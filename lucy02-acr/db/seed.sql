-- Lucy02 ACR — Seed Data (3 sample clients)
-- Run AFTER migrations

-- ─── Tenants ────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name, slug, industry, brand_color, settings) VALUES
    ('11111111-0000-0000-0000-000000000001', 'RetailMax', 'retailmax', 'E-Commerce', '#FF6B35',
     '{"cost_budget_monthly": 500, "alert_email": "ops@retailmax.com", "retention_days": 30}'),
    ('22222222-0000-0000-0000-000000000002', 'LegalEdge', 'legaledge', 'Legal Tech', '#6C63FF',
     '{"cost_budget_monthly": 1200, "alert_email": "tech@legaledge.io", "retention_days": 90}'),
    ('33333333-0000-0000-0000-000000000003', 'HealthBridge', 'healthbridge', 'Healthcare', '#00C896',
     '{"cost_budget_monthly": 800, "alert_email": "ai@healthbridge.co", "retention_days": 90}');

-- ─── Users ──────────────────────────────────────────────────────────────────
-- password: "admin123" (bcrypt) — CHANGE IN PRODUCTION
INSERT INTO users (id, email, name, role, tenant_id, password_hash) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@lucy02.ai', 'Lucy02 Admin', 'super_admin', NULL,
     '$2b$12$LQv3c1yqBwEHYkj.PaL7J.k3fIbBnzW3YoJVD6P5kQZ.example'),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'ops@lucy02.ai', 'Lucy02 Operator', 'operator', NULL,
     '$2b$12$LQv3c1yqBwEHYkj.PaL7J.k3fIbBnzW3YoJVD6P5kQZ.example'),
    ('aaaaaaaa-0000-0000-0000-000000000003', 'admin@retailmax.com', 'RetailMax Admin', 'client_admin',
     '11111111-0000-0000-0000-000000000001', '$2b$12$LQv3c1yqBwEHYkj.PaL7J.k3fIbBnzW3YoJVD6P5kQZ.example'),
    ('aaaaaaaa-0000-0000-0000-000000000004', 'admin@legaledge.io', 'LegalEdge Admin', 'client_admin',
     '22222222-0000-0000-0000-000000000002', '$2b$12$LQv3c1yqBwEHYkj.PaL7J.k3fIbBnzW3YoJVD6P5kQZ.example'),
    ('aaaaaaaa-0000-0000-0000-000000000005', 'admin@healthbridge.co', 'HealthBridge Admin', 'client_admin',
     '33333333-0000-0000-0000-000000000003', '$2b$12$LQv3c1yqBwEHYkj.PaL7J.k3fIbBnzW3YoJVD6P5kQZ.example');

-- ─── Agents — RetailMax ──────────────────────────────────────────────────────
INSERT INTO agents (id, tenant_id, name, role, model_name, model_provider, status, config) VALUES
    ('bbbbbbbb-1111-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
     'Product Classifier', 'classifier', 'gpt-4o', 'openai', 'running',
     '{"temperature": 0.1, "max_tokens": 500, "system_prompt": "Classify products into categories"}'),
    ('bbbbbbbb-1111-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
     'Review Analyzer', 'analyzer', 'claude-sonnet-4-6', 'anthropic', 'running',
     '{"temperature": 0.3, "max_tokens": 1000}'),
    ('bbbbbbbb-1111-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
     'Pricing Optimizer', 'optimizer', 'gpt-4o', 'openai', 'idle',
     '{"temperature": 0.0, "max_tokens": 200}');

-- ─── Agents — LegalEdge ─────────────────────────────────────────────────────
INSERT INTO agents (id, tenant_id, name, role, model_name, model_provider, status, config) VALUES
    ('bbbbbbbb-2222-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
     'Document Parser', 'parser', 'claude-opus-4-6', 'anthropic', 'running',
     '{"temperature": 0.0, "max_tokens": 4000}'),
    ('bbbbbbbb-2222-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002',
     'Contract Reviewer', 'reviewer', 'claude-opus-4-6', 'anthropic', 'running',
     '{"temperature": 0.1, "max_tokens": 4000}'),
    ('bbbbbbbb-2222-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002',
     'Risk Assessor', 'assessor', 'gpt-4o', 'openai', 'idle',
     '{"temperature": 0.2, "max_tokens": 2000}'),
    ('bbbbbbbb-2222-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002',
     'Report Writer', 'writer', 'claude-sonnet-4-6', 'anthropic', 'running',
     '{"temperature": 0.7, "max_tokens": 3000}');

-- ─── Agents — HealthBridge ───────────────────────────────────────────────────
INSERT INTO agents (id, tenant_id, name, role, model_name, model_provider, status, config) VALUES
    ('bbbbbbbb-3333-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003',
     'Patient Intake', 'intake', 'gpt-4o', 'openai', 'running',
     '{"temperature": 0.2, "max_tokens": 1500}'),
    ('bbbbbbbb-3333-0000-0000-000000000002', '33333333-0000-0000-0000-000000000003',
     'Symptom Analyzer', 'analyzer', 'claude-opus-4-6', 'anthropic', 'running',
     '{"temperature": 0.1, "max_tokens": 2000}'),
    ('bbbbbbbb-3333-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003',
     'Report Generator', 'writer', 'claude-sonnet-4-6', 'anthropic', 'error',
     '{"temperature": 0.4, "max_tokens": 3000}');

-- ─── Workflows ──────────────────────────────────────────────────────────────
INSERT INTO workflows (id, tenant_id, name, description, definition) VALUES
    ('cccccccc-1111-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
     'Product Ingestion Pipeline', 'Classify and price new products automatically',
     '{
       "steps": [
         {"id": "s1", "name": "Classify Product", "agent_id": "bbbbbbbb-1111-0000-0000-000000000001", "type": "agent"},
         {"id": "s2", "name": "Analyze Reviews", "agent_id": "bbbbbbbb-1111-0000-0000-000000000002", "type": "agent"},
         {"id": "s3", "name": "Optimize Price", "agent_id": "bbbbbbbb-1111-0000-0000-000000000003", "type": "agent"}
       ],
       "edges": [
         {"id": "e1", "source": "s1", "target": "s2"},
         {"id": "e2", "source": "s2", "target": "s3"}
       ],
       "trigger": {"type": "webhook", "path": "/products/new"}
     }'),
    ('cccccccc-2222-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
     'Contract Review Pipeline', 'Full contract analysis and risk assessment',
     '{
       "steps": [
         {"id": "s1", "name": "Parse Document", "agent_id": "bbbbbbbb-2222-0000-0000-000000000001", "type": "agent"},
         {"id": "s2", "name": "Review Contract", "agent_id": "bbbbbbbb-2222-0000-0000-000000000002", "type": "agent"},
         {"id": "s3", "name": "Assess Risk", "agent_id": "bbbbbbbb-2222-0000-0000-000000000003", "type": "agent"},
         {"id": "s4", "name": "Write Report", "agent_id": "bbbbbbbb-2222-0000-0000-000000000004", "type": "agent"}
       ],
       "edges": [
         {"id": "e1", "source": "s1", "target": "s2"},
         {"id": "e2", "source": "s2", "target": "s3"},
         {"id": "e3", "source": "s3", "target": "s4"}
       ],
       "trigger": {"type": "api", "path": "/contracts/review"}
     }'),
    ('cccccccc-3333-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003',
     'Patient Assessment Flow', 'Intake, analyze, and report on patient symptoms',
     '{
       "steps": [
         {"id": "s1", "name": "Patient Intake", "agent_id": "bbbbbbbb-3333-0000-0000-000000000001", "type": "agent"},
         {"id": "s2", "name": "Analyze Symptoms", "agent_id": "bbbbbbbb-3333-0000-0000-000000000002", "type": "agent"},
         {"id": "s3", "name": "Generate Report", "agent_id": "bbbbbbbb-3333-0000-0000-000000000003", "type": "agent"}
       ],
       "edges": [
         {"id": "e1", "source": "s1", "target": "s2"},
         {"id": "e2", "source": "s2", "target": "s3"}
       ],
       "trigger": {"type": "manual"}
     }');

-- ─── Sample Alerts ───────────────────────────────────────────────────────────
INSERT INTO alert_rules (tenant_id, name, metric, operator, threshold, notification_channels) VALUES
    ('11111111-0000-0000-0000-000000000001', 'High Error Rate', 'error_rate', 'gt', 5.0,
     '[{"type": "slack", "webhook": "https://hooks.slack.com/example"}]'),
    ('22222222-0000-0000-0000-000000000002', 'High Latency', 'latency_p95', 'gt', 5000,
     '[{"type": "telegram", "chat_id": "-1001234567890"}]'),
    ('33333333-0000-0000-0000-000000000003', 'Agent Down', 'agent_down_minutes', 'gt', 5,
     '[{"type": "email", "to": "ai@healthbridge.co"}]');

INSERT INTO alerts (tenant_id, severity, message, status, affected_agent_id) VALUES
    ('33333333-0000-0000-0000-000000000003', 'critical',
     'Report Generator agent is in error state — last heartbeat 8 minutes ago',
     'active', 'bbbbbbbb-3333-0000-0000-000000000003'),
    ('11111111-0000-0000-0000-000000000001', 'warning',
     'Product Classifier token usage 82% of daily budget',
     'active', 'bbbbbbbb-1111-0000-0000-000000000001');
