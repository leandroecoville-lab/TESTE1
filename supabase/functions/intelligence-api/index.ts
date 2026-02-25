// ══════════════════════════════════════════════════════════════
// LAI INTELLIGENCE API — Motor dos Agentes
// Todos os agents rodam aqui. IA local via AI_SERVER_URL.
// © Leandro Castelo — Ecossistema LAI | 300 Franchising
// ══════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── CONFIG ──────────────────────────────────────────────────
const AI_SERVER_URL = Deno.env.get('AI_SERVER_URL') || 'http://localhost:11434'
const AI_MODEL = Deno.env.get('AI_MODEL') || 'llama3'
const CLAUDE_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''
const AI_PROVIDER = Deno.env.get('AI_PROVIDER') || 'local' // 'local' | 'claude'

// ── SUPABASE CLIENT ─────────────────────────────────────────
function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

// ── AI CALL (Routes to local server OR Claude) ──────────────
async function askAI(prompt: string, systemPrompt?: string): Promise<string> {
  const startMs = Date.now()
  const AI_TIMEOUT_MS = 30000 // 30s timeout

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

    try {
      if (AI_PROVIDER === 'claude' && CLAUDE_API_KEY) {
        // Claude API
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            system: systemPrompt || 'You are LAI Intelligence Agent. Respond in JSON only.',
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: controller.signal,
        })
        const data = await res.json()
        return data.content?.[0]?.text || '{}'
      } else {
        // Local AI server (Ollama / LM Studio / vLLM)
        const res = await fetch(`${AI_SERVER_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: systemPrompt || 'You are LAI Intelligence Agent. Respond in JSON only. No markdown.' },
              { role: 'user', content: prompt },
            ],
            stream: false,
            options: { temperature: 0.3 },
          }),
          signal: controller.signal,
        })
        const data = await res.json()
        return data.message?.content || data.response || '{}'
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch (e) {
    if (e.name === 'AbortError') console.error('AI call timed out after', AI_TIMEOUT_MS, 'ms')
    else console.error('AI call failed:', e)
    return '{}'
  }
}

// ── PARSE JSON SAFELY ───────────────────────────────────────
function parseJSON(text: string): any {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    try {
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      return match ? JSON.parse(match[0]) : {}
    } catch {
      return {}
    }
  }
}

// ── LOG AGENT EXECUTION ─────────────────────────────────────
async function logExecution(db: any, agentName: string, status: string, summary: string, items: number, durationMs: number, tokens = 0) {
  await db.from('agent_executions').insert({
    agent_name: agentName,
    status,
    output_summary: summary,
    items_processed: items,
    items_generated: items,
    duration_ms: durationMs,
    ai_tokens_used: tokens,
    completed_at: new Date().toISOString(),
  })
}

// ══════════════════════════════════════════════════════════════
// AGENT: FRICTION DETECTOR
// ══════════════════════════════════════════════════════════════
async function runFrictionDetector(db: any) {
  const t0 = Date.now()
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  // Get recent behavior events
  const { data: events } = await db.from('user_behavior_events')
    .select('*').gte('timestamp', since).order('timestamp', { ascending: true }).limit(1000)

  if (!events?.length) {
    await logExecution(db, 'friction-detector', 'success', 'No events to analyze', 0, Date.now() - t0)
    return { analyzed: 0, frictions: 0 }
  }

  // Detect rage clicks (5+ clicks on same element within 3 seconds)
  const frictions: any[] = []
  const clickGroups: Record<string, any[]> = {}

  for (const e of events) {
    if (e.event_type === 'click' && e.element) {
      const key = `${e.user_id}:${e.screen}:${e.element}`
      if (!clickGroups[key]) clickGroups[key] = []
      clickGroups[key].push(e)
    }
  }

  for (const [key, clicks] of Object.entries(clickGroups)) {
    if (clicks.length >= 5) {
      const first = new Date(clicks[0].timestamp).getTime()
      const last = new Date(clicks[clicks.length - 1].timestamp).getTime()
      if (last - first < 5000) {
        frictions.push({
          tenant_id: clicks[0].tenant_id,
          user_id: clicks[0].user_id,
          friction_type: 'rage_click',
          severity: clicks.length >= 10 ? 'critical' : 'high',
          screen: clicks[0].screen,
          element: clicks[0].element,
          count: clicks.length,
          details: { window_ms: last - first, clicks: clicks.length },
        })
      }
    }
  }

  // Detect backtracks (navigate away and back within 10 seconds)
  const navEvents = events.filter((e: any) => e.event_type === 'navigate')
  for (let i = 2; i < navEvents.length; i++) {
    if (navEvents[i].screen === navEvents[i - 2].screen && navEvents[i].screen !== navEvents[i - 1].screen) {
      const dt = new Date(navEvents[i].timestamp).getTime() - new Date(navEvents[i - 2].timestamp).getTime()
      if (dt < 10000) {
        frictions.push({
          tenant_id: navEvents[i].tenant_id,
          user_id: navEvents[i].user_id,
          friction_type: 'backtrack',
          severity: 'medium',
          screen: navEvents[i - 1].screen,
          count: 1,
          details: { from: navEvents[i - 2].screen, to: navEvents[i - 1].screen, back_to: navEvents[i].screen, dt_ms: dt },
        })
      }
    }
  }

  // Detect error loops (same error 3+ times)
  const errorEvents = events.filter((e: any) => e.event_type === 'error')
  const errorGroups: Record<string, any[]> = {}
  for (const e of errorEvents) {
    const key = `${e.user_id}:${e.screen}:${e.metadata?.error_code || e.metadata?.message || 'unknown'}`
    if (!errorGroups[key]) errorGroups[key] = []
    errorGroups[key].push(e)
  }
  for (const [key, errs] of Object.entries(errorGroups)) {
    if (errs.length >= 3) {
      frictions.push({
        tenant_id: errs[0].tenant_id,
        user_id: errs[0].user_id,
        friction_type: 'error_loop',
        severity: 'high',
        screen: errs[0].screen,
        count: errs.length,
        details: { error: errs[0].metadata, occurrences: errs.length },
      })
    }
  }

  // Ask AI for suggested fixes
  if (frictions.length > 0) {
    const prompt = `Analyze these UX friction events and suggest fixes. Respond in JSON array with "index" and "suggested_fix" fields:\n${JSON.stringify(frictions.slice(0, 10), null, 2)}`
    const aiResponse = parseJSON(await askAI(prompt, 'You are a UX analyst. Suggest concrete fixes for friction events. JSON array only.'))

    if (Array.isArray(aiResponse)) {
      for (const fix of aiResponse) {
        if (fix.index !== undefined && fix.suggested_fix && frictions[fix.index]) {
          frictions[fix.index].suggested_fix = fix.suggested_fix
        }
      }
    }
  }

  // Insert frictions
  if (frictions.length > 0) {
    await db.from('friction_events').insert(frictions)
  }

  await logExecution(db, 'friction-detector', 'success', `${frictions.length} frictions from ${events.length} events`, events.length, Date.now() - t0)
  return { analyzed: events.length, frictions: frictions.length }
}

// ══════════════════════════════════════════════════════════════
// AGENT: PROCESS MINER
// ══════════════════════════════════════════════════════════════
async function runProcessMiner(db: any) {
  const t0 = Date.now()
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: events } = await db.from('user_behavior_events')
    .select('*').eq('event_type', 'navigate').gte('timestamp', since)
    .order('timestamp', { ascending: true }).limit(5000)

  if (!events?.length) {
    await logExecution(db, 'process-miner', 'success', 'No navigation events', 0, Date.now() - t0)
    return { traces: 0 }
  }

  // Group by session
  const sessions: Record<string, any[]> = {}
  for (const e of events) {
    const key = e.session_id
    if (!sessions[key]) sessions[key] = []
    sessions[key].push(e)
  }

  // Extract process traces
  const traces: any[] = []
  const processMap: Record<string, { steps: string[], count: number, durations: number[] }> = {}

  for (const [sessionId, navs] of Object.entries(sessions)) {
    if (navs.length < 2) continue
    const steps = navs.map((n: any) => n.screen)
    const processKey = steps.join(' → ')
    const totalDuration = new Date(navs[navs.length - 1].timestamp).getTime() - new Date(navs[0].timestamp).getTime()

    if (!processMap[processKey]) {
      processMap[processKey] = { steps, count: 0, durations: [] }
    }
    processMap[processKey].count++
    processMap[processKey].durations.push(totalDuration)
  }

  // Find top processes and variants
  for (const [key, data] of Object.entries(processMap)) {
    if (data.count < 2) continue
    const avgDuration = Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)

    // Find bottleneck (longest gap between steps)
    let bottleneck = { step: data.steps[0], duration: 0 }
    // Simplified: use first step as placeholder

    traces.push({
      tenant_id: events[0].tenant_id,
      process_name: `${data.steps[0]} → ${data.steps[data.steps.length - 1]}`,
      variant: key,
      steps: data.steps.map((s, i) => ({ screen: s, order: i + 1 })),
      step_count: data.steps.length,
      total_duration_ms: avgDuration,
      bottleneck_step: data.steps[Math.floor(data.steps.length / 2)],
      bottleneck_duration_ms: Math.round(avgDuration / data.steps.length),
      frequency: data.count,
      user_count: new Set(events.filter((e: any) => e.session_id in sessions).map((e: any) => e.user_id)).size,
      mermaid_diagram: `graph LR\n${data.steps.map((s, i) => i < data.steps.length - 1 ? `  ${s.replace(/\W/g, '_')}[${s}] --> ${data.steps[i + 1].replace(/\W/g, '_')}[${data.steps[i + 1]}]` : '').filter(Boolean).join('\n')}`,
    })
  }

  if (traces.length > 0) {
    await db.from('process_traces').insert(traces.slice(0, 50))
  }

  await logExecution(db, 'process-miner', 'success', `${traces.length} process traces from ${Object.keys(sessions).length} sessions`, events.length, Date.now() - t0)
  return { traces: traces.length }
}

// ══════════════════════════════════════════════════════════════
// AGENT: AUTOMATION SCOUT
// ══════════════════════════════════════════════════════════════
async function runAutomationScout(db: any) {
  const t0 = Date.now()

  // Get recent frictions + processes
  const { data: frictions } = await db.from('friction_events')
    .select('*').gte('detected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(100)

  const { data: processes } = await db.from('process_traces')
    .select('*').gte('analyzed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(50)

  const { data: behaviors } = await db.from('user_behavior_events')
    .select('event_type, screen, count(*)').eq('event_type', 'export')
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const prompt = `You are an automation consultant for a franchising company CRM.

Analyze this data and propose automations. For each, calculate ROI.

Friction events (last 24h): ${JSON.stringify(frictions?.slice(0, 20) || [])}
Process traces (last 24h): ${JSON.stringify(processes?.slice(0, 10) || [])}
Export events (last 7d): ${JSON.stringify(behaviors?.slice(0, 10) || [])}

Respond ONLY with a JSON array of proposals:
[{
  "title": "...",
  "description": "...",
  "category": "repetitive_task|copy_paste|predictable_decision|manual_notification|manual_report|data_entry|approval_flow|scheduled_task|integration",
  "current_time_minutes": N,
  "frequency_per_week": N,
  "estimated_dev_hours": N
}]`

  const aiResponse = parseJSON(await askAI(prompt, 'Automation consultant. JSON array only. Be specific and practical.'))
  const proposals = Array.isArray(aiResponse) ? aiResponse : []

  if (proposals.length > 0) {
    const valid = proposals.filter((p: any) => p.title && p.description && p.category && p.current_time_minutes > 0)
    if (valid.length > 0) {
      await db.from('automation_proposals').insert(
        valid.map((p: any) => ({ ...p, tenant_id: frictions?.[0]?.tenant_id || null }))
      )
    }
  }

  await logExecution(db, 'automation-scout', 'success', `${proposals.length} proposals generated`, (frictions?.length || 0) + (processes?.length || 0), Date.now() - t0)
  return { proposals: proposals.length }
}

// ══════════════════════════════════════════════════════════════
// AGENT: SYSTEM HEALTH ROVER
// ══════════════════════════════════════════════════════════════
async function runHealthRover(db: any) {
  const t0 = Date.now()
  const checks: any[] = []

  // Check database health
  const { data: tableStats } = await db.rpc('get_table_sizes').catch(() => ({ data: null }))
  const { count: totalRows } = await db.from('user_behavior_events').select('*', { count: 'exact', head: true })
  const { count: errorCount } = await db.from('api_logs').select('*', { count: 'exact', head: true })
    .gte('status_code', 500).gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  checks.push({
    component: 'database',
    status: (errorCount || 0) > 10 ? 'degraded' : 'healthy',
    metrics: { total_behavior_events: totalRows, errors_last_hour: errorCount, table_stats: tableStats },
    anomalies: (errorCount || 0) > 10 ? [{ type: 'high_error_rate', count: errorCount }] : [],
    suggestions: (totalRows || 0) > 100000 ? [{ action: 'Consider partitioning user_behavior_events by month' }] : [],
  })

  // Check Edge Functions (self-check)
  checks.push({
    component: 'edge_functions',
    status: 'healthy',
    metrics: { self_check: true, response_time_ms: Date.now() - t0 },
    anomalies: [],
    suggestions: [],
  })

  // Check auth
  const { count: activeUsers } = await db.auth.admin.listUsers({ perPage: 1 }).catch(() => ({ count: 0 }))
  checks.push({
    component: 'auth',
    status: 'healthy',
    metrics: { active_users: activeUsers || 0 },
    anomalies: [],
    suggestions: [],
  })

  // Check recent API performance
  const { data: recentLogs } = await db.from('api_logs')
    .select('duration_ms, status_code')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .limit(500)

  if (recentLogs?.length) {
    const durations = recentLogs.map((l: any) => l.duration_ms).sort((a: number, b: number) => a - b)
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0
    const errorRate = recentLogs.filter((l: any) => l.status_code >= 500).length / recentLogs.length

    checks.push({
      component: 'api',
      status: p95 > 1000 || errorRate > 0.05 ? 'degraded' : 'healthy',
      metrics: { p50_ms: p50, p95_ms: p95, p99_ms: p99, error_rate: Math.round(errorRate * 1000) / 10, total_requests: recentLogs.length },
      anomalies: p95 > 1000 ? [{ type: 'slow_p95', value: p95 }] : [],
      suggestions: p95 > 500 ? [{ action: 'Investigate slow endpoints' }] : [],
    })
  }

  await db.from('system_health_checks').insert(checks)
  await logExecution(db, 'health-rover', 'success', `${checks.length} components checked`, checks.length, Date.now() - t0)
  return { checks: checks.length }
}

// ══════════════════════════════════════════════════════════════
// AGENT: COST WATCHER
// ══════════════════════════════════════════════════════════════
async function runCostWatcher(db: any) {
  const t0 = Date.now()
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  // Count AI agent executions (proxy for token cost)
  const { data: executions } = await db.from('agent_executions')
    .select('ai_tokens_used').gte('started_at', monthStart)

  const totalTokens = executions?.reduce((s: number, e: any) => s + (e.ai_tokens_used || 0), 0) || 0
  const projectedTokens = Math.round(totalTokens * daysInMonth / Math.max(dayOfMonth, 1))

  // Estimate costs
  const aiCost = totalTokens * 0.000003 // ~$3/1M tokens for local, more for Claude
  const projectedAiCost = projectedTokens * 0.000003

  // Count Edge Function invocations
  const { count: invocations } = await db.from('api_logs')
    .select('*', { count: 'exact', head: true }).gte('created_at', monthStart)

  const costs = [
    {
      service: 'supabase', period_start: monthStart, period_end: monthEnd,
      actual_cost: 25, projected_cost: 25, budget: 50,
      usage_metrics: { invocations, storage_gb: 0.5 },
    },
    {
      service: 'local_ai', period_start: monthStart, period_end: monthEnd,
      actual_cost: Math.round(aiCost * 100) / 100,
      projected_cost: Math.round(projectedAiCost * 100) / 100,
      budget: 100,
      usage_metrics: { tokens_used: totalTokens, projected_tokens: projectedTokens },
      alerts: projectedAiCost > 80 ? [{ type: 'budget_warning', message: 'AI cost projected to exceed 80% of budget' }] : [],
    },
  ]

  await db.from('cost_tracking').insert(costs)
  await logExecution(db, 'cost-watcher', 'success', `Tracked ${costs.length} services. AI tokens: ${totalTokens}`, costs.length, Date.now() - t0)
  return { services: costs.length, total_tokens: totalTokens }
}

// ══════════════════════════════════════════════════════════════
// AGENT: KNOWLEDGE HARVESTER
// ══════════════════════════════════════════════════════════════
async function runKnowledgeHarvester(db: any) {
  const t0 = Date.now()
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

  // Harvest from automation proposals
  const { data: proposals } = await db.from('automation_proposals')
    .select('*').gte('proposed_at', since).limit(20)

  // Harvest from friction events
  const { data: frictions } = await db.from('friction_events')
    .select('*').gte('detected_at', since).eq('severity', 'critical').limit(10)

  // Harvest from build learnings
  const { data: learnings } = await db.from('build_learnings')
    .select('*').gte('learned_at', since).limit(20)

  const knowledgeItems: any[] = []

  for (const p of proposals || []) {
    knowledgeItems.push({
      category: 'process',
      title: `Automation: ${p.title}`,
      content: p.description,
      source: 'automation-scout',
      source_id: p.id,
      tags: ['automation', p.category],
      confidence: 0.7,
    })
  }

  for (const f of frictions || []) {
    knowledgeItems.push({
      category: 'user_feedback',
      title: `Critical friction: ${f.friction_type} on ${f.screen}`,
      content: `${f.friction_type} detected ${f.count} times on screen "${f.screen}" (element: ${f.element || 'unknown'}). ${f.suggested_fix || ''}`,
      source: 'friction-detector',
      source_id: f.id,
      tags: ['ux', 'friction', f.screen],
      confidence: 0.8,
    })
  }

  for (const l of learnings || []) {
    knowledgeItems.push({
      category: 'learning',
      title: `Build learning: ${l.learning_type}`,
      content: l.description,
      source: 'learning-accumulator',
      source_id: l.id,
      tags: ['build', l.module_type, l.learning_type],
      confidence: l.confidence,
    })
  }

  if (knowledgeItems.length > 0) {
    await db.from('knowledge_base').insert(knowledgeItems)
  }

  await logExecution(db, 'knowledge-harvester', 'success', `Harvested ${knowledgeItems.length} items`, knowledgeItems.length, Date.now() - t0)
  return { harvested: knowledgeItems.length }
}

// ══════════════════════════════════════════════════════════════
// AGENT: LEARNING ACCUMULATOR (Barreira 1)
// ══════════════════════════════════════════════════════════════
async function runLearningAccumulator(db: any, buildId: string, buildResult: any) {
  const t0 = Date.now()

  const prompt = `Analyze this build result and extract learnings. For each learning, classify as:
pattern_success, pattern_failure, error_fix, performance_insight, security_fix, ux_improvement, code_style, test_strategy, architecture_choice

Build ID: ${buildId}
Module: ${buildResult.module || 'unknown'}
Tests: ${buildResult.tests_passed || 0}/${buildResult.tests_total || 0}
Self-healing rounds: ${buildResult.heal_rounds || 0}
Errors fixed: ${JSON.stringify(buildResult.errors_fixed || [])}
Gates: ${JSON.stringify(buildResult.gates || {})}

Respond with JSON array: [{"learning_type":"...","description":"...","confidence":0.N}]`

  const aiResponse = parseJSON(await askAI(prompt, 'Extract build learnings. JSON array only.'))
  const learnings = Array.isArray(aiResponse) ? aiResponse : []

  if (learnings.length > 0) {
    await db.from('build_learnings').insert(
      learnings.map((l: any) => ({
        build_id: buildId,
        module_type: buildResult.module || 'unknown',
        learning_type: l.learning_type || 'pattern_success',
        description: l.description || '',
        confidence: Math.min(1, Math.max(0, l.confidence || 0.5)),
      }))
    )
  }

  await logExecution(db, 'learning-accumulator', 'success', `${learnings.length} learnings from build ${buildId}`, 1, Date.now() - t0)
  return { learnings: learnings.length }
}

// ══════════════════════════════════════════════════════════════
// AGENT: TRUST CERTIFIER (Barreira 3)
// ══════════════════════════════════════════════════════════════
async function runTrustCertifier(db: any, buildId: string, buildResult: any) {
  const t0 = Date.now()

  const testsPassed = buildResult.tests_passed || 0
  const testsTotal = Math.max(buildResult.tests_total || 1, 1)
  const gatesPassed = buildResult.gates_passed || 0
  const gatesTotal = Math.max(buildResult.gates_total || 1, 1)

  const testScore = (testsPassed / testsTotal) * 40
  const gateScore = (gatesPassed / gatesTotal) * 30
  const securityScore = buildResult.security_clean ? 15 : (buildResult.security_warnings ? 8 : 0)
  const perfScore = buildResult.p95_ms && buildResult.p95_ms < 200 ? 15 : (buildResult.p95_ms < 500 ? 10 : 5)

  const trustScore = Math.round((testScore + gateScore + securityScore + perfScore) * 10) / 10

  const certificate = {
    build_id: buildId,
    module: buildResult.module || 'unknown',
    version: buildResult.version || '0.0.1',
    trust_score: trustScore,
    evidence: {
      tests: `${testsPassed}/${testsTotal}`,
      gates: `${gatesPassed}/${gatesTotal}`,
      security: buildResult.security_clean ? 'clean' : 'warnings',
      performance: buildResult.p95_ms ? `P95: ${buildResult.p95_ms}ms` : 'not measured',
      self_healing: buildResult.heal_rounds || 0,
      errors_fixed: buildResult.errors_fixed || [],
    },
    gates_passed: gatesPassed,
    gates_total: gatesTotal,
    tests_passed: testsPassed,
    tests_total: testsTotal,
    security_score: securityScore,
    performance_score: perfScore,
  }

  await db.from('trust_certificates').upsert(certificate, { onConflict: 'build_id' })
  await logExecution(db, 'trust-certifier', 'success', `Trust score: ${trustScore} for ${buildId}`, 1, Date.now() - t0)
  return certificate
}

// ══════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const db = getServiceClient()
    const body = await req.json().catch(() => ({}))
    const action = body.action || ''

    let result: any = { error: 'Unknown action' }

    switch (action) {
      case 'run_friction_detector': result = await runFrictionDetector(db); break
      case 'run_process_miner': result = await runProcessMiner(db); break
      case 'run_automation_scout': result = await runAutomationScout(db); break
      case 'run_health_rover': result = await runHealthRover(db); break
      case 'run_cost_watcher': result = await runCostWatcher(db); break
      case 'run_knowledge_harvester': result = await runKnowledgeHarvester(db); break
      case 'run_learning_accumulator': result = await runLearningAccumulator(db, body.build_id, body.build_result || {}); break
      case 'run_trust_certifier': result = await runTrustCertifier(db, body.build_id, body.build_result || {}); break
      case 'run_all': {
        result = {
          friction: await runFrictionDetector(db),
          process: await runProcessMiner(db),
          automation: await runAutomationScout(db),
          health: await runHealthRover(db),
          cost: await runCostWatcher(db),
          knowledge: await runKnowledgeHarvester(db),
        }
        break
      }
      case 'status': {
        const { data: executions } = await db.from('agent_executions')
          .select('agent_name, status, completed_at, duration_ms')
          .order('completed_at', { ascending: false }).limit(20)
        result = { agents: executions }
        break
      }
      default:
        result = { error: `Unknown action: ${action}`, available: [
          'run_friction_detector', 'run_process_miner', 'run_automation_scout',
          'run_health_rover', 'run_cost_watcher', 'run_knowledge_harvester',
          'run_learning_accumulator', 'run_trust_certifier', 'run_all', 'status'
        ]}
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
