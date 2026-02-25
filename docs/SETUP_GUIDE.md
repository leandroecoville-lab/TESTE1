# GUIA DE IMPLEMENTAÇÃO REAL — LAI Factory V014

© Leandro Castelo — Ecossistema LAI | 300 Franchising

---

## PRÉ-REQUISITOS

| Serviço | Plano | Custo |
|---|---|---|
| GitHub | Free (repos privados) | $0 |
| Supabase | Pro | $25/mês |
| Vercel | Hobby (ou Pro) | $0-20/mês |
| Anthropic (Claude API) | Pay-as-you-go | ~$30-60/mês |
| Lovable | Pro (opcional) | $20/mês |

**Total estimado: R$ 145-600/mês**

---

## PASSO 1: CRIAR REPOSITÓRIO GITHUB

```bash
# Criar repo
gh repo create lai-software-factory --private

# Clonar
git clone git@github.com:SEU_USER/lai-software-factory.git
cd lai-software-factory

# Copiar TODOS os arquivos do ZIP para dentro do repo
unzip LAI_FACTORY_V014_IMPLEMENTACAO.zip -d .
```

---

## PASSO 2: CONFIGURAR SUPABASE

### 2.1 Criar projeto
1. Acesse https://supabase.com/dashboard
2. New Project → Nome: `lai-factory` → Região: `South America (São Paulo)`
3. Anote: Project ID, URL, anon key, service_role key

### 2.2 Rodar migrations
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_ID

# Rodar migration da factory (tracking de builds)
supabase db push --db-url postgresql://postgres:SENHA@db.SEU_PROJECT.supabase.co:5432/postgres

# Ou via SQL Editor no dashboard:
# Cole o conteúdo de supabase/migrations/20260225000001_factory_builds.sql
# Cole o conteúdo de supabase/migrations/20260225000002_crm_contacts.sql
# Cole o conteúdo de supabase/security/rls_policies.sql
```

### 2.3 Deploy Edge Functions
```bash
# Deploy trigger-factory
supabase functions deploy trigger-factory --project-ref SEU_PROJECT_ID

# Deploy factory-callback
supabase functions deploy factory-callback --project-ref SEU_PROJECT_ID

# Deploy CRM API
supabase functions deploy api --project-ref SEU_PROJECT_ID

# Configurar secrets das Edge Functions
supabase secrets set GITHUB_PAT=ghp_SEU_TOKEN
supabase secrets set GITHUB_OWNER=SEU_USER
supabase secrets set GITHUB_REPO=lai-software-factory
supabase secrets set CALLBACK_SECRET=SEU_SECRET_FORTE
```

### 2.4 Rodar seed (dados de demo)
```sql
-- Cole o conteúdo de crm-module/db/seed.sql no SQL Editor do Supabase
```

---

## PASSO 3: CONFIGURAR GITHUB SECRETS

Vá em: Repository → Settings → Secrets and variables → Actions

| Secret | Onde encontrar |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → API Keys |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Settings → Access tokens |
| `SUPABASE_PROJECT_ID` | Supabase Dashboard → Settings → General |
| `SUPABASE_DB_URL` | Supabase → Settings → Database → Connection string (URI) |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VERCEL_TOKEN` | https://vercel.com → Settings → Tokens |
| `CALLBACK_SECRET` | Gere: `openssl rand -hex 32` |
| `GITHUB_PAT` | GitHub → Settings → Developer → Personal access tokens |

---

## PASSO 4: DEPLOY DO FRONTEND

### Opção A: Lovable (recomendado para não-técnicos)
1. Acesse https://lovable.dev
2. Crie novo projeto
3. Cole o conteúdo de `frontend/src/App.jsx` como componente principal
4. Configure Supabase integration:
   - Project URL: sua URL do Supabase
   - Anon Key: sua anon key
5. Deploy automático pelo Lovable

### Opção B: Vercel (recomendado para devs)
```bash
cd frontend

# Criar .env.production
echo "VITE_SUPABASE_URL=https://SEU_PROJECT.supabase.co" > .env.production
echo "VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY" >> .env.production

# Deploy
npx vercel --prod
```

---

## PASSO 5: TESTAR O PIPELINE COMPLETO

### 5.1 Teste manual (via GitHub Actions)
1. Vá em: Repository → Actions → Factory Build Pipeline
2. Clique "Run workflow"
3. Preencha:
   - Module: `crm-contacts`
   - State: `NORMAL`
   - Max heal: `5`
   - Auto deploy: `true`
4. Acompanhe a execução

### 5.2 Teste via Edge Function (como o front faria)
```bash
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/trigger-factory \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "crm-contacts",
    "engineer_state": "NORMAL",
    "auto_deploy": true,
    "deploy_target": "supabase+vercel"
  }'
```

### 5.3 Verificar status
```bash
# Via Supabase (Realtime ou query)
curl https://SEU_PROJECT.supabase.co/rest/v1/factory_builds?order=triggered_at.desc&limit=1 \
  -H "apikey: SEU_ANON_KEY" \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

---

## PASSO 6: VERIFICAR CRM FUNCIONANDO

1. Acesse o front (URL do Lovable ou Vercel)
2. Login com qualquer email + senha (min 4 chars)
3. Verifique:
   - [ ] Dashboard carrega com métricas
   - [ ] Lista de contatos com busca
   - [ ] Criar novo contato (formulário + validação)
   - [ ] Pipeline kanban com deals
   - [ ] Criar novo deal
   - [ ] Deletar com confirmação
   - [ ] Toast de feedback
   - [ ] Mobile responsive (testar no celular)

4. Verificar API diretamente:
```bash
# Health check
curl https://SEU_PROJECT.supabase.co/functions/v1/api/health

# Listar contatos
curl https://SEU_PROJECT.supabase.co/functions/v1/api/contacts \
  -H "Authorization: Bearer SEU_ANON_KEY"

# Dashboard
curl https://SEU_PROJECT.supabase.co/functions/v1/api/dashboard \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

---

## ESTRUTURA DE DIRETÓRIOS DO REPOSITÓRIO

```
lai-software-factory/
│
├── .github/
│   ├── workflows/
│   │   ├── factory.yml              ← Pipeline autônomo (9 steps)
│   │   ├── pre-factory.yml          ← Investigação pré-fábrica
│   │   └── ci.yml                   ← CI básico (testes)
│   ├── CODEOWNERS
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── services/
│   └── pack-factory/
│       ├── app/                     ← ENGINE DA FÁBRICA (Python)
│       │   ├── cli.py               ← Entry point CLI
│       │   ├── autonomous_agent.py  ← Orquestrador 6-stages
│       │   ├── clone_engineer.py    ← DNA do Clone Engenheiro
│       │   ├── pack0_validator.py   ← Validação de especificação
│       │   ├── pack1.py             ← Geração de código
│       │   ├── audit.py             ← Auditoria de qualidade
│       │   ├── leak_check.py        ← Scanner de secrets
│       │   ├── exporter.py          ← Export team-safe
│       │   ├── manifest.py          ← Gestão de manifests
│       │   ├── merger.py            ← Merge de pacotes
│       │   ├── inventory.py         ← Inventário semântico
│       │   ├── module_registry.py   ← Registro de módulos
│       │   ├── oca.py               ← Análise de contexto
│       │   ├── onca_scanner.py      ← Scanner de segurança
│       │   ├── planner.py           ← Planejamento de builds
│       │   ├── resolver.py          ← Resolução de dependências
│       │   ├── software_book.py     ← Livro do software
│       │   └── utils.py             ← Utilitários
│       ├── requirements.txt
│       └── Dockerfile
│
├── scripts/
│   ├── factory_agent.py             ← V2: GitHub Actions → Engine
│   ├── pre_factory_agent.py         ← Pré-fábrica
│   ├── notify_callback.py           ← Callback para Supabase
│   └── lovable_api_integration.js   ← Integração Lovable
│
├── supabase/
│   ├── migrations/
│   │   ├── 20260225000001_factory_builds.sql  ← Tracking
│   │   └── 20260225000002_crm_contacts.sql    ← CRM
│   ├── functions/
│   │   ├── trigger-factory/index.ts           ← Front → GitHub
│   │   ├── factory-callback/index.ts          ← GitHub → Front
│   │   └── api/index.ts                       ← CRM API
│   └── security/
│       └── rls_policies.sql                   ← RLS completo
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  ← CRM completo (produção)
│   │   └── lib/supabase.ts
│   └── package.json
│
├── crm-module/
│   ├── db/seed.sql                  ← Dados de demonstração
│   ├── pack0/
│   │   ├── SRS.json                 ← Especificação
│   │   ├── events.json              ← Contratos de eventos
│   │   └── validation.json
│   └── docs/
│       ├── idea_brief.json
│       └── build_blueprint.md
│
├── gpt_builder/                     ← Prompts para GPT/Claude
│   ├── SYSTEM_INSTRUCTIONS.md
│   ├── ORQUESTRADOR_MASTER.md
│   ├── PROMPT_PACK0.md
│   ├── PROMPT_PACK1.md
│   ├── PROMPT_OCA.md
│   ├── MODO_EXECUCAO_PADRAO_LAI.md
│   ├── PACK_UNICO__MODO_CLONE_GITHUB.md
│   └── clone_engineer/              ← VS5 + V2 Sentinela
│
├── governance/
│   ├── BIGTECH_DICTIONARY.md
│   ├── policy_flags.json
│   └── public_export_policy.json
│
├── docs/
│   ├── BLUEPRINT_FABRICA_AUTONOMA_V014.md
│   ├── ARQUITETURA_FABRICA_COMPLETA.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY_MODEL.md
│   └── ...
│
├── runbooks/
│   ├── HOW_TO_RUN.md
│   ├── HOW_TO_DEPLOY.md
│   ├── HOW_TO_TEST.md
│   ├── HOW_TO_ROLLBACK.md
│   ├── HOW_TO_DEBUG.md
│   └── ENGINEERING_MANUAL.md
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── observability/
│   └── otel-collector-config.yaml
│
├── infra/
│   └── docker-compose.yml
│
├── SETUP_GUIDE.md                   ← ESTE ARQUIVO
├── README.md
├── SECURITY.md
├── CHANGELOG.md
├── Makefile
└── .env.sample
```

---

## ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

| Dia | Ação | Tempo estimado |
|---|---|---|
| 1 | Criar repo + push código + configurar secrets | 1h |
| 1 | Criar projeto Supabase + rodar migrations | 30min |
| 1 | Deploy Edge Functions | 30min |
| 1 | Deploy frontend (Lovable ou Vercel) | 30min |
| 2 | Testar pipeline completo (trigger → build → deploy) | 2h |
| 2 | Testar CRM (CRUD, pipeline, dashboard) | 1h |
| 3 | Configurar auth real (Supabase Auth + email) | 1h |
| 3 | Personalizar dados seed para o cliente | 1h |
| 4+ | Gerar próximo módulo (Tasks, Calendar, etc.) | Via fábrica |

---

## TROUBLESHOOTING

**GitHub Actions falha no step de Claude:**
- Verifique ANTHROPIC_API_KEY está correto
- Verifique créditos na conta Anthropic

**Edge Function retorna 401:**
- Verifique SUPABASE_ANON_KEY no header Authorization
- Formato: `Bearer eyJ...`

**Migration falha:**
- Execute na ordem: factory_builds primeiro, depois crm_contacts
- Verifique se a extensão uuid-ossp já existe

**Frontend não carrega dados:**
- Verifique .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
- Verifique RLS policies foram aplicadas
- Verifique seed data foi inserido

**Rate limit na API:**
- Padrão: 100 req/min por tenant
- Ajuste RATE_LIMIT na Edge Function se necessário
