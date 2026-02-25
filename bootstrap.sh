#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# LAI FACTORY — BOOTSTRAP AUTOMÁTICO
# Substitui 100% do trabalho de dev.
# Usuário: cria contas + preenche .env → roda este script → pronto.
#
# © Leandro Castelo — Ecossistema LAI | 300 Franchising
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# ── CORES ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✕]${NC} $1"; }
step()  { echo -e "\n${BLUE}${BOLD}══ STEP $1 ══${NC}"; }
banner() {
  echo -e "${CYAN}"
  echo "╔═══════════════════════════════════════════════════╗"
  echo "║   LAI FACTORY — BOOTSTRAP AUTOMÁTICO              ║"
  echo "║   Zero dev. Zero terminal. Tudo automático.       ║"
  echo "╚═══════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

# ── VERIFICAR PRÉ-REQUISITOS ────────────────────────────────
check_tools() {
  step "0: Verificando ferramentas"
  
  local missing=()
  
  command -v git >/dev/null 2>&1 || missing+=("git")
  command -v gh >/dev/null 2>&1 || missing+=("gh (GitHub CLI)")
  command -v node >/dev/null 2>&1 || missing+=("node")
  command -v npm >/dev/null 2>&1 || missing+=("npm")
  command -v npx >/dev/null 2>&1 || missing+=("npx")
  
  # Supabase CLI
  if ! command -v supabase >/dev/null 2>&1; then
    warn "Supabase CLI não encontrado. Instalando..."
    npm install -g supabase@latest 2>/dev/null || missing+=("supabase CLI")
  fi
  
  # Vercel CLI
  if ! command -v vercel >/dev/null 2>&1; then
    warn "Vercel CLI não encontrado. Instalando..."
    npm install -g vercel@latest 2>/dev/null || missing+=("vercel CLI")
  fi
  
  if [ ${#missing[@]} -gt 0 ]; then
    err "Ferramentas faltando: ${missing[*]}"
    echo ""
    echo "Instale com:"
    echo "  brew install git gh node        (macOS)"
    echo "  npm install -g supabase vercel"
    echo ""
    echo "Ou no Windows:"
    echo "  winget install GitHub.cli Git.Git OpenJS.NodeJS"
    echo "  npm install -g supabase vercel"
    exit 1
  fi
  
  log "Todas as ferramentas instaladas"
}

# ── CARREGAR CONFIG ──────────────────────────────────────────
load_config() {
  step "1: Carregando configuração"
  
  ENV_FILE="${1:-.env.deploy}"
  
  if [ ! -f "$ENV_FILE" ]; then
    warn "Arquivo $ENV_FILE não encontrado."
    echo ""
    echo -e "${BOLD}Criando $ENV_FILE — preencha as chaves:${NC}"
    
    cat > "$ENV_FILE" << 'ENVEOF'
# ══════════════════════════════════════════════════════════════
# LAI FACTORY — CONFIGURAÇÃO DE DEPLOY
# Preencha APENAS estas 8 variáveis. O script faz o resto.
# ══════════════════════════════════════════════════════════════

# 1. GitHub (https://github.com → Settings → Developer → Tokens)
GITHUB_PAT=ghp_SEU_TOKEN_AQUI
GITHUB_OWNER=seu-usuario-github

# 2. Supabase (https://supabase.com/dashboard → Settings)
SUPABASE_ACCESS_TOKEN=sbp_SEU_TOKEN_AQUI
SUPABASE_PROJECT_ID=seu-project-id
SUPABASE_DB_PASSWORD=sua-senha-do-banco

# 3. Vercel (https://vercel.com → Settings → Tokens)
VERCEL_TOKEN=SEU_VERCEL_TOKEN

# 4. Anthropic (https://console.anthropic.com → API Keys)
ANTHROPIC_API_KEY=sk-ant-SEU_TOKEN_AQUI

# 5. Nome do repositório (será criado automaticamente)
REPO_NAME=lai-software-factory

# 6. Região do Supabase (sa-east-1 = São Paulo)
SUPABASE_REGION=sa-east-1
ENVEOF
    
    echo ""
    echo -e "${YELLOW}Abra o arquivo $ENV_FILE, preencha as chaves, e rode novamente:${NC}"
    echo "  ./bootstrap.sh"
    exit 0
  fi
  
  source "$ENV_FILE"
  
  # Validar
  local errors=()
  [ -z "${GITHUB_PAT:-}" ] || [[ "$GITHUB_PAT" == *"SEU_TOKEN"* ]] && errors+=("GITHUB_PAT")
  [ -z "${GITHUB_OWNER:-}" ] || [[ "$GITHUB_OWNER" == *"seu-"* ]] && errors+=("GITHUB_OWNER")
  [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] || [[ "$SUPABASE_ACCESS_TOKEN" == *"SEU_TOKEN"* ]] && errors+=("SUPABASE_ACCESS_TOKEN")
  [ -z "${SUPABASE_PROJECT_ID:-}" ] || [[ "$SUPABASE_PROJECT_ID" == *"seu-"* ]] && errors+=("SUPABASE_PROJECT_ID")
  [ -z "${SUPABASE_DB_PASSWORD:-}" ] || [[ "$SUPABASE_DB_PASSWORD" == *"sua-"* ]] && errors+=("SUPABASE_DB_PASSWORD")
  [ -z "${VERCEL_TOKEN:-}" ] || [[ "$VERCEL_TOKEN" == *"SEU_"* ]] && errors+=("VERCEL_TOKEN")
  [ -z "${ANTHROPIC_API_KEY:-}" ] || [[ "$ANTHROPIC_API_KEY" == *"SEU_TOKEN"* ]] && errors+=("ANTHROPIC_API_KEY")
  
  if [ ${#errors[@]} -gt 0 ]; then
    err "Chaves não preenchidas: ${errors[*]}"
    echo "Abra $ENV_FILE e preencha as chaves marcadas."
    exit 1
  fi
  
  REPO_NAME="${REPO_NAME:-lai-software-factory}"
  SUPABASE_REGION="${SUPABASE_REGION:-sa-east-1}"
  
  # Derivar URLs do Supabase
  SUPABASE_URL="https://${SUPABASE_PROJECT_ID}.supabase.co"
  SUPABASE_DB_URL="postgresql://postgres.${SUPABASE_PROJECT_ID}:${SUPABASE_DB_PASSWORD}@aws-0-${SUPABASE_REGION}.pooler.supabase.com:6543/postgres"
  
  # Gerar callback secret
  CALLBACK_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
  
  log "Configuração carregada (${REPO_NAME})"
}

# ── OBTER ANON KEY DO SUPABASE ───────────────────────────────
get_supabase_keys() {
  step "2: Obtendo chaves do Supabase"
  
  SUPABASE_ANON_KEY=$(curl -s "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/api-keys" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" | \
    python3 -c "import sys,json; keys=json.load(sys.stdin); print([k['api_key'] for k in keys if k['name']=='anon'][0])" 2>/dev/null)
  
  SUPABASE_SERVICE_KEY=$(curl -s "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/api-keys" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" | \
    python3 -c "import sys,json; keys=json.load(sys.stdin); print([k['api_key'] for k in keys if k['name']=='service_role'][0])" 2>/dev/null)
  
  if [ -z "$SUPABASE_ANON_KEY" ]; then
    err "Não conseguiu obter anon key. Verifique SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_ID."
    exit 1
  fi
  
  log "Anon key: ${SUPABASE_ANON_KEY:0:20}..."
  log "Service key: ${SUPABASE_SERVICE_KEY:0:20}..."
}

# ── CRIAR REPOSITÓRIO GITHUB ────────────────────────────────
setup_github() {
  step "3: Configurando GitHub"
  
  # Auth
  echo "$GITHUB_PAT" | gh auth login --with-token 2>/dev/null || true
  
  # Criar repo se não existe
  if gh repo view "${GITHUB_OWNER}/${REPO_NAME}" >/dev/null 2>&1; then
    warn "Repositório ${REPO_NAME} já existe. Usando existente."
  else
    gh repo create "${REPO_NAME}" --private --description "LAI Software Factory — Autonomous Build Pipeline"
    log "Repositório criado: ${GITHUB_OWNER}/${REPO_NAME}"
  fi
  
  # Clone (ou init)
  WORK_DIR=$(mktemp -d)
  cd "$WORK_DIR"
  
  git clone "https://${GITHUB_PAT}@github.com/${GITHUB_OWNER}/${REPO_NAME}.git" . 2>/dev/null || {
    git init
    git remote add origin "https://${GITHUB_PAT}@github.com/${GITHUB_OWNER}/${REPO_NAME}.git"
  }
  
  log "Repositório clonado em ${WORK_DIR}"
}

# ── EXTRAIR CÓDIGO ───────────────────────────────────────────
extract_code() {
  step "4: Extraindo código da fábrica"
  
  ZIP_FILE="${SCRIPT_DIR}/LAI_FACTORY_V014_IMPLEMENTACAO.zip"
  
  if [ ! -f "$ZIP_FILE" ]; then
    err "ZIP não encontrado: $ZIP_FILE"
    echo "Certifique-se de que LAI_FACTORY_V014_IMPLEMENTACAO.zip está na mesma pasta do script."
    exit 1
  fi
  
  # Extrair (remove prefixo lai-software-factory/)
  unzip -o "$ZIP_FILE" -d "$WORK_DIR/_tmp_extract" >/dev/null
  cp -r "$WORK_DIR/_tmp_extract/lai-software-factory/"* "$WORK_DIR/" 2>/dev/null || true
  cp -r "$WORK_DIR/_tmp_extract/lai-software-factory/".* "$WORK_DIR/" 2>/dev/null || true
  rm -rf "$WORK_DIR/_tmp_extract"
  
  FILE_COUNT=$(find "$WORK_DIR" -type f ! -path "*/.git/*" | wc -l)
  log "Extraído: ${FILE_COUNT} arquivos"
}

# ── CONFIGURAR GITHUB SECRETS ────────────────────────────────
setup_github_secrets() {
  step "5: Configurando GitHub Secrets"
  
  cd "$WORK_DIR"
  
  gh secret set ANTHROPIC_API_KEY --body "$ANTHROPIC_API_KEY" 2>/dev/null && log "ANTHROPIC_API_KEY ✓" || warn "ANTHROPIC_API_KEY (manual)"
  gh secret set SUPABASE_ACCESS_TOKEN --body "$SUPABASE_ACCESS_TOKEN" 2>/dev/null && log "SUPABASE_ACCESS_TOKEN ✓" || warn "manual"
  gh secret set SUPABASE_PROJECT_ID --body "$SUPABASE_PROJECT_ID" 2>/dev/null && log "SUPABASE_PROJECT_ID ✓" || warn "manual"
  gh secret set SUPABASE_DB_URL --body "$SUPABASE_DB_URL" 2>/dev/null && log "SUPABASE_DB_URL ✓" || warn "manual"
  gh secret set SUPABASE_ANON_KEY --body "$SUPABASE_ANON_KEY" 2>/dev/null && log "SUPABASE_ANON_KEY ✓" || warn "manual"
  gh secret set SUPABASE_URL --body "$SUPABASE_URL" 2>/dev/null && log "SUPABASE_URL ✓" || warn "manual"
  gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" 2>/dev/null && log "VERCEL_TOKEN ✓" || warn "manual"
  gh secret set CALLBACK_SECRET --body "$CALLBACK_SECRET" 2>/dev/null && log "CALLBACK_SECRET ✓" || warn "manual"
  gh secret set GITHUB_PAT --body "$GITHUB_PAT" 2>/dev/null && log "GITHUB_PAT ✓" || warn "manual"
  
  log "Secrets configurados"
}

# ── PUSH CÓDIGO ──────────────────────────────────────────────
push_code() {
  step "6: Push do código"
  
  cd "$WORK_DIR"
  
  # Criar .gitignore
  cat > .gitignore << 'GITEOF'
node_modules/
.env
.env.deploy
.env.local
.env.production
__pycache__/
*.pyc
.DS_Store
_tmp/
_out/
_audit/
dist/
build/
.vercel/
.supabase/
GITEOF
  
  git add -A
  git commit -m "feat: LAI Factory V014 — Autonomous Deploy Pipeline

- Complete factory engine (Python)
- GitHub Actions workflows (factory + pre-factory + CI)
- Supabase Edge Functions (trigger + callback + API)
- CRM Contacts module (production grade)
- Frontend (React + Tailwind + shadcn)
- Migrations + RLS + Seed data
- Clone Engineer DNA (VS5 + V2 Sentinela)
- Full audit trail + PEC Chain

© Leandro Castelo — Ecossistema LAI | 300 Franchising" 2>/dev/null

  git push -u origin main 2>/dev/null || git push -u origin master 2>/dev/null
  
  log "Código pushed para ${GITHUB_OWNER}/${REPO_NAME}"
}

# ── SETUP SUPABASE ───────────────────────────────────────────
setup_supabase() {
  step "7: Configurando Supabase"
  
  cd "$WORK_DIR"
  
  # Login na CLI
  export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN"
  
  # Link ao projeto
  supabase link --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null || warn "Link já existe"
  log "Projeto linkado"
  
  # ── 7a: Rodar migrations ──
  echo "  Rodando migrations..."
  
  # Factory builds table
  if [ -f "supabase/migrations/20260225000001_factory_builds.sql" ]; then
    psql "$SUPABASE_DB_URL" -f "supabase/migrations/20260225000001_factory_builds.sql" 2>/dev/null && \
      log "Migration: factory_builds ✓" || warn "factory_builds (verifique manualmente)"
  fi
  
  # CRM tables
  if [ -f "supabase/migrations/20260225000002_crm_contacts.sql" ]; then
    psql "$SUPABASE_DB_URL" -f "supabase/migrations/20260225000002_crm_contacts.sql" 2>/dev/null && \
      log "Migration: crm_contacts ✓" || warn "crm_contacts (verifique manualmente)"
  fi
  
  # CRM V2 Auditado (correções: ordem tabelas, functions em public, partial indexes)
  if [ -f "supabase/migrations/20260225000003_crm_contacts_v2_auditado.sql" ]; then
    psql "$SUPABASE_DB_URL" -f "supabase/migrations/20260225000003_crm_contacts_v2_auditado.sql" 2>/dev/null && \
      log "Migration: crm_v2_auditado ✓" || warn "crm_v2_auditado (verifique manualmente)"
  fi
  
  # Intelligence Layer (15 tabelas + pgvector + pg_cron + RLS)
  if [ -f "supabase/migrations/20260225100001_intelligence_layer.sql" ]; then
    psql "$SUPABASE_DB_URL" -f "supabase/migrations/20260225100001_intelligence_layer.sql" 2>/dev/null && \
      log "Migration: intelligence_layer ✓" || warn "intelligence_layer (verifique manualmente)"
  fi
  
  # RLS policies
  if [ -f "supabase/security/rls_policies.sql" ]; then
    psql "$SUPABASE_DB_URL" -f "supabase/security/rls_policies.sql" 2>/dev/null && \
      log "RLS policies ✓" || warn "RLS (verifique manualmente)"
  fi
  
  # Seed data
  if [ -f "crm-module/db/seed.sql" ]; then
    psql "$SUPABASE_DB_URL" -f "crm-module/db/seed.sql" 2>/dev/null && \
      log "Seed data ✓" || warn "Seed (verifique manualmente)"
  fi
  
  # ── 7b: Deploy Edge Functions ──
  echo "  Deployando Edge Functions..."
  
  # Configurar secrets das functions
  supabase secrets set \
    GITHUB_PAT="$GITHUB_PAT" \
    GITHUB_OWNER="$GITHUB_OWNER" \
    GITHUB_REPO="$REPO_NAME" \
    CALLBACK_SECRET="$CALLBACK_SECRET" \
    --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null && \
    log "Edge Function secrets ✓" || warn "Secrets (configure manualmente)"
  
  # Configurar secrets de IA (se disponíveis)
  if [ -n "$AI_SERVER_URL" ]; then
    supabase secrets set \
      AI_PROVIDER="${AI_PROVIDER:-local}" \
      AI_SERVER_URL="$AI_SERVER_URL" \
      AI_MODEL="${AI_MODEL:-llama3}" \
      --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null && \
      log "AI secrets (local) ✓" || warn "AI secrets (configure manualmente)"
  fi
  if [ -n "$ANTHROPIC_API_KEY" ]; then
    supabase secrets set \
      ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
      --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null && \
      log "AI secrets (Claude) ✓" || warn "Anthropic key (configure manualmente)"
  fi
  
  # Deploy functions (todas: factory + intelligence + spy)
  for fn in trigger-factory factory-callback api intelligence-api spy-agents; do
    if [ -d "supabase/functions/$fn" ]; then
      supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_ID" 2>/dev/null && \
        log "Function: $fn ✓" || warn "Function $fn (deploy manual necessário)"
    fi
  done
  
  log "Supabase configurado"
}

# ── DEPLOY FRONTEND ──────────────────────────────────────────
deploy_frontend() {
  step "8: Deploy do Frontend"
  
  cd "$WORK_DIR/frontend"
  
  # Criar .env.production
  cat > .env.production << ENVPROD
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
ENVPROD
  
  # Instalar dependências
  npm install 2>/dev/null
  
  # Build
  npm run build 2>/dev/null && log "Frontend build ✓" || {
    warn "Build falhou. Tentando deploy direto pelo Vercel..."
  }
  
  # Deploy via Vercel
  export VERCEL_TOKEN="$VERCEL_TOKEN"
  DEPLOY_URL=$(npx vercel --prod --yes --token "$VERCEL_TOKEN" 2>/dev/null | tail -1)
  
  if [ -n "$DEPLOY_URL" ]; then
    log "Frontend deployed: $DEPLOY_URL"
    FRONT_URL="$DEPLOY_URL"
  else
    warn "Vercel deploy falhou. Use Lovable como alternativa."
    FRONT_URL="(deploy manual necessário)"
  fi
}

# ── HEALTH CHECK ─────────────────────────────────────────────
health_check() {
  step "9: Health Check"
  
  echo "  Verificando API..."
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/functions/v1/api/health" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" 2>/dev/null || echo "000")
  
  if [ "$API_STATUS" = "200" ]; then
    log "API: Healthy (200) ✓"
  else
    warn "API: Status $API_STATUS (pode levar 1-2 min para ativar)"
  fi
  
  echo "  Verificando trigger-factory..."
  TRIGGER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPABASE_URL}/functions/v1/trigger-factory" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" 2>/dev/null || echo "000")
  
  if [ "$TRIGGER_STATUS" = "405" ] || [ "$TRIGGER_STATUS" = "200" ]; then
    log "Trigger-factory: Online ✓"
  else
    warn "Trigger-factory: Status $TRIGGER_STATUS"
  fi
}

# ── RESULTADO FINAL ──────────────────────────────────────────
final_report() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "╔═══════════════════════════════════════════════════════╗"
  echo "║           ✅ DEPLOY COMPLETO                          ║"
  echo "╚═══════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
  echo -e "  ${BOLD}Repositório:${NC}  https://github.com/${GITHUB_OWNER}/${REPO_NAME}"
  echo -e "  ${BOLD}API:${NC}          ${SUPABASE_URL}/functions/v1/api"
  echo -e "  ${BOLD}Health:${NC}       ${SUPABASE_URL}/functions/v1/api/health"
  echo -e "  ${BOLD}Trigger:${NC}      ${SUPABASE_URL}/functions/v1/trigger-factory"
  echo -e "  ${BOLD}Supabase:${NC}     https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}"
  echo -e "  ${BOLD}Frontend:${NC}     ${FRONT_URL:-'(deploy via Lovable ou Vercel)'}"
  echo ""
  echo -e "  ${BOLD}Próximo passo:${NC}"
  echo "  Acesse o frontend e teste: login → dashboard → contatos → pipeline"
  echo ""
  echo "  Para rodar a fábrica manualmente:"
  echo "  gh workflow run factory.yml -f module=crm-contacts -f state=NORMAL -f auto_deploy=true"
  echo ""
  echo -e "  ${BOLD}Para trigger via API (como o front faria):${NC}"
  echo "  curl -X POST ${SUPABASE_URL}/functions/v1/trigger-factory \\"
  echo "    -H 'Authorization: Bearer ${SUPABASE_ANON_KEY:0:20}...' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"module\":\"meu-novo-modulo\",\"auto_deploy\":true}'"
  echo ""
}

# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONT_URL=""

banner
check_tools
load_config "$@"
get_supabase_keys
setup_github
extract_code
setup_github_secrets
push_code
setup_supabase
deploy_frontend
health_check
final_report
