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
from typing import Any, Dict, List

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

# JSON Schema para Structured Outputs (garante JSON válido)
OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "files": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                },
                "required": ["path", "content"],
                "additionalProperties": False,
            },
        },
        "dependencies": {
            "type": "object",
            "properties": {
                "python": {"type": "array", "items": {"type": "string"}},
                "node": {"type": "array", "items": {"type": "string"}},
            },
            "additionalProperties": False,
        },
        "docker": {
            "type": "object",
            "properties": {
                "dockerfile": {"type": "string"},
                "compose": {"type": "string"},
            },
            "additionalProperties": False,
        },
        "tests": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                },
                "required": ["path", "content"],
                "additionalProperties": False,
            },
        },
        "runbooks": {
            "type": "object",
            "properties": {
                "how_to_run": {"type": "string"},
                "how_to_deploy": {"type": "string"},
                "how_to_rollback": {"type": "string"},
            },
            "additionalProperties": False,
        },
    },
    "required": ["files"],
    "additionalProperties": False,
}


def _safe_rel_path(rel: str) -> Path:
    # impede path traversal (..), e paths absolutos
    rel_norm = Path(rel).as_posix().lstrip("/")
    if rel_norm.startswith("..") or "/../" in rel_norm:
        raise ValueError(f"Path inválido (..): {rel}")
    return Path(rel_norm)


def _extract_plan_from_pack0(pack0_zip: Path) -> str:
    plan_md = ""
    with zipfile.ZipFile(pack0_zip, "r") as z:
        # aceita "docs/PLAN.md" ou ".../docs/PLAN.md"
        plan_candidates = [n for n in z.namelist() if n.endswith("docs/PLAN.md")]
        if plan_candidates:
            plan_md = z.read(plan_candidates[0]).decode("utf-8", errors="replace")
    return plan_md


def _load_ecosystem_fit(blueprint_path: Path) -> str:
    # compat: nomes antigos e novos
    candidates = [
        blueprint_path.parent / "ecosystem_fit.json",
        blueprint_path.parent / "ecosystem_fit_map.json",
    ]
    for p in candidates:
        if p.exists():
            eco = json.loads(p.read_text(encoding="utf-8"))
            return f"""
## Ecosystem Fit
- Módulos para reusar: {', '.join(eco.get('reuse_candidates', []))}
- Novo módulo necessário: {eco.get('new_module_needed', True)}
- Event Bus Topics: {', '.join(eco.get('event_bus_topics', []))}
- Integrações: {', '.join(eco.get('integrations', []))}
""".strip()
    return ""


def _join_text_blocks(response) -> str:
    # content pode ser lista de blocos; junta todos os textos
    parts: List[str] = []
    for b in getattr(response, "content", []) or []:
        t = getattr(b, "text", None)
        if isinstance(t, str):
            parts.append(t)
    return "".join(parts).strip()


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

    plan_md = ""
    try:
        plan_md = _extract_plan_from_pack0(pack0_path)
    except Exception as e:
        print(f"⚠️  Não consegui ler Pack0 PLAN.md: {e}")

    eco_info = _load_ecosystem_fit(blueprint_path)

    # Claude client (usa ANTHROPIC_API_KEY automaticamente)
    client = anthropic.Anthropic()

    model = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514").strip()
    max_tokens = int(os.getenv("CLAUDE_MAX_TOKENS", "24000"))

    user_message = f"""
## Módulo: {args.module}
## Trace: {args.trace}

## Blueprint Técnico
{blueprint}

## Plano SRS (Pack0)
{(plan_md[:8000] + "\n...(truncado)") if plan_md and len(plan_md) > 8000 else (plan_md or "(não disponível)")}

{eco_info}

Gere o código completo para este módulo. Código real, executável, com testes.
""".strip()

    print(f"🏭 Factory Agent iniciado — módulo: {args.module}")
    print(f"📋 Blueprint: {len(blueprint)} chars")
    print(f"📋 Plan: {len(plan_md)} chars")
    print(f"🧠 Model: {model} | max_tokens={max_tokens}")

    # Structured Outputs: output_config.format (com fallback p/ output_format)
    request_kwargs = dict(
        model=model,
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    try:
        response = client.messages.create(
            **request_kwargs,
            output_config={"format": {"type": "json_schema", "schema": OUTPUT_SCHEMA}},
        )
    except TypeError:
        # compat com SDKs antigos (deprecado, mas ainda funciona)
        response = client.messages.create(
            **request_kwargs,
            output_format={"type": "json_schema", "schema": OUTPUT_SCHEMA},
        )

    # Se bater max_tokens, pode truncar JSON (quebra parse)
    stop_reason = getattr(response, "stop_reason", None)
    if stop_reason == "max_tokens":
        raw = _join_text_blocks(response)
        (pack1_dir / "_raw_response.txt").write_text(raw, encoding="utf-8")
        print("❌ Saída truncada por max_tokens. Aumente CLAUDE_MAX_TOKENS (ex: 40000).")
        sys.exit(1)

    raw_text = _join_text_blocks(response)

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"❌ JSON inválido do Claude: {e}")
        (pack1_dir / "_raw_response.txt").write_text(raw_text, encoding="utf-8")
        sys.exit(1)

    files_written = 0

    # files
    for file_info in result.get("files", []) or []:
        relp = _safe_rel_path(file_info["path"])
        fpath = (pack1_dir / relp).resolve()
        if pack1_dir.resolve() not in fpath.parents and fpath != pack1_dir.resolve():
            raise ValueError(f"Path escapou do pack1-dir: {file_info['path']}")
        fpath.parent.mkdir(parents=True, exist_ok=True)
        fpath.write_text(file_info["content"], encoding="utf-8")
        files_written += 1

    # tests
    for test_info in result.get("tests", []) or []:
        relp = _safe_rel_path(test_info["path"])
        tpath = (pack1_dir / relp).resolve()
        if pack1_dir.resolve() not in tpath.parents and tpath != pack1_dir.resolve():
            raise ValueError(f"Path escapou do pack1-dir: {test_info['path']}")
        tpath.parent.mkdir(parents=True, exist_ok=True)
        tpath.write_text(test_info["content"], encoding="utf-8")
        files_written += 1

    # docker
    docker = result.get("docker", {}) or {}
    if docker.get("dockerfile"):
        (pack1_dir / "Dockerfile").write_text(docker["dockerfile"], encoding="utf-8")
        files_written += 1
    if docker.get("compose"):
        (pack1_dir / "docker-compose.yml").write_text(docker["compose"], encoding="utf-8")
        files_written += 1

    # dependencies
    deps = result.get("dependencies", {}) or {}
    if deps.get("python"):
        (pack1_dir / "requirements.txt").write_text("\n".join(deps["python"]) + "\n", encoding="utf-8")
        files_written += 1
    if deps.get("node"):
        pkg = {"name": args.module, "version": "0.0.1", "dependencies": {d: "latest" for d in deps["node"]}}
        (pack1_dir / "package.json").write_text(json.dumps(pkg, indent=2), encoding="utf-8")
        files_written += 1

    # runbooks
    runbooks = result.get("runbooks", {}) or {}
    if runbooks:
        rb_dir = pack1_dir / "runbooks"
        rb_dir.mkdir(parents=True, exist_ok=True)
        for name, content in runbooks.items():
            if isinstance(content, str) and content.strip():
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
    it = meta["input_tokens"]
    ot = meta["output_tokens"]
    if it is not None or ot is not None:
        print(f"   📊 Tokens: {it} in / {ot} out")


if __name__ == "__main__":
    main()
