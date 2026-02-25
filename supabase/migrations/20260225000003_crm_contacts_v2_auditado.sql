-- Migration: CRM Contacts Module V2 (CORRIGIDO)
-- LAI Factory Clone Engenheiro VS5
-- FIXES: Ordem tabelas, functions em public, dashboard RPC, partial indexes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper Functions (public, NÃO auth) ─────────────────
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id'),
    ''
  )::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'visualizador'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════
-- TABELAS — ordem de dependência correta
-- ══════════════════════════════════════════════════════════

-- 1. Companies (sem deps)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  domain TEXT,
  industry TEXT,
  size TEXT CHECK (size IS NULL OR size IN ('1-10','11-50','51-200','201-1000','1000+')),
  logo_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Contacts (depende de companies)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email TEXT CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active','inactive','archived')),
  source TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Deals (depende de contacts + companies)
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  value NUMERIC(15,2) DEFAULT 0 NOT NULL CHECK (value >= 0),
  stage TEXT DEFAULT 'new' NOT NULL CHECK (stage IN ('new','qualified','proposal','negotiation','closed_won','closed_lost')),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  expected_close DATE,
  created_by UUID NOT NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending','in_progress','done','cancelled')),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Notes (sem updated_at — imutável)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) >= 1),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  color TEXT DEFAULT '#3b82f6' CHECK (color ~* '^#[0-9a-f]{6}$'),
  UNIQUE(tenant_id, name)
);

-- 7. Junction
CREATE TABLE IF NOT EXISTS public.contact_tags (
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (contact_id, tag_id)
);

-- ── Indexes (com partial indexes para performance) ──────
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON public.companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.contacts(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_tenant ON public.deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_deals_open ON public.deals(tenant_id, value DESC) WHERE stage NOT IN ('closed_won','closed_lost');
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON public.tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_pending ON public.tasks(tenant_id, due_date) WHERE status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS idx_notes_contact ON public.notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag_id);

-- ── Triggers ────────────────────────────────────────────
CREATE TRIGGER trg_companies_upd BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_contacts_upd BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_deals_upd BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_tasks_upd BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── Dashboard RPC (substitui SELECT * no Edge Function) ─
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
  tid UUID := public.get_tenant_id();
  result JSON;
BEGIN
  IF tid IS NULL THEN
    RETURN '{"error":"no_tenant"}'::json;
  END IF;
  SELECT json_build_object(
    'total_contacts', (SELECT COUNT(*) FROM contacts WHERE tenant_id = tid),
    'total_companies', (SELECT COUNT(*) FROM companies WHERE tenant_id = tid),
    'open_deals', (SELECT COUNT(*) FROM deals WHERE tenant_id = tid AND stage NOT IN ('closed_won','closed_lost')),
    'pipeline_value', COALESCE((SELECT SUM(value) FROM deals WHERE tenant_id = tid AND stage NOT IN ('closed_won','closed_lost')), 0),
    'won_value', COALESCE((SELECT SUM(value) FROM deals WHERE tenant_id = tid AND stage = 'closed_won'), 0),
    'total_deals', (SELECT COUNT(*) FROM deals WHERE tenant_id = tid),
    'won_deals', (SELECT COUNT(*) FROM deals WHERE tenant_id = tid AND stage = 'closed_won'),
    'deals_by_stage', COALESCE((
      SELECT json_object_agg(stage, cnt) FROM (
        SELECT stage, COUNT(*) as cnt FROM deals WHERE tenant_id = tid GROUP BY stage
      ) s
    ), '{}'::json),
    'pending_tasks', (SELECT COUNT(*) FROM tasks WHERE tenant_id = tid AND status = 'pending')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── Realtime ────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
