-- SEED: Dados de demonstração
-- Tenant de exemplo
DO $$
DECLARE
  t_id UUID := '11111111-1111-1111-1111-111111111111';
  u_id UUID := '22222222-2222-2222-2222-222222222222';
  c1 UUID; c2 UUID; c3 UUID;
  comp1 UUID; comp2 UUID;
BEGIN
  -- Companies
  INSERT INTO public.companies (id, tenant_id, name, domain, industry, size, created_by)
  VALUES
    (gen_random_uuid(), t_id, 'Acme Corp', 'acme.com', 'Tecnologia', '51-200', u_id)
  RETURNING id INTO comp1;

  INSERT INTO public.companies (id, tenant_id, name, domain, industry, size, created_by)
  VALUES
    (gen_random_uuid(), t_id, 'Beta Labs', 'betalabs.io', 'SaaS', '11-50', u_id)
  RETURNING id INTO comp2;

  -- Contacts
  INSERT INTO public.contacts (id, tenant_id, name, email, phone, company_id, status, created_by)
  VALUES
    (gen_random_uuid(), t_id, 'Maria Silva', 'maria@acme.com', '(11) 99999-0001', comp1, 'active', u_id)
  RETURNING id INTO c1;

  INSERT INTO public.contacts (id, tenant_id, name, email, phone, company_id, status, created_by)
  VALUES
    (gen_random_uuid(), t_id, 'João Santos', 'joao@betalabs.io', '(11) 99999-0002', comp2, 'active', u_id)
  RETURNING id INTO c2;

  INSERT INTO public.contacts (id, tenant_id, name, email, phone, status, created_by)
  VALUES
    (gen_random_uuid(), t_id, 'Ana Oliveira', 'ana@email.com', '(11) 99999-0003', 'active', u_id)
  RETURNING id INTO c3;

  -- Deals
  INSERT INTO public.deals (tenant_id, title, value, stage, contact_id, company_id, expected_close, created_by)
  VALUES
    (t_id, 'Licença Enterprise Acme', 45000.00, 'proposal', c1, comp1, '2026-04-15', u_id),
    (t_id, 'Projeto Beta Labs', 12000.00, 'qualified', c2, comp2, '2026-05-01', u_id),
    (t_id, 'Consultoria Ana', 8500.00, 'new', c3, NULL, '2026-06-01', u_id),
    (t_id, 'Upsell Acme', 22000.00, 'negotiation', c1, comp1, '2026-03-30', u_id),
    (t_id, 'Renovação Beta', 15000.00, 'closed_won', c2, comp2, '2026-02-01', u_id);

  -- Tasks
  INSERT INTO public.tasks (tenant_id, title, due_date, status, contact_id, assigned_to, created_by)
  VALUES
    (t_id, 'Ligar para Maria sobre proposta', now() + interval '1 day', 'pending', c1, u_id, u_id),
    (t_id, 'Enviar contrato Beta Labs', now() + interval '3 days', 'pending', c2, u_id, u_id),
    (t_id, 'Follow-up Ana Oliveira', now() + interval '7 days', 'pending', c3, u_id, u_id);

  -- Notes
  INSERT INTO public.notes (tenant_id, body, contact_id, created_by)
  VALUES
    (t_id, 'Maria interessada no plano enterprise. Agenda reunião para próxima semana.', c1, u_id),
    (t_id, 'João pediu proposta formal com desconto para 2 anos.', c2, u_id);

  -- Tags
  INSERT INTO public.tags (tenant_id, name, color) VALUES
    (t_id, 'VIP', '#ef4444'),
    (t_id, 'Lead Quente', '#f97316'),
    (t_id, 'Parceiro', '#22c55e'),
    (t_id, 'Inbound', '#3b82f6');
END $$;
