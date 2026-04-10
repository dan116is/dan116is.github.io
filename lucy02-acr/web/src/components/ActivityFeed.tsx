import { useState, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { formatDistanceToNow } from "date-fns";

const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace("http", "ws");

interface FeedEvent {
  id: string;
  event: string;
  timestamp: string;
  agent_id?: string;
  agent_name?: string;
  execution_id?: string;
  workflow_name?: string;
  step_name?: string;
  severity?: string;
  message?: string;
  status?: string;
  duration_ms?: number;
}

const EVENT_STYLES: Record<string, { icon: string; color: string }> = {
  agent_status_changed: { icon: "◎", color: "text-blue-400" },
  execution_started:    { icon: "▶", color: "text-[#00D4AA]" },
  execution_finished:   { icon: "✓", color: "text-green-400" },
  step_started:         { icon: "→", color: "text-blue-300" },
  step_completed:       { icon: "✓", color: "text-green-400" },
  alert_fired:          { icon: "⚠", color: "text-orange-400" },
  error:                { icon: "✗", color: "text-red-400" },
};

function eventLabel(ev: FeedEvent): string {
  switch (ev.event) {
    case "agent_status_changed":
      return `${ev.agent_name || "Agent"} → ${ev.status?.toUpperCase()}`;
    case "execution_started":
      return `Workflow started: ${ev.workflow_name || ev.execution_id?.slice(0, 8)}`;
    case "execution_finished":
      return `Workflow ${ev.status}: ${ev.execution_id?.slice(0, 8)}`;
    case "step_started":
      return `Step running: ${ev.step_name}`;
    case "step_completed":
      return `Step done: ${ev.step_name}${ev.duration_ms ? ` (${ev.duration_ms}ms)` : ""}`;
    case "alert_fired":
      return ev.message || "Alert fired";
    default:
      return ev.event;
  }
}

export default function ActivityFeed({ tenantId }: { tenantId: string }) {
  const [events, setEvents] = useState<FeedEvent[]>([]);

  useWebSocket(`${WS_BASE}/api/ws/tenants/${tenantId}/live`, (data) => {
    const ev = data as FeedEvent;
    ev.id = `${Date.now()}-${Math.random()}`;
    ev.timestamp = new Date().toISOString();
    setEvents((prev) => [ev, ...prev].slice(0, 200));
  });

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-xs text-gray-500 font-mono">LIVE ACTIVITY</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
          <span className="text-xs text-[#00D4AA] font-mono">LIVE</span>
        </div>
      </div>

      <div className="overflow-y-auto max-h-64">
        {events.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-600 text-xs font-mono">
            Waiting for events...
          </div>
        ) : (
          events.map((ev) => {
            const style = EVENT_STYLES[ev.event] || { icon: "·", color: "text-gray-400" };
            return (
              <div
                key={ev.id}
                className="flex items-start gap-3 px-4 py-2.5 border-b border-white/[0.03]
                           hover:bg-white/[0.02] transition-colors"
              >
                <span className={`font-mono text-sm shrink-0 mt-0.5 ${style.color}`}>
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono ${style.color}`}>
                    {eventLabel(ev)}
                  </div>
                  {ev.severity && (
                    <div className="text-xs text-gray-600 font-mono mt-0.5">
                      severity: {ev.severity}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-700 font-mono shrink-0">
                  {formatDistanceToNow(new Date(ev.timestamp), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
