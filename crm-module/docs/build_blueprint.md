# Blueprint Técnico — crm-contacts

## Arquitetura
- Frontend: React + TypeScript + Tailwind + shadcn/ui
- Backend: Supabase (Postgres + RLS + Auth + Edge Functions)
- Deploy: Vercel + Supabase

## Entidades
| Entidade | Campos principais |
|---|---|
| contacts | id, tenant_id, name, email, phone, company_id, avatar_url, tags, status, created_by |
| companies | id, tenant_id, name, domain, industry, size, logo_url |
| deals | id, tenant_id, title, value, stage, contact_id, company_id, expected_close, created_by |
| tasks | id, tenant_id, title, description, due_date, status, contact_id, deal_id, assigned_to |
| notes | id, tenant_id, body, contact_id, deal_id, created_by |
| tags | id, tenant_id, name, color |
| contact_tags | contact_id, tag_id |

## RLS (Row Level Security)
- Todas as tabelas filtram por tenant_id
- Vendedor vê apenas registros onde created_by = auth.uid() OU role = 'admin'
- Visualizador: SELECT only

## Stages do Pipeline
1. new (Novo)
2. qualified (Qualificado)  
3. proposal (Proposta)
4. negotiation (Negociação)
5. closed_won (Fechado/Ganho)
6. closed_lost (Fechado/Perdido)

## Edge Functions
- /contacts — CRUD com paginação, busca, filtros
- /deals — CRUD + move stage + métricas
- /dashboard — Agregações: total contatos, deals por stage, valor pipeline

## Contratos de Evento (CloudEvents)
- crm.contact.created
- crm.contact.updated
- crm.deal.stage_changed
- crm.deal.closed

## Segurança
- Auth via Supabase (email + OAuth)
- RLS em todas as tabelas
- Rate limiting nas Edge Functions
- Validação de input (zod)
- Sanitização de output
