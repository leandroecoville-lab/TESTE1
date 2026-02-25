// ══════════════════════════════════════════════════════════════════════════
// LAI INTELLIGENCE LAYER — DOCUMENTO COMPLETO PARA LOVABLE
// Cole este arquivo no Lovable. Ele contém TUDO que precisa adicionar.
// 
// O QUE TEM AQUI:
// 1. Hook useIntelligence() — conecta com todos os agents
// 2. Hook useSpyReports() — relatórios dos espiões
// 3. Página IntelligenceDashboard — dashboard completo dos agents
// 4. Página SpyDashboard — relatórios Spy Alpha + Omega
// 5. Página TrustCertificates — certificados de confiança dos builds
// 6. Página AutomationProposals — propostas de automatização com ROI
// 7. Componente BehaviorTracker — importar no App.jsx
// 8. Rotas a adicionar no router
//
// INSTRUÇÕES:
// 1. Copie cada seção para um arquivo separado no Lovable
// 2. Adicione as rotas no seu router
// 3. Adicione <BehaviorTracker /> no App.jsx
// 4. Pronto — tudo funciona automaticamente
//
// © Leandro Castelo — Ecossistema LAI | 300 Franchising
// ══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// ARQUIVO 1: src/hooks/useIntelligence.js
// ═══════════════════════════════════════════
/*
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useIntelligence() {
  const [agentStatus, setAgentStatus] = useState([]);
  const [frictions, setFrictions] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [healthChecks, setHealthChecks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data: executions } = await supabase
        .from('agent_executions')
        .select('*')
        .order('completed_at', { ascending: false })
        .limit(20);
      setAgentStatus(executions || []);
    } catch (e) { console.error('Agent status fetch error:', e); }
  }, []);

  const fetchFrictions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('friction_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(50);
      setFrictions(data || []);
    } catch (e) { console.error('Frictions fetch error:', e); }
  }, []);

  const fetchProposals = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('automation_proposals')
        .select('*')
        .order('proposed_at', { ascending: false })
        .limit(50);
      setProposals(data || []);
    } catch (e) { console.error('Proposals fetch error:', e); }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('system_health_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(20);
      setHealthChecks(data || []);
    } catch (e) { console.error('Health fetch error:', e); }
  }, []);

  const runAgent = useCallback(async (action) => {
    try {
      const { data, error } = await supabase.functions.invoke('intelligence-api', {
        body: { action },
      });
      if (error) throw error;
      await fetchStatus();
      return data;
    } catch (e) {
      console.error('Agent run error:', e);
      throw e;
    }
  }, [fetchStatus]);

  useEffect(() => {
    Promise.all([fetchStatus(), fetchFrictions(), fetchProposals(), fetchHealth()])
      .finally(() => setLoading(false));

    // Realtime subscriptions
    const frictionSub = supabase
      .channel('friction_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friction_events' },
        (payload) => setFrictions(prev => [payload.new, ...prev].slice(0, 50)))
      .subscribe();

    const proposalSub = supabase
      .channel('automation_proposals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_proposals' },
        (payload) => setProposals(prev => [payload.new, ...prev].slice(0, 50)))
      .subscribe();

    const healthSub = supabase
      .channel('system_health_checks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_health_checks' },
        (payload) => setHealthChecks(prev => [payload.new, ...prev].slice(0, 20)))
      .subscribe();

    return () => {
      supabase.removeChannel(frictionSub);
      supabase.removeChannel(proposalSub);
      supabase.removeChannel(healthSub);
    };
  }, [fetchStatus, fetchFrictions, fetchProposals, fetchHealth]);

  return { agentStatus, frictions, proposals, healthChecks, loading, runAgent, refresh: fetchStatus };
}
*/

// ═══════════════════════════════════════════
// ARQUIVO 2: src/hooks/useSpyReports.js
// ═══════════════════════════════════════════
/*
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSpyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('spy_agent_reports')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(30);
      setReports(data || []);
    } catch (e) { console.error('Spy reports error:', e); }
  }, []);

  const runSpy = useCallback(async (agent, scan) => {
    try {
      const { data, error } = await supabase.functions.invoke('spy-agents', {
        body: { agent, scan },
      });
      if (error) throw error;
      await fetchReports();
      return data;
    } catch (e) {
      console.error('Spy run error:', e);
      throw e;
    }
  }, [fetchReports]);

  useEffect(() => {
    fetchReports().finally(() => setLoading(false));

    const sub = supabase
      .channel('spy_agent_reports')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spy_agent_reports' },
        (payload) => setReports(prev => [payload.new, ...prev].slice(0, 30)))
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [fetchReports]);

  return { reports, loading, runSpy, refresh: fetchReports };
}
*/

// ═══════════════════════════════════════════
// ARQUIVO 3: src/hooks/useTrustCertificates.js
// ═══════════════════════════════════════════
/*
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useTrustCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('trust_certificates')
        .select('*')
        .order('certified_at', { ascending: false })
        .limit(30);
      setCertificates(data || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetch().finally(() => setLoading(false));

    const sub = supabase
      .channel('trust_certificates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trust_certificates' },
        () => fetch())
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [fetch]);

  return { certificates, loading, refresh: fetch };
}
*/

// ═══════════════════════════════════════════
// ARQUIVO 4: src/components/BehaviorTracker.jsx
// Importar em App.jsx: <BehaviorTracker />
// ═══════════════════════════════════════════
/*
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FLUSH_MS = 5000;
const IDLE_MS = 60000;
const RAGE_CLICKS = 5;
let sessionId = crypto.randomUUID();
let buffer = [];
let lastClick = { el: '', ts: 0, count: 0 };
let lastActivity = Date.now();

function getScreen() { return window.location.pathname + window.location.hash; }

function getEl(e) {
  if (!e?.target) return '';
  const t = e.target;
  const tag = t.tagName?.toLowerCase() || '';
  const id = t.id ? `#${t.id}` : '';
  const cls = t.className && typeof t.className === 'string' ? `.${t.className.split(' ')[0]}` : '';
  const txt = (t.textContent || '').slice(0, 30).trim();
  return `${tag}${id}${cls}${txt ? `[${txt}]` : ''}`;
}

function track(type, element, meta = {}) {
  buffer.push({ session_id: sessionId, event_type: type, screen: getScreen(), element, metadata: meta, timestamp: new Date().toISOString() });
  lastActivity = Date.now();
}

async function flush() {
  if (!buffer.length) return;
  const events = [...buffer];
  buffer = [];

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
  const tenantId = session?.user?.user_metadata?.tenant_id || '00000000-0000-0000-0000-000000000000';

  const enriched = events.map(e => ({ ...e, user_id: userId, tenant_id: tenantId }));

  const { error } = await supabase.from('user_behavior_events').insert(enriched);
  if (error) {
    buffer.push(...events);
    console.warn('[LAI] flush failed:', error.message);
  }
}

export default function BehaviorTracker() {
  useEffect(() => {
    // Click + rage click
    const onClick = (e) => {
      const el = getEl(e);
      const now = Date.now();
      if (el === lastClick.el && now - lastClick.ts < 3000) {
        lastClick.count++;
        if (lastClick.count >= RAGE_CLICKS) track('rage_click', el, { count: lastClick.count });
      } else {
        lastClick = { el, ts: now, count: 1 };
      }
      track('click', el, { x: e.clientX, y: e.clientY });
    };

    // Navigation
    let currentPath = getScreen();
    const navCheck = setInterval(() => {
      const p = getScreen();
      if (p !== currentPath) { track('navigate', null, { from: currentPath, to: p }); currentPath = p; }
    }, 500);

    // Copy/Paste
    const onCopy = () => track('copy', null, { len: (window.getSelection()?.toString() || '').length });
    const onPaste = () => track('paste', null, {});

    // Export detection
    const onClickExport = (e) => {
      const btn = e.target?.closest?.('button');
      if (btn) {
        const txt = (btn.textContent || '').toLowerCase();
        if (txt.includes('export') || txt.includes('download') || txt.includes('excel')) {
          track('export', getEl(e), { text: txt.slice(0, 50) });
        }
      }
    };

    // Error
    const onError = (e) => track('error', null, { msg: e.message?.slice(0, 200), file: e.filename?.slice(-50), line: e.lineno });
    const onReject = (e) => track('error', null, { msg: String(e.reason)?.slice(0, 200), type: 'promise' });

    // Idle
    const idleCheck = setInterval(() => {
      if (Date.now() - lastActivity > IDLE_MS) track('idle', null, { idle_ms: Date.now() - lastActivity });
    }, IDLE_MS);

    // Search/filter
    const onInput = (e) => {
      const t = e.target;
      if (t?.type === 'search' || t?.placeholder?.toLowerCase().includes('buscar') || t?.placeholder?.toLowerCase().includes('filtrar')) {
        track('search', getEl(e), { len: (t.value || '').length });
      }
    };

    // Flush
    const flushInterval = setInterval(flush, FLUSH_MS);

    document.addEventListener('click', onClick, { passive: true });
    document.addEventListener('click', onClickExport, { passive: true });
    document.addEventListener('copy', onCopy, { passive: true });
    document.addEventListener('paste', onPaste, { passive: true });
    document.addEventListener('input', onInput, { passive: true });
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onReject);
    window.addEventListener('beforeunload', flush);

    return () => {
      clearInterval(navCheck);
      clearInterval(idleCheck);
      clearInterval(flushInterval);
      document.removeEventListener('click', onClick);
      document.removeEventListener('click', onClickExport);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('input', onInput);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onReject);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  return null; // Invisible component
}
*/

// ═══════════════════════════════════════════
// ARQUIVO 5: src/pages/IntelligenceDashboard.jsx
// ═══════════════════════════════════════════
/*
import { useState } from 'react';
import { useIntelligence } from '@/hooks/useIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Bot, Brain, RefreshCw, Shield, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AGENTS = [
  { key: 'run_friction_detector', name: 'Friction Detector', icon: AlertTriangle, color: 'text-orange-500' },
  { key: 'run_process_miner', name: 'Process Miner', icon: Activity, color: 'text-purple-500' },
  { key: 'run_automation_scout', name: 'Automation Scout', icon: Bot, color: 'text-emerald-500' },
  { key: 'run_health_rover', name: 'Health Rover', icon: Shield, color: 'text-cyan-500' },
  { key: 'run_cost_watcher', name: 'Cost Watcher', icon: Zap, color: 'text-yellow-500' },
  { key: 'run_knowledge_harvester', name: 'Knowledge Harvester', icon: Brain, color: 'text-pink-500' },
];

export default function IntelligenceDashboard() {
  const { agentStatus, frictions, proposals, healthChecks, loading, runAgent } = useIntelligence();
  const [running, setRunning] = useState('');
  const { toast } = useToast();

  const handleRun = async (action, name) => {
    setRunning(action);
    try {
      await runAgent(action);
      toast({ title: `${name} executado`, description: 'Resultados atualizados.' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setRunning('');
  };

  const handleRunAll = async () => {
    setRunning('run_all');
    try {
      await runAgent('run_all');
      toast({ title: 'Todos os agents executados' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setRunning('');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" /></div>;

  const criticalFrictions = frictions.filter(f => f.severity === 'critical' || f.severity === 'high');
  const topProposals = proposals.filter(p => p.status === 'proposed').sort((a, b) => (b.roi_hours_per_month || 0) - (a.roi_hours_per_month || 0));
  const latestHealth = healthChecks.reduce((acc, h) => { if (!acc[h.component] || h.checked_at > acc[h.component].checked_at) acc[h.component] = h; return acc; }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Intelligence Dashboard</h1>
          <p className="text-muted-foreground">Agentes autônomos monitorando sua empresa 24/7</p>
        </div>
        <Button onClick={handleRunAll} disabled={!!running}>
          {running === 'run_all' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
          Executar Todos
        </Button>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENTS.map(({ key, name, icon: Icon, color }) => {
          const lastRun = agentStatus.find(a => a.agent_name === key.replace('run_', '').replace(/_/g, '-'));
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <CardTitle className="text-sm">{name}</CardTitle>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleRun(key, name)} disabled={!!running}>
                    {running === key ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Run'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {lastRun ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={lastRun.status === 'success' ? 'default' : 'destructive'} className="text-xs">{lastRun.status}</Badge>
                    </div>
                    <div className="flex justify-between"><span>Duração:</span><span>{lastRun.duration_ms}ms</span></div>
                    <div className="flex justify-between"><span>Último:</span><span>{new Date(lastRun.completed_at).toLocaleString('pt-BR')}</span></div>
                    {lastRun.output_summary && <p className="mt-1 text-xs opacity-70">{lastRun.output_summary}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nunca executado</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Health */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" /> Saúde do Sistema</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(latestHealth).map(([component, check]) => (
              <div key={component} className="p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${check.status === 'healthy' ? 'bg-emerald-500' : check.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium capitalize">{component}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{check.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Frictions */}
      {criticalFrictions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" /> Fricções Críticas ({criticalFrictions.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalFrictions.slice(0, 10).map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <span className="font-medium text-sm">{f.friction_type}</span>
                    <span className="text-xs text-muted-foreground ml-2">em {f.screen}</span>
                    {f.suggested_fix && <p className="text-xs text-emerald-600 mt-1">💡 {f.suggested_fix}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={f.severity === 'critical' ? 'destructive' : 'outline'}>{f.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{f.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Automation Proposals */}
      {topProposals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bot className="h-5 w-5 text-emerald-500" /> Propostas de Automatização ({topProposals.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProposals.slice(0, 10).map(p => (
                <div key={p.id} className="p-3 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-sm">{p.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    <Badge variant={p.priority === 'critical' ? 'destructive' : p.priority === 'high' ? 'default' : 'outline'}>
                      {p.priority}
                    </Badge>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>⏱ {p.current_time_minutes}min × {p.frequency_per_week}x/sem</span>
                    <span>🔧 {p.estimated_dev_hours}h dev</span>
                    <span className="text-emerald-600 font-medium">📈 {p.roi_hours_per_month?.toFixed(1)}h/mês ROI</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
*/

// ═══════════════════════════════════════════
// ARQUIVO 6: src/pages/SpyDashboard.jsx
// ═══════════════════════════════════════════
/*
import { useState } from 'react';
import { useSpyReports } from '@/hooks/useSpyReports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SpyDashboard() {
  const { reports, loading, runSpy } = useSpyReports();
  const [running, setRunning] = useState('');
  const { toast } = useToast();

  const handleRun = async (agent, scan) => {
    setRunning(agent);
    try {
      await runSpy(agent, scan);
      toast({ title: `${agent} executado com sucesso` });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
    setRunning('');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" /></div>;

  const alphaReports = reports.filter(r => r.agent_name === 'spy-alpha');
  const omegaReports = reports.filter(r => r.agent_name === 'spy-omega');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spy Agents</h1>
          <p className="text-muted-foreground">Agentes espiões varrendo toda a empresa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleRun('spy-alpha', 'full_system')} disabled={!!running}>
            {running === 'spy-alpha' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Spy Alpha
          </Button>
          <Button variant="outline" onClick={() => handleRun('spy-omega', 'manual_process_hunt')} disabled={!!running}>
            {running === 'spy-omega' ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Spy Omega
          </Button>
          <Button onClick={() => handleRun('both', 'full_system')} disabled={!!running}>
            Executar Ambos
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spy Alpha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" /> Spy Alpha — Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alphaReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum relatório ainda. Execute o Spy Alpha.</p>
            ) : alphaReports.slice(0, 5).map(r => (
              <div key={r.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{r.scan_type}</span>
                  <div className="flex gap-2">
                    <Badge variant={r.severity === 'critical' ? 'destructive' : r.severity === 'high' ? 'default' : 'outline'}>{r.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.scanned_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                {r.findings?.map((f, i) => (
                  <div key={i} className="text-xs p-2 bg-muted rounded">
                    <span className="font-medium">[{f.area || f.type}]</span> {f.type || ''}: {JSON.stringify(f).slice(0, 150)}
                  </div>
                ))}
                {r.suggestions?.map((s, i) => (
                  <div key={i} className="text-xs text-emerald-700 dark:text-emerald-400">💡 {s.action || JSON.stringify(s)}</div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Spy Omega */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-amber-500" /> Spy Omega — Processos Manuais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {omegaReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum relatório ainda. Execute o Spy Omega.</p>
            ) : omegaReports.slice(0, 5).map(r => (
              <div key={r.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{r.scan_type}</span>
                  <Badge variant={r.severity === 'critical' ? 'destructive' : r.severity === 'high' ? 'default' : 'outline'}>{r.severity}</Badge>
                </div>
                {r.findings?.map((f, i) => (
                  <div key={i} className="text-xs p-2 bg-muted rounded">
                    <span className="font-medium text-amber-600">{f.type}:</span> {f.signal || JSON.stringify(f).slice(0, 150)}
                  </div>
                ))}
                {r.suggestions?.map((s, i) => (
                  <div key={i} className="text-xs text-emerald-700 dark:text-emerald-400">
                    🤖 {s.action || JSON.stringify(s)} {s.roi ? `(${s.roi})` : ''}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
*/

// ═══════════════════════════════════════════
// ARQUIVO 7: src/pages/TrustCertificates.jsx
// ═══════════════════════════════════════════
/*
import { useTrustCertificates } from '@/hooks/useTrustCertificates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Shield, CheckCircle, XCircle } from 'lucide-react';

function ScoreRing({ score }) {
  const color = score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-yellow-500' : score >= 50 ? 'text-orange-500' : 'text-red-500';
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-muted" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className={color} strokeWidth="8"
          strokeDasharray={`${score * 2.51} 999`} strokeLinecap="round" />
      </svg>
      <span className={`absolute text-lg font-bold ${color}`}>{score}</span>
    </div>
  );
}

export default function TrustCertificates() {
  const { certificates, loading } = useTrustCertificates();

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Trust Certificates</h1>
        <p className="text-muted-foreground">Certificados de confiança de cada build — prova de que funciona</p>
      </div>

      {certificates.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum certificado ainda. Execute um build na Factory.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {certificates.map(cert => (
            <Card key={cert.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-6">
                  <ScoreRing score={cert.trust_score} />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">{cert.module}</h3>
                      <Badge variant="outline">{cert.version}</Badge>
                      <Badge variant={cert.classification === 'production' ? 'default' : cert.classification === 'staging' ? 'outline' : 'secondary'}>
                        {cert.classification}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1">
                        {cert.tests_passed === cert.tests_total ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <span>Testes: {cert.tests_passed}/{cert.tests_total}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span>Gates: {cert.gates_passed}/{cert.gates_total}</span>
                      </div>
                      <div><span className="text-muted-foreground">Segurança:</span> {cert.security_score}/15</div>
                      <div><span className="text-muted-foreground">Performance:</span> {cert.performance_score}/15</div>
                    </div>
                    {cert.evidence && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Self-healing: {cert.evidence.self_healing || 0} rounds |
                        Erros corrigidos: {cert.evidence.errors_fixed?.length || 0} |
                        {new Date(cert.certified_at).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
*/

// ═══════════════════════════════════════════
// ARQUIVO 8: ROTAS A ADICIONAR NO ROUTER
// ═══════════════════════════════════════════
/*
// No seu arquivo de rotas (App.jsx ou routes.jsx), adicionar:

import IntelligenceDashboard from '@/pages/IntelligenceDashboard';
import SpyDashboard from '@/pages/SpyDashboard';
import TrustCertificates from '@/pages/TrustCertificates';

// Dentro das rotas protegidas:
<Route path="/intelligence" element={<IntelligenceDashboard />} />
<Route path="/spies" element={<SpyDashboard />} />
<Route path="/trust" element={<TrustCertificates />} />

// No menu/sidebar, adicionar links:
{ to: '/intelligence', label: 'Intelligence', icon: Brain },
{ to: '/spies', label: 'Spy Agents', icon: Eye },
{ to: '/trust', label: 'Trust Certs', icon: Shield },
*/

// ═══════════════════════════════════════════
// ARQUIVO 9: ADICIONAR NO App.jsx
// ═══════════════════════════════════════════
/*
// No topo do App.jsx:
import BehaviorTracker from '@/components/BehaviorTracker';

// Dentro do return, antes de qualquer router:
<BehaviorTracker />
*/

// ═══════════════════════════════════════════
// RESUMO — CHECKLIST DE IMPLEMENTAÇÃO
// ═══════════════════════════════════════════
/*
CHECKLIST PARA LOVABLE:

□ 1. Criar src/hooks/useIntelligence.js (copiar ARQUIVO 1)
□ 2. Criar src/hooks/useSpyReports.js (copiar ARQUIVO 2)
□ 3. Criar src/hooks/useTrustCertificates.js (copiar ARQUIVO 3)
□ 4. Criar src/components/BehaviorTracker.jsx (copiar ARQUIVO 4)
□ 5. Criar src/pages/IntelligenceDashboard.jsx (copiar ARQUIVO 5)
□ 6. Criar src/pages/SpyDashboard.jsx (copiar ARQUIVO 6)
□ 7. Criar src/pages/TrustCertificates.jsx (copiar ARQUIVO 7)
□ 8. Adicionar rotas no router (copiar ARQUIVO 8)
□ 9. Adicionar <BehaviorTracker /> no App.jsx (copiar ARQUIVO 9)

DEPENDÊNCIAS (já devem estar no Lovable):
- @supabase/supabase-js
- lucide-react
- shadcn/ui (Card, Badge, Button, Toast)

VARIÁVEIS DE AMBIENTE:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Após implementar:
1. O BehaviorTracker começa a coletar dados imediatamente
2. Os agents (cron) processam dados a cada 15min-6h
3. O Intelligence Dashboard mostra tudo em tempo real
4. Os Spy Agents varrem o sistema e trazem sugestões
5. Trust Certificates aparecem após cada build da Factory
*/

export default {};
