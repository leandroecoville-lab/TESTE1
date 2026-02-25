// ══════════════════════════════════════════════════════════════
// LAI SPY AGENTS — Alpha (Sistema) + Omega (Processos Manuais)
// Varrem toda a empresa. Trazem sugestões. Rodam na IA local.
// © Leandro Castelo — Ecossistema LAI | 300 Franchising
// ══════════════════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const AI_SERVER_URL = Deno.env.get('AI_SERVER_URL') || 'http://localhost:11434'
const AI_MODEL = Deno.env.get('AI_MODEL') || 'llama3'
const AI_PROVIDER = Deno.env.get('AI_PROVIDER') || 'local'
const CLAUDE_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || ''

function getDB() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function askAI(prompt: string, system?: string): Promise<string> {
  const AI_TIMEOUT_MS = 30000
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
    try {
      if (AI_PROVIDER === 'claude' && CLAUDE_API_KEY) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: system || '', messages: [{ role: 'user', content: prompt }] }),
          signal: controller.signal,
        })
        const d = await res.json()
        return d.content?.[0]?.text || '{}'
      }
      const res = await fetch(`${AI_SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: AI_MODEL, messages: [{ role: 'system', content: system || '' }, { role: 'user', content: prompt }], stream: false, options: { temperature: 0.2 } }),
        signal: controller.signal,
      })
      const d = await res.json()
      return d.message?.content || d.response || '{}'
    } finally { clearTimeout(timeout) }
  } catch (e) {
    if ((e as any).name === 'AbortError') console.error('AI timed out after', AI_TIMEOUT_MS, 'ms')
    return '{}'
  }
}

function parseJSON(t: string): any {
  try {
    return JSON.parse(t.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
  } catch {
    const m = t.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    return m ? JSON.parse(m[0]) : {}
  }
}

// ══════════════════════════════════════════════════════════════
// SPY ALPHA — Varre sistema completo, detecta anomalias
// ══════════════════════════════════════════════════════════════
async function spyAlpha(db: any, scanType: string) {
  const t0 = Date.now()
  const findings: any[] = []
  const suggestions: any[] = []

  // 1. Database scan — tabelas crescendo, queries lentas
  const tables = ['user_behavior_events', 'friction_events', 'api_logs', 'agent_executions']
  for (const table of tables) {
    const { count } = await db.from(table).select('*', { count: 'exact', head: true })
    if ((count || 0) > 50000) {
      findings.push({ area: 'database', type: 'large_table', table, rows: count, severity: count > 200000 ? 'high' : 'medium' })
      suggestions.push({ action: `Particionar tabela ${table} por mês ou implementar retenção de ${table.includes('log') ? '30' : '90'} dias` })
    }
  }

  // 2. Agent health — agents que falharam recentemente
  const { data: failedAgents } = await db.from('agent_executions')
    .select('agent_name, error').eq('status', 'failed')
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if (failedAgents?.length) {
    findings.push({ area: 'agents', type: 'agent_failures', count: failedAgents.length, agents: [...new Set(failedAgents.map((a: any) => a.agent_name))] })
    suggestions.push({ action: `Investigar falhas em: ${[...new Set(failedAgents.map((a: any) => a.agent_name))].join(', ')}` })
  }

  // 3. Security scan — tokens não rotacionados, permissões excessivas
  const { data: recentErrors } = await db.from('api_logs')
    .select('path, status_code, count(*)')
    .gte('status_code', 400).gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .limit(20)

  if (recentErrors?.length) {
    const errorPaths = recentErrors.map((e: any) => e.path)
    if (recentErrors.some((e: any) => e.status_code === 401 || e.status_code === 403)) {
      findings.push({ area: 'security', type: 'auth_errors', count: recentErrors.filter((e: any) => e.status_code === 401 || e.status_code === 403).length })
      suggestions.push({ action: 'Verificar se tokens de API estão válidos e se permissões estão corretas' })
    }
  }

  // 4. Performance scan — endpoints lentos
  const { data: slowEndpoints } = await db.from('api_logs')
    .select('path, duration_ms').gte('duration_ms', 1000)
    .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .limit(20)

  if (slowEndpoints?.length) {
    const paths = [...new Set(slowEndpoints.map((e: any) => e.path))]
    findings.push({ area: 'performance', type: 'slow_endpoints', paths, count: slowEndpoints.length })
    suggestions.push({ action: `Otimizar endpoints lentos: ${paths.slice(0, 3).join(', ')}. Considerar cache ou índices.` })
  }

  // 5. Cost projection
  const { data: costs } = await db.from('cost_tracking')
    .select('*').order('recorded_at', { ascending: false }).limit(5)

  if (costs?.some((c: any) => c.projected_cost > (c.budget || Infinity) * 0.8)) {
    findings.push({ area: 'cost', type: 'budget_warning', services: costs.filter((c: any) => c.projected_cost > (c.budget || Infinity) * 0.8).map((c: any) => c.service) })
    suggestions.push({ action: 'Custos projetados acima de 80% do budget. Revisar uso e otimizar.' })
  }

  // 6. AI Analysis of all findings
  if (findings.length > 0) {
    const aiPrompt = `You are Spy Alpha, a system health agent for a franchising CRM platform.
Analyze these findings and provide actionable suggestions. Focus on what's most critical.

Findings: ${JSON.stringify(findings)}
Current suggestions: ${JSON.stringify(suggestions)}

Respond with JSON: {"priority_actions": [{"action":"...", "urgency":"critical|high|medium|low", "estimated_impact":"..."}], "overall_health": "healthy|concerning|critical"}`

    const analysis = parseJSON(await askAI(aiPrompt, 'System health analyst. Be specific and actionable. JSON only.'))
    if (analysis.priority_actions) {
      suggestions.push(...analysis.priority_actions.map((a: any) => ({ action: a.action, urgency: a.urgency, estimated_impact: a.estimated_impact })))
    }
  }

  const severity = findings.some((f: any) => f.severity === 'critical') ? 'critical' :
    findings.some((f: any) => f.severity === 'high') ? 'high' :
    findings.length > 3 ? 'medium' : 'info'

  await db.from('spy_agent_reports').insert({
    agent_name: 'spy-alpha',
    scan_type: scanType || 'full_system',
    findings,
    suggestions,
    severity,
    auto_fixable: suggestions.some((s: any) => s.urgency === 'critical'),
  })

  await db.from('agent_executions').insert({
    agent_name: 'spy-alpha', status: 'success',
    output_summary: `${findings.length} findings, ${suggestions.length} suggestions`,
    items_processed: findings.length, duration_ms: Date.now() - t0,
    completed_at: new Date().toISOString(),
  })

  return { findings: findings.length, suggestions: suggestions.length, severity }
}

// ══════════════════════════════════════════════════════════════
// SPY OMEGA — Caça processos manuais, sugere automatizações
// ══════════════════════════════════════════════════════════════
async function spyOmega(db: any, scanType: string) {
  const t0 = Date.now()
  const findings: any[] = []
  const suggestions: any[] = []
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Hunt exports (Excel/CSV = processo manual)
  const { data: exports } = await db.from('user_behavior_events')
    .select('user_id, screen, metadata').eq('event_type', 'export').gte('timestamp', since7d)

  if (exports?.length) {
    const byScreen: Record<string, number> = {}
    for (const e of exports) {
      byScreen[e.screen] = (byScreen[e.screen] || 0) + 1
    }
    for (const [screen, count] of Object.entries(byScreen)) {
      if (count >= 3) {
        findings.push({
          type: 'frequent_export', screen, count_per_week: count,
          signal: 'Usuários exportam dados repetidamente — provável processo manual que deveria ser relatório automático'
        })
        suggestions.push({
          action: `Criar relatório automático para tela "${screen}" (${count} exports/semana). Edge Function + PDF + email agendado.`,
          roi: `~${Math.round(count * 15 / 60 * 4.33)} horas/mês economizadas`,
          urgency: count >= 10 ? 'high' : 'medium',
        })
      }
    }
  }

  // 2. Hunt copy/paste between screens (integração manual)
  const { data: copyPastes } = await db.from('user_behavior_events')
    .select('user_id, screen, event_type, metadata, session_id, timestamp')
    .in('event_type', ['copy', 'paste']).gte('timestamp', since7d)
    .order('timestamp', { ascending: true }).limit(2000)

  if (copyPastes?.length) {
    const sessions: Record<string, any[]> = {}
    for (const e of copyPastes) {
      if (!sessions[e.session_id]) sessions[e.session_id] = []
      sessions[e.session_id].push(e)
    }

    let copyPasteFlows = 0
    for (const [sid, events] of Object.entries(sessions)) {
      for (let i = 1; i < events.length; i++) {
        if (events[i - 1].event_type === 'copy' && events[i].event_type === 'paste' && events[i - 1].screen !== events[i].screen) {
          copyPasteFlows++
        }
      }
    }

    if (copyPasteFlows >= 5) {
      findings.push({
        type: 'cross_screen_copy_paste', count: copyPasteFlows,
        signal: 'Dados copiados de uma tela para outra — falta integração automática entre módulos'
      })
      suggestions.push({
        action: `Implementar auto-fill ou linking entre telas. ${copyPasteFlows} copy/paste entre telas por semana.`,
        roi: `~${Math.round(copyPasteFlows * 2 / 60 * 4.33)} horas/mês`,
        urgency: copyPasteFlows >= 20 ? 'high' : 'medium',
      })
    }
  }

  // 3. Hunt repetitive sequences (mesma ação N vezes)
  const { data: recentBehavior } = await db.from('user_behavior_events')
    .select('user_id, screen, event_type, element, session_id')
    .gte('timestamp', since7d).order('timestamp', { ascending: true }).limit(5000)

  if (recentBehavior?.length) {
    // Find repeated 3-step sequences
    const sequences: Record<string, number> = {}
    for (let i = 2; i < recentBehavior.length; i++) {
      if (recentBehavior[i].session_id === recentBehavior[i - 1].session_id &&
          recentBehavior[i - 1].session_id === recentBehavior[i - 2].session_id) {
        const seq = [recentBehavior[i - 2], recentBehavior[i - 1], recentBehavior[i]]
          .map((e: any) => `${e.screen}:${e.event_type}:${e.element || ''}`)
          .join(' → ')
        sequences[seq] = (sequences[seq] || 0) + 1
      }
    }

    const repetitive = Object.entries(sequences).filter(([_, count]) => count >= 5).sort((a, b) => b[1] - a[1])
    for (const [seq, count] of repetitive.slice(0, 5)) {
      findings.push({
        type: 'repetitive_sequence', sequence: seq, count,
        signal: `Sequência repetida ${count}x/semana — candidata a automação`
      })
    }

    if (repetitive.length > 0) {
      suggestions.push({
        action: `${repetitive.length} sequências repetitivas detectadas. Top: ${repetitive[0]?.[0]?.split(' → ')[0] || 'unknown'} (${repetitive[0]?.[1] || 0}x/semana)`,
        urgency: 'medium',
      })
    }
  }

  // 4. Hunt idle time (longas pausas = confusão ou processo pesado)
  const { data: idles } = await db.from('user_behavior_events')
    .select('screen, count(*)').eq('event_type', 'idle').gte('timestamp', since7d)

  if (idles?.length) {
    for (const idle of idles) {
      if ((idle.count || 0) >= 10) {
        findings.push({
          type: 'high_idle_screen', screen: idle.screen, idle_count: idle.count,
          signal: 'Tela com muitas pausas longas — interface confusa ou processo pesado'
        })
      }
    }
  }

  // 5. AI Analysis
  if (findings.length > 0) {
    const prompt = `You are Spy Omega, hunting manual processes in a franchising CRM.
Analyze these findings and suggest specific automations with ROI.

Findings: ${JSON.stringify(findings)}

Respond with JSON: {"automations": [{"what":"...","how":"...","roi_hours_per_month":N,"priority":"critical|high|medium|low"}], "biggest_waste": "...description of biggest time waste found..."}`

    const analysis = parseJSON(await askAI(prompt, 'Automation hunter for franchising CRM. Practical suggestions. JSON only.'))
    if (analysis.automations) {
      for (const a of analysis.automations) {
        suggestions.push({ action: `${a.what}: ${a.how}`, roi: `${a.roi_hours_per_month}h/mês`, urgency: a.priority })
      }
    }
    if (analysis.biggest_waste) {
      findings.push({ type: 'ai_insight', signal: analysis.biggest_waste })
    }
  }

  const severity = findings.some((f: any) => f.type === 'frequent_export' && f.count_per_week >= 10) ? 'high' :
    findings.length > 5 ? 'medium' : 'info'

  await db.from('spy_agent_reports').insert({
    agent_name: 'spy-omega',
    scan_type: scanType || 'manual_process_hunt',
    findings,
    suggestions,
    severity,
    auto_fixable: false,
  })

  await db.from('agent_executions').insert({
    agent_name: 'spy-omega', status: 'success',
    output_summary: `${findings.length} manual processes found, ${suggestions.length} automations suggested`,
    items_processed: findings.length, duration_ms: Date.now() - t0,
    completed_at: new Date().toISOString(),
  })

  return { findings: findings.length, suggestions: suggestions.length, severity }
}

// ══════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const db = getDB()
    const body = await req.json().catch(() => ({}))
    const agent = body.agent || ''
    const scan = body.scan || 'full_system'

    let result: any

    switch (agent) {
      case 'spy-alpha': result = await spyAlpha(db, scan); break
      case 'spy-omega': result = await spyOmega(db, scan); break
      case 'both': result = { alpha: await spyAlpha(db, 'full_system'), omega: await spyOmega(db, 'manual_process_hunt') }; break
      default:
        // Get latest reports
        const { data: reports } = await db.from('spy_agent_reports')
          .select('*').order('scanned_at', { ascending: false }).limit(10)
        result = { latest_reports: reports }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
