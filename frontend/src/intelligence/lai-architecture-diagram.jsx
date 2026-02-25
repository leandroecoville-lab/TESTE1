import { useState } from "react"

const AGENTS = [
  { id: "tracker", name: "Behavior Tracker", type: "frontend", freq: "5s flush", icon: "👁️", color: "#3b82f6", x: 50, y: 8, desc: "30 linhas no front. Captura clicks, nav, copy/paste, exports, errors, idle, rage clicks.", output: "user_behavior_events" },
  { id: "friction", name: "Friction Detector", type: "agent", freq: "15min", icon: "🔥", color: "#f97316", x: 15, y: 35, desc: "Analisa eventos → detecta rage clicks, backtracks, error loops, dead clicks.", output: "friction_events" },
  { id: "process", name: "Process Miner", type: "agent", freq: "1h", icon: "⛏️", color: "#a855f7", x: 50, y: 35, desc: "Reconstrói fluxos reais dos usuários. Gera Mermaid diagrams.", output: "process_traces" },
  { id: "omega", name: "Spy Omega", type: "spy", freq: "3h", icon: "🔍", color: "#eab308", x: 85, y: 35, desc: "Caça processos manuais: exports, copy/paste, sequências repetitivas.", output: "spy_agent_reports" },
  { id: "scout", name: "Automation Scout", type: "agent", freq: "6h", icon: "🤖", color: "#10b981", x: 32, y: 58, desc: "Propõe automatizações com ROI calculado. Prioriza por economia.", output: "automation_proposals" },
  { id: "alpha", name: "Spy Alpha", type: "spy", freq: "2h", icon: "🛸", color: "#06b6d4", x: 68, y: 58, desc: "Varre sistema: DB, performance, segurança, custos, agents.", output: "spy_agent_reports" },
  { id: "health", name: "Health Rover", type: "agent", freq: "1h", icon: "🛡️", color: "#8b5cf6", x: 10, y: 58, desc: "Checa DB, Edge Functions, auth, API performance.", output: "system_health_checks" },
  { id: "cost", name: "Cost Watcher", type: "agent", freq: "12h", icon: "💸", color: "#ef4444", x: 90, y: 58, desc: "Monitora gastos, projeta custos, alerta estouros.", output: "cost_tracking" },
  { id: "harvester", name: "Knowledge Harvester", type: "agent", freq: "4h", icon: "📚", color: "#ec4899", x: 50, y: 75, desc: "Indexa tudo em pgvector: frictions, proposals, learnings → FAQ + ADRs.", output: "knowledge_base" },
  { id: "learning", name: "Learning Accumulator", type: "barrier", freq: "pós-build", icon: "🧠", color: "#7c3aed", x: 25, y: 92, desc: "BARREIRA 1: Extrai patterns de cada build → próximo build consulta.", output: "build_learnings" },
  { id: "trust", name: "Trust Certifier", type: "barrier", freq: "pós-build", icon: "🔗", color: "#d97706", x: 75, y: 92, desc: "BARREIRA 3: Gera certificado com score + evidências. Não-técnico confia.", output: "trust_certificates" },
]

const FLOWS = [
  { from: "tracker", to: "friction", label: "eventos brutos" },
  { from: "tracker", to: "process", label: "navegação" },
  { from: "tracker", to: "omega", label: "exports/copy" },
  { from: "friction", to: "scout", label: "dor detectada" },
  { from: "process", to: "scout", label: "gargalos" },
  { from: "omega", to: "scout", label: "manuais" },
  { from: "scout", to: "harvester", label: "propostas" },
  { from: "friction", to: "harvester", label: "fricções" },
  { from: "learning", to: "harvester", label: "patterns" },
  { from: "health", to: "alpha", label: "métricas" },
  { from: "cost", to: "alpha", label: "custos" },
]

function AgentNode({ agent, selected, onClick }) {
  const isSelected = selected === agent.id
  return (
    <div onClick={() => onClick(agent.id)}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110"
      style={{ left: `${agent.x}%`, top: `${agent.y}%`, zIndex: isSelected ? 20 : 10 }}>
      <div className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${isSelected ? 'bg-white/15 border-white/40 shadow-lg shadow-white/10' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
        style={{ borderColor: isSelected ? agent.color : undefined }}>
        <span className="text-xl">{agent.icon}</span>
        <span className="text-[10px] font-bold text-white whitespace-nowrap">{agent.name}</span>
        <span className="text-[8px] text-gray-400">{agent.freq}</span>
      </div>
    </div>
  )
}

export default function App() {
  const [selected, setSelected] = useState(null)
  const agent = AGENTS.find(a => a.id === selected)

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060a12 0%, #0f172a 50%, #060a12 100%)" }}>
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-bold text-white">LAI Intelligence Layer — Diagrama de Arquitetura</h1>
        <p className="text-gray-500 text-xs mt-0.5">Clique em qualquer agente para ver detalhes. 9 agents + 2 spies + 2 barreiras.</p>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Diagram */}
        <div className="relative w-full rounded-2xl border border-white/10 bg-white/[0.02]" style={{ paddingBottom: "75%" }}>
          {/* Labels */}
          <div className="absolute top-1 left-3 text-[9px] text-blue-400/60 font-bold uppercase tracking-widest">Frontend</div>
          <div className="absolute top-[28%] left-3 text-[9px] text-orange-400/60 font-bold uppercase tracking-widest">Detecção</div>
          <div className="absolute top-[50%] left-3 text-[9px] text-emerald-400/60 font-bold uppercase tracking-widest">Análise</div>
          <div className="absolute top-[68%] left-3 text-[9px] text-pink-400/60 font-bold uppercase tracking-widest">Indexação</div>
          <div className="absolute top-[85%] left-3 text-[9px] text-violet-400/60 font-bold uppercase tracking-widest">Barreiras</div>

          {/* Divider lines */}
          <div className="absolute w-full border-t border-white/5" style={{ top: "25%" }} />
          <div className="absolute w-full border-t border-white/5" style={{ top: "48%" }} />
          <div className="absolute w-full border-t border-white/5" style={{ top: "68%" }} />
          <div className="absolute w-full border-t border-white/5" style={{ top: "85%" }} />

          {/* SVG Flow Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="rgba(255,255,255,0.15)" />
              </marker>
            </defs>
            {FLOWS.map((f, i) => {
              const from = AGENTS.find(a => a.id === f.from)
              const to = AGENTS.find(a => a.id === f.to)
              if (!from || !to) return null
              const isActive = selected === f.from || selected === f.to
              return (
                <line key={i} x1={from.x} y1={from.y + 3} x2={to.x} y2={to.y - 3}
                  stroke={isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.08)"}
                  strokeWidth={isActive ? "0.3" : "0.15"} markerEnd="url(#arrow)"
                  strokeDasharray={isActive ? "none" : "1 1"} />
              )
            })}
          </svg>

          {/* Agent Nodes */}
          {AGENTS.map(a => (
            <AgentNode key={a.id} agent={a} selected={selected} onClick={setSelected} />
          ))}
        </div>

        {/* Detail Panel */}
        {agent && (
          <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <h3 className="text-white font-bold">{agent.name}</h3>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{agent.freq}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full text-gray-300" style={{ backgroundColor: agent.color + "20", color: agent.color }}>{agent.type}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-300">{agent.desc}</p>
            <div className="mt-2 text-xs text-gray-500">
              Output → <code className="text-blue-400">{agent.output}</code>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Conexões: {FLOWS.filter(f => f.from === agent.id).map(f => `→ ${AGENTS.find(a => a.id === f.to)?.name}`).join(', ') || 'nenhuma saída'}
              {FLOWS.filter(f => f.to === agent.id).length > 0 && (
                <span className="ml-2">| Recebe de: {FLOWS.filter(f => f.to === agent.id).map(f => AGENTS.find(a => a.id === f.from)?.name).join(', ')}</span>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Frontend</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Agent (cron)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Spy Agent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Barreira</span>
          <span>| IA: Servidor local ($0) ou Claude API (fallback)</span>
        </div>
      </div>
    </div>
  )
}
