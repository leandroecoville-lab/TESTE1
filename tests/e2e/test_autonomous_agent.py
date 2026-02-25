"""
Testes do Autonomous Agent (V013).
Valida o pipeline autônomo em modo simulação (sem API key).
"""
import json
import os
import subprocess
import sys
from pathlib import Path

CLI = [sys.executable, "-m", "app.cli"]
FACTORY_ROOT = Path(__file__).resolve().parents[2]  # tests/e2e/.. -> tests/.. -> factory root
PACK_FACTORY = FACTORY_ROOT / "services" / "pack-factory"
OUT = FACTORY_ROOT / "_out"


def _run(args, extra_env=None, **kw):
    env = {**os.environ,
           "PYTHONPATH": str(PACK_FACTORY) + os.pathsep + str(FACTORY_ROOT) + os.pathsep + str(FACTORY_ROOT / "_shims")}
    if extra_env:
        env.update(extra_env)
    return subprocess.run(CLI + args, capture_output=True, text=True, cwd=str(FACTORY_ROOT), env=env, **kw)


def test_auto_build_simulation_mode():
    """auto-build em modo simulação (sem ANTHROPIC_API_KEY) gera pipeline_result.json."""
    # Primeiro gerar um Pack0 para usar como input
    pack0_dir = OUT / "auto_test_pack0"
    pack0_dir.mkdir(parents=True, exist_ok=True)
    r = _run(["plan-pack0", "--module", "test-auto", "--out", str(pack0_dir)])
    assert r.returncode == 0, f"plan-pack0 falhou: {r.stderr}"

    # Rodar auto-build (modo simulação, sem API key)
    build_dir = OUT / "auto_test_build"
    env_clean = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    env_clean["PYTHONPATH"] = str(PACK_FACTORY) + os.pathsep + str(FACTORY_ROOT) + os.pathsep + str(FACTORY_ROOT / "_shims")
    r2 = subprocess.run(
        CLI + ["auto-build",
               "--module", "test-auto",
               "--pack0", str(pack0_dir),
               "--out", str(build_dir),
               "--max-heal", "1"],
        capture_output=True, text=True, cwd=str(FACTORY_ROOT), env=env_clean,
    )
    # Em modo simulação vai falhar nos testes (código é placeholder)
    # Mas deve gerar o pipeline_result.json
    result_path = build_dir / "pipeline_result.json"
    assert result_path.exists(), f"pipeline_result.json não gerado. stdout={r2.stdout[-500:]}, stderr={r2.stderr[-500:]}"
    data = json.loads(result_path.read_text())
    assert data["module"] == "test-auto"
    assert data["trace_id"]  # trace_id presente
    assert len(data["steps"]) >= 1  # pelo menos codegen rodou
    print(f"✅ auto-build simulação: status={data['status']}, steps={len(data['steps'])}")


def test_auto_full_simulation_mode():
    """auto-full gera Pack0 + roda auto-build automaticamente."""
    out_dir = OUT / "auto_full_test"
    env_clean = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    env_clean["PYTHONPATH"] = str(PACK_FACTORY) + os.pathsep + str(FACTORY_ROOT) + os.pathsep + str(FACTORY_ROOT / "_shims")
    r = subprocess.run(
        CLI + ["auto-full",
               "--module", "test-full",
               "--out", str(out_dir),
               "--max-heal", "1"],
        capture_output=True, text=True, cwd=str(FACTORY_ROOT), env=env_clean,
    )
    # Verifica que Pack0 foi gerado
    pack0_dir = out_dir / "pack0"
    assert pack0_dir.exists(), "Pack0 dir não criado"
    # Pack0 gera em subdirectory pack0-{module}-0.0.1/docs/PLAN.md
    plan_files = list(pack0_dir.rglob("PLAN.md"))
    assert len(plan_files) > 0, f"PLAN.md não encontrado em {pack0_dir}"

    # Verifica que build rodou
    build_dir = out_dir / "build"
    result_path = build_dir / "pipeline_result.json"
    assert result_path.exists(), f"pipeline_result.json não gerado no build"
    data = json.loads(result_path.read_text())
    assert data["module"] == "test-full"
    print(f"✅ auto-full simulação: status={data['status']}, steps={len(data['steps'])}")


def test_auto_build_cli_help():
    """auto-build aparece no --help."""
    r = _run(["auto-build", "--help"])
    assert r.returncode == 0
    assert "auto" in r.stdout.lower() or "pipeline" in r.stdout.lower()
    print("✅ auto-build --help ok")


def test_auto_full_cli_help():
    """auto-full aparece no --help."""
    r = _run(["auto-full", "--help"])
    assert r.returncode == 0
    assert "auto" in r.stdout.lower() or "pipeline" in r.stdout.lower()
    print("✅ auto-full --help ok")


if __name__ == "__main__":
    test_auto_build_cli_help()
    test_auto_full_cli_help()
    test_auto_build_simulation_mode()
    test_auto_full_simulation_mode()
    print("\n🎯 Todos os testes do autonomous agent passaram!")
