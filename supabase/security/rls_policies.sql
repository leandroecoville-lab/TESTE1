-- GATE: Row Level Security for CRM Contacts
-- Multi-tenant isolation + role-based access

-- Enable RLS on all tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- UTILS: Helper function to get tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$ LANGUAGE sql STABLE;

-- UTILS: Helper function to get user role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'visualizador'
  );
$$ LANGUAGE sql STABLE;

-- GATE: Contacts policies
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND created_by = auth.uid()
    AND auth.user_role() IN ('admin', 'vendedor')
  );

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    AND (auth.user_role() = 'admin' OR created_by = auth.uid())
  );

CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    AND auth.user_role() = 'admin'
  );

-- GATE: Deals policies (same pattern)
CREATE POLICY "deals_select" ON public.deals
  FOR SELECT TO authenticated
  USING (tenant_id = auth.tenant_id());

CREATE POLICY "deals_insert" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.tenant_id()
    AND created_by = auth.uid()
    AND auth.user_role() IN ('admin', 'vendedor')
  );

CREATE POLICY "deals_update" ON public.deals
  FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.tenant_id()
    AND (auth.user_role() = 'admin' OR created_by = auth.uid())
  );

CREATE POLICY "deals_delete" ON public.deals
  FOR DELETE TO authenticated
  USING (tenant_id = auth.tenant_id() AND auth.user_role() = 'admin');

-- GATE: Companies, Tasks, Notes, Tags — mesma lógica de tenant isolation
-- (aplicar pattern idêntico para cada tabela)
CREATE POLICY "companies_tenant" ON public.companies FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "tasks_tenant" ON public.tasks FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "notes_tenant" ON public.notes FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "tags_tenant" ON public.tags FOR ALL TO authenticated
  USING (tenant_id = auth.tenant_id()) WITH CHECK (tenant_id = auth.tenant_id());

CREATE POLICY "contact_tags_tenant" ON public.contact_tags FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_id AND tenant_id = auth.tenant_id())
  );

-- GATE: Service role (Edge Functions) tem acesso total
CREATE POLICY "service_role_all_contacts" ON public.contacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_companies" ON public.companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_deals" ON public.deals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tasks" ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_notes" ON public.notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tags" ON public.tags FOR ALL TO service_role USING (true) WITH CHECK (true);
