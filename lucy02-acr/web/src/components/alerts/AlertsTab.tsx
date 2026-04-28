import { useEffect, useState } from "react";
import { api, type Alert } from "../../lib/api";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  warning: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

export default function AlertsTab({ tenantId }: { tenantId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.alerts
      .list(tenantId, filter === "active" ? "active" : undefined)
      .then((data) => { setAlerts(data); setLoading(false); });
  };

  useEffect(load, [tenantId, filter]);

  const handleAck = async (id: string) => {
    await api.alerts.acknowledge(id);
    load();
  };

  const handleResolve = async (id: string) => {
    await api.alerts.resolve(id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["active", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
              filter === f
                ? "bg-white/[0.08] text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 font-mono text-sm">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-gray-600 font-mono text-sm py-8 text-center">
          No {filter} alerts
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-xl p-4 ${SEVERITY_STYLES[alert.severity]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold uppercase">
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-mono text-white/80">{alert.message}</div>
                </div>

                {alert.status === "active" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAck(alert.id)}
                      className="text-xs font-mono px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1]
                                 text-white rounded transition-colors"
                    >
                      ACK
                    </button>
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="text-xs font-mono px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30
                                 text-green-400 rounded transition-colors"
                    >
                      RESOLVE
                    </button>
                  </div>
                )}

                {alert.status !== "active" && (
                  <span className="text-xs font-mono text-gray-500 uppercase shrink-0">
                    {alert.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
