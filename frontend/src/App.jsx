import { useState, useEffect, useCallback, createContext, useContext } from "react"

// ── DESIGN: Refined SaaS with warm neutrals + blue accent ──

// ── TOAST SYSTEM ────────────────────────────────────────────
const ToastContext = createContext(null)
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium backdrop-blur-sm
            ${t.type === "success" ? "bg-emerald-600 text-white" : t.type === "error" ? "bg-red-600 text-white" : "bg-gray-800 text-white"}`}
            style={{ animation: "slideUp 0.3s ease-out" }}>
            {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : "ℹ "}{t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
function useToast() { return useContext(ToastContext) }

// ── ERROR BOUNDARY ──────────────────────────────────────────
function ErrorFallback({ error, onReset }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Algo deu errado</h2>
        <p className="text-gray-500 text-sm mb-6">{error?.message || "Erro inesperado na aplicação"}</p>
        <button onClick={onReset} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

// ── AUTH CONTEXT ─────────────────────────────────────────────
const AuthContext = createContext(null)
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const saved = user // In production: supabase.auth.getSession()
    setTimeout(() => setLoading(false), 600)
  }, [])
  const login = (email, password) => {
    setLoading(true)
    setTimeout(() => {
      if (email && password.length >= 4) {
        setUser({ id: "u1", email, name: email.split("@")[0], role: "admin", tenant_id: "t1" })
      }
      setLoading(false)
    }, 800)
  }
  const logout = () => { setUser(null) }
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}
function useAuth() { return useContext(AuthContext) }

// ── LOADING SKELETON ────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}
function TableSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ── DELETE CONFIRMATION MODAL ───────────────────────────────
function DeleteModal({ item, onConfirm, onCancel }) {
  if (!item) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🗑️</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Confirmar exclusão</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Tem certeza que deseja excluir <strong>{item.name || item.title}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={() => onConfirm(item)} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FORM MODAL (Create/Edit Contact) ────────────────────────
function ContactFormModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState(contact || { name: "", email: "", phone: "", status: "active" })
  const [errors, setErrors] = useState({})
  const toast = useToast()

  const validate = () => {
    const e = {}
    if (!form.name?.trim()) e.name = "Nome é obrigatório"
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = "Email inválido"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...form, id: form.id || `c${Date.now()}`, created_at: form.created_at || new Date().toISOString() })
    toast(contact ? "Contato atualizado" : "Contato criado")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-5">{contact ? "Editar Contato" : "Novo Contato"}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500
              ${errors.name ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              placeholder="Nome completo" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500
              ${errors.email ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              placeholder="email@empresa.com" type="email" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Telefone</label>
            <input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(11) 99999-0000" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            {contact ? "Salvar" : "Criar Contato"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FORM MODAL (Create/Edit Deal) ───────────────────────────
function DealFormModal({ deal, contacts, onSave, onClose }) {
  const [form, setForm] = useState(deal || { title: "", value: 0, stage: "new", contact_id: "" })
  const [errors, setErrors] = useState({})
  const toast = useToast()

  const validate = () => {
    const e = {}
    if (!form.title?.trim()) e.title = "Título é obrigatório"
    if (form.value < 0) e.value = "Valor não pode ser negativo"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...form, id: form.id || `d${Date.now()}`, value: Number(form.value) })
    toast(deal ? "Deal atualizado" : "Deal criado")
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-5">{deal ? "Editar Deal" : "Novo Deal"}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Título *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={`w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500
              ${errors.title ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              placeholder="Nome do deal" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Valor (R$)</label>
            <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              type="number" min="0" step="100" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contato</label>
            <select value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Selecionar...</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Etapa</label>
            <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="new">Novo</option>
              <option value="qualified">Qualificado</option>
              <option value="proposal">Proposta</option>
              <option value="negotiation">Negociação</option>
              <option value="closed_won">Ganho</option>
              <option value="closed_lost">Perdido</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            {deal ? "Salvar" : "Criar Deal"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── LOGIN PAGE ──────────────────────────────────────────────
function LoginPage() {
  const { login, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [pass, setPass] = useState("")
  const [error, setError] = useState("")

  const handleLogin = () => {
    if (!email || !pass) { setError("Preencha todos os campos"); return }
    setError("")
    login(email, pass)
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="hidden lg:flex flex-1 items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">LAI CRM</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Gerencie seus contatos e vendas em um só lugar
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Pipeline visual, dashboard em tempo real e controle total do seu funil de vendas.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { n: "250+", l: "Contatos" },
              { n: "R$ 2.1M", l: "Pipeline" },
              { n: "34%", l: "Conversão" },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <p className="text-2xl font-bold text-white">{s.n}</p>
                <p className="text-xs text-gray-400 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-bold text-gray-900">LAI CRM</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo</h2>
          <p className="text-gray-500 text-sm mb-8">Entre com sua conta para continuar</p>

          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl mb-4">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Senha</label>
              <input value={pass} onChange={e => setPass(e.target.value)} type="password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-all">
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-xs text-gray-400 text-center mt-6">
            Demo: use qualquer email + senha (min 4 chars)
          </p>
        </div>
      </div>
    </div>
  )
}

// ── METRIC CARD ─────────────────────────────────────────────
function MetricCard({ label, value, sub, color = "blue" }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    violet: "from-violet-500 to-violet-600",
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && (
        <div className="mt-3 flex items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden`}>
            <div className={`h-full rounded-full bg-gradient-to-r ${colors[color]}`} style={{ width: sub }} />
          </div>
          <span className="text-xs text-gray-400">{sub}</span>
        </div>
      )}
    </div>
  )
}

// ── PIPELINE COLUMN ─────────────────────────────────────────
function PipelineColumn({ title, deals, color, onDealClick }) {
  const total = deals.reduce((s, d) => s + d.value, 0)
  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
        <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{deals.length}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3 font-medium">
        R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
      </p>
      <div className="space-y-2 min-h-[120px]">
        {deals.map(d => (
          <div key={d.id} onClick={() => onDealClick?.(d)}
            className="bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group">
            <p className="font-medium text-sm text-gray-800 group-hover:text-blue-700 transition-colors">{d.title}</p>
            <p className="text-sm font-semibold text-blue-600 mt-1.5">
              R$ {d.value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </p>
            {d.contactName && <p className="text-xs text-gray-400 mt-2">{d.contactName}</p>}
          </div>
        ))}
        {deals.length === 0 && (
          <div className="text-center py-8 text-gray-300">
            <p className="text-2xl mb-1">📭</p>
            <p className="text-xs">Nenhum deal</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN APP ────────────────────────────────────────────────
function CRMApp() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState("dashboard")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showContactForm, setShowContactForm] = useState(null)
  const [showDealForm, setShowDealForm] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])

  useEffect(() => {
    setTimeout(() => {
      setContacts([
        { id: "1", name: "Maria Silva", email: "maria@acme.com", phone: "(11) 99999-0001", status: "active", company: "Acme Corp" },
        { id: "2", name: "João Santos", email: "joao@betalabs.io", phone: "(11) 99999-0002", status: "active", company: "Beta Labs" },
        { id: "3", name: "Ana Oliveira", email: "ana@email.com", phone: "(11) 99999-0003", status: "active", company: "" },
        { id: "4", name: "Carlos Mendes", email: "carlos@techcorp.com", phone: "(11) 99999-0004", status: "inactive", company: "TechCorp" },
        { id: "5", name: "Lucia Ferreira", email: "lucia@startup.io", phone: "(11) 99999-0005", status: "active", company: "StartupIO" },
        { id: "6", name: "Roberto Lima", email: "roberto@consulting.com", phone: "(11) 99999-0006", status: "active", company: "Consulting Plus" },
        { id: "7", name: "Patricia Souza", email: "patricia@vendas.com.br", phone: "(11) 99999-0007", status: "active", company: "Vendas BR" },
      ])
      setDeals([
        { id: "1", title: "Licença Enterprise Acme", value: 45000, stage: "proposal", contact_id: "1", contactName: "Maria Silva" },
        { id: "2", title: "Projeto Beta Labs", value: 12000, stage: "qualified", contact_id: "2", contactName: "João Santos" },
        { id: "3", title: "Consultoria Ana", value: 8500, stage: "new", contact_id: "3", contactName: "Ana Oliveira" },
        { id: "4", title: "Upsell Acme", value: 22000, stage: "negotiation", contact_id: "1", contactName: "Maria Silva" },
        { id: "5", title: "Renovação Beta", value: 15000, stage: "closed_won", contact_id: "2", contactName: "João Santos" },
        { id: "6", title: "Parceria TechCorp", value: 35000, stage: "proposal", contact_id: "4", contactName: "Carlos Mendes" },
        { id: "7", title: "Onboarding Startup", value: 6000, stage: "new", contact_id: "5", contactName: "Lucia Ferreira" },
        { id: "8", title: "Expansão Consulting", value: 28000, stage: "negotiation", contact_id: "6", contactName: "Roberto Lima" },
        { id: "9", title: "Contrato Vendas BR", value: 18000, stage: "closed_won", contact_id: "7", contactName: "Patricia Souza" },
      ])
      setLoading(false)
    }, 900)
  }, [])

  const saveContact = (c) => {
    setContacts(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      return idx >= 0 ? prev.map((x, i) => i === idx ? c : x) : [...prev, c]
    })
  }

  const saveDeal = (d) => {
    setDeals(prev => {
      const idx = prev.findIndex(x => x.id === d.id)
      return idx >= 0 ? prev.map((x, i) => i === idx ? d : x) : [...prev, d]
    })
  }

  const confirmDelete = (item) => {
    if (item.email) {
      setContacts(p => p.filter(c => c.id !== item.id))
    } else {
      setDeals(p => p.filter(d => d.id !== item.id))
    }
    toast("Item excluído")
    setDeleteTarget(null)
  }

  const stages = [
    { key: "new", title: "Novo", color: "bg-gray-400" },
    { key: "qualified", title: "Qualificado", color: "bg-blue-500" },
    { key: "proposal", title: "Proposta", color: "bg-amber-500" },
    { key: "negotiation", title: "Negociação", color: "bg-orange-500" },
    { key: "closed_won", title: "Ganho ✓", color: "bg-emerald-500" },
    { key: "closed_lost", title: "Perdido", color: "bg-red-400" },
  ]

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || "").toLowerCase().includes(search.toLowerCase())
  )

  const openDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage))
  const wonDeals = deals.filter(d => d.stage === "closed_won")
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0)
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0)
  const closedTotal = wonDeals.length + deals.filter(d => d.stage === "closed_lost").length
  const convRate = closedTotal > 0 ? Math.round(wonDeals.length / closedTotal * 100) : 0

  const navItems = [
    { key: "dashboard", icon: "📊", label: "Dashboard" },
    { key: "contacts", icon: "👥", label: "Contatos" },
    { key: "pipeline", icon: "💰", label: "Pipeline" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 flex items-center gap-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">LAI CRM</p>
            <p className="text-xs text-gray-400">v0.0.1</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(n => (
            <button key={n.key} onClick={() => { setTab(n.key); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${tab === n.key ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || "Usuário"}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Sair">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <main className="flex-1 min-w-0">
        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">☰</button>
          <h2 className="font-bold text-gray-900">{navItems.find(n => n.key === tab)?.label}</h2>
          <div className="flex-1" />
          <span className="text-xs text-gray-400 hidden sm:block">{user?.role === "admin" ? "Administrador" : "Vendedor"}</span>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          {loading ? <TableSkeleton /> : (
            <>
              {/* DASHBOARD */}
              {tab === "dashboard" && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard label="Total Contatos" value={contacts.length} sub={`${contacts.filter(c => c.status === "active").length} ativos`} color="blue" />
                    <MetricCard label="Deals Abertos" value={openDeals.length} sub={`${stages.length} etapas`} color="violet" />
                    <MetricCard label="Valor Pipeline" value={`R$ ${(pipelineValue / 1000).toFixed(0)}k`} sub="75%" color="amber" />
                    <MetricCard label="Taxa Conversão" value={`${convRate}%`} sub={`${convRate}%`} color="emerald" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-900 text-sm mb-4">Deals por Etapa</h3>
                      <div className="space-y-3">
                        {stages.filter(s => s.key !== "closed_lost").map(s => {
                          const count = deals.filter(d => d.stage === s.key).length
                          const pct = deals.length ? Math.round(count / deals.length * 100) : 0
                          return (
                            <div key={s.key} className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                              <span className="text-sm text-gray-600 w-28">{s.title}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="font-bold text-gray-900 text-sm mb-4">Últimos Contatos</h3>
                      <div className="space-y-3">
                        {contacts.slice(0, 5).map(c => (
                          <div key={c.id} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                              {c.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                              <p className="text-xs text-gray-400 truncate">{c.email}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                              {c.status === "active" ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-900 text-sm mb-4">Resumo Financeiro</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">R$ {(pipelineValue / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-gray-400 mt-1">Em negociação</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">R$ {(wonValue / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-gray-400 mt-1">Fechado ganho</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">R$ {((pipelineValue + wonValue) / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-gray-400 mt-1">Total geral</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTACTS */}
              {tab === "contacts" && (
                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                    <div className="relative w-full sm:w-80">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Buscar por nome, email ou empresa..." />
                    </div>
                    <button onClick={() => setShowContactForm({})}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm">
                      + Novo Contato
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contato</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Empresa</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Telefone</th>
                            <th className="text-left py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map(c => (
                            <tr key={c.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {c.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-5 text-sm text-gray-600 hidden md:table-cell">{c.company || "—"}</td>
                              <td className="py-3 px-5 text-sm text-gray-500 hidden sm:table-cell">{c.phone}</td>
                              <td className="py-3 px-5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium
                                  ${c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                  {c.status === "active" ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setShowContactForm(c)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Editar">✏️</button>
                                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors" title="Excluir">🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filtered.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-3xl mb-2">🔍</p>
                        <p className="text-gray-500 text-sm">Nenhum contato encontrado</p>
                        <p className="text-gray-400 text-xs mt-1">Tente outra busca ou crie um novo contato</p>
                      </div>
                    )}
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-400">{filtered.length} de {contacts.length} contatos</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PIPELINE */}
              {tab === "pipeline" && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-sm text-gray-500">
                      {openDeals.length} deals abertos · R$ {pipelineValue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} em pipeline
                    </p>
                    <button onClick={() => setShowDealForm({})}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                      + Novo Deal
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
                    {stages.map(s => (
                      <PipelineColumn key={s.key} title={s.title} color={s.color}
                        deals={deals.filter(d => d.stage === s.key)}
                        onDealClick={d => setShowDealForm(d)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showContactForm !== null && (
        <ContactFormModal
          contact={showContactForm.id ? showContactForm : null}
          onSave={saveContact}
          onClose={() => setShowContactForm(null)}
        />
      )}
      {showDealForm !== null && (
        <DealFormModal
          deal={showDealForm.id ? showDealForm : null}
          contacts={contacts}
          onSave={saveDeal}
          onClose={() => setShowDealForm(null)}
        />
      )}
      <DeleteModal item={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── ENTRY POINT ─────────────────────────────────────────────
export default function App() {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)

  if (hasError) {
    return <ErrorFallback error={error} onReset={() => setHasError(false)} />
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  )
}

function AppRouter() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
            <span className="text-white font-bold">L</span>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />
  return <CRMApp />
}
