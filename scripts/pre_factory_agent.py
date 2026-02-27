#!/usr/bin/env python3
"""
PRÉ-FÁBRICA AGENT — Transforma texto livre em blueprint técnico.

Usa Claude API com o system prompt da Pré-Fábrica LAI.
Gera: idea_brief.json, market_scan.json, ecosystem_fit.json,
      build_blueprint.md, decision_log.md

Roda dentro de GitHub Actions.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

import anthropic

# ── Config ──────────────────────────────────────────────────
OUT_DIR = Path("_out/pre_factory")
TRACE_ID = os.environ.get("TRACE_ID", f"TRC-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}")
USER_REQUEST = os.environ.get("USER_REQUEST", "").strip()
MODE = os.environ.get("MODE", "DILIGENCE").strip().upper()
MODULE_NAME = os.environ.get("MODULE_NAME", "new-module").strip()

if not USER_REQUEST:
    raise RuntimeError("USER_REQUEST ausente. Defina a env USER_REQUEST no GitHub Actions.")

SYSTEM_PROMPT = """Você é o LAI-CTO (Pré-Fábrica): Visionário + Market Intel + Arquiteto do Ecossistema LAI.
Sua função é operar ANTES da Fábrica (antes de Pack0/Pack1).

## Módulos existentes do ecossistema LAI
- meetcore: videoconferência + eventos + análise facial/emocional
- lai-connect: omnicanal + integrações CRM + mensageria
- app-lai: experiência unificada + feed + rotinas
- culture-people: pipeline efêmero + vetores comportamentais + guidance

## Pipeline obrigatório
1) VS4: problema → hipóteses → 3 opções → trade-offs → riscos → decisão recomendada
2) Investigação em 3 rodadas:
   R1: mapa do domínio + "o que precisa ser verdade"
   R2: evidências + consenso/dissenso + atualização de confiança
   R3: benchmark + números práticos + riscos operacionais
3) Auditoria: evidências (A/B/C/D), log de crenças, stop rules
4) Red Team: 5 formas de estar errado + como testar + mitigação
5) Patch: se Red Team mudar conclusão, atualizar

## Saídas OBRIGATÓRIAS (JSON válido, sem markdown fences)
Você DEVE retornar um JSON com esta estrutura exata:
{
  "idea_brief": { ... conforme schema idea_brief.v1 ... },
  "market_scan": { ... conforme schema market_scan_report.v1 ... },
  "ecosystem_fit": { ... conforme schema ecosystem_fit_map.v1 ... },
  "build_blueprint": "string markdown com blueprint técnico completo",
  "decision_log": "string markdown com log de decisões"
}

## Schemas obrigatórios

### idea_brief (campos required):
- schema_version: "1.0"
- trace_id: string
- idea_title: string
- problem: string
- target_users: [string]
- desired_outcomes: [string]
- constraints: { time_to_mvp_days: int, budget: string, channels: [string], compliance: [string] }

### market_scan (campos required):
- schema_version: "1.0"
- trace_id: string
- sources: [{ title, type, ref }]
- signals: [{ signal, strength }]
- risks: [{ risk, severity, mitigation }]
- verdict: string

### ecosystem_fit (campos required):
- schema_version: "1.0"
- trace_id: string
- reuse_candidates: [string] (módulos LAI que podem ser reusados)
- new_module_needed: boolean
- event_bus_topics: [string] (CloudEvents necessários)
- integrations: [string]

### build_blueprint (markdown com):
- OBJETIVO (1-3 frases)
- ESCOPO (o que entra, o que não entra)
- ARQUITETURA (diagrama textual de eventos, serviços, segurança)
- CONTRATOS (CloudEvents, endpoints REST/gRPC)
- STORAGE (Postgres/Redis/Document, tabelas mínimas)
- OBSERVABILIDADE (logs/métricas/traces, SLO/SLI)
- TESTES (unit/integration/e2e, critérios de aceite)
- ROLLOUT (shadow mode, feature flags, kill switch)

## Regras
- Responda APENAS com JSON válido, sem texto adicional.
- Sem markdown fences (```json```), apenas JSON puro.
- Use termos corporativos e operacionais (Big Tech).
- Linguagem: português BR para conteúdo, inglês para campos técnicos.
"""

SCAN_ADDENDUM = """
MODO: /SCAN — apenas Rodada 1 (mapa + checklist + riscos).
Simplificar market_scan e Red Team. Focar no essencial.
"""

DILIGENCE_ADDENDUM = """
MODO: /DILIGENCE — Rodadas 1-3 completas + Red Team + Patch.
Análise completa com evidências, benchmark e mitigações.
"""


def _strip_markdown_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        # remove primeira linha (``` ou ```json)
        s = s.split("\n", 1)[1] if "\n" in s else ""
    if s.endswith("```"):
        s = s.rsplit("```", 1)[0]
    return s.strip()


def _extract_json_text(raw: str) -> str:
    """
    1) remove fences
    2) se ainda vier lixo, tenta recortar do primeiro '{' ao último '}'
    """
    s = _strip_markdown_fences(raw)
    if not s:
        return s

    # tentativa direta
    try:
        json.loads(s)
        return s
    except Exception:
        pass

    i = s.find("{")
    j = s.rfind("}")
    if i != -1 and j != -1 and j > i:
        candidate = s[i : j + 1].strip()
        return candidate

    return s


def _write_json(path: Path, data: dict):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    api_key = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    if not api_key or not api_key.startswith("sk-ant-"):
        raise RuntimeError(
            "ANTHROPIC_API_KEY ausente ou inválida. "
            "Configure uma chave da Anthropic (prefixo sk-ant-...)."
        )

    # ✅ Use a key sanitizada (strip) no client
    client = anthropic.Anthropic(api_key=api_key)

    system = SYSTEM_PROMPT + ("\n" + SCAN_ADDENDUM if MODE == "SCAN" else "\n" + DILIGENCE_ADDENDUM)

    user_message = f"""
## Requisição do usuário
{USER_REQUEST}

## Módulo sugerido
{MODULE_NAME}

## Trace ID
{TRACE_ID}

Gere o JSON completo com idea_brief, market_scan, ecosystem_fit, build_blueprint e decision_log.
""".strip()

    print(f"🏗️  Pré-Fábrica iniciada — modo: {MODE}, módulo: {MODULE_NAME}")
    print(f"📝 Request: {USER_REQUEST[:200]}...")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=8192,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )

    # content é lista de blocos; normalmente o 1º é texto
    raw_text = ""
    if getattr(response, "content", None):
        block0 = response.content[0]
        raw_text = getattr(block0, "text", "") or ""
    raw_text = raw_text.strip()

    json_text = _extract_json_text(raw_text)

    try:
        result = json.loads(json_text)
    except json.JSONDecodeError as e:
        print(f"❌ Claude retornou JSON inválido: {e}")
        print(f"Raw (primeiros 500 chars): {json_text[:500]}")
        (OUT_DIR / "raw_response.txt").write_text(raw_text, encoding="utf-8")
        (OUT_DIR / "raw_response_extracted.json.txt").write_text(json_text, encoding="utf-8")
        sys.exit(1)

    # ── Salvar artefatos individuais ─────────────────────────
    idea = result.get("idea_brief", {}) or {}
    idea.setdefault("schema_version", "1.0")
    idea.setdefault("trace_id", TRACE_ID)
    _write_json(OUT_DIR / "idea_brief.json", idea)

    market = result.get("market_scan", {}) or {}
    market.setdefault("schema_version", "1.0")
    market.setdefault("trace_id", TRACE_ID)
    
    # nomes esperados pelo validador
    _write_json(OUT_DIR / "market_scan_report.json", market)
    
    # opcional: manter o antigo também (compatibilidade)
    _write_json(OUT_DIR / "market_scan.json", market)
    
    eco = result.get("ecosystem_fit", {}) or {}
    eco.setdefault("schema_version", "1.0")
    eco.setdefault("trace_id", TRACE_ID)
    
    # nomes esperados pelo validador
    _write_json(OUT_DIR / "ecosystem_fit_map.json", eco)
    
    # opcional: manter o antigo também (compatibilidade)
    _write_json(OUT_DIR / "ecosystem_fit.json", eco)

    blueprint = result.get("build_blueprint", "") or ""
    (OUT_DIR / "build_blueprint.md").write_text(str(blueprint), encoding="utf-8")

    decision = result.get("decision_log", "") or ""
    (OUT_DIR / "decision_log.md").write_text(str(decision), encoding="utf-8")

    usage = getattr(response, "usage", None)
    meta = {
        "trace_id": TRACE_ID,
        "module_name": MODULE_NAME,
        "mode": MODE,
        "user_request_preview": USER_REQUEST[:500],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": "claude-sonnet-4-20250514",
        "input_tokens": getattr(usage, "input_tokens", None),
        "output_tokens": getattr(usage, "output_tokens", None),
    }
    _write_json(OUT_DIR / "meta.json", meta)

    print("✅ Blueprint gerado com sucesso!")
    print("   📄 idea_brief.json")
    print("   📄 market_scan.json")
    print("   📄 ecosystem_fit.json")
    print("   📄 build_blueprint.md")
    print("   📄 decision_log.md")

    # ── GitHub Actions outputs ───────────────────────────────
    gh_output = os.environ.get("GITHUB_OUTPUT", "")
    if gh_output:
        with open(gh_output, "a", encoding="utf-8") as f:
            f.write(f"module_name={MODULE_NAME}\n")
            f.write(f"trace_id={TRACE_ID}\n")


if __name__ == "__main__":
    main()
