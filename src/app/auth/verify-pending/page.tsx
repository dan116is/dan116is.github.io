import Link from "next/link";

export default function VerifyPendingPage() {
  return (
    <div className="min-h-screen city-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-black text-gold-gradient mb-4">
          Verification Pending
        </h1>
        <p className="text-gray-400 mb-6 leading-relaxed">
          Your identity documents have been submitted for review. Our system uses AI-powered
          facial recognition to verify your identity within minutes.
        </p>

        <div className="luxury-card p-6 mb-6 text-left space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-bold">✓</div>
            <span className="text-gray-300">Account created</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black text-xs font-bold">✓</div>
            <span className="text-gray-300">Age verified (18+)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            </div>
            <span className="text-gray-300">Identity verification in progress...</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-600 text-xs">4</div>
            <span className="text-gray-500">Access granted to full platform</span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          You will receive an email notification once verification is complete.
          This typically takes 2–5 minutes.
        </p>

        <div className="flex gap-3 justify-center">
          <Link
            href="/city"
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg"
          >
            Enter City (Limited Access)
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
