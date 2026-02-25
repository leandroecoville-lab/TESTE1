# ══════════════════════════════════════════════════════════════════
# LAI INTELLIGENCE LAYER — Configuração do Servidor de IA
# Preparado para PI com Claude API ou servidor local
# ══════════════════════════════════════════════════════════════════

## OPÇÃO A: Usar seu servidor local de IA (custo $0)

### 1. Configuração no Supabase

Vá em: Supabase Dashboard → Edge Functions → Secrets

Adicione estas variáveis:

```
AI_SERVER_URL=http://SEU_IP_DO_SERVIDOR:11434
AI_MODEL=llama3
AI_PROVIDER=local
```

### 2. Como funciona

Todos os agents chamam seu servidor via API padrão Ollama:

```
POST http://SEU_IP:11434/api/chat
{
  "model": "llama3",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "stream": false,
  "options": {"temperature": 0.3}
}
```

### 3. Requisitos do servidor

- Ollama, LM Studio, vLLM ou qualquer servidor com API compatível Ollama
- Modelo: llama3 (ou qualquer modelo que você tenha)
- Porta: 11434 (padrão Ollama) ou qualquer outra
- O servidor precisa ser acessível via internet (ou VPN) para as Edge Functions chamarem


## OPÇÃO B: Usar Claude API (fallback)

### 1. Configuração no Supabase

```
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-api03-SUA_CHAVE_AQUI
```

### 2. Quando usar

- Se seu servidor local estiver offline
- Para tarefas que exigem mais inteligência (ex: Automation Scout, análise complexa)
- Como fallback automático


## OPÇÃO C: Híbrido (recomendado)

### 1. Configuração

```
AI_SERVER_URL=http://SEU_IP:11434
AI_MODEL=llama3
AI_PROVIDER=local
ANTHROPIC_API_KEY=sk-ant-api03-SUA_CHAVE
```

O código já suporta dual provider. Por padrão usa local.
Se quiser trocar para Claude, basta mudar AI_PROVIDER=claude.


## VARIÁVEIS DE AMBIENTE COMPLETAS

No Supabase Dashboard → Edge Functions → Secrets, adicione:

```env
# ── Obrigatórias ──
SUPABASE_URL=https://SEU_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ── IA Local (seu servidor) ──
AI_SERVER_URL=http://SEU_IP:11434
AI_MODEL=llama3
AI_PROVIDER=local

# ── IA Claude (opcional, fallback) ──
ANTHROPIC_API_KEY=sk-ant-api03-...
```


## DEPLOY DAS EDGE FUNCTIONS

### Via CLI Supabase

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy intelligence-api
supabase functions deploy intelligence-api --project-ref SEU_PROJECT_REF

# Deploy spy-agents
supabase functions deploy spy-agents --project-ref SEU_PROJECT_REF
```

### Via Dashboard (alternativa)

1. Vá em Edge Functions no Dashboard
2. Clique "New Function"
3. Nome: intelligence-api
4. Cole o código do arquivo supabase/functions/intelligence-api/index.ts
5. Repita para spy-agents


## RODAR MIGRATION

No Supabase Dashboard → SQL Editor:

1. Abra o arquivo supabase/migrations/20260225_intelligence_layer.sql
2. Cole inteiro no editor
3. Clique "Run"
4. Verifique: 15 tabelas criadas, RLS ativo, seeds inseridos


## TESTAR

### Via curl (terminal)

```bash
# Status dos agents
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/intelligence-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -d '{"action":"status"}'

# Rodar health check
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/intelligence-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -d '{"action":"run_health_rover"}'

# Rodar spy agents
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/spy-agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -d '{"agent":"both"}'

# Rodar todos os agents
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/intelligence-api \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -d '{"action":"run_all"}'
```


## CRON JOBS (Automático)

Se seu Supabase tem pg_cron habilitado, rode no SQL Editor:

```sql
-- Friction Detector: a cada 15 min
SELECT cron.schedule('friction-detector', '*/15 * * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-api',
    '{"action":"run_friction_detector"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Process Miner: a cada hora
SELECT cron.schedule('process-miner', '0 * * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-api',
    '{"action":"run_process_miner"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Automation Scout: a cada 6h
SELECT cron.schedule('automation-scout', '0 */6 * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-api',
    '{"action":"run_automation_scout"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Health Rover: a cada hora
SELECT cron.schedule('health-rover', '30 * * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-api',
    '{"action":"run_health_rover"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Spy Alpha: a cada 2h
SELECT cron.schedule('spy-alpha', '15 */2 * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/spy-agents',
    '{"agent":"spy-alpha","scan":"full_system"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Spy Omega: a cada 3h
SELECT cron.schedule('spy-omega', '45 */3 * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/spy-agents',
    '{"agent":"spy-omega","scan":"manual_process_hunt"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Knowledge Harvester: a cada 4h
SELECT cron.schedule('knowledge-harvester', '0 */4 * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-api',
    '{"action":"run_knowledge_harvester"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);

-- Cost Watcher: a cada 12h
SELECT cron.schedule('cost-watcher', '0 */12 * * *',
  $$SELECT net.http_post(
    current_setting('app.settings.supabase_url') || '/functions/v1/intelligence-api',
    '{"action":"run_cost_watcher"}'::jsonb,
    '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  )$$);
```

Se NÃO tiver pg_cron, use GitHub Actions ou um cron externo (ex: cron-job.org gratuito).
