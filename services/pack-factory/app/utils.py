from __future__ import annotations
import hashlib
import json
from pathlib import Path

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def utc_now_iso() -> str:
    import datetime
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
