// ENTRY: CRM Contacts API Edge Function — PRODUCTION GRADE
// Rate limiting, structured logging, health check, full CRUD
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS ──────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id, x-request-id',
}

// ── RATE LIMITER (in-memory, per-tenant) ──────────────────
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100 // requests
const RATE_WINDOW = 60_000 // 1 min

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(tenantId)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(tenantId, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT
}

// ── STRUCTURED LOGGER ─────────────────────────────────────
function log(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    service: 'crm-api',
    ...meta,
  }
  if (level === 'error') console.error(JSON.stringify(entry))
  else console.log(JSON.stringify(entry))
}

// ── SUPABASE CLIENT ───────────────────────────────────────
function getClient(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
}

// ── PATH PARSER ───────────────────────────────────────────
function parsePath(url: URL): { resource: string; id?: string; action?: string } {
  const parts = url.pathname.replace('/api/', '').split('/').filter(Boolean)
  return { resource: parts[0] || '', id: parts[1], action: parts[2] }
}

// ── VALIDATORS ────────────────────────────────────────────
function validateContact(data: Record<string, unknown>): string | null {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 1) return 'ERR_NAME_REQUIRED'
  if ((data.name as string).length > 200) return 'ERR_NAME_TOO_LONG'
  if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email as string)) return 'ERR_INVALID_EMAIL'
  if (data.phone && typeof data.phone !== 'string') return 'ERR_INVALID_PHONE'
  return null
}

function validateDeal(data: Record<string, unknown>): string | null {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 1) return 'ERR_TITLE_REQUIRED'
  if (data.value !== undefined && (typeof data.value !== 'number' || data.value < 0)) return 'ERR_INVALID_VALUE'
  const validStages = ['new', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  if (data.stage && !validStages.includes(data.stage as string)) return 'ERR_INVALID_STAGE'
  return null
}

// ── JSON HELPER ───────────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── MAIN HANDLER ──────────────────────────────────────────
Deno.serve(async (req) => {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
  const t0 = Date.now()

  // FLOW: CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const { resource, id, action } = parsePath(url)
    const method = req.method

    // ── HEALTH CHECK ────────────────────────────────────
    if (resource === 'health') {
      const supabase = getClient(req)
      const { error } = await supabase.from('contacts').select('id').limit(1)
      const status = error ? 'degraded' : 'healthy'
      log('info', 'health_check', { status, requestId })
      return json({ status, timestamp: new Date().toISOString(), version: '0.0.1' }, error ? 503 : 200)
    }

    // ── RATE LIMIT ──────────────────────────────────────
    const tenantHint = req.headers.get('x-tenant-id') || 'anon'
    if (!checkRateLimit(tenantHint)) {
      log('warn', 'rate_limit_exceeded', { tenant: tenantHint, requestId })
      return json({ error: 'ERR_RATE_LIMIT', retry_after_seconds: 60 }, 429)
    }

    const supabase = getClient(req)

    // ── DASHBOARD ───────────────────────────────────────
    if (resource === 'dashboard') {
      const { data: contacts, count: contactCount } = await supabase
        .from('contacts').select('id', { count: 'exact', head: true })
      const { data: deals } = await supabase.from('deals').select('id, value, stage')

      const openDeals = deals?.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)) || []
      const wonDeals = deals?.filter(d => d.stage === 'closed_won') || []
      const lostDeals = deals?.filter(d => d.stage === 'closed_lost') || []
      const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)
      const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)
      const closedTotal = wonDeals.length + lostDeals.length
      const conversionRate = closedTotal > 0 ? (wonDeals.length / closedTotal * 100) : 0

      log('info', 'dashboard_fetched', { requestId, duration_ms: Date.now() - t0 })

      return json({
        total_contacts: contactCount || 0,
        open_deals: openDeals.length,
        pipeline_value: pipelineValue,
        won_value: wonValue,
        conversion_rate: Math.round(conversionRate * 10) / 10,
        deals_by_stage: {
          new: deals?.filter(d => d.stage === 'new').length || 0,
          qualified: deals?.filter(d => d.stage === 'qualified').length || 0,
          proposal: deals?.filter(d => d.stage === 'proposal').length || 0,
          negotiation: deals?.filter(d => d.stage === 'negotiation').length || 0,
          closed_won: wonDeals.length,
          closed_lost: lostDeals.length,
        }
      })
    }

    // ── RESOURCE VALIDATION ─────────────────────────────
    const validTables = ['contacts', 'companies', 'deals', 'tasks', 'notes', 'tags']
    if (!validTables.includes(resource)) {
      return json({ error: 'ERR_UNKNOWN_RESOURCE' }, 404)
    }

    // ── GET ─────────────────────────────────────────────
    if (method === 'GET') {
      if (id) {
        const { data, error } = await supabase.from(resource).select('*').eq('id', id).single()
        if (error) return json({ error: 'ERR_NOT_FOUND' }, 404)
        log('info', 'resource_fetched', { resource, id, requestId, duration_ms: Date.now() - t0 })
        return json(data)
      }

      let query = supabase.from(resource).select('*', { count: 'exact' })
      const page = Math.max(1, Number(url.searchParams.get('page') || 1))
      const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit') || 25)), 100)
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const search = url.searchParams.get('search')
      if (search && ['contacts', 'companies'].includes(resource)) {
        query = query.ilike('name', `%${search}%`)
      }

      const stage = url.searchParams.get('stage')
      if (stage && resource === 'deals') query = query.eq('stage', stage)

      const status = url.searchParams.get('status')
      if (status && resource === 'contacts') query = query.eq('status', status)

      query = query.order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) return json({ error: error.message }, 500)
      log('info', 'list_fetched', { resource, page, limit, count, requestId, duration_ms: Date.now() - t0 })
      return json({ data, page, limit, total: count })
    }

    // ── POST ────────────────────────────────────────────
    if (method === 'POST') {
      let body: any
      try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
      if (resource === 'contacts') {
        const err = validateContact(body)
        if (err) return json({ error: err }, 400)
      }
      if (resource === 'deals') {
        const err = validateDeal(body)
        if (err) return json({ error: err }, 400)
      }
      const { data, error } = await supabase.from(resource).insert(body).select().single()
      if (error) return json({ error: error.message }, 400)
      log('info', 'resource_created', { resource, id: data.id, requestId, duration_ms: Date.now() - t0 })
      return json(data, 201)
    }

    // ── PATCH ───────────────────────────────────────────
    if (method === 'PATCH' && id) {
      let body: any
      try { body = await req.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
      if (resource === 'deals' && body.stage && ['closed_won', 'closed_lost'].includes(body.stage)) {
        body.closed_at = new Date().toISOString()
      }
      const { data, error } = await supabase.from(resource).update(body).eq('id', id).select().single()
      if (error) return json({ error: error.message }, 400)
      log('info', 'resource_updated', { resource, id, requestId, duration_ms: Date.now() - t0 })
      return json(data)
    }

    // ── DELETE ───────────────────────────────────────────
    if (method === 'DELETE' && id) {
      const { error } = await supabase.from(resource).delete().eq('id', id)
      if (error) return json({ error: error.message }, 400)
      log('info', 'resource_deleted', { resource, id, requestId, duration_ms: Date.now() - t0 })
      return json({ deleted: true })
    }

    return json({ error: 'ERR_METHOD_NOT_ALLOWED' }, 405)

  } catch (err) {
    log('error', 'unhandled_error', { error: String(err), requestId, duration_ms: Date.now() - t0 })
    return json({ error: 'ERR_INTERNAL' }, 500)
  }
})
