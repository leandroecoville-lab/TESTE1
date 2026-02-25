import { useState, useEffect, useCallback } from "react"

// ── MOCK DATA (usado quando Supabase não está disponível) ──
const MOCK_CONTACTS = [
  { id: '1', name: 'Maria Silva', email: 'maria@acme.com', phone: '(11) 99999-0001', status: 'active', company_id: '1', created_at: '2026-02-20T10:00:00Z' },
  { id: '2', name: 'João Santos', email: 'joao@betalabs.io', phone: '(11) 99999-0002', status: 'active', company_id: '2', created_at: '2026-02-18T14:30:00Z' },
  { id: '3', name: 'Ana Oliveira', email: 'ana@email.com', phone: '(11) 99999-0003', status: 'active', company_id: null, created_at: '2026-02-15T09:00:00Z' },
  { id: '4', name: 'Carlos Mendes', email: 'carlos@techcorp.com', phone: '(11) 99999-0004', status: 'inactive', company_id: '3', created_at: '2026-02-10T11:45:00Z' },
  { id: '5', name: 'Lucia Ferreira', email: 'lucia@startup.io', phone: '(11) 99999-0005', status: 'active', company_id: '4', created_at: '2026-02-08T16:20:00Z' },
  { id: '6', name: 'Pedro Almeida', email: 'pedro@consulting.br', phone: '(11) 99999-0006', status: 'active', company_id: '1', created_at: '2026-02-05T08:00:00Z' },
  { id: '7', name: 'Fernanda Costa', email: 'fer@agency.com', phone: '(21) 98888-0001', status: 'active', company_id: null, created_at: '2026-02-03T13:15:00Z' },
]

const MOCK_DEALS = [
  { id: '1', title: 'Licença Enterprise Acme', value: 45000, stage: 'proposal', contact_id: '1', created_at: '2026-02-20T10:00:00Z' },
  { id: '2', title: 'Projeto Beta Labs', value: 12000, stage: 'qualified', contact_id: '2', created_at: '2026-02-18T14:30:00Z' },
  { id: '3', title: 'Consultoria Ana', value: 8500, stage: 'new', contact_id: '3', created_at: '2026-02-15T09:00:00Z' },
  { id: '4', title: 'Upsell Acme', value: 22000, stage: 'negotiation', contact_id: '1', created_at: '2026-02-12T11:00:00Z' },
  { id: '5', title: 'Renovação Beta', value: 15000, stage: 'closed_won', contact_id: '2', created_at: '2026-02-10T16:00:00Z' },
  { id: '6', title: 'Parceria TechCorp', value: 35000, stage: 'proposal', contact_id: '4', created_at: '2026-02-08T09:30:00Z' },
  { id: '7', title: 'Onboarding Startup', value: 6000, stage: 'new', contact_id: '5', created_at: '2026-02-05T14:00:00Z' },
  { id: '8', title: 'Treinamento Agency', value: 18000, stage: 'closed_won', contact_id: '7', created_at: '2026-02-01T10:00:00Z' },
  { id: '9', title: 'Suporte Anual', value: 9000, stage: 'closed_lost', contact_id: '6', created_at: '2026-01-28T15:00:00Z' },
]

const STAGES = [
  { key: 'new', label: 'Novo', color: '#94a3b8', bg: '#f1f5f9' },
  { key: 'qualified', label: 'Qualificado', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'proposal', label: 'Proposta', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'negotiation', label: 'Negociação', color: '#f97316', bg: '#fff7ed' },
  { key: 'closed_won', label: 'Ganho', color: '#22c55e', bg: '#f0fdf4' },
  { key: 'closed_lost', label: 'Perdido', color: '#ef4444', bg: '#fef2f2' },
]

const fmt = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// ── ICONS (inline SVG) ──────────────────────────────────
const Icons = {
  users: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  deal: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  chart: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  plus: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  x: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  trash: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/></svg>,
  arrow: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
}

// ── TOAST ────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  const bg = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100, background: bg,
      color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 14,
      fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,.15)', display: 'flex',
      alignItems: 'center', gap: 8, animation: 'slideUp .3s ease'
    }}>
      {type === 'success' ? Icons.check : null}
      {message}
    </div>
  )
}

// ── MODAL ───────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)',
        backdropFilter: 'blur(4px)', animation: 'fadeIn .2s ease'
      }} />
      <div style={{
        position: 'relative', background: 'white', borderRadius: 16,
        padding: 28, width: '90%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        animation: 'scaleIn .25s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>{Icons.x}</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0',
  borderRadius: 10, fontSize: 14, outline: 'none', background: '#f8fafc',
  transition: 'border-color .2s', boxSizing: 'border-box',
}

const labelStyle = { fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }

const btnPrimary = {
  padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none',
  borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  transition: 'background .2s',
}

// ── METRIC CARD ─────────────────────────────────────────
function MetricCard({ label, value, icon, accent }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: '20px 22px',
      border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden',
      flex: '1 1 200px', minWidth: 180,
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: accent || '#eff6ff', opacity: 0.5,
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{ color: accent || '#3b82f6', marginBottom: 8 }}>{icon}</div>
        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, margin: '0 0 4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, fontFeatureSettings: '"tnum"' }}>{value}</p>
      </div>
    </div>
  )
}

// ── PIPELINE COLUMN ─────────────────────────────────────
function PipelineCol({ stage, deals, onMove }) {
  const total = deals.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ flex: '1 1 170px', minWidth: 170 }}>
      <div style={{ height: 3, background: stage.color, borderRadius: '4px 4px 0 0' }} />
      <div style={{ background: stage.bg, borderRadius: '0 0 10px 10px', padding: 12, minHeight: 200 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: stage.color }}>{stage.label}</span>
          <span style={{
            fontSize: 11, background: 'white', padding: '2px 8px', borderRadius: 20,
            color: '#64748b', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,.06)'
          }}>{deals.length}</span>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px', fontWeight: 500 }}>{fmt(total)}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deals.map(deal => (
            <div key={deal.id} style={{
              background: 'white', borderRadius: 10, padding: 12,
              border: '1px solid #e5e7eb', transition: 'box-shadow .2s',
              cursor: 'default',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 6px', lineHeight: 1.3 }}>{deal.title}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: stage.color, margin: 0 }}>{fmt(deal.value)}</p>
            </div>
          ))}
          {deals.length === 0 && (
            <p style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
              Nenhum deal
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── SKELETON ────────────────────────────────────────────
function Skeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          height: 48, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
          borderRadius: 8, backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [contacts, setContacts] = useState(MOCK_CONTACTS)
  const [deals, setDeals] = useState(MOCK_DEALS)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewContact, setShowNewContact] = useState(false)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // FORM states
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', status: 'active' })
  const [dealForm, setDealForm] = useState({ title: '', value: '', stage: 'new', contact_id: '' })

  // Simulate loading
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  // Metrics
  const openDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
  const wonDeals = deals.filter(d => d.stage === 'closed_won')
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0)
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0)
  const convRate = deals.length ? Math.round(wonDeals.length / deals.length * 100) : 0

  // Filtered contacts
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  // CREATE contact
  const handleCreateContact = () => {
    if (!contactForm.name.trim()) return
    const newC = {
      id: String(Date.now()),
      ...contactForm,
      company_id: null,
      created_at: new Date().toISOString(),
    }
    setContacts(prev => [newC, ...prev])
    setShowNewContact(false)
    setContactForm({ name: '', email: '', phone: '', status: 'active' })
    setToast({ message: 'Contato criado com sucesso', type: 'success' })
  }

  // CREATE deal
  const handleCreateDeal = () => {
    if (!dealForm.title.trim()) return
    const newD = {
      id: String(Date.now()),
      title: dealForm.title,
      value: Number(dealForm.value) || 0,
      stage: dealForm.stage,
      contact_id: dealForm.contact_id || null,
      created_at: new Date().toISOString(),
    }
    setDeals(prev => [newD, ...prev])
    setShowNewDeal(false)
    setDealForm({ title: '', value: '', stage: 'new', contact_id: '' })
    setToast({ message: 'Deal criado com sucesso', type: 'success' })
  }

  // DELETE
  const handleDelete = (type, id) => {
    if (type === 'contact') {
      setContacts(prev => prev.filter(c => c.id !== id))
    } else {
      setDeals(prev => prev.filter(d => d.id !== id))
    }
    setConfirmDelete(null)
    setToast({ message: 'Removido com sucesso', type: 'success' })
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.chart },
    { id: 'contacts', label: 'Contatos', icon: Icons.users },
    { id: 'pipeline', label: 'Pipeline', icon: Icons.deal },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        input:focus { border-color: #3b82f6 !important; background: white !important; }
        select:focus { border-color: #3b82f6 !important; }
        button:active { transform: scale(.97); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* HEADER */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e5e7eb',
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>L</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>LAI CRM</span>
          <span style={{
            fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#3b82f6',
            padding: '2px 8px', borderRadius: 6, letterSpacing: '0.05em',
          }}>BETA</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 13, fontWeight: 700,
          }}>U</div>
        </div>
      </header>

      {/* TABS */}
      <nav style={{
        background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 24px',
        display: 'flex', gap: 4, position: 'sticky', top: 56, zIndex: 29,
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 16px', fontSize: 13, fontWeight: 600,
              color: tab === t.id ? '#2563eb' : '#64748b',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid #2563eb' : '2px solid transparent',
              transition: 'all .2s',
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* CONTENT */}
      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

        {loading ? <Skeleton rows={6} /> : (
          <>
            {/* ── DASHBOARD ──────────────────────────────── */}
            {tab === 'dashboard' && (
              <div style={{ animation: 'fadeIn .3s ease' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
                  <MetricCard label="Contatos" value={contacts.length} icon={Icons.users} accent="#3b82f6" />
                  <MetricCard label="Deals Abertos" value={openDeals.length} icon={Icons.deal} accent="#f59e0b" />
                  <MetricCard label="Pipeline" value={fmt(pipelineValue)} icon={Icons.chart} accent="#8b5cf6" />
                  <MetricCard label="Conversão" value={`${convRate}%`} icon={Icons.check} accent="#22c55e" />
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {/* Deals by stage mini chart */}
                  <div style={{
                    flex: '2 1 400px', background: 'white', borderRadius: 14,
                    border: '1px solid #e5e7eb', padding: 22,
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Pipeline por Estágio</h3>
                    {STAGES.filter(s => s.key !== 'closed_lost').map(s => {
                      const count = deals.filter(d => d.stage === s.key).length
                      const pct = deals.length ? (count / deals.length * 100) : 0
                      return (
                        <div key={s.key} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{s.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{count}</span>
                          </div>
                          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct}%`, background: s.color,
                              borderRadius: 3, transition: 'width .5s ease',
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Recent */}
                  <div style={{
                    flex: '1 1 280px', background: 'white', borderRadius: 14,
                    border: '1px solid #e5e7eb', padding: 22,
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Últimos Deals</h3>
                    {deals.slice(0, 5).map(d => {
                      const st = STAGES.find(s => s.key === d.stage)
                      return (
                        <div key={d.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 0', borderBottom: '1px solid #f1f5f9',
                        }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>{d.title}</p>
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: st?.color,
                              background: st?.bg, padding: '2px 6px', borderRadius: 4,
                            }}>{st?.label}</span>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(d.value)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{
                  marginTop: 20, background: 'white', borderRadius: 14,
                  border: '1px solid #e5e7eb', padding: 22,
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Valor Total Ganho</h3>
                  <p style={{ fontSize: 32, fontWeight: 800, color: '#22c55e', margin: 0 }}>{fmt(wonValue)}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>de {wonDeals.length} deal{wonDeals.length !== 1 ? 's' : ''} fechado{wonDeals.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            {/* ── CONTACTS ───────────────────────────────── */}
            {tab === 'contacts' && (
              <div style={{ animation: 'fadeIn .3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>{Icons.search}</span>
                    <input
                      type="text"
                      placeholder="Buscar contatos..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 36, width: 300 }}
                    />
                  </div>
                  <button
                    onClick={() => setShowNewContact(true)}
                    style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {Icons.plus} Novo Contato
                  </button>
                </div>

                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contato</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telefone</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                        <th style={{ width: 60 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background .15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: `hsl(${c.name.charCodeAt(0) * 7 % 360}, 65%, 92%)`,
                                color: `hsl(${c.name.charCodeAt(0) * 7 % 360}, 65%, 35%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 700,
                              }}>
                                {c.name.charAt(0)}
                              </div>
                              <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{c.name}</p>
                                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569' }}>{c.phone || '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                              background: c.status === 'active' ? '#f0fdf4' : '#f1f5f9',
                              color: c.status === 'active' ? '#16a34a' : '#64748b',
                            }}>
                              {c.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => setConfirmDelete({ type: 'contact', id: c.id, name: c.name })}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#cbd5e1', padding: 4, borderRadius: 4,
                                transition: 'color .2s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}
                            >
                              {Icons.trash}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      <p style={{ fontSize: 14 }}>Nenhum contato encontrado</p>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{filtered.length} de {contacts.length} contatos</p>
              </div>
            )}

            {/* ── PIPELINE ───────────────────────────────── */}
            {tab === 'pipeline' && (
              <div style={{ animation: 'fadeIn .3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Pipeline de Vendas
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginLeft: 8 }}>
                      {fmt(pipelineValue)} em aberto
                    </span>
                  </h2>
                  <button onClick={() => setShowNewDeal(true)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Icons.plus} Novo Deal
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                  {STAGES.map(s => (
                    <PipelineCol key={s.key} stage={s} deals={deals.filter(d => d.stage === s.key)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── MODAL: New Contact ───────────────────────────── */}
      {showNewContact && (
        <Modal title="Novo Contato" onClose={() => setShowNewContact(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input style={inputStyle} placeholder="Ex: Maria Silva" value={contactForm.name}
                onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" placeholder="maria@empresa.com" value={contactForm.email}
                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Telefone</label>
              <input style={inputStyle} placeholder="(11) 99999-0000" value={contactForm.phone}
                onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <button onClick={handleCreateContact} style={{ ...btnPrimary, width: '100%', marginTop: 4 }}>
              Criar Contato
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: New Deal ──────────────────────────────── */}
      {showNewDeal && (
        <Modal title="Novo Deal" onClose={() => setShowNewDeal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Título *</label>
              <input style={inputStyle} placeholder="Ex: Licença Enterprise" value={dealForm.title}
                onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Valor (R$)</label>
              <input style={inputStyle} type="number" min="0" step="100" placeholder="0.00" value={dealForm.value}
                onChange={e => setDealForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Estágio</label>
              <select
                value={dealForm.stage}
                onChange={e => setDealForm(f => ({ ...f, stage: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Contato</label>
              <select
                value={dealForm.contact_id}
                onChange={e => setDealForm(f => ({ ...f, contact_id: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Selecionar...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={handleCreateDeal} style={{ ...btnPrimary, width: '100%', marginTop: 4 }}>
              Criar Deal
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Confirm Delete ────────────────────────── */}
      {confirmDelete && (
        <Modal title="Confirmar exclusão" onClose={() => setConfirmDelete(null)}>
          <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px' }}>
            Tem certeza que deseja remover <strong>{confirmDelete.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDelete(null)}
              style={{ ...btnPrimary, background: '#f1f5f9', color: '#475569' }}>
              Cancelar
            </button>
            <button onClick={() => handleDelete(confirmDelete.type, confirmDelete.id)}
              style={{ ...btnPrimary, background: '#ef4444' }}>
              Remover
            </button>
          </div>
        </Modal>
      )}

      {/* TOAST */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
