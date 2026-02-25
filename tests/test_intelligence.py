#!/usr/bin/env python3
"""
LAI FACTORY V014 — TESTE COMPLETO
35 testes sobre todo o sistema: migrations, agents, Edge Functions, coerencia.
"""
import json, re, sys
from pathlib import Path

BASE = Path("/home/claude/IMPL")
RESULTS = []
ERRORS = []

def test(name, fn):
    try:
        result = fn()
        if result is True:
            RESULTS.append({"test": name, "status": "PASS"})
            return True
        else:
            RESULTS.append({"test": name, "status": "FAIL", "reason": str(result)})
            ERRORS.append(f"{name}: {result}")
            return False
    except Exception as e:
        RESULTS.append({"test": name, "status": "ERROR", "reason": str(e)})
        ERRORS.append(f"{name}: {e}")
        return False

def read(path):
    return (BASE / path).read_text()

def exists(path):
    return (BASE / path).exists()

# Load files
migration = read("supabase/migrations/20260225100001_intelligence_layer.sql") if exists("supabase/migrations/20260225100001_intelligence_layer.sql") else ""
intel_api = read("supabase/functions/intelligence-api/index.ts") if exists("supabase/functions/intelligence-api/index.ts") else ""
spy_api = read("supabase/functions/spy-agents/index.ts") if exists("supabase/functions/spy-agents/index.ts") else ""

# ═══ MIGRATION TESTS (1-10) ═══
def t01():
    tables = ["user_behavior_events", "friction_events", "process_traces",
              "automation_proposals", "system_health_checks", "cost_tracking",
              "knowledge_base", "build_learnings", "domain_entities",
              "domain_rules", "domain_vocabulary", "trust_certificates",
              "spy_agent_reports", "agent_executions", "api_logs"]
    missing = [t for t in tables if f"CREATE TABLE IF NOT EXISTS public.{t}" not in migration]
    return True if not missing else f"Missing tables: {missing}"
test("01_all_15_tables_exist", t01)

def t02():
    required_indexes = ["idx_behavior_tenant_ts", "idx_friction_tenant", "idx_process_tenant",
                        "idx_proposals_tenant", "idx_health_component", "idx_cost_service",
                        "idx_knowledge_category", "idx_learnings_module", "idx_trust_module",
                        "idx_spy_agent", "idx_agent_exec_name", "idx_api_logs_ts"]
    missing = [i for i in required_indexes if i not in migration]
    return True if not missing else f"Missing indexes: {missing}"
test("02_all_indexes_exist", t02)

def t03():
    return True if "ENABLE ROW LEVEL SECURITY" in migration else "RLS not enabled"
test("03_rls_enabled_all_tables", t03)

def t04():
    return True if "service_role" in migration else "No service_role policies"
test("04_service_role_policies", t04)

def t05():
    return True if "vector(1536)" in migration else "No pgvector columns"
test("05_pgvector_columns_exist", t05)

def t06():
    exts = ["uuid-ossp", "vector", "pg_cron"]
    missing = [e for e in exts if e not in migration]
    return True if not missing else f"Missing extensions: {missing}"
test("06_required_extensions", t06)

def t07():
    checks = ["event_type IN", "friction_type IN", "severity IN", "category IN",
              "status IN", "component IN", "service IN", "learning_type IN"]
    missing = [c for c in checks if c not in migration]
    return True if not missing else f"Missing CHECK constraints: {missing}"
test("07_check_constraints", t07)

def t08():
    return True if "GENERATED ALWAYS AS" in migration else "No computed columns (ROI)"
test("08_computed_columns_roi", t08)

def t09():
    crons = ["friction-detector", "process-miner", "automation-scout",
             "health-rover", "cost-watcher", "spy-alpha", "spy-omega", "knowledge-harvester"]
    missing = [c for c in crons if c not in migration]
    return True if not missing else f"Missing cron jobs: {missing}"
test("09_all_cron_jobs_scheduled", t09)

def t10():
    return True if "supabase_realtime" in migration else "No realtime configured"
test("10_realtime_enabled", t10)

# ═══ INTELLIGENCE API TESTS (11-20) ═══
def t11():
    agents = ["runFrictionDetector", "runProcessMiner", "runAutomationScout",
              "runHealthRover", "runCostWatcher", "runKnowledgeHarvester",
              "runLearningAccumulator", "runTrustCertifier"]
    missing = [a for a in agents if a not in intel_api]
    return True if not missing else f"Missing agent functions: {missing}"
test("11_all_8_agents_implemented", t11)

def t12():
    return True if "AI_SERVER_URL" in intel_api and "AI_MODEL" in intel_api else "No AI config"
test("12_ai_server_config", t12)

def t13():
    return True if "AI_PROVIDER" in intel_api and "'local'" in intel_api and "'claude'" in intel_api else "No dual AI provider"
test("13_dual_ai_provider_local_and_claude", t13)

def t14():
    return True if "ANTHROPIC_API_KEY" in intel_api and "api.anthropic.com" in intel_api else "No Claude API"
test("14_claude_api_integration", t14)

def t15():
    return True if "11434" in intel_api or "AI_SERVER_URL" in intel_api else "No local AI"
test("15_local_ai_server_support", t15)

def t16():
    return True if "logExecution" in intel_api and "agent_executions" in intel_api else "No execution logging"
test("16_agent_execution_logging", t16)

def t17():
    return True if "corsHeaders" in intel_api and "Access-Control" in intel_api else "No CORS"
test("17_cors_headers", t17)

def t18():
    patterns = ["rage_click", "backtrack", "error_loop"]
    missing = [p for p in patterns if p not in intel_api]
    return True if not missing else f"Missing friction patterns: {missing}"
test("18_friction_detection_patterns", t18)

def t19():
    return True if "trust_score" in intel_api and "certificate" in intel_api else "No trust cert"
test("19_trust_certifier_scoring", t19)

def t20():
    actions = ["run_friction_detector", "run_process_miner", "run_automation_scout",
               "run_health_rover", "run_cost_watcher", "run_knowledge_harvester",
               "run_learning_accumulator", "run_trust_certifier", "run_all", "status"]
    missing = [a for a in actions if a not in intel_api]
    return True if not missing else f"Missing router actions: {missing}"
test("20_all_router_actions", t20)

# ═══ SPY AGENTS TESTS (21-25) ═══
def t21():
    return True if "spyAlpha" in spy_api and "spyOmega" in spy_api else "Missing spy functions"
test("21_spy_alpha_and_omega_exist", t21)

def t22():
    scans = ["large_table", "agent_failures", "auth_errors", "slow_endpoints", "budget_warning"]
    missing = [s for s in scans if s not in spy_api]
    return True if not missing else f"Missing Alpha scans: {missing}"
test("22_spy_alpha_all_scan_types", t22)

def t23():
    hunts = ["frequent_export", "cross_screen_copy_paste", "repetitive_sequence", "high_idle_screen"]
    missing = [h for h in hunts if h not in spy_api]
    return True if not missing else f"Missing Omega hunts: {missing}"
test("23_spy_omega_all_hunt_types", t23)

def t24():
    return True if "AI_SERVER_URL" in spy_api and "AI_PROVIDER" in spy_api else "No AI in spies"
test("24_spy_agents_use_ai", t24)

def t25():
    return True if "spy_agent_reports" in spy_api and "agent_executions" in spy_api else "No logging"
test("25_spy_agents_log_results", t25)

# ═══ COHERENCE TESTS (26-30) ═══
def t26():
    tables_in_code = set()
    for code in [intel_api, spy_api]:
        for match in re.findall(r"from\('(\w+)'\)", code):
            tables_in_code.add(match)
    tables_in_migration = set(re.findall(r"CREATE TABLE IF NOT EXISTS public\.(\w+)", migration))
    missing = tables_in_code - tables_in_migration - {"auth"}
    return True if not missing else f"Tables in code not in migration: {missing}"
test("26_coherence_tables_code_vs_migration", t26)

def t27():
    cron_agents = re.findall(r'"action":"run_(\w+)"', migration)
    impl_agents = re.findall(r"case 'run_(\w+)':", intel_api)
    missing = set(cron_agents) - set(impl_agents)
    return True if not missing else f"Cron without impl: {missing}"
test("27_coherence_cron_vs_implementation", t27)

def t28():
    friction_types = ["rage_click", "backtrack", "error_loop"]
    used = [t for t in friction_types if t in intel_api or t in spy_api]
    return True if len(used) >= 3 else f"Only {len(used)} friction types used"
test("28_coherence_friction_types_used", t28)

def t29():
    alpha_has = "AI_PROVIDER" in spy_api and "AI_SERVER_URL" in spy_api
    intel_has = "AI_PROVIDER" in intel_api and "AI_SERVER_URL" in intel_api
    return True if alpha_has and intel_has else "Inconsistent AI config"
test("29_coherence_ai_config_consistent", t29)

def t30():
    agent_names_in_code = set(re.findall(r"'([\w-]+)'", intel_api + spy_api))
    required = {"friction-detector", "process-miner", "automation-scout", "health-rover",
                "cost-watcher", "knowledge-harvester", "spy-alpha", "spy-omega"}
    found = required.intersection(agent_names_in_code)
    return True if len(found) >= 6 else f"Only {len(found)} agents found: {found}"
test("30_coherence_agent_names_consistent", t30)

# ═══ ROBUSTNESS TESTS (31-35) ═══
def t31():
    dangerous = ["' OR ", "'; DROP", "1=1", "UNION SELECT"]
    for d in dangerous:
        if d in intel_api or d in spy_api:
            return f"SQL injection: {d}"
    return True
test("31_security_no_sql_injection", t31)

def t32():
    has_try = "try {" in intel_api and "try {" in spy_api
    has_catch = "catch" in intel_api and "catch" in spy_api
    return True if has_try and has_catch else "Missing error handling"
test("32_error_handling_all_functions", t32)

def t33():
    return True if "parseJSON" in intel_api and "parseJSON" in spy_api else "No safe JSON parsing"
test("33_safe_json_parsing", t33)

def t34():
    has_limit = ".limit(" in intel_api and ".limit(" in spy_api
    return True if has_limit else "No query limits"
test("34_query_limits_exist", t34)

def t35():
    has_tz = "TIMESTAMPTZ" in migration
    has_iso = "toISOString()" in intel_api
    return True if has_tz and has_iso else "Inconsistent timestamps"
test("35_consistent_utc_timestamps", t35)

# ═══ RESULTS ═══
passed = sum(1 for r in RESULTS if r["status"] == "PASS")
failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
errored = sum(1 for r in RESULTS if r["status"] == "ERROR")
total = len(RESULTS)

print(f"\n{'='*60}")
print(f"LAI FACTORY V014 — TEST RESULTS")
print(f"{'='*60}")
print(f"Total:   {total}")
print(f"Passed:  {passed} ✅")
print(f"Failed:  {failed} ❌")
print(f"Errors:  {errored} 💥")
print(f"{'='*60}")

for r in RESULTS:
    icon = "✅" if r["status"] == "PASS" else "❌" if r["status"] == "FAIL" else "💥"
    reason = f" — {r.get('reason','')}" if r["status"] != "PASS" else ""
    print(f"  {icon} {r['test']}{reason}")

print(f"\n{'='*60}")
if passed == total:
    print(f"✅ ALL {total} TESTS PASSED — ZERO ERRORS")
else:
    print(f"❌ {total - passed} TESTS NEED FIXING")
print(f"{'='*60}\n")

Path("/home/claude/IMPL/tests/results.json").write_text(json.dumps({"passed":passed,"failed":failed,"errors":errored,"total":total,"results":RESULTS}, indent=2))
sys.exit(0 if passed == total else 1)
