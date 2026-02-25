-- ══════════════════════════════════════════════════════════════
-- LAI INTELLIGENCE LAYER — Migration Completa
-- Agentes Bisbilhoteiros + Trust Chain + Learning + Domain
-- © Leandro Castelo — Ecossistema LAI | 300 Franchising
-- ══════════════════════════════════════════════════════════════

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ══════════════════════════════════════════════════════════════
-- 1. BEHAVIOR TRACKER — Eventos de comportamento do usuário
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'click', 'input', 'navigate', 'scroll', 'copy', 'paste',
    'export', 'search', 'filter', 'error', 'rage_click',
    'dead_click', 'backtrack', 'idle', 'focus', 'blur'
  )),
  screen TEXT NOT NULL,
  element TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_tenant_ts ON public.user_behavior_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_user ON public.user_behavior_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_screen ON public.user_behavior_events(tenant_id, screen);
CREATE INDEX IF NOT EXISTS idx_behavior_type ON public.user_behavior_events(event_type);

-- ══════════════════════════════════════════════════════════════
-- 2. FRICTION DETECTOR — Eventos de fricção detectados
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.friction_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  friction_type TEXT NOT NULL CHECK (friction_type IN (
    'rage_click', 'dead_click', 'backtrack', 'slow_path',
    'error_loop', 'workaround', 'abandon', 'excessive_scroll'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  screen TEXT NOT NULL,
  element TEXT,
  count INTEGER DEFAULT 1,
  details JSONB DEFAULT '{}',
  suggested_fix TEXT,
  detected_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_friction_tenant ON public.friction_events(tenant_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_friction_severity ON public.friction_events(severity);

-- ══════════════════════════════════════════════════════════════
-- 3. PROCESS MINER — Traces de processos reais
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.process_traces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  process_name TEXT NOT NULL,
  variant TEXT NOT NULL,
  steps JSONB NOT NULL,
  step_count INTEGER NOT NULL,
  total_duration_ms INTEGER,
  bottleneck_step TEXT,
  bottleneck_duration_ms INTEGER,
  frequency INTEGER DEFAULT 1,
  user_count INTEGER DEFAULT 1,
  mermaid_diagram TEXT,
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_process_tenant ON public.process_traces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_process_name ON public.process_traces(process_name);

-- ══════════════════════════════════════════════════════════════
-- 4. AUTOMATION SCOUT — Propostas de automatização
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.automation_proposals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'repetitive_task', 'copy_paste', 'predictable_decision',
    'manual_notification', 'manual_report', 'data_entry',
    'approval_flow', 'scheduled_task', 'integration'
  )),
  current_time_minutes NUMERIC(8,1) NOT NULL,
  frequency_per_week NUMERIC(6,1) NOT NULL,
  estimated_dev_hours NUMERIC(6,1) NOT NULL,
  roi_hours_per_month NUMERIC(8,1) GENERATED ALWAYS AS (
    (current_time_minutes * frequency_per_week * 4.33 / 60) - (estimated_dev_hours / 12)
  ) STORED,
  priority TEXT GENERATED ALWAYS AS (
    CASE
      WHEN (current_time_minutes * frequency_per_week * 4.33 / 60) > 20 THEN 'critical'
      WHEN (current_time_minutes * frequency_per_week * 4.33 / 60) > 8 THEN 'high'
      WHEN (current_time_minutes * frequency_per_week * 4.33 / 60) > 3 THEN 'medium'
      ELSE 'low'
    END
  ) STORED,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'building', 'deployed', 'rejected')),
  source_agent TEXT DEFAULT 'automation-scout',
  evidence JSONB DEFAULT '{}',
  proposed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON public.automation_proposals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_priority ON public.automation_proposals(priority);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.automation_proposals(status);

-- ══════════════════════════════════════════════════════════════
-- 5. SYSTEM HEALTH — Checks de saúde do sistema
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID,
  component TEXT NOT NULL CHECK (component IN (
    'database', 'edge_functions', 'auth', 'storage',
    'frontend', 'github_actions', 'api', 'realtime'
  )),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down', 'warning')),
  metrics JSONB NOT NULL DEFAULT '{}',
  anomalies JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  checked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_component ON public.system_health_checks(component, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_status ON public.system_health_checks(status);

-- ══════════════════════════════════════════════════════════════
-- 6. COST TRACKING — Monitoramento de custos
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cost_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID,
  service TEXT NOT NULL CHECK (service IN (
    'supabase', 'vercel', 'anthropic', 'github_actions',
    'local_ai', 'storage', 'egress', 'compute'
  )),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_cost NUMERIC(10,2) DEFAULT 0,
  projected_cost NUMERIC(10,2) DEFAULT 0,
  budget NUMERIC(10,2),
  usage_metrics JSONB DEFAULT '{}',
  alerts JSONB DEFAULT '[]',
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cost_service ON public.cost_tracking(service, period_start DESC);

-- ══════════════════════════════════════════════════════════════
-- 7. KNOWLEDGE BASE — Conhecimento indexado com embeddings
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID,
  category TEXT NOT NULL CHECK (category IN (
    'decision', 'error_correction', 'business_rule', 'faq',
    'architecture', 'domain_term', 'process', 'regulation',
    'template', 'learning', 'user_feedback'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  source_id TEXT,
  tags TEXT[] DEFAULT '{}',
  confidence NUMERIC(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON public.knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON public.knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- ══════════════════════════════════════════════════════════════
-- 8. BUILD LEARNINGS — Memória cumulativa composta (Barreira 1)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.build_learnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  build_id TEXT NOT NULL,
  module_type TEXT NOT NULL,
  learning_type TEXT NOT NULL CHECK (learning_type IN (
    'pattern_success', 'pattern_failure', 'error_fix',
    'performance_insight', 'security_fix', 'ux_improvement',
    'code_style', 'test_strategy', 'architecture_choice'
  )),
  description TEXT NOT NULL,
  code_before TEXT,
  code_after TEXT,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  applied_count INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0,
  embedding vector(1536),
  learned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learnings_module ON public.build_learnings(module_type);
CREATE INDEX IF NOT EXISTS idx_learnings_type ON public.build_learnings(learning_type);
CREATE INDEX IF NOT EXISTS idx_learnings_confidence ON public.build_learnings(confidence DESC);

-- ══════════════════════════════════════════════════════════════
-- 9. DOMAIN RULES — DNA de domínio vertical (Barreira 2)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.domain_entities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '[]',
  relationships JSONB DEFAULT '[]',
  business_rules JSONB DEFAULT '[]',
  vertical TEXT DEFAULT 'franchising',
  source TEXT,
  validated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.domain_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rule TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'legal', 'financial', 'operational', 'contractual',
    'compliance', 'metric', 'flow', 'permission'
  )),
  regulation_ref TEXT,
  mandatory BOOLEAN DEFAULT false,
  vertical TEXT DEFAULT 'franchising',
  applies_to TEXT[],
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.domain_vocabulary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  synonyms TEXT[] DEFAULT '{}',
  context TEXT,
  vertical TEXT DEFAULT 'franchising',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- 10. TRUST CERTIFICATES — Cadeia de confiança (Barreira 3)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.trust_certificates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  build_id TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  version TEXT NOT NULL,
  trust_score NUMERIC(4,1) NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  classification TEXT GENERATED ALWAYS AS (
    CASE
      WHEN trust_score >= 90 THEN 'production'
      WHEN trust_score >= 70 THEN 'staging'
      WHEN trust_score >= 50 THEN 'beta'
      ELSE 'prototype'
    END
  ) STORED,
  evidence JSONB NOT NULL,
  gates_passed INTEGER NOT NULL DEFAULT 0,
  gates_total INTEGER NOT NULL DEFAULT 0,
  tests_passed INTEGER NOT NULL DEFAULT 0,
  tests_total INTEGER NOT NULL DEFAULT 0,
  security_score NUMERIC(4,1) DEFAULT 0,
  performance_score NUMERIC(4,1) DEFAULT 0,
  signed_by TEXT DEFAULT 'LAI Factory V014',
  certified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_module ON public.trust_certificates(module);
CREATE INDEX IF NOT EXISTS idx_trust_score ON public.trust_certificates(trust_score DESC);

-- ══════════════════════════════════════════════════════════════
-- 11. SPY AGENTS — Log dos agentes espiões
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.spy_agent_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('spy-alpha', 'spy-omega')),
  scan_type TEXT NOT NULL CHECK (scan_type IN (
    'full_system', 'user_patterns', 'data_flow', 'security_audit',
    'performance_sweep', 'cost_analysis', 'integration_check',
    'manual_process_hunt', 'bottleneck_search', 'anomaly_detection'
  )),
  findings JSONB NOT NULL DEFAULT '[]',
  suggestions JSONB NOT NULL DEFAULT '[]',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  auto_fixable BOOLEAN DEFAULT false,
  fix_proposal JSONB,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spy_agent ON public.spy_agent_reports(agent_name, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_spy_severity ON public.spy_agent_reports(severity);

-- ══════════════════════════════════════════════════════════════
-- 12. AGENT EXECUTIONS — Tracking de execução dos agents
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  input_summary TEXT,
  output_summary TEXT,
  items_processed INTEGER DEFAULT 0,
  items_generated INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error TEXT,
  ai_tokens_used INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_exec_name ON public.agent_executions(agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_exec_status ON public.agent_executions(status);

-- ══════════════════════════════════════════════════════════════
-- 13. API LOGS — Structured logging para observabilidade
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_id TEXT NOT NULL,
  tenant_id UUID,
  user_id UUID,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_ts ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_path ON public.api_logs(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON public.api_logs(status_code);

-- ══════════════════════════════════════════════════════════════
-- RLS — Segurança em todas as tabelas
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'user_behavior_events', 'friction_events', 'process_traces',
      'automation_proposals', 'system_health_checks', 'cost_tracking',
      'knowledge_base', 'build_learnings', 'domain_entities',
      'domain_rules', 'domain_vocabulary', 'trust_certificates',
      'spy_agent_reports', 'agent_executions', 'api_logs'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('CREATE POLICY "service_role_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "authenticated_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;

-- Tenant isolation para tabelas com tenant_id
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'user_behavior_events', 'friction_events', 'process_traces',
      'automation_proposals'
    ])
  LOOP
    EXECUTE format('CREATE POLICY "tenant_write_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = (current_setting(''request.jwt.claims'', true)::json->>''tenant_id'')::uuid)', tbl, tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════
-- REALTIME — Habilitar para front receber updates
-- ══════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.friction_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spy_agent_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trust_certificates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_health_checks;

-- ══════════════════════════════════════════════════════════════
-- CRON JOBS — Schedules dos agents
-- ══════════════════════════════════════════════════════════════
-- SETUP OBRIGATÓRIO: Antes de ativar os cron jobs, execute no SQL Editor:
--
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://SEU_PROJETO.supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key = 'SUA_SERVICE_ROLE_KEY';
--
-- Sem isso, os cron jobs NÃO conseguem chamar as Edge Functions.
-- Após configurar, execute o bloco abaixo para ativar os cron jobs.
-- ══════════════════════════════════════════════════════════════

-- Verificar se as settings existem antes de criar os jobs
DO $$
DECLARE
  _url TEXT;
  _key TEXT;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url');
    _key := current_setting('app.settings.service_role_key');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'app.settings não configurado. Cron jobs NÃO serão criados.';
    RAISE NOTICE 'Execute: ALTER DATABASE postgres SET app.settings.supabase_url = ...';
    RAISE NOTICE 'Execute: ALTER DATABASE postgres SET app.settings.service_role_key = ...';
    RETURN;
  END;

  IF _url IS NULL OR _url = '' OR _key IS NULL OR _key = '' THEN
    RAISE NOTICE 'app.settings vazios. Configure antes de ativar cron.';
    RETURN;
  END IF;

  -- Friction Detector: a cada 15 minutos
  PERFORM cron.schedule('friction-detector', '*/15 * * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/intelligence-api',
      '{"action":"run_friction_detector"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  -- Process Miner: a cada hora
  PERFORM cron.schedule('process-miner', '0 * * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/intelligence-api',
      '{"action":"run_process_miner"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  -- Automation Scout: a cada 6 horas
  PERFORM cron.schedule('automation-scout', '0 */6 * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/intelligence-api',
      '{"action":"run_automation_scout"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  -- System Health Rover: a cada hora
  PERFORM cron.schedule('health-rover', '30 * * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/intelligence-api',
      '{"action":"run_health_rover"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  -- Cost Watcher: a cada 12 horas
  PERFORM cron.schedule('cost-watcher', '0 */12 * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/intelligence-api',
      '{"action":"run_cost_watcher"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  -- Spy Alpha: a cada 2 horas
  PERFORM cron.schedule('spy-alpha', '15 */2 * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/spy-agents',
      '{"agent":"spy-alpha","scan":"full_system"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  -- Spy Omega: a cada 3 horas
  PERFORM cron.schedule('spy-omega', '45 */3 * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/spy-agents',
      '{"agent":"spy-omega","scan":"manual_process_hunt"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  -- Knowledge Harvester: a cada 4 horas
  PERFORM cron.schedule('knowledge-harvester', '0 */4 * * *',
    format('SELECT net.http_post(%L, %L::jsonb, %L::jsonb)',
      _url || '/functions/v1/intelligence-api',
      '{"action":"run_knowledge_harvester"}',
      format('{"Content-Type":"application/json","Authorization":"Bearer %s"}', _key)
    )
  );

  RAISE NOTICE 'Todos os 8 cron jobs criados com sucesso.';
END $$;
