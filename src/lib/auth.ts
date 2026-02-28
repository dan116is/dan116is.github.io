import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { User, KYCStatus } from "@prisma/client";

const SALT_ROUNDS = 12;
const MIN_AGE = 18;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const m = today.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

export function isAgeVerified(dateOfBirth: Date): boolean {
  return calculateAge(dateOfBirth) >= MIN_AGE;
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.session.create({
    data: { userId, token, expiresAt, ipAddress, userAgent },
  });

  return token;
}

export async function validateSession(
  token: string
): Promise<User | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { token } });
    }
    return null;
  }

  return session.user;
}

export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Initiates KYC (Know Your Customer) verification.
 * In production this integrates with a third-party KYC provider
 * (e.g. Onfido, Jumio, Veriff) that handles document + face scan.
 */
export async function submitKYC(
  userId: string,
  documentUrl: string,
  faceScanUrl: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: KYCStatus.SUBMITTED,
      kycDocumentUrl: documentUrl,
      faceScanUrl: faceScanUrl,
    },
  });
}

export async function approveKYC(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus: KYCStatus.APPROVED,
      isVerified: true,
    },
  });
}

export async function rejectKYC(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: KYCStatus.REJECTED },
  });
}

export function canAccessPlatform(user: User): boolean {
  return (
    user.isVerified &&
    user.kycStatus === "APPROVED" &&
    !user.isBanned &&
    isAgeVerified(user.dateOfBirth)
  );
}
