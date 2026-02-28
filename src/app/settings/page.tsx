"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

type Section = "account" | "security" | "notifications" | "preferences" | "kyc";

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "account", label: "Account", icon: "👤" },
  { key: "security", label: "Security", icon: "🔐" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "preferences", label: "Preferences", icon: "⚙️" },
  { key: "kyc", label: "KYC / Verification", icon: "✅" },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("account");
  const [saved, setSaved] = useState(false);

  // Account state
  const [displayName, setDisplayName] = useState("Shadow King");
  const [bio, setBio] = useState("Fortune favors the bold. All in or nothing.");
  const [email, setEmail] = useState("shadowking@example.com");

  // Security state
  const [twoFactor, setTwoFactor] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // Notifications state
  const [notifWins, setNotifWins] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);
  const [notifVip, setNotifVip] = useState(true);
  const [notifBets, setNotifBets] = useState(true);

  // Preferences state
  const [currency, setCurrency] = useState("VC");
  const [language, setLanguage] = useState("en");
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [responsibleGaming, setResponsibleGaming] = useState(false);
  const [dailyLimit, setDailyLimit] = useState("10000");

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen city-bg">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-black/50 backdrop-blur-md">
        <Link href="/profile" className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Profile
        </Link>
        <div className="text-yellow-400 font-bold">Settings</div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-all ${
            saved
              ? "bg-green-500 text-black"
              : "bg-yellow-500 hover:bg-yellow-400 text-black"
          }`}
        >
          {saved ? "✓ Saved!" : "Save Changes"}
        </motion.button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <div className="luxury-card overflow-hidden sticky top-20">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-all border-b border-white/5 last:border-0 ${
                    section === s.key
                      ? "bg-yellow-500/10 text-yellow-400 border-l-2 border-l-yellow-500"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <motion.div
              key={section}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="luxury-card p-6"
            >
              {/* Account */}
              {section === "account" && (
                <div>
                  <h2 className="text-lg font-black text-white mb-6">Account Settings</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Display Name</label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Email</label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
                      />
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <button className="text-red-400 text-sm hover:text-red-300 transition-colors">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security */}
              {section === "security" && (
                <div>
                  <h2 className="text-lg font-black text-white mb-6">Security</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Current Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">New Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50 transition-colors"
                      />
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-medium text-white">Two-Factor Authentication</div>
                          <div className="text-xs text-gray-500 mt-0.5">Extra layer of security for your account</div>
                        </div>
                        <button
                          onClick={() => setTwoFactor(!twoFactor)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${twoFactor ? "bg-yellow-500" : "bg-white/10"}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${twoFactor ? "left-7" : "left-1"}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">Login Alerts</div>
                          <div className="text-xs text-gray-500 mt-0.5">Get notified of new logins</div>
                        </div>
                        <button
                          onClick={() => setLoginAlerts(!loginAlerts)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${loginAlerts ? "bg-yellow-500" : "bg-white/10"}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${loginAlerts ? "left-7" : "left-1"}`} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <div className="text-xs text-blue-400">🔐 Active Sessions: 2 devices</div>
                      <button className="text-xs text-red-400 hover:text-red-300 mt-1 transition-colors">
                        Sign out all other devices
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {section === "notifications" && (
                <div>
                  <h2 className="text-lg font-black text-white mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    {[
                      { label: "Win Notifications", desc: "Get notified when you win", value: notifWins, set: setNotifWins },
                      { label: "Active Bet Updates", desc: "Updates on your live bets", value: notifBets, set: setNotifBets },
                      { label: "VIP Status Changes", desc: "Level up notifications", value: notifVip, set: setNotifVip },
                      { label: "Promotions & Bonuses", desc: "Special offers and rewards", value: notifPromos, set: setNotifPromos },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-sm font-medium text-white">{item.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                        </div>
                        <button
                          onClick={() => item.set(!item.value)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${item.value ? "bg-yellow-500" : "bg-white/10"}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.value ? "left-7" : "left-1"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preferences */}
              {section === "preferences" && (
                <div>
                  <h2 className="text-lg font-black text-white mb-6">Preferences</h2>
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-2">Currency Display</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50"
                        >
                          <option value="VC">VC (Virtual City)</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-2">Language</label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/50"
                        >
                          <option value="en">English</option>
                          <option value="he">Hebrew</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-white/5">
                      {[
                        { label: "Sound Effects", desc: "Game audio and win sounds", value: soundEffects, set: setSoundEffects },
                        { label: "Auto-Spin", desc: "Automatically spin slots", value: autoSpin, set: setAutoSpin },
                        { label: "Responsible Gaming Limits", desc: "Set daily wagering limits", value: responsibleGaming, set: setResponsibleGaming },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">{item.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                          </div>
                          <button
                            onClick={() => item.set(!item.value)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${item.value ? "bg-yellow-500" : "bg-white/10"}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.value ? "left-7" : "left-1"}`} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {responsibleGaming && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl"
                      >
                        <label className="text-xs text-orange-400 block mb-2">Daily Wager Limit (VC)</label>
                        <input
                          type="number"
                          value={dailyLimit}
                          onChange={(e) => setDailyLimit(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* KYC */}
              {section === "kyc" && (
                <div>
                  <h2 className="text-lg font-black text-white mb-6">KYC Verification</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                      <div className="text-2xl">✅</div>
                      <div>
                        <div className="text-sm font-bold text-green-400">Identity Verified</div>
                        <div className="text-xs text-gray-400">Your account is fully verified</div>
                      </div>
                    </div>

                    {[
                      { label: "Email Verification", status: "verified", icon: "📧" },
                      { label: "Phone Number", status: "verified", icon: "📱" },
                      { label: "Government ID", status: "verified", icon: "🪪" },
                      { label: "Address Proof", status: "pending", icon: "🏠" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 bg-white/3 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-sm text-white">{item.label}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.status === "verified"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {item.status === "verified" ? "✓ Verified" : "Pending"}
                        </span>
                      </div>
                    ))}

                    <div className="pt-2">
                      <button className="w-full py-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium rounded-xl hover:bg-yellow-500/20 transition-all">
                        Upload Address Proof →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
