import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PAGE_SIZE = 20;

const MarkReadSchema = z.object({
  // If ids is omitted, all notifications are marked as read
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const unreadOnly = searchParams.get("unread") === "true";

    const where = {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
      unreadCount,
    });
  } catch (error) {
    console.error("[Notifications GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(sessionToken);

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = MarkReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ids, markAll } = parsed.data;

    if (markAll || (!ids || ids.length === 0)) {
      // Mark all of the user's notifications as read
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        updatedCount: result.count,
        message: `Marked ${result.count} notification(s) as read.`,
      });
    }

    // Mark specific notifications as read — ensure they belong to this user
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: `Marked ${result.count} notification(s) as read.`,
    });
  } catch (error) {
    console.error("[Notifications PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update notifications." },
      { status: 500 }
    );
  }
}
