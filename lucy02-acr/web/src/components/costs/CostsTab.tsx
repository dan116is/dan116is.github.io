import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { api, type CostSummary, type AgentCost, type CostForecast } from "../../lib/api";

export default function CostsTab({ tenantId }: { tenantId: string }) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [agentCosts, setAgentCosts] = useState<AgentCost[]>([]);
  const [forecast, setForecast] = useState<CostForecast | null>(null);

  useEffect(() => {
    api.costs.summary(tenantId, period).then(setSummary);
    api.costs.byAgent(tenantId).then(setAgentCosts);
    api.costs.forecast(tenantId).then(setForecast);
  }, [tenantId, period]);

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-mono font-bold text-white">
            ${summary?.total_cost.toFixed(2) || "—"}
          </div>
          <div className="text-sm text-gray-500 font-mono">Total cost this {period}</div>
        </div>
        <div className="flex items-center gap-2">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                period === p ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="grid grid-cols-3 gap-4">
          <ForecastCard label="AVG DAILY" value={`$${forecast.avg_daily_cost.toFixed(2)}`} />
          <ForecastCard label="30-DAY FORECAST" value={`$${forecast.forecast_30d.toFixed(2)}`} />
          <ForecastCard label="90-DAY FORECAST" value={`$${forecast.forecast_90d.toFixed(2)}`} />
        </div>
      )}

      {/* Daily cost chart */}
      {summary && summary.daily.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <div className="text-xs text-gray-500 font-mono mb-4">DAILY COST TREND</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[...summary.daily].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #374151", fontFamily: "JetBrains Mono", fontSize: 12 }}
                labelStyle={{ color: "#9CA3AF" }}
              />
              <Line type="monotone" dataKey="cost" stroke="#00D4AA" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cost by agent */}
      {agentCosts.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <div className="text-xs text-gray-500 font-mono mb-4">COST BY AGENT (30 DAYS)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={agentCosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="agent_name" tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <YAxis tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #374151", fontFamily: "JetBrains Mono", fontSize: 12 }}
              />
              <Bar dataKey="cost" fill="#00D4AA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Agent cost table */}
      {agentCosts.length > 0 && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["AGENT", "COST", "TOKENS IN", "TOKENS OUT", "TRACES"].map((h) => (
                  <th key={h} className="text-left text-gray-500 px-4 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentCosts.map((a) => (
                <tr key={a.agent_id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-white">{a.agent_name}</td>
                  <td className="px-4 py-3 text-[#00D4AA]">${a.cost.toFixed(4)}</td>
                  <td className="px-4 py-3 text-gray-400">{a.tokens_in.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{a.tokens_out.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{a.traces}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ForecastCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
      <div className="text-xs text-gray-500 font-mono mb-1">{label}</div>
      <div className="text-xl font-mono font-bold text-white">{value}</div>
    </div>
  );
}
