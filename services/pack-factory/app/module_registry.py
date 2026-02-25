"""
Module Registry — resolves module config from module_registry.json.
Zero-code module addition: add entry to JSON, factory adapts.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any

_REGISTRY_PATH = Path(__file__).parent / "module_registry.json"
_cache: Optional[Dict] = None


def _load() -> Dict:
    global _cache
    if _cache is None:
        _cache = json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    return _cache


def resolve(module_name: str) -> Optional[Dict[str, Any]]:
    """Resolve module by canonical name or alias. Returns module config dict or None."""
    reg = _load()
    key = _normalize(module_name)
    modules = reg.get("modules", {})

    # Direct match
    if key in modules:
        return modules[key]

    # Alias match
    for mod_key, mod_cfg in modules.items():
        aliases = [_normalize(a) for a in mod_cfg.get("aliases", [])]
        if key in aliases:
            return mod_cfg

    return None


def resolve_key(module_name: str) -> Optional[str]:
    """Resolve module to its canonical registry key, or None."""
    reg = _load()
    key = _normalize(module_name)
    modules = reg.get("modules", {})

    if key in modules:
        return key

    for mod_key, mod_cfg in modules.items():
        aliases = [_normalize(a) for a in mod_cfg.get("aliases", [])]
        if key in aliases:
            return mod_key

    return None


def get_required_docs(module_name: str) -> List[str]:
    """Get required_docs for module, or empty list if unknown."""
    cfg = resolve(module_name)
    if cfg:
        return cfg.get("required_docs", [])
    return []


def get_slices(module_name: str) -> Optional[Dict]:
    """Get slices config for module, or None."""
    cfg = resolve(module_name)
    if cfg:
        return cfg.get("slices")
    return None


def get_events(module_name: str) -> List[Dict]:
    """Get events for module, or empty list."""
    cfg = resolve(module_name)
    if cfg:
        return cfg.get("events", [])
    return []


def get_content_checks(module_name: str) -> List[Dict]:
    """Get content validation checks for module."""
    cfg = resolve(module_name)
    if cfg:
        return cfg.get("content_checks", [])
    return []


def get_references(module_name: str) -> List[Dict]:
    """Get references for module, or empty list."""
    cfg = resolve(module_name)
    if cfg:
        return cfg.get("references", [])
    return []


def get_budgets(module_name: str) -> Optional[Dict]:
    """Get budgets for module, or None."""
    cfg = resolve(module_name)
    if cfg:
        return cfg.get("budgets")
    return None


def get_template() -> Dict:
    """Get the _template entry for creating new modules."""
    reg = _load()
    return reg.get("_template", {})


def list_modules() -> List[str]:
    """List all registered module canonical keys."""
    reg = _load()
    return list(reg.get("modules", {}).keys())


def is_registered(module_name: str) -> bool:
    """Check if module is in registry."""
    return resolve(module_name) is not None


def _normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
