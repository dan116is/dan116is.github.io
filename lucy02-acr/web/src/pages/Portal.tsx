/**
 * Client Portal — branded readonly view.
 * Route: /portal/:slug
 * Accessible to: client_admin, client_viewer
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type Tenant, type Agent, type Alert, type CostSummary } from "../lib/api";
import { useAuth } from "../stores/auth";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function Portal() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api.tenants.list().then((tenants) => {
      const found = tenants.find((t) => t.slug === slug);
      if (!found) { navigate("/login"); return; }

      // Enforce: client users can only see their own portal
      if (user && user.tenant_id && user.tenant_id !== found.id) {
        navigate("/login");
        return;
      }

      setTenant(found);
      Promise.all([
        api.agents.list(found.id),
        api.alerts.list(found.id, "active"),
        api.costs.summary(found.id, "month"),
      ]).then(([a, al, c]) => {
        setAgents(a);
        setAlerts(al);
        setCosts(c);
        setLoading(false);
      });
    });
  }, [slug, user, navigate]);

  if (loading || !tenant) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#08080F" }}
      >
        <div className="text-gray-500 font-mono text-sm">Loading portal...</div>
      </div>
    );
  }

  const runningAgents = agents.filter((a) => a.status === "running").length;
  const errorAgents = agents.filter((a) => a.status === "error").length;
  const uptime = agents.length > 0
    ? Math.round(((agents.length - errorAgents) / agents.length) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      {/* Branded header */}
      <header
        className="border-b px-8 py-5"
        style={{ borderColor: tenant.brand_color + "33" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 rounded object-contain" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-black font-bold text-sm font-mono"
                style={{ backgroundColor: tenant.brand_color }}
              >
                {tenant.name[0]}
              </div>
            )}
            <div>
              <div className="font-mono font-bold text-white">{tenant.name}</div>
              <div className="text-xs text-gray-500 font-mono">AI Agent Portal</div>
            </div>
          </div>
          <div className="text-xs text-gray-600 font-mono">
            Powered by <span style={{ color: tenant.brand_color }}>Lucy02</span>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 space-y-8">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="TOTAL AGENTS"
            value={agents.length.toString()}
            accent={tenant.brand_color}
          />
          <KPICard
            label="RUNNING NOW"
            value={runningAgents.toString()}
            accent={tenant.brand_color}
          />
          <KPICard
            label="UPTIME"
            value={`${uptime}%`}
            accent={uptime >= 99 ? "#10B981" : uptime >= 90 ? "#F59E0B" : "#EF4444"}
          />
          <KPICard
            label="ACTIVE ALERTS"
            value={alerts.length.toString()}
            accent={alerts.length > 0 ? "#EF4444" : "#10B981"}
          />
        </div>

        {/* Agent status grid */}
        <Section title="AGENT STATUS" accent={tenant.brand_color}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono font-semibold text-sm">{agent.name}</div>
                  <StatusBadge status={agent.status} accent={tenant.brand_color} />
                </div>
                <div className="text-xs text-gray-500 font-mono">{agent.role}</div>
                {agent.model_name && (
                  <div className="text-xs text-gray-600 font-mono mt-1">
                    {agent.model_provider} / {agent.model_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Cost trend */}
        {costs && costs.daily.length > 0 && (
          <Section title="COST TREND (30 DAYS)" accent={tenant.brand_color}>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <div className="text-2xl font-mono font-bold" style={{ color: tenant.brand_color }}>
                  ${costs.total_cost.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 font-mono">Total this month</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={[...costs.daily].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }}
                />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip
                  contentStyle={{
                    background: "#111", border: `1px solid ${tenant.brand_color}44`,
                    fontFamily: "JetBrains Mono", fontSize: 11,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke={tenant.brand_color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        )}

        {/* Active alerts */}
        {alerts.length > 0 && (
          <Section title="ACTIVE ALERTS" accent="#EF4444">
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"
                >
                  <span
                    className={`text-xs font-mono font-bold uppercase mt-0.5 ${
                      alert.severity === "critical" ? "text-red-400" : "text-orange-400"
                    }`}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-sm font-mono text-white/70">{alert.message}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

function KPICard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <div className="text-xs text-gray-500 font-mono mb-1">{label}</div>
      <div className="text-2xl font-mono font-bold" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-xs font-mono font-bold mb-3 flex items-center gap-2"
        style={{ color: accent }}
      >
        <span className="w-3 h-px inline-block" style={{ backgroundColor: accent }} />
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status, accent }: { status: string; accent: string }) {
  const map: Record<string, { label: string; color: string; pulse: boolean }> = {
    running: { label: "RUNNING", color: accent, pulse: true },
    idle:    { label: "IDLE",    color: "#F59E0B", pulse: false },
    error:   { label: "ERROR",   color: "#EF4444", pulse: true },
    stopped: { label: "STOPPED", color: "#6B7280", pulse: false },
  };
  const s = map[status] || map.stopped;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full ${s.pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: s.color }}
      />
      <span className="text-xs font-mono" style={{ color: s.color }}>{s.label}</span>
    </div>
  );
}
