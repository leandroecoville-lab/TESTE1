from __future__ import annotations

import json
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from . import module_registry

REQUIRED_PATHS = [
    "docs/PLAN.md",
    "docs/PROMPT_CONTINUIDADE.md",
    "docs/TROUBLESHOOTING.md",
    "docs/DEFINITION_OF_DONE.md",
    "runbooks/HOW_TO_RUN.md",
    "runbooks/HOW_TO_DEPLOY.md",
    "runbooks/HOW_TO_ROLLBACK.md",
    "contracts/README.json",
]

REQUIRED_SECTIONS = [
    # SRS baseline (documento_de_requisitos_analise_projeto.pdf)
    "Introdução",
    "Propósito",
    "Escopo",
    "Características dos Usuários",
    "Referências",
    "Visão Geral do Produto",
    "Perspectiva do Produto",
    "Funcionalidades",
    "Ambiente Operacional",
    "Limitações",
    "Suposições e Dependências",
    "Requisitos Funcionais",
    "Requisitos Não Funcionais",
    "Casos de Uso",
    "Diagramas",
    "Rastreabilidade",

    # Pack lifecycle baseline
    "Plano de Implementação",
    "Testes",
    "Aceite",
    "Rollout",
    "Rollback",
    "Definition of Done",
]

@dataclass
class ValidationReport:
    ok: bool
    gaps: List[str]
    checked_paths: List[str]
    checked_sections: List[str]
    meta: Dict[str, str]

def _read_from_zip(z: zipfile.ZipFile, path: str) -> Optional[str]:
    try:
        with z.open(path) as f:
            return f.read().decode("utf-8", errors="ignore")
    except KeyError:
        return None

def _exists_in_zip(z: zipfile.ZipFile, path: str) -> bool:
    try:
        z.getinfo(path)
        return True
    except KeyError:
        return False

def validate_pack0(target: Union[str, Path]) -> ValidationReport:
    """
    Valida se um Pack0 contém as seções mínimas (SRS) + estrutura pack-first.
    Retorna um relatório e marca ok=False se faltarem itens.
    """
    p = Path(target)
    gaps: List[str] = []
    checked_paths = list(REQUIRED_PATHS)
    checked_sections = list(REQUIRED_SECTIONS)
    meta: Dict[str, str] = {}

    plan_text = ""

    if p.is_dir():
        # paths
        for rp in REQUIRED_PATHS:
            if not (p / rp).exists():
                gaps.append(f"missing_path::{rp}")
        # plan
        plan_file = p / "docs/PLAN.md"
        if plan_file.exists():
            plan_text = plan_file.read_text(encoding="utf-8", errors="ignore")
        # manifest meta
        mpath = p / "02_INVENTORY/manifest.json"
        if mpath.exists():
            try:
                m = json.loads(mpath.read_text(encoding="utf-8"))
                meta["pack_id"] = str(m.get("pack_id",""))
                meta["version"] = str(m.get("version",""))
            except Exception:
                pass

    else:
        # zip
        with zipfile.ZipFile(p, "r") as z:
            for rp in REQUIRED_PATHS:
                if not _exists_in_zip(z, rp):
                    gaps.append(f"missing_path::{rp}")

            plan = _read_from_zip(z, "docs/PLAN.md")
            if plan:
                plan_text = plan

            m = _read_from_zip(z, "02_INVENTORY/manifest.json")
            if m:
                try:
                    mj = json.loads(m)
                    meta["pack_id"] = str(mj.get("pack_id",""))
                    meta["version"] = str(mj.get("version",""))
                except Exception:
                    pass


    # MeetCore-first gating (Pack0 precisa carregar slices + budgets + retenção como artefatos explícitos)
    module_name = ""
    pid = meta.get("pack_id", "")
    if pid.startswith("pack0-"):
        module_name = pid[len("pack0-"):].strip().lower()
    elif p.name.startswith("pack0-"):
        # fallback quando manifest não existe
        module_name = p.name.split("-")[1].strip().lower() if "-" in p.name else ""

    # Normalização do nome do módulo (permite aliases sem quebrar gating)
    mod_key = re.sub(r"[^a-z0-9]+", "-", (module_name or "").lower()).strip("-")

    # Registry-based module gating
    mod_cfg = module_registry.resolve(mod_key)
    required_docs = module_registry.get_required_docs(mod_key) if mod_cfg else []
    content_checks = module_registry.get_content_checks(mod_key) if mod_cfg else []

    if required_docs:
        for rp in required_docs:
            if rp not in checked_paths:
                checked_paths.append(rp)
        if p.is_dir():
            for rp in required_docs:
                if not (p / rp).exists():
                    gaps.append(f"missing_path::{rp}")
        else:
            with zipfile.ZipFile(p, "r") as z:
                for rp in required_docs:
                    if not _exists_in_zip(z, rp):
                        gaps.append(f"missing_path::{rp}")

    # Content checks from registry
    if content_checks:
        try:
            for check in content_checks:
                file_path = check.get("file", "")
                content = ""
                if p.is_dir():
                    fp = p / file_path
                    if fp.exists():
                        content = fp.read_text(encoding="utf-8", errors="ignore")
                else:
                    with zipfile.ZipFile(p, "r") as z:
                        content = _read_from_zip(z, file_path) or ""

                if "contains" in check:
                    if check["contains"].lower() not in content.lower().replace(" ", ""):
                        gaps.append(check["error"])
                elif "contains_all" in check:
                    clow = content.lower()
                    if not all(kw in clow for kw in check["contains_all"]):
                        gaps.append(check["error"])
        except Exception:
            gaps.append(f"validation_error::{mod_key}_docs_read_failed")



    # sections
    # Normalize whitespace to avoid false negatives due to line breaks.
    normalized = re.sub(r"\s+", " ", plan_text).lower()
    for sec in REQUIRED_SECTIONS:
        if sec.lower() not in normalized:
            gaps.append(f"missing_section::{sec}")

    # RF/RNF/UC minimal presence checks (ids)
    if not re.search(r"\bRF[-_\s]?\d+", plan_text, re.IGNORECASE):
        gaps.append("missing_trace::RF_ids_not_found")
    if not re.search(r"\bRNF[-_\s]?\d+", plan_text, re.IGNORECASE):
        gaps.append("missing_trace::RNF_ids_not_found")
    if not re.search(r"\bUC[-_\s]?\d+", plan_text, re.IGNORECASE):
        gaps.append("missing_trace::UC_ids_not_found")

    ok = len(gaps) == 0
    return ValidationReport(ok=ok, gaps=gaps, checked_paths=checked_paths, checked_sections=checked_sections, meta=meta)

def report_to_dict(r: ValidationReport) -> Dict:
    return {
        "ok": r.ok,
        "gaps": r.gaps,
        "checked_paths": r.checked_paths,
        "checked_sections": r.checked_sections,
        "meta": r.meta,
    }
