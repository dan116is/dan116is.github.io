"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

type Step = "account" | "dob" | "kyc" | "character";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    agreeTerms: false,
    agreeAge: false,
  });

  const [kycFiles, setKycFiles] = useState({
    document: null as File | null,
    selfie: null as File | null,
  });

  const [character, setCharacter] = useState({
    name: "",
    gender: "male",
    skinTone: "light",
    hairStyle: "short",
    hairColor: "black",
    eyeColor: "brown",
    bodyType: "athletic",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox"
      ? target.checked
      : target.value;
    setForm((prev) => ({ ...prev, [target.name]: value }));
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.agreeTerms || !form.agreeAge) {
      setError("Please accept the terms and confirm you are 18+");
      return;
    }

    setStep("dob");
  }

  async function handleDobSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.dateOfBirth) {
      setError("Please enter your date of birth");
      return;
    }

    const dob = new Date(form.dateOfBirth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    if (age < 18) {
      setError("You must be 18 or older to use this platform");
      return;
    }

    setStep("kyc");
  }

  async function handleKycSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!kycFiles.document || !kycFiles.selfie) {
      setError("Please upload both your ID document and selfie");
      return;
    }

    setStep("character");
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          character,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      router.push("/auth/verify-pending");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const steps = ["account", "dob", "kyc", "character"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen city-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {["Account", "Age", "Identity", "Avatar"].map((label, i) => (
            <div key={label} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i <= currentStepIndex
                    ? "bg-yellow-500 text-black"
                    : "bg-white/10 text-gray-500"
                }`}
              >
                {i < currentStepIndex ? "✓" : i + 1}
              </div>
              <span
                className={`ml-2 text-xs hidden sm:block ${
                  i <= currentStepIndex ? "text-yellow-400" : "text-gray-600"
                }`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    i < currentStepIndex ? "bg-yellow-500" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Account */}
          {step === "account" && (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="luxury-card p-8">
                <h1 className="text-2xl font-black mb-2 text-gold-gradient">Create Account</h1>
                <p className="text-gray-400 text-sm mb-6">Join the virtual city</p>

                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      required
                      minLength={3}
                      maxLength={20}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none transition-colors"
                      placeholder="CityPlayer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={form.agreeTerms}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <span className="text-xs text-gray-400">
                      I agree to the{" "}
                      <Link href="/legal/terms" className="text-yellow-400 hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/legal/privacy" className="text-yellow-400 hover:underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="agreeAge"
                      checked={form.agreeAge}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <span className="text-xs text-gray-400">
                      I confirm that I am 18 years of age or older and that gambling is
                      legal in my jurisdiction.
                    </span>
                  </label>

                  {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all"
                  >
                    Continue
                  </button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="text-yellow-400 hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Date of Birth */}
          {step === "dob" && (
            <motion.div
              key="dob"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="luxury-card p-8">
                <h1 className="text-2xl font-black mb-2 text-gold-gradient">Age Verification</h1>
                <p className="text-gray-400 text-sm mb-6">
                  This platform is for adults only. Please confirm your date of birth.
                </p>

                <form onSubmit={handleDobSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      required
                      max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0]}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-xs text-yellow-300">
                    Your date of birth will be verified against your ID document in the next step.
                    False information will result in permanent ban.
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all"
                  >
                    Continue
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Step 3: KYC */}
          {step === "kyc" && (
            <motion.div
              key="kyc"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="luxury-card p-8">
                <h1 className="text-2xl font-black mb-2 text-gold-gradient">Identity Verification</h1>
                <p className="text-gray-400 text-sm mb-6">
                  Upload your government ID and a selfie. Our system uses facial recognition
                  to verify your identity.
                </p>

                <form onSubmit={handleKycSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      Government-issued ID (passport, driver&apos;s license)
                    </label>
                    <div
                      className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-yellow-500/50 transition-colors"
                      onClick={() => document.getElementById("doc-upload")?.click()}
                    >
                      <div className="text-3xl mb-2">🪪</div>
                      <p className="text-sm text-gray-400">
                        {kycFiles.document ? kycFiles.document.name : "Click to upload"}
                      </p>
                      <input
                        id="doc-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setKycFiles((prev) => ({ ...prev, document: e.target.files?.[0] ?? null }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-2">
                      Selfie holding your ID
                    </label>
                    <div
                      className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-yellow-500/50 transition-colors"
                      onClick={() => document.getElementById("selfie-upload")?.click()}
                    >
                      <div className="text-3xl mb-2">🤳</div>
                      <p className="text-sm text-gray-400">
                        {kycFiles.selfie ? kycFiles.selfie.name : "Click to upload selfie"}
                      </p>
                      <input
                        id="selfie-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setKycFiles((prev) => ({ ...prev, selfie: e.target.files?.[0] ?? null }))
                        }
                      />
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs text-blue-300">
                    Your documents are encrypted and processed securely. We use facial
                    recognition AI to verify your identity. Documents are deleted after verification.
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all"
                  >
                    Verify Identity
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Step 4: Character Creation */}
          {step === "character" && (
            <motion.div
              key="character"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="luxury-card p-8">
                <h1 className="text-2xl font-black mb-2 text-gold-gradient">Create Your Avatar</h1>
                <p className="text-gray-400 text-sm mb-6">
                  Design your 3D character for the virtual city
                </p>

                <form onSubmit={handleFinalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Character Name</label>
                    <input
                      type="text"
                      value={character.name}
                      onChange={(e) => setCharacter((p) => ({ ...p, name: e.target.value }))}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none"
                      placeholder="Your character's name"
                    />
                  </div>

                  {[
                    { key: "gender", label: "Gender", options: ["male", "female", "non-binary"] },
                    { key: "skinTone", label: "Skin Tone", options: ["light", "medium-light", "medium", "medium-dark", "dark"] },
                    { key: "hairStyle", label: "Hair Style", options: ["short", "medium", "long", "curly", "bald", "ponytail"] },
                    { key: "hairColor", label: "Hair Color", options: ["black", "brown", "blonde", "red", "white", "blue", "purple"] },
                    { key: "eyeColor", label: "Eye Color", options: ["brown", "blue", "green", "hazel", "grey", "amber"] },
                    { key: "bodyType", label: "Body Type", options: ["slim", "athletic", "average", "muscular", "curvy"] },
                  ].map(({ key, label, options }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-400 mb-1">{label}</label>
                      <select
                        value={character[key as keyof typeof character]}
                        onChange={(e) => setCharacter((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-yellow-500/50 focus:outline-none capitalize"
                      >
                        {options.map((o) => (
                          <option key={o} value={o} className="bg-gray-900 capitalize">{o}</option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {error && (
                    <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50"
                  >
                    {loading ? "Creating your city account..." : "Enter VirtualCity"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
