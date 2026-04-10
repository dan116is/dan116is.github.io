import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Tenant, type TenantDashboard } from "../lib/api";

export default function GlobalDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [dashboards, setDashboards] = useState<Record<string, TenantDashboard>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tenants.list().then((data) => {
      setTenants(data);
      setLoading(false);
      // Load dashboard data for each tenant
      data.forEach((t) => {
        api.tenants.dashboard(t.id).then((d) => {
          setDashboards((prev) => ({ ...prev, [t.id]: d }));
        });
      });
    });
  }, []);

  const totalAgents = Object.values(dashboards).reduce((sum, d) => sum + d.agents.total, 0);
  const totalAlerts = Object.values(dashboards).reduce((sum, d) => sum + d.alerts.active, 0);
  const activeExecs = Object.values(dashboards).reduce((sum, d) => sum + d.workflows.active_executions, 0);

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      {/* Top bar */}
      <header className="border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-bold text-[#00D4AA]">LUCY02</span>
          <span className="text-xs text-gray-600 font-mono">|</span>
          <span className="text-sm text-gray-400 font-mono">Agent Control Room</span>
        </div>
        <div className="flex items-center gap-6">
          <StatBadge label="AGENTS" value={totalAgents} />
          <StatBadge label="CLIENTS" value={tenants.length} />
          <StatBadge label="ACTIVE EXECS" value={activeExecs} color="blue" />
          {totalAlerts > 0 && <StatBadge label="ALERTS" value={totalAlerts} color="red" />}
          <LiveIndicator />
        </div>
      </header>

      <main className="px-8 py-8">
        <h1 className="text-xl font-mono font-semibold mb-6">All Clients</h1>

        {loading ? (
          <div className="text-gray-500 font-mono text-sm">Loading clients...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => {
              const dash = dashboards[tenant.id];
              const runningAgents = dash?.agents.by_status?.["running"] || 0;
              const errorAgents = dash?.agents.by_status?.["error"] || 0;
              const health = errorAgents > 0 ? "error" : runningAgents > 0 ? "healthy" : "idle";

              return (
                <Link
                  key={tenant.id}
                  to={`/clients/${tenant.slug}`}
                  className="block bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]
                             rounded-xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-mono font-semibold text-white group-hover:text-[#00D4AA] transition-colors">
                        {tenant.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">{tenant.industry}</div>
                    </div>
                    <HealthDot status={health} />
                  </div>

                  {dash ? (
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCell label="AGENTS" value={dash.agents.total} />
                      <MetricCell label="RUNNING" value={runningAgents} color="#00D4AA" />
                      <MetricCell label="ALERTS" value={dash.alerts.active} color={dash.alerts.active > 0 ? "#FF4444" : undefined} />
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 font-mono">Loading...</div>
                  )}

                  <div
                    className="h-0.5 mt-4 rounded-full opacity-30"
                    style={{ backgroundColor: tenant.brand_color }}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color?: "blue" | "red" }) {
  const colorClass = color === "red" ? "text-red-400" : color === "blue" ? "text-blue-400" : "text-white";
  return (
    <div className="text-right">
      <div className={`text-lg font-mono font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-gray-600 font-mono">{label}</div>
    </div>
  );
}

function LiveIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
      <span className="text-xs text-[#00D4AA] font-mono">LIVE</span>
    </div>
  );
}

function HealthDot({ status }: { status: "healthy" | "error" | "idle" }) {
  const colors = { healthy: "bg-green-400", error: "bg-red-400 animate-pulse", idle: "bg-gray-600" };
  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

function MetricCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white/[0.02] rounded-lg p-2.5">
      <div className="text-xs text-gray-500 font-mono">{label}</div>
      <div className="text-base font-mono font-bold mt-0.5" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
