const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

let accessToken: string | null = localStorage.getItem("access_token");

export function setToken(token: string) {
  accessToken = token;
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  accessToken = null;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; refresh_token: string; user: User }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }) }
      ),
  },

  // ─── Tenants ──────────────────────────────────────────────────────────────
  tenants: {
    list: () => request<Tenant[]>("/api/tenants"),
    get: (id: string) => request<Tenant>(`/api/tenants/${id}`),
    dashboard: (id: string) => request<TenantDashboard>(`/api/tenants/${id}/dashboard`),
    create: (data: Partial<Tenant>) =>
      request<Tenant>("/api/tenants", { method: "POST", body: JSON.stringify(data) }),
  },

  // ─── Agents ───────────────────────────────────────────────────────────────
  agents: {
    list: (tenantId: string) => request<Agent[]>(`/api/tenants/${tenantId}/agents`),
    get: (agentId: string) => request<AgentDetail>(`/api/agents/${agentId}`),
    metrics: (agentId: string, range: "1h" | "24h" | "7d" = "24h") =>
      request<AgentMetrics>(`/api/agents/${agentId}/metrics?range=${range}`),
  },

  // ─── Workflows ────────────────────────────────────────────────────────────
  workflows: {
    list: (tenantId: string) => request<Workflow[]>(`/api/tenants/${tenantId}/workflows`),
    get: (id: string) => request<Workflow>(`/api/workflows/${id}`),
    executions: (id: string) => request<WorkflowExecution[]>(`/api/workflows/${id}/executions`),
    execute: (id: string, payload?: Record<string, unknown>) =>
      request<WorkflowExecution>(`/api/workflows/${id}/execute`, {
        method: "POST",
        body: JSON.stringify({ trigger_payload: payload || {} }),
      }),
    getExecution: (id: string) => request<ExecutionDetail>(`/api/executions/${id}`),
  },

  // ─── Alerts ───────────────────────────────────────────────────────────────
  alerts: {
    list: (tenantId: string, status?: string) =>
      request<Alert[]>(`/api/tenants/${tenantId}/alerts${status ? `?status=${status}` : ""}`),
    acknowledge: (id: string) =>
      request<Alert>(`/api/alerts/${id}/acknowledge`, { method: "PATCH" }),
    resolve: (id: string) =>
      request<Alert>(`/api/alerts/${id}/resolve`, { method: "PATCH" }),
  },

  // ─── Costs ────────────────────────────────────────────────────────────────
  costs: {
    summary: (tenantId: string, period: "day" | "week" | "month" = "month") =>
      request<CostSummary>(`/api/tenants/${tenantId}/costs?period=${period}`),
    byAgent: (tenantId: string) =>
      request<AgentCost[]>(`/api/tenants/${tenantId}/costs/agents`),
    forecast: (tenantId: string) =>
      request<CostForecast>(`/api/tenants/${tenantId}/costs/forecast`),
  },
};

// ─── WebSocket ──────────────────────────────────────────────────────────────
export function createTenantSocket(tenantId: string, onMessage: (data: unknown) => void) {
  const wsBase = BASE.replace("http", "ws");
  const ws = new WebSocket(`${wsBase}/api/ws/tenants/${tenantId}/live`);

  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      // ignore non-JSON
    }
  };

  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send("ping");
  }, 30_000);

  ws.onclose = () => clearInterval(interval);
  return ws;
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  logo_url: string | null;
  brand_color: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface TenantDashboard {
  tenant: Tenant;
  agents: { total: number; by_status: Record<string, number> };
  workflows: { active_executions: number };
  alerts: { active: number };
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  role: string;
  model_name: string | null;
  model_provider: string | null;
  status: "running" | "idle" | "error" | "stopped";
  last_heartbeat: string | null;
  config: Record<string, unknown>;
  version: string | null;
  created_at: string;
}

export interface AgentDetail extends Agent {
  recent_traces: Trace[];
}

export interface Trace {
  id: string;
  name: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  cost: number;
}

export interface AgentMetrics {
  agent_id: string;
  range: string;
  metrics: Record<string, { time: string; avg: number; max: number }[]>;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  version: number;
  definition: {
    steps: WorkflowStep[];
    edges: WorkflowEdge[];
    trigger: Record<string, unknown>;
  };
  is_active: boolean;
  created_at: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agent_id: string | null;
  type: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  trigger_type: string;
  error: string | null;
}

export interface ExecutionDetail extends WorkflowExecution {
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  step_name: string;
  step_order: number;
  agent_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  tokens_in: number;
  tokens_out: number;
  cost: number;
  error: string | null;
  output_payload: Record<string, unknown> | null;
}

export interface Alert {
  id: string;
  tenant_id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  status: "active" | "acknowledged" | "resolved";
  affected_agent_id: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface CostSummary {
  period: string;
  total_cost: number;
  daily: { date: string; cost: number; tokens_in: number; tokens_out: number; traces: number }[];
}

export interface AgentCost {
  agent_id: string;
  agent_name: string;
  cost: number;
  tokens_in: number;
  tokens_out: number;
  traces: number;
}

export interface CostForecast {
  avg_daily_cost: number;
  forecast_30d: number;
  forecast_90d: number;
}
