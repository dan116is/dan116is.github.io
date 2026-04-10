import { useState, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { api, type ExecutionDetail } from "../lib/api";

const WS_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace("http", "ws");

interface StepUpdate {
  step_id: string;
  step_name: string;
  status?: string;
  duration_ms?: number;
  tokens_in?: number;
  tokens_out?: number;
  cost?: number;
}

export function useLiveExecution(executionId: string | null) {
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [stepUpdates, setStepUpdates] = useState<Record<string, StepUpdate>>({});

  // Load initial execution data
  useEffect(() => {
    if (!executionId) return;
    api.workflows.getExecution(executionId).then(setExecution);
  }, [executionId]);

  // Subscribe to live updates
  useWebSocket(
    executionId ? `${WS_BASE}/api/ws/executions/${executionId}/live` : null,
    (data) => {
      const event = data as { event: string } & StepUpdate & { status?: string };

      if (event.event === "step_started" || event.event === "step_completed") {
        setStepUpdates((prev) => ({
          ...prev,
          [event.step_id]: {
            ...prev[event.step_id],
            ...event,
            status: event.event === "step_started" ? "running" : "completed",
          },
        }));
      }

      if (event.event === "execution_finished") {
        // Reload full execution data
        api.workflows.getExecution(executionId!).then(setExecution);
        setStepUpdates({});
      }
    }
  );

  // Merge live step updates into execution data
  const mergedExecution = execution
    ? {
        ...execution,
        steps: execution.steps.map((step) => {
          const live = stepUpdates[step.id];
          if (!live) return step;
          return {
            ...step,
            status: live.status || step.status,
            duration_ms: live.duration_ms ?? step.duration_ms,
            tokens_in: live.tokens_in ?? step.tokens_in,
            tokens_out: live.tokens_out ?? step.tokens_out,
            cost: live.cost ?? step.cost,
          };
        }),
      }
    : null;

  return { execution: mergedExecution, isLive: true };
}
