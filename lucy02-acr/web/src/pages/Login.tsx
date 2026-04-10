import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../stores/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080F] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-mono font-bold text-[#00D4AA] tracking-wider">
            LUCY02
          </div>
          <div className="text-sm text-gray-500 mt-1 font-mono">Agent Control Room</div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-8 space-y-4"
        >
          <div>
            <label className="block text-xs text-gray-400 font-mono mb-1.5">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5
                         text-white font-mono text-sm focus:outline-none focus:border-[#00D4AA]/50
                         placeholder-gray-600"
              placeholder="admin@lucy02.ai"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-mono mb-1.5">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5
                         text-white font-mono text-sm focus:outline-none focus:border-[#00D4AA]/50"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00D4AA] hover:bg-[#00D4AA]/90 disabled:opacity-50
                       text-black font-mono font-bold text-sm py-2.5 rounded-lg
                       transition-colors"
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
