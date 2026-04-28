-- Lucy02 ACR — Initial Schema
-- PostgreSQL 15+ with TimescaleDB extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tenants ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    industry VARCHAR(100),
    logo_url TEXT,
    brand_color VARCHAR(7) DEFAULT '#00D4AA',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    -- roles: super_admin, operator, client_admin, client_viewer
    role VARCHAR(20) NOT NULL DEFAULT 'client_viewer',
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ
);

-- ─── Agents ─────────────────────────────────────────────────────────────────
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- e.g. orchestrator, researcher, writer
    model_name VARCHAR(100),
    model_provider VARCHAR(50),  -- openai, anthropic, google, etc.
    -- status: running, idle, error, stopped
    status VARCHAR(20) DEFAULT 'stopped',
    last_heartbeat TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Workflows ──────────────────────────────────────────────────────────────
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    -- definition: {steps: [...], edges: [...], trigger: {...}}
    definition JSONB NOT NULL DEFAULT '{"steps":[],"edges":[],"trigger":{}}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Workflow Executions ─────────────────────────────────────────────────────
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- status: pending, running, completed, failed, cancelled
    status VARCHAR(20) DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error TEXT,
    -- trigger_type: manual, schedule, webhook, api
    trigger_type VARCHAR(50) DEFAULT 'manual',
    trigger_payload JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- ─── Workflow Steps ──────────────────────────────────────────────────────────
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL DEFAULT 0,
    agent_id UUID REFERENCES agents(id),
    -- status: pending, running, completed, failed, skipped
    status VARCHAR(20) DEFAULT 'pending',
    input_payload JSONB,
    output_payload JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0
);

-- ─── Traces ─────────────────────────────────────────────────────────────────
CREATE TABLE traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    parent_trace_id UUID REFERENCES traces(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    -- status: ok, error, warning
    status VARCHAR(20) DEFAULT 'ok',
    input JSONB,
    output JSONB,
    started_at TIMESTAMPTZ DEFAULT now(),
    duration_ms INTEGER,
    model VARCHAR(100),
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cached_tokens INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- ─── Alert Rules ────────────────────────────────────────────────────────────
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    -- metric: error_rate, latency_p95, agent_down, cost_daily, token_rate
    metric VARCHAR(100) NOT NULL,
    -- operator: gt, lt, gte, lte, eq
    operator VARCHAR(10) NOT NULL,
    threshold DECIMAL(10,2) NOT NULL,
    -- notification_channels: [{type: "slack", url: "..."}, {type: "telegram", chat_id: "..."}]
    notification_channels JSONB DEFAULT '[]',
    cooldown_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Alerts ─────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    -- severity: critical, warning, info
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    -- status: active, acknowledged, resolved
    status VARCHAR(20) DEFAULT 'active',
    affected_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    affected_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ
);

-- ─── Audit Log ──────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Metrics (TimescaleDB hypertable) ────────────────────────────────────────
CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    tenant_id UUID NOT NULL,
    agent_id UUID,
    metric_name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    tags JSONB DEFAULT '{}'
);

SELECT create_hypertable('metrics', 'time', if_not_exists => true);

CREATE INDEX idx_metrics_tenant ON metrics (tenant_id, time DESC);
CREATE INDEX idx_metrics_agent ON metrics (agent_id, metric_name, time DESC);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_agents_tenant ON agents (tenant_id, status);
CREATE INDEX idx_agents_heartbeat ON agents (last_heartbeat) WHERE status != 'stopped';
CREATE INDEX idx_workflow_executions_tenant ON workflow_executions (tenant_id, status, started_at DESC);
CREATE INDEX idx_workflow_steps_execution ON workflow_steps (execution_id, step_order);
CREATE INDEX idx_traces_tenant ON traces (tenant_id, started_at DESC);
CREATE INDEX idx_traces_agent ON traces (agent_id, started_at DESC);
CREATE INDEX idx_alerts_tenant_status ON alerts (tenant_id, status, created_at DESC);
CREATE INDEX idx_audit_log_tenant ON audit_log (tenant_id, created_at DESC);

-- ─── Row-Level Security ──────────────────────────────────────────────────────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins bypass RLS (set in middleware for Lucy02 operators)
CREATE POLICY tenant_isolation ON agents
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON workflows
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON workflow_executions
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON workflow_steps
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON traces
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON alerts
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON alert_rules
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON metrics
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY tenant_isolation ON audit_log
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID
           OR current_setting('app.is_super_admin', true) = 'true');

-- ─── Updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
