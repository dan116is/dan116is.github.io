import { useEffect, useState } from "react";
import { api, type WorkflowExecution } from "../../lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-gray-500",
  running: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
  cancelled: "text-yellow-400",
};

export default function ExecutionList({
  workflowId,
  selectedId,
  onSelect,
}: {
  workflowId: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);

  useEffect(() => {
    api.workflows.executions(workflowId).then(setExecutions);
  }, [workflowId]);

  if (executions.length === 0) {
    return <div className="text-gray-600 text-xs font-mono">No executions yet</div>;
  }

  return (
    <div className="space-y-1.5">
      {executions.map((exec) => (
        <button
          key={exec.id}
          onClick={() => onSelect(exec.id)}
          className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs font-mono
                     ${selectedId === exec.id
                       ? "bg-white/[0.06] border border-white/[0.1]"
                       : "hover:bg-white/[0.03]"
                     }`}
        >
          <div className="flex justify-between items-center">
            <span className={STATUS_COLORS[exec.status]}>{exec.status.toUpperCase()}</span>
            <span className="text-gray-600">{exec.trigger_type}</span>
          </div>
          <div className="text-gray-600 mt-0.5">
            {exec.started_at
              ? new Date(exec.started_at).toLocaleTimeString()
              : "—"}
          </div>
        </button>
      ))}
    </div>
  );
}
