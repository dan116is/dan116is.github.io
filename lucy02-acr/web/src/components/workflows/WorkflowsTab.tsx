import { useEffect, useState } from "react";
import { api, type Workflow, type ExecutionDetail } from "../../lib/api";
import WorkflowDiagram from "./WorkflowDiagram";
import ExecutionList from "./ExecutionList";
import { useLiveExecution } from "../../hooks/useLiveExecution";

export default function WorkflowsTab({ tenantId }: { tenantId: string }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { execution } = useLiveExecution(activeExecutionId);

  useEffect(() => {
    api.workflows.list(tenantId).then((data) => {
      setWorkflows(data);
      setLoading(false);
    });
  }, [tenantId]);

  const handleRun = async () => {
    if (!selected) return;
    setRunning(true);
    try {
      const exec = await api.workflows.execute(selected.id);
      setActiveExecutionId(exec.id);
    } finally {
      setRunning(false);
    }
  };

  const handleSelectExecution = (execId: string) => {
    setActiveExecutionId(execId);
  };

  if (loading) {
    return <div className="text-gray-500 font-mono text-sm">Loading workflows...</div>;
  }

  return (
    <div className="space-y-4">
      {!selected ? (
        // Workflow list
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => setSelected(wf)}
              className="text-left bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15]
                         rounded-xl p-5 transition-all"
            >
              <div className="font-mono font-semibold mb-1">{wf.name}</div>
              {wf.description && (
                <div className="text-xs text-gray-500 font-mono mb-3">{wf.description}</div>
              )}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-gray-600">v{wf.version}</span>
                <span className="text-gray-600">{wf.definition.steps.length} steps</span>
                <span className={`${wf.is_active ? "text-green-400" : "text-gray-600"}`}>
                  {wf.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        // Workflow detail with diagram
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelected(null); setExecution(null); }}
                className="text-gray-600 hover:text-gray-400 font-mono text-sm transition-colors"
              >
                ← Workflows
              </button>
              <span className="text-gray-700">|</span>
              <span className="font-mono font-semibold">{selected.name}</span>
              <span className="text-xs text-gray-500 font-mono">v{selected.version}</span>
            </div>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-4 py-1.5 bg-[#00D4AA] hover:bg-[#00D4AA]/90 disabled:opacity-50
                         text-black font-mono text-xs font-bold rounded-lg transition-colors"
            >
              {running ? "RUNNING..." : "▶ RUN"}
            </button>
          </div>

          <div className="flex gap-4">
            {/* Workflow diagram */}
            <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden"
                 style={{ height: 400 }}>
              <WorkflowDiagram workflow={selected} execution={execution} />
            </div>

            {/* Execution history */}
            <div className="w-64 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="text-xs text-gray-500 font-mono mb-3">EXECUTIONS</div>
              <ExecutionList
                workflowId={selected.id}
                selectedId={execution?.id}
                onSelect={handleSelectExecution}
              />
            </div>
          </div>

          {/* Step details */}
          {execution && execution.steps.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="text-xs text-gray-500 font-mono mb-3">STEP DETAILS — {execution.id.slice(0, 8)}...</div>
              <div className="space-y-2">
                {execution.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-4 text-xs font-mono">
                    <StepStatus status={step.status} />
                    <span className="text-gray-300 w-40 truncate">{step.step_name}</span>
                    <span className="text-gray-600">{step.duration_ms ? `${step.duration_ms}ms` : "—"}</span>
                    <span className="text-gray-600">{step.tokens_in + step.tokens_out} tokens</span>
                    <span className="text-gray-600">${step.cost.toFixed(4)}</span>
                    {step.error && <span className="text-red-400 truncate max-w-xs">{step.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepStatus({ status }: { status: string }) {
  const icons: Record<string, string> = {
    pending: "○",
    running: "◎",
    completed: "✓",
    failed: "✗",
    skipped: "—",
  };
  const colors: Record<string, string> = {
    pending: "text-gray-600",
    running: "text-blue-400",
    completed: "text-green-400",
    failed: "text-red-400",
    skipped: "text-yellow-400",
  };
  return (
    <span className={`w-4 text-center ${colors[status] || "text-gray-400"}`}>
      {icons[status] || "?"}
    </span>
  );
}
