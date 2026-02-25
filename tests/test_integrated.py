#!/usr/bin/env python3
"""
LAI FACTORY V014 + INTELLIGENCE LAYER — TESTE INTEGRADO FINAL
35 testes cobrindo: fábrica, intelligence, integração, coerência
"""
import json, re, sys
from pathlib import Path

B = Path("/tmp/factory_work/lai-software-factory")
R, E = [], []

def test(n, fn):
    try:
        r = fn()
        R.append({"t": n, "s": "PASS"}) if r is True else (R.append({"t": n, "s": "FAIL", "r": str(r)}), E.append(f"{n}: {r}"))
    except Exception as e:
        R.append({"t": n, "s": "ERR", "r": str(e)}); E.append(f"{n}: {e}")

def rd(p): return (B / p).read_text()
def ex(p): return (B / p).exists()

# === FACTORY ENGINE (1-8) ===
test("01_autonomous_agent", lambda: True if ex("services/pack-factory/app/autonomous_agent.py") and len(rd("services/pack-factory/app/autonomous_agent.py")) > 30000 else "Missing/short")
test("02_clone_engineer", lambda: True if ex("services/pack-factory/app/clone_engineer.py") else "Missing")
test("03_intelligence_hook", lambda: True if ex("services/pack-factory/app/intelligence_hook.py") and "post_build_intelligence" in rd("services/pack-factory/app/intelligence_hook.py") else "Missing hook")
test("04_hook_integrated", lambda: True if "_INTELLIGENCE_AVAILABLE" in rd("services/pack-factory/app/autonomous_agent.py") and "post_build_intelligence" in rd("services/pack-factory/app/autonomous_agent.py") else "Hook not integrated")
test("05_query_learnings", lambda: True if "query_learnings" in rd("services/pack-factory/app/intelligence_hook.py") else "No query_learnings")
test("06_query_domain_rules", lambda: True if "query_domain_rules" in rd("services/pack-factory/app/intelligence_hook.py") else "No domain rules")
test("07_planner", lambda: True if ex("services/pack-factory/app/planner.py") else "Missing")
test("08_module_registry", lambda: True if ex("services/pack-factory/app/module_registry.json") else "Missing")

# === GITHUB ACTIONS (9-10) ===
test("09_factory_workflow", lambda: True if ex(".github/workflows/factory.yml") and len(rd(".github/workflows/factory.yml")) > 5000 else "Missing/short")
test("10_pre_factory_workflow", lambda: True if ex(".github/workflows/pre-factory.yml") else "Missing")

# === SUPABASE — ORIGINAL (11-14) ===
test("11_migration_factory", lambda: True if ex("supabase/migrations/20260225000001_factory_builds.sql") else "Missing")
test("12_migration_crm", lambda: True if ex("supabase/migrations/20260225000002_crm_contacts.sql") else "Missing")
test("13_edge_fn_api", lambda: True if ex("supabase/functions/api/index.ts") else "Missing")
test("14_edge_fn_trigger", lambda: True if ex("supabase/functions/trigger-factory/index.ts") else "Missing")

# === SUPABASE — INTELLIGENCE (15-19) ===
mig = rd("supabase/migrations/20260225100001_intelligence_layer.sql") if ex("supabase/migrations/20260225100001_intelligence_layer.sql") else ""
api = rd("supabase/functions/intelligence-api/index.ts") if ex("supabase/functions/intelligence-api/index.ts") else ""
spy = rd("supabase/functions/spy-agents/index.ts") if ex("supabase/functions/spy-agents/index.ts") else ""

test("15_migration_intelligence", lambda: True if len(mig) > 5000 and mig.count("CREATE TABLE") >= 15 else f"Tables: {mig.count('CREATE TABLE')}")
test("16_edge_fn_intelligence", lambda: True if len(api) > 5000 and "runFrictionDetector" in api else "Missing agents")
test("17_edge_fn_spies", lambda: True if len(spy) > 3000 and "spyAlpha" in spy and "spyOmega" in spy else "Missing spies")
test("18_all_5_edge_functions", lambda: True if all(ex(f"supabase/functions/{fn}/index.ts") for fn in ["api", "trigger-factory", "factory-callback", "intelligence-api", "spy-agents"]) else "Missing Edge Functions")
test("19_3_migrations", lambda: True if len(list((B / "supabase/migrations").glob("*.sql"))) >= 3 else "Need 3 migrations")

# === FRONTEND (20-23) ===
test("20_app_jsx", lambda: True if ex("frontend/src/App.jsx") and len(rd("frontend/src/App.jsx")) > 10000 else "Missing/short")
test("21_behavior_tracker", lambda: True if ex("frontend/src/intelligence/lai-behavior-tracker.js") and "rage_click" in rd("frontend/src/intelligence/lai-behavior-tracker.js") else "Missing")
test("22_lovable_guide", lambda: True if ex("frontend/src/intelligence/lovable-integration-guide.jsx") and "useIntelligence" in rd("frontend/src/intelligence/lovable-integration-guide.jsx") else "Missing")
test("23_architecture_diagram", lambda: True if ex("frontend/src/intelligence/lai-architecture-diagram.jsx") else "Missing")

# === DOCS + GOVERNANCE (24-26) ===
test("24_intelligence_docs", lambda: True if ex("docs/INTELLIGENCE_ARCHITECTURE.md") and "Barreira" in rd("docs/INTELLIGENCE_ARCHITECTURE.md") else "Missing")
test("25_clone_engineer_vs5", lambda: True if any(ex(f"gpt_builder/mode_clone_engineer_202601/{f}") for f in ["Modo_clone_engenheiro_de_software_VS5.txt"]) else "Missing VS5")
test("26_bootstrap", lambda: True if ex("bootstrap.sh") and "functions deploy" in rd("bootstrap.sh") else "Missing")

# === COHERENCE (27-31) ===
def t27():
    """Intelligence hook calls both learning and trust"""
    hook = rd("services/pack-factory/app/intelligence_hook.py")
    has_learning = "run_learning_accumulator" in hook
    has_trust = "run_trust_certifier" in hook
    return True if has_learning and has_trust else f"learning={has_learning}, trust={has_trust}"
test("27_hook_calls_both_agents", t27)

def t28():
    """All tables in Edge Functions exist in migrations"""
    all_mig = ""
    for f in (B / "supabase/migrations").glob("*.sql"):
        all_mig += f.read_text()
    code_tables = set(re.findall(r"from\('(\w+)'\)", api + spy))
    mig_tables = set(re.findall(r"CREATE TABLE[^.]*public\.(\w+)", all_mig))
    missing = code_tables - mig_tables - {"auth"}
    return True if not missing else f"Missing: {missing}"
test("28_all_tables_in_migrations", t28)

def t29():
    """AI config consistent: local + claude in both functions"""
    both_local = "AI_SERVER_URL" in api and "AI_SERVER_URL" in spy
    both_claude = "ANTHROPIC_API_KEY" in api and "ANTHROPIC_API_KEY" in spy
    return True if both_local and both_claude else "Inconsistent AI config"
test("29_ai_config_consistent", t29)

def t30():
    """RLS on all intelligence tables"""
    return True if "ENABLE ROW LEVEL SECURITY" in mig else "No RLS"
test("30_rls_intelligence", t30)

def t31():
    """Cron jobs match router actions"""
    crons = set(re.findall(r'"action":"(run_\w+)"', mig))
    routes = set(re.findall(r"case '(run_\w+)':", api))
    missing = crons - routes
    return True if not missing else f"Cron without route: {missing}"
test("31_cron_matches_routes", t31)

# === SECURITY + ROBUSTNESS (32-35) ===
test("32_no_hardcoded_keys", lambda: True if not re.search(r"sk-ant-[a-zA-Z0-9]{20,}", api + spy + mig) else "Hardcoded API key!")
test("33_error_handling", lambda: True if api.count("catch") >= 3 and spy.count("catch") >= 3 else "Weak error handling")
test("34_query_limits", lambda: True if api.count(".limit(") >= 5 and spy.count(".limit(") >= 3 else "Missing limits")
test("35_safe_json_parse", lambda: True if "parseJSON" in api and "parseJSON" in spy else "No safe parse")

# === OUTPUT ===
p = sum(1 for r in R if r["s"] == "PASS")
t = len(R)
print(f"\n{'='*60}")
print(f"LAI FACTORY V014 + INTELLIGENCE — INTEGRATED TEST")
print(f"{'='*60}")
print(f"Total: {t} | Passed: {p} ✅ | Failed: {t-p} ❌")
print(f"{'='*60}")
for r in R:
    i = "✅" if r["s"]=="PASS" else "❌"
    x = f" — {r.get('r','')}" if r["s"]!="PASS" else ""
    print(f"  {i} {r['t']}{x}")
print(f"\n{'='*60}")
print(f"{'✅ ALL '+str(t)+' PASSED — ZERO ERRORS' if p==t else '❌ '+str(t-p)+' NEED FIX'}")
print(f"{'='*60}\n")
sys.exit(0 if p==t else 1)
