#!/usr/bin/env python3
"""
LAI FACTORY V014 — TESTE FINAL (Round 2)
35 testes incluindo frontend, docs, coerência cross-file
"""
import json, re, sys
from pathlib import Path

BASE = Path("/home/claude/IMPL")
R = []
E = []

def test(name, fn):
    try:
        result = fn()
        if result is True:
            R.append({"test": name, "status": "PASS"})
        else:
            R.append({"test": name, "status": "FAIL", "reason": str(result)})
            E.append(f"{name}: {result}")
    except Exception as e:
        R.append({"test": name, "status": "ERROR", "reason": str(e)})
        E.append(f"{name}: {e}")

def read(p): return (BASE / p).read_text()
def exists(p): return (BASE / p).exists()

mig = read("supabase/migrations/20260225100001_intelligence_layer.sql")
api = read("supabase/functions/intelligence-api/index.ts")
spy = read("supabase/functions/spy-agents/index.ts")
tracker = read("frontend/lai-behavior-tracker.js")
lovable = read("frontend/lovable-integration-guide.jsx")
docs = read("docs/ARCHITECTURE.md")

# === FILE EXISTENCE (1-5) ===
test("01_migration_exists", lambda: True if len(mig) > 5000 else "Too short")
test("02_intelligence_api_exists", lambda: True if len(api) > 5000 else "Too short")
test("03_spy_agents_exists", lambda: True if len(spy) > 3000 else "Too short")
test("04_behavior_tracker_exists", lambda: True if len(tracker) > 1000 else "Too short")
test("05_lovable_guide_exists", lambda: True if len(lovable) > 5000 else "Too short")

# === MIGRATION (6-12) ===
test("06_15_tables", lambda: True if len(re.findall(r"CREATE TABLE", mig)) >= 15 else f"Only {len(re.findall('CREATE TABLE', mig))}")
test("07_12_indexes", lambda: True if len(re.findall(r"CREATE INDEX", mig)) >= 12 else f"Only {len(re.findall('CREATE INDEX', mig))}")
test("08_rls_all", lambda: True if "ENABLE ROW LEVEL SECURITY" in mig else "No RLS")
test("09_pgvector", lambda: True if "vector(1536)" in mig and "ivfflat" in mig else "Missing pgvector")
test("10_pg_cron", lambda: True if "pg_cron" in mig and "cron.schedule" in mig else "No cron")
test("11_computed_roi", lambda: True if "GENERATED ALWAYS AS" in mig and "roi_hours_per_month" in mig else "No ROI")
test("12_realtime", lambda: True if mig.count("supabase_realtime") >= 5 else f"Only {mig.count('supabase_realtime')} realtime tables")

# === INTELLIGENCE API (13-20) ===
test("13_all_agents", lambda: True if all(a in api for a in ["runFrictionDetector","runProcessMiner","runAutomationScout","runHealthRover","runCostWatcher","runKnowledgeHarvester","runLearningAccumulator","runTrustCertifier"]) else "Missing agents")
test("14_dual_ai", lambda: True if "AI_PROVIDER" in api and "local" in api and "claude" in api else "No dual AI")
test("15_error_handling", lambda: True if api.count("try {") >= 3 and api.count("catch") >= 3 else "Weak error handling")
test("16_safe_json", lambda: True if "parseJSON" in api and "```json" in api else "No safe parse")
test("17_query_limits", lambda: True if api.count(".limit(") >= 5 else f"Only {api.count('.limit(')} limits")
test("18_cors", lambda: True if "Access-Control-Allow-Origin" in api else "No CORS")
test("19_friction_patterns", lambda: True if all(p in api for p in ["rage_click","backtrack","error_loop"]) else "Missing patterns")
test("20_trust_score_calc", lambda: True if "testScore" in api and "gateScore" in api and "securityScore" in api else "No score calc")

# === SPY AGENTS (21-25) ===
test("21_both_spies", lambda: True if "spyAlpha" in spy and "spyOmega" in spy else "Missing spy")
test("22_alpha_scans", lambda: True if all(s in spy for s in ["large_table","agent_failures","slow_endpoints"]) else "Missing Alpha scans")
test("23_omega_hunts", lambda: True if all(h in spy for h in ["frequent_export","copy_paste","repetitive_sequence"]) else "Missing Omega hunts")
test("24_spy_ai", lambda: True if "askAI" in spy and "AI_SERVER_URL" in spy else "No AI in spies")
test("25_spy_logging", lambda: True if "spy_agent_reports" in spy and "agent_executions" in spy else "No logging")

# === FRONTEND TRACKER (26-28) ===
test("26_tracker_events", lambda: True if all(e in tracker for e in ["click","navigate","copy","paste","export","error","idle","rage_click"]) else "Missing events")
test("27_tracker_flush", lambda: True if "flush" in tracker and "user_behavior_events" in tracker else "No flush")
test("28_tracker_session", lambda: True if "sessionId" in tracker and "crypto.randomUUID" in tracker else "No session")

# === LOVABLE GUIDE (29-31) ===
test("29_lovable_hooks", lambda: True if all(h in lovable for h in ["useIntelligence","useSpyReports","useTrustCertificates"]) else "Missing hooks")
test("30_lovable_pages", lambda: True if all(p in lovable for p in ["IntelligenceDashboard","SpyDashboard","TrustCertificates"]) else "Missing pages")
test("31_lovable_behavior", lambda: True if "BehaviorTracker" in lovable and "App.jsx" in lovable else "No BehaviorTracker guide")

# === CROSS-FILE COHERENCE (32-35) ===
def t32():
    """Tables in Edge Functions match migration"""
    code_tables = set(re.findall(r"from\('(\w+)'\)", api + spy))
    mig_tables = set(re.findall(r"CREATE TABLE IF NOT EXISTS public\.(\w+)", mig))
    missing = code_tables - mig_tables - {"auth"}
    return True if not missing else f"Missing: {missing}"
test("32_tables_match_migration", t32)

def t33():
    """Frontend references match backend tables"""
    front_tables = set(re.findall(r"from\('(\w+)'\)", lovable))
    mig_tables = set(re.findall(r"CREATE TABLE IF NOT EXISTS public\.(\w+)", mig))
    missing = front_tables - mig_tables
    return True if not missing else f"Frontend refs missing tables: {missing}"
test("33_frontend_tables_match_backend", t33)

def t34():
    """All cron jobs have matching router entries"""
    cron_actions = set(re.findall(r'"action":"(run_\w+)"', mig))
    router_actions = set(re.findall(r"case '(run_\w+)':", api))
    missing = cron_actions - router_actions
    return True if not missing else f"Cron without router: {missing}"
test("34_cron_matches_router", t34)

def t35():
    """Documentation covers all components"""
    required = ["Behavior Tracker", "Friction Detector", "Process Miner", "Automation Scout",
                 "Health Rover", "Cost Watcher", "Knowledge Harvester", "Spy Alpha", "Spy Omega",
                 "Trust Cert", "Learning Accumulator", "Barreira 1", "Barreira 2", "Barreira 3"]
    missing = [r for r in required if r not in docs]
    return True if not missing else f"Docs missing: {missing}"
test("35_docs_complete", t35)

# === RESULTS ===
passed = sum(1 for r in R if r["status"] == "PASS")
total = len(R)

print(f"\n{'='*60}")
print(f"LAI FACTORY V014 — FINAL TEST (Round 2)")
print(f"{'='*60}")
print(f"Total: {total} | Passed: {passed} ✅ | Failed: {total-passed} ❌")
print(f"{'='*60}")
for r in R:
    icon = "✅" if r["status"] == "PASS" else "❌"
    extra = f" — {r.get('reason','')}" if r["status"] != "PASS" else ""
    print(f"  {icon} {r['test']}{extra}")

print(f"\n{'='*60}")
print(f"{'✅ ALL '+str(total)+' TESTS PASSED — ZERO ERRORS' if passed==total else '❌ '+str(total-passed)+' NEED FIXING'}")
print(f"{'='*60}\n")

sys.exit(0 if passed==total else 1)
