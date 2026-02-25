-- ================================================================
-- LAI FACTORY — Tabela de builds + RLS + Realtime
-- Rodar no Supabase SQL Editor ou via migration
-- ================================================================

-- Tabela principal de builds
CREATE TABLE IF NOT EXISTS public.factory_builds (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id        TEXT NOT NULL UNIQUE,
  module          TEXT NOT NULL,
  engineer_state  TEXT DEFAULT 'NORMAL',
  auto_deploy     BOOLEAN DEFAULT true,
  deploy_target   TEXT DEFAULT 'supabase',
  status          TEXT DEFAULT 'triggered'
                  CHECK (status IN (
                    'triggered', 'running', 'pack0', 'codegen',
                    'testing', 'healing', 'gates', 'deploying',
                    'deployed', 'built', 'failed', 'cancelled'
                  )),
  message         TEXT,
  release_url     TEXT,
  api_url         TEXT,
  front_url       TEXT,
  github_run_id   TEXT,
  callback_url    TEXT,
  triggered_at    TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_builds_trace ON public.factory_builds(trace_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON public.factory_builds(status);
CREATE INDEX IF NOT EXISTS idx_builds_module ON public.factory_builds(module);
CREATE INDEX IF NOT EXISTS idx_builds_created ON public.factory_builds(created_at DESC);

-- Updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_builds_updated ON public.factory_builds;
CREATE TRIGGER trg_builds_updated
  BEFORE UPDATE ON public.factory_builds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.factory_builds ENABLE ROW LEVEL SECURITY;

-- Policy: qualquer autenticado pode ler
CREATE POLICY "Autenticados podem ler builds"
  ON public.factory_builds FOR SELECT
  TO authenticated
  USING (true);

-- Policy: service_role pode tudo (Edge Functions usam isso)
CREATE POLICY "Service role full access"
  ON public.factory_builds FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: anon pode ler por trace_id (para o front mostrar status)
CREATE POLICY "Anon pode ler por trace_id"
  ON public.factory_builds FOR SELECT
  TO anon
  USING (true);

-- Habilitar Realtime (front escuta mudanças de status)
ALTER PUBLICATION supabase_realtime ADD TABLE public.factory_builds;

-- ================================================================
-- View para dashboard
-- ================================================================
CREATE OR REPLACE VIEW public.v_factory_dashboard AS
SELECT
  module,
  COUNT(*) AS total_builds,
  COUNT(*) FILTER (WHERE status = 'deployed') AS deployed,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status IN ('triggered', 'running', 'codegen', 'testing', 'healing', 'gates', 'deploying')) AS in_progress,
  MAX(completed_at) AS last_completed,
  AVG(EXTRACT(EPOCH FROM (completed_at - triggered_at))) AS avg_duration_seconds
FROM public.factory_builds
GROUP BY module;
