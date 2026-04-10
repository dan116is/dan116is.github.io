import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { type Workflow, type ExecutionDetail } from "../../lib/api";

const STATUS_COLORS: Record<string, string> = {
  pending: "#374151",
  running: "#3B82F6",
  completed: "#10B981",
  failed: "#EF4444",
  skipped: "#F59E0B",
};

function AgentNode({ data }: { data: { label: string; status: string; duration?: number } }) {
  const color = STATUS_COLORS[data.status] || STATUS_COLORS.pending;
  const isRunning = data.status === "running";
  return (
    <div
      className="px-4 py-3 rounded-xl border text-white font-mono text-xs min-w-[120px]"
      style={{
        backgroundColor: color + "22",
        borderColor: color,
        boxShadow: isRunning ? `0 0 12px ${color}66` : "none",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`w-1.5 h-1.5 rounded-full`}
          style={{
            backgroundColor: color,
            animation: isRunning ? "pulse 1s infinite" : "none",
          }}
        />
        <span className="font-semibold">{data.label}</span>
      </div>
      {data.duration && (
        <div className="text-gray-500 text-[10px]">{data.duration}ms</div>
      )}
    </div>
  );
}

const nodeTypes = { agentNode: AgentNode };

interface Props {
  workflow: Workflow;
  execution: ExecutionDetail | null;
}

export default function WorkflowDiagram({ workflow, execution }: Props) {
  const { steps: defSteps, edges: defEdges } = workflow.definition;

  // Build a map of step status from execution
  const stepStatusMap: Record<string, { status: string; duration?: number }> = {};
  if (execution) {
    execution.steps.forEach((s) => {
      stepStatusMap[s.step_name] = { status: s.status, duration: s.duration_ms || undefined };
    });
  }

  // Layout steps in a horizontal row
  const nodes: Node[] = defSteps.map((step, i) => ({
    id: step.id,
    type: "agentNode",
    position: { x: i * 200, y: 100 },
    data: {
      label: step.name,
      status: stepStatusMap[step.name]?.status || "pending",
      duration: stepStatusMap[step.name]?.duration,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edges: Edge[] = defEdges.map((edge) => {
    const targetStatus = stepStatusMap[
      defSteps.find((s) => s.id === edge.target)?.name || ""
    ]?.status || "pending";
    const isActive = targetStatus === "running" || targetStatus === "completed";

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: isActive,
      style: { stroke: isActive ? "#00D4AA" : "#374151", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: isActive ? "#00D4AA" : "#374151" },
    };
  });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      style={{ background: "transparent" }}
    >
      <Background color="#1f2937" gap={20} size={1} />
      <Controls
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
        }}
      />
    </ReactFlow>
  );
}
