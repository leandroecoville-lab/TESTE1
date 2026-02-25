#!/usr/bin/env python3
"""
Notify Callback — Envia webhook de volta ao Lovable (ou qualquer frontend).
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
from datetime import datetime, timezone

import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", required=True, choices=["phase_complete", "completed", "failed"])
    parser.add_argument("--phase", required=True)
    parser.add_argument("--message", required=True)
    parser.add_argument("--download-url", default="")
    args = parser.parse_args()

    url = os.environ.get("CALLBACK_URL", "").strip()
    secret = os.environ.get("CALLBACK_SECRET", "").strip()
    build_id = os.environ.get("BUILD_ID", "")
    trace_id = os.environ.get("TRACE_ID", "")
    module = os.environ.get("MODULE", "")

    if not url:
        print("⚠️  CALLBACK_URL não definida. Pulando notificação.")
        return

    payload = {
        "build_id": build_id,
        "trace_id": trace_id,
        "module": module,
        "status": args.status,
        "phase": args.phase,
        "message": args.message,
        "download_url": args.download_url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    body = json.dumps(payload, ensure_ascii=False)
    headers = {"Content-Type": "application/json"}

    if secret:
        sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        headers["X-Signature"] = f"sha256={sig}"

    try:
        resp = requests.post(url, data=body, headers=headers, timeout=10)
        print(f"✅ Callback enviado: {resp.status_code}")
    except Exception as e:
        print(f"⚠️  Falha no callback: {e}")
        # Não falhar o workflow por causa de callback


if __name__ == "__main__":
    main()
