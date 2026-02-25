"""
LAI Factory — Intelligence Layer Integration
=============================================
Conecta o motor da fábrica (autonomous_agent) com a Intelligence Layer.
Após cada build: chama Learning Accumulator + Trust Certifier via Edge Function.

Uso:
    from .intelligence_hook import post_build_intelligence
    post_build_intelligence(pipeline_result, supabase_url, service_key)
"""

import json
import os
from typing import Any, Dict, Optional
from dataclasses import asdict

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _http_post(url: str, body: dict, headers: dict) -> dict:
    """HTTP POST usando httpx, requests ou curl."""
    try:
        import httpx
        r = httpx.post(url, json=body, headers=headers, timeout=30)
        return r.json()
    except ImportError:
        pass
    try:
        import requests
        r = requests.post(url, json=body, headers=headers, timeout=30)
        return r.json()
    except ImportError:
        pass
    import subprocess
    cmd = [
        "curl", "-s", "-X", "POST", url,
        "-H", "Content-Type: application/json",
    ]
    for k, v in headers.items():
        cmd.extend(["-H", f"{k}: {v}"])
    cmd.extend(["-d", json.dumps(body)])
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        return json.loads(result.stdout)
    except:
        return {"error": result.stdout or result.stderr}


def _extract_build_metrics(pipeline_result) -> dict:
    """Extrai métricas do PipelineResult para enviar aos agents."""
    try:
        result = asdict(pipeline_result) if hasattr(pipeline_result, '__dataclass_fields__') else pipeline_result
    except:
        result = pipeline_result if isinstance(pipeline_result, dict) else {}

    steps = result.get("steps", [])

    # Count tests
    tests_passed = 0
    tests_total = 0
    for step in steps:
        output = step.get("output", "") if isinstance(step, dict) else ""
        if "pass" in str(output).lower():
            tests_passed += 1
        tests_total += 1

    # Count gates
    gates_passed = 0
    gates_total = 0
    for step in steps:
        step_name = step.get("step", "") if isinstance(step, dict) else ""
        if "gate" in step_name.lower() or "lint" in step_name.lower() or "security" in step_name.lower():
            gates_total += 1
            if (step.get("status", "") if isinstance(step, dict) else "") == "success":
                gates_passed += 1

    # Healing rounds
    heal_rounds = 0
    errors_fixed = []
    for step in steps:
        step_name = step.get("step", "") if isinstance(step, dict) else ""
        if "heal" in step_name.lower():
            heal_rounds += 1
            error = step.get("error", "") if isinstance(step, dict) else ""
            if error:
                errors_fixed.append(str(error)[:100])

    return {
        "module": result.get("module", "unknown"),
        "version": "v014",
        "status": result.get("status", "unknown"),
        "tests_passed": max(tests_passed, gates_passed),
        "tests_total": max(tests_total, 1),
        "gates_passed": gates_passed,
        "gates_total": max(gates_total, 1),
        "heal_rounds": heal_rounds,
        "errors_fixed": errors_fixed,
        "security_clean": not any(
            "security" in (s.get("step", "") if isinstance(s, dict) else "").lower() and
            (s.get("status", "") if isinstance(s, dict) else "") == "failed"
            for s in steps
        ),
        "p95_ms": result.get("duration_ms", 0) // max(len(steps), 1),
        "duration_ms": result.get("duration_ms", 0),
        "artifacts": len(result.get("final_artifacts", [])),
    }


def post_build_intelligence(
    pipeline_result,
    supabase_url: str = "",
    service_key: str = "",
    verbose: bool = True,
) -> Dict[str, Any]:
    """
    Chamado após cada build da Factory.
    Envia resultados para Learning Accumulator + Trust Certifier.

    Returns dict com resultados de ambos os agents.
    """
    url = supabase_url or SUPABASE_URL
    key = service_key or SUPABASE_SERVICE_KEY

    if not url or not key:
        if verbose:
            print("[Intelligence] ⚠️  SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado. Pulando intelligence hook.")
        return {"skipped": True, "reason": "no_credentials"}

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
    }

    metrics = _extract_build_metrics(pipeline_result)
    build_id = f"build-{metrics['module']}-{int(__import__('time').time())}"

    results = {}

    # 1. Learning Accumulator (Barreira 1)
    try:
        if verbose:
            print(f"[Intelligence] 🧠 Calling Learning Accumulator for {build_id}...")
        learning_result = _http_post(
            f"{url}/functions/v1/intelligence-api",
            {
                "action": "run_learning_accumulator",
                "build_id": build_id,
                "build_result": metrics,
            },
            headers,
        )
        results["learning"] = learning_result
        if verbose:
            print(f"[Intelligence] 🧠 Learnings: {learning_result.get('learnings', '?')}")
    except Exception as e:
        results["learning"] = {"error": str(e)}
        if verbose:
            print(f"[Intelligence] ⚠️  Learning failed: {e}")

    # 2. Trust Certifier (Barreira 3)
    try:
        if verbose:
            print(f"[Intelligence] 🔗 Calling Trust Certifier for {build_id}...")
        trust_result = _http_post(
            f"{url}/functions/v1/intelligence-api",
            {
                "action": "run_trust_certifier",
                "build_id": build_id,
                "build_result": metrics,
            },
            headers,
        )
        results["trust"] = trust_result
        if verbose:
            score = trust_result.get("trust_score", "?")
            classification = trust_result.get("classification", "?")
            print(f"[Intelligence] 🔗 Trust Score: {score} ({classification})")
    except Exception as e:
        results["trust"] = {"error": str(e)}
        if verbose:
            print(f"[Intelligence] ⚠️  Trust failed: {e}")

    # 3. Log summary
    if verbose:
        print(f"[Intelligence] ✅ Post-build intelligence complete for {build_id}")
        print(f"[Intelligence]    Module: {metrics['module']}")
        print(f"[Intelligence]    Tests: {metrics['tests_passed']}/{metrics['tests_total']}")
        print(f"[Intelligence]    Gates: {metrics['gates_passed']}/{metrics['gates_total']}")
        print(f"[Intelligence]    Healing: {metrics['heal_rounds']} rounds")
        print(f"[Intelligence]    Duration: {metrics['duration_ms']}ms")

    results["build_id"] = build_id
    results["metrics"] = metrics
    return results


def query_learnings(module_type: str, supabase_url: str = "", service_key: str = "", limit: int = 20) -> list:
    """
    Consulta learnings anteriores antes de gerar código.
    Usado pelo Clone Engineer para melhorar próximo build (Barreira 1).
    """
    url = supabase_url or SUPABASE_URL
    key = service_key or SUPABASE_SERVICE_KEY
    if not url or not key:
        return []

    try:
        query_url = (
            f"{url}/rest/v1/build_learnings"
            f"?module_type=eq.{module_type}"
            f"&confidence=gte.0.6"
            f"&order=confidence.desc"
            f"&limit={limit}"
        )
        import httpx
        r = httpx.get(query_url, headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        }, timeout=10)
        return r.json()
    except:
        return []


def query_domain_rules(vertical: str = "franchising", supabase_url: str = "", service_key: str = "") -> list:
    """
    Consulta regras de domínio antes de gerar código.
    Usado pelo Clone Engineer para DNA vertical (Barreira 2).
    """
    url = supabase_url or SUPABASE_URL
    key = service_key or SUPABASE_SERVICE_KEY
    if not url or not key:
        return []

    try:
        query_url = (
            f"{url}/rest/v1/domain_rules"
            f"?vertical=eq.{vertical}"
            f"&order=mandatory.desc"
        )
        import httpx
        r = httpx.get(query_url, headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
        }, timeout=10)
        return r.json()
    except:
        return []
