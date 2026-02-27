#!/usr/bin/env python3
"""
FACTORY AGENT — Gera código executável a partir do blueprint.

Recebe o blueprint da Pré-Fábrica + Pack0 + Pack1 scaffold
e usa Claude API para gerar código real nos arquivos do Pack1.

Roda dentro de GitHub Actions.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from typing import List

import anthropic


SYSTEM_PROMPT = """Você é um engenheiro de software sênior da LAI Factory.
Sua função é gerar código executável de produção a partir de um blueprint técnico.

## Regras absolutas
1. SEMPRE gerar código que FUNCIONA (sem placeholders "TODO: implement").
2. Seguir o blueprint à risca: arquitetura, contratos, storage, observabilidade.
3. Incluir testes unitários para TODA lógica de negócio.
4. Incluir Dockerfile e docker-compose quando aplicável.
5. Incluir runbooks (HOW_TO_RUN, HOW_TO_DEPLOY, HOW_TO_ROLLBACK).
6. Usar CloudEvents para mensageria entre módulos.
7. Código em Python (FastAPI) ou TypeScript (Next.js/Express) conforme o blueprint indicar.
8. Sem bibliotecas obscuras — preferir stdlib + libs mainstream.

## Estrutura obrigatória de saída
Retorne um JSON com a seguinte estrutura:
{
  "files": [
    {
      "path": "caminho/relativo/arquivo.py",
      "content": "conteúdo completo do arquivo"
    }
  ],
  "dependencies": {
    "python": ["fastapi", "uvicorn", ...],
    "node": ["express", ...]
  },
  "docker": {
    "dockerfile": "conteúdo do Dockerfile",
    "compose": "conteúdo do docker-compose.yml"
  },
  "tests": [
    {
      "path": "tests/test_xxx.py",
      "content": "conteúdo do teste"
    }
  ],
  "runbooks": {
    "how_to_run": "markdown",
    "how_to_deploy": "markdown",
    "how_to_rollback": "markdown"
  }
}

Responda APENAS com JSON válido, sem texto adicional ou markdown fences.
"""


def _join_text_blocks(response) -> str:
    parts: List[str] = []
    for b in getattr(response, "content", []) or []:
        t = getattr(b, "text", None)
        if isinstance(t, str):
            parts.append(t)
    return "".join(parts).strip()


def _strip_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else ""
    if s.endswith("```"):
        s = s.rsplit("```", 1)[0]
    return s.strip()


def _extract_json_text(raw: str) -> str:
    s = _strip_fences(raw)
    if not s:
        return s
    # tenta direto
    try:
        json.loads(s)
        return s
    except Exception:
        pass
    # recorta do primeiro { ao último }
    i = s.find("{")
    j = s.rfind("}")
    if i != -1 and j != -1 and j > i:
        return s[i : j + 1].strip()
    return s


def main():
    parser = argparse.ArgumentParser(description="Factory Agent — Gera código a partir de blueprint")
    parser.add_argument("--blueprint", required=True, help="Caminho para build_blueprint.md")
    parser.add_argument("--pack0", required=True, help="Caminho para pack0 ZIP")
    parser.add_argument("--pack1-dir", required=True, help="Diretório do Pack1 scaffold")
    parser.add_argument("--module", required=True, help="Nome do módulo")
    parser.add_argument("--trace", required=True, help="Trace ID")
    args = parser.parse_args()

    blueprint_path = Path(args.blueprint)
    pack0_path = Path(args.pack0)
    pack1_dir = Path(args.pack1_dir)
    pack1_dir.mkdir(parents=True, exist_ok=True)

    blueprint = blueprint_path.read_text(encoding="utf-8")

    # ── Ler Pack0 PLAN.md (se existir no ZIP) ────────────────
    plan_md = ""
    try:
        with zipfile.ZipFile(pack0_path, "r") as z:
            plan_candidates = [n for n in z.namelist() if n.endswith("docs/PLAN.md")]
            if plan_candidates:
                plan_md = z.read(plan_candidates[0]).decode("utf-8", errors="replace")
    except Exception as e:
        print(f"⚠️  Não consegui ler Pack0: {e}")

    # ✅ monta o bloco do plano FORA do f-string (evita SyntaxError)
    plan_block = plan_md if plan_md else "(não disponível)"
    if plan_md and len(plan_md) > 8000:
        plan_block = plan_md[:8000] + "\n...(truncado)"

    # ── Ler ecosystem_fit (compat nomes) ─────────────────────
    eco_info = ""
    for eco_name in ("ecosystem_fit.json", "ecosystem_fit_map.json"):
        eco_path = blueprint_path.parent / eco_name
        if eco_path.exists():
            eco = json.loads(eco_path.read_text(encoding="utf-8"))
            eco_info = f"""
## Ecosystem Fit
- Módulos para reusar: {', '.join(eco.get('reuse_candidates', []))}
- Novo módulo necessário: {eco.get('new_module_needed', True)}
- Event Bus Topics: {', '.join(eco.get('event_bus_topics', []))}
- Integrações: {', '.join(eco.get('integrations', []))}
""".strip()
            break

    # ── Chamar Claude API ────────────────────────────────────
    client = anthropic.Anthropic()

    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514").strip()
    max_tokens = int(os.getenv("CLAUDE_MAX_TOKENS", "40000"))

    user_message = f"""
## Módulo: {args.module}
## Trace: {args.trace}

## Blueprint Técnico
{blueprint}

## Plano SRS (Pack0)
{plan_block}

{eco_info}

Gere o código completo para este módulo. Código real, executável, com testes.
""".strip()

    print(f"🏭 Factory Agent iniciado — módulo: {args.module}")
    print(f"📋 Blueprint: {len(blueprint)} chars")
    print(f"📋 Plan: {len(plan_md)} chars")
    print(f"🧠 Model: {model} | max_tokens={max_tokens}")

    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = _join_text_blocks(response)
    json_text = _extract_json_text(raw_text)

    try:
        result = json.loads(json_text)
    except json.JSONDecodeError as e:
        print(f"❌ JSON inválido do Claude: {e}")
        (pack1_dir / "_raw_response.txt").write_text(raw_text, encoding="utf-8")
        (pack1_dir / "_raw_response_extracted.json.txt").write_text(json_text, encoding="utf-8")
        sys.exit(1)

    # ── Escrever arquivos gerados ────────────────────────────
    files_written = 0

    for file_info in result.get("files", []) or []:
        fpath = pack1_dir / file_info["path"]
        fpath.parent.mkdir(parents=True, exist_ok=True)
        fpath.write_text(file_info["content"], encoding="utf-8")
        files_written += 1

    for test_info in result.get("tests", []) or []:
        tpath = pack1_dir / test_info["path"]
        tpath.parent.mkdir(parents=True, exist_ok=True)
        tpath.write_text(test_info["content"], encoding="utf-8")
        files_written += 1

    docker = result.get("docker", {}) or {}
    if docker.get("dockerfile"):
        (pack1_dir / "Dockerfile").write_text(docker["dockerfile"], encoding="utf-8")
        files_written += 1
    if docker.get("compose"):
        (pack1_dir / "docker-compose.yml").write_text(docker["compose"], encoding="utf-8")
        files_written += 1

    deps = result.get("dependencies", {}) or {}
    if deps.get("python"):
        (pack1_dir / "requirements.txt").write_text("\n".join(deps["python"]) + "\n", encoding="utf-8")
        files_written += 1
    if deps.get("node"):
        pkg = {"name": args.module, "version": "0.0.1", "dependencies": {d: "latest" for d in deps["node"]}}
        (pack1_dir / "package.json").write_text(json.dumps(pkg, indent=2), encoding="utf-8")
        files_written += 1

    runbooks = result.get("runbooks", {}) or {}
    if runbooks:
        rb_dir = pack1_dir / "runbooks"
        rb_dir.mkdir(parents=True, exist_ok=True)
        for name, content in runbooks.items():
            (rb_dir / f"{name.upper()}.md").write_text(content, encoding="utf-8")
            files_written += 1

    meta = {
        "trace_id": args.trace,
        "module": args.module,
        "files_written": files_written,
        "model": model,
        "input_tokens": getattr(getattr(response, "usage", None), "input_tokens", None),
        "output_tokens": getattr(getattr(response, "usage", None), "output_tokens", None),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    (pack1_dir / "_gen_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✅ {files_written} arquivos gerados no Pack1")


if __name__ == "__main__":
    main()
