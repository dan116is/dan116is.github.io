import { useEffect, useState } from "react";
import { api, type Agent, type AgentDetail } from "../../lib/api";

const STATUS_COLORS = {
  running: "text-green-400",
  idle: "text-yellow-400",
  error: "text-red-400",
  stopped: "text-gray-600",
};

const STATUS_DOT = {
  running: "bg-green-400 animate-pulse",
  idle: "bg-yellow-400",
  error: "bg-red-400 animate-pulse",
  stopped: "bg-gray-600",
};

export default function AgentsTab({ tenantId }: { tenantId: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.agents.list(tenantId).then((data) => {
      setAgents(data);
      setLoading(false);
    });
  }, [tenantId]);

  const handleSelectAgent = async (agent: Agent) => {
    const detail = await api.agents.get(agent.id);
    setSelected(detail);
  };

  if (loading) {
    return <div className="text-gray-500 font-mono text-sm">Loading agents...</div>;
  }

  return (
    <div className="flex gap-6">
      {/* Agent list */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => handleSelectAgent(agent)}
            className={`text-left bg-white/[0.02] border rounded-xl p-4 transition-all
                       hover:border-white/[0.15] ${
                         selected?.id === agent.id
                           ? "border-white/[0.2] bg-white/[0.04]"
                           : "border-white/[0.06]"
                       }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-mono font-semibold text-sm">{agent.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{agent.role}</div>
              </div>
              <span className={`w-2 h-2 rounded-full mt-1 ${STATUS_DOT[agent.status]}`} />
            </div>

            <div className="space-y-1">
              <InfoRow label="MODEL" value={agent.model_name || "—"} />
              <InfoRow label="PROVIDER" value={agent.model_provider || "—"} />
              <InfoRow
                label="STATUS"
                value={agent.status.toUpperCase()}
                valueClass={STATUS_COLORS[agent.status]}
              />
              {agent.last_heartbeat && (
                <InfoRow
                  label="HEARTBEAT"
                  value={new Date(agent.last_heartbeat).toLocaleTimeString()}
                />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono font-semibold">{selected.name}</div>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-600 hover:text-gray-400 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 mb-5">
            <InfoRow label="ROLE" value={selected.role} />
            <InfoRow label="MODEL" value={selected.model_name || "—"} />
            <InfoRow label="VERSION" value={selected.version || "—"} />
            <InfoRow
              label="STATUS"
              value={selected.status.toUpperCase()}
              valueClass={STATUS_COLORS[selected.status]}
            />
          </div>

          <div className="text-xs text-gray-500 font-mono mb-2">RECENT TRACES</div>
          <div className="space-y-1.5">
            {selected.recent_traces.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400 truncate max-w-[140px]">{t.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{t.duration_ms}ms</span>
                  <span className={t.status === "ok" ? "text-green-400" : "text-red-400"}>
                    {t.status === "ok" ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            ))}
            {selected.recent_traces.length === 0 && (
              <div className="text-gray-600 text-xs font-mono">No traces yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600 font-mono">{label}</span>
      <span className={`text-xs font-mono ${valueClass || "text-gray-300"}`}>{value}</span>
    </div>
  );
}
