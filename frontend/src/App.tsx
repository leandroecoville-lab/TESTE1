// ENTRY: CRM Contacts App
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

// TYPES
interface Contact {
  id: string
  name: string
  email: string
  phone: string
  status: string
  company_id: string
  created_at: string
}

interface Deal {
  id: string
  title: string
  value: number
  stage: string
  contact_id: string
}

interface DashboardData {
  total_contacts: number
  open_deals: number
  pipeline_value: number
  won_value: number
  conversion_rate: number
}

// CORE: Dashboard metrics card
function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}

// CORE: Contact row
function ContactRow({ contact }: { contact: Contact }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">
            {contact.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900">{contact.name}</p>
            <p className="text-sm text-gray-500">{contact.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{contact.phone || '—'}</td>
      <td className="py-3 px-4">
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          contact.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {contact.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </td>
    </tr>
  )
}

// CORE: Pipeline kanban column
function PipelineColumn({ title, deals, color }: { title: string; deals: Deal[]; color: string }) {
  const total = deals.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex-1 min-w-[200px]">
      <div className={`h-1 ${color} rounded-t-lg`} />
      <div className="bg-gray-50 rounded-b-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
          <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500 shadow-sm">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        <div className="space-y-2">
          {deals.map(deal => (
            <div key={deal.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <p className="font-medium text-sm text-gray-800">{deal.title}</p>
              <p className="text-sm text-blue-600 font-semibold mt-1">
                R$ {deal.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
          {deals.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">Nenhum deal</p>
          )}
        </div>
      </div>
    </div>
  )
}

// EXPORT: Main App
export default function App() {
  const [tab, setTab] = useState<'dashboard' | 'contacts' | 'pipeline'>('dashboard')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [search, setSearch] = useState('')
  const [metrics, setMetrics] = useState<DashboardData>({
    total_contacts: 0, open_deals: 0, pipeline_value: 0, won_value: 0, conversion_rate: 0
  })

  // FLOW: Load data (mock for preview, real via Supabase)
  useEffect(() => {
    // Mock data for preview
    setContacts([
      { id: '1', name: 'Maria Silva', email: 'maria@acme.com', phone: '(11) 99999-0001', status: 'active', company_id: '1', created_at: '2026-02-20' },
      { id: '2', name: 'João Santos', email: 'joao@betalabs.io', phone: '(11) 99999-0002', status: 'active', company_id: '2', created_at: '2026-02-18' },
      { id: '3', name: 'Ana Oliveira', email: 'ana@email.com', phone: '(11) 99999-0003', status: 'active', company_id: '', created_at: '2026-02-15' },
      { id: '4', name: 'Carlos Mendes', email: 'carlos@techcorp.com', phone: '(11) 99999-0004', status: 'inactive', company_id: '3', created_at: '2026-02-10' },
      { id: '5', name: 'Lucia Ferreira', email: 'lucia@startup.io', phone: '(11) 99999-0005', status: 'active', company_id: '4', created_at: '2026-02-08' },
    ])
    setDeals([
      { id: '1', title: 'Licença Enterprise Acme', value: 45000, stage: 'proposal', contact_id: '1' },
      { id: '2', title: 'Projeto Beta Labs', value: 12000, stage: 'qualified', contact_id: '2' },
      { id: '3', title: 'Consultoria Ana', value: 8500, stage: 'new', contact_id: '3' },
      { id: '4', title: 'Upsell Acme', value: 22000, stage: 'negotiation', contact_id: '1' },
      { id: '5', title: 'Renovação Beta', value: 15000, stage: 'closed_won', contact_id: '2' },
      { id: '6', title: 'Parceria TechCorp', value: 35000, stage: 'proposal', contact_id: '4' },
      { id: '7', title: 'Onboarding Startup', value: 6000, stage: 'new', contact_id: '5' },
    ])
    setMetrics({
      total_contacts: 5,
      open_deals: 5,
      pipeline_value: 128500,
      won_value: 15000,
      conversion_rate: 14.3
    })
  }, [])

  const stages = [
    { key: 'new', title: 'Novo', color: 'bg-gray-400' },
    { key: 'qualified', title: 'Qualificado', color: 'bg-blue-500' },
    { key: 'proposal', title: 'Proposta', color: 'bg-yellow-500' },
    { key: 'negotiation', title: 'Negociação', color: 'bg-orange-500' },
    { key: 'closed_won', title: 'Ganho', color: 'bg-green-500' },
    { key: 'closed_lost', title: 'Perdido', color: 'bg-red-500' },
  ]

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* FLOW: Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">LAI CRM</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
              U
            </div>
          </div>
        </div>
      </header>

      {/* FLOW: Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-6">
          {(['dashboard', 'contacts', 'pipeline'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'dashboard' ? '📊 Dashboard' : t === 'contacts' ? '👥 Contatos' : '💰 Pipeline'}
            </button>
          ))}
        </nav>
      </div>

      {/* FLOW: Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard label="Total Contatos" value={String(metrics.total_contacts)} icon="👥" />
              <MetricCard label="Deals Abertos" value={String(metrics.open_deals)} icon="📋" />
              <MetricCard
                label="Valor Pipeline"
                value={`R$ ${metrics.pipeline_value.toLocaleString('pt-BR')}`}
                icon="💰"
              />
              <MetricCard label="Taxa Conversão" value={`${metrics.conversion_rate}%`} icon="📈" />
            </div>
          </div>
        )}

        {/* Contacts */}
        {tab === 'contacts' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <input
                type="text"
                placeholder="Buscar contatos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-72 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                + Novo Contato
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Contato</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => <ContactRow key={c.id} contact={c} />)}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">Nenhum contato encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* Pipeline */}
        {tab === 'pipeline' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map(s => (
              <PipelineColumn
                key={s.key}
                title={s.title}
                deals={deals.filter(d => d.stage === s.key)}
                color={s.color}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
