import { useState, useEffect, useCallback } from "react";

const PHASES = [
  { id: "queued", label: "Na fila", icon: "⏳", pct: 0 },
  { id: "pre-factory", label: "Pré-Fábrica", icon: "🔍", pct: 15 },
  { id: "blueprint", label: "Blueprint", icon: "📐", pct: 30 },
  { id: "pack0", label: "Pack0 (SRS)", icon: "📋", pct: 45 },
  { id: "validate", label: "Validação", icon: "✅", pct: 55 },
  { id: "pack1", label: "Pack1 (Código)", icon: "⚡", pct: 70 },
  { id: "promote", label: "PEC Chain", icon: "🔗", pct: 85 },
  { id: "export", label: "Export", icon: "📦", pct: 95 },
  { id: "done", label: "Pronto!", icon: "🚀", pct: 100 },
];

const EXAMPLES = [
  "Módulo de agendamento online integrado ao CRM com notificações por WhatsApp",
  "Sistema de pagamentos recorrentes com gestão de inadimplência e split de comissões",
  "Dashboard de analytics com KPIs de vendas, funil de conversão e previsão de receita",
  "Chatbot de atendimento com IA que integra com o banco de conhecimento da empresa",
];

export default function SoftwareFactory() {
  const [request, setRequest] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [mode, setMode] = useState("DILIGENCE");
  const [phase, setPhase] = useState(null);
  const [buildId, setBuildId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [builds, setBuilds] = useState([]);

  const addLog = useCallback((msg) => {
    setLogs((prev) => [
      ...prev,
      { time: new Date().toLocaleTimeString("pt-BR"), msg },
    ]);
  }, []);

  // Simulated polling (replace with real GitHub API calls)
  useEffect(() => {
    if (!buildId || phase === "done" || phase === "failed") return;
    const interval = setInterval(() => {
      const currentIdx = PHASES.findIndex((p) => p.id === phase);
      if (currentIdx < PHASES.length - 1) {
        const next = PHASES[currentIdx + 1];
        setPhase(next.id);
        addLog(`${next.icon} ${next.label}`);
        if (next.id === "done") {
          setDownloadUrl(
            `https://github.com/seu-repo/releases/tag/v0.1.0-${moduleName}-${buildId}`
          );
          setBuilds((prev) => [
            {
              id: buildId,
              module: moduleName,
              status: "done",
              date: new Date().toLocaleDateString("pt-BR"),
            },
            ...prev,
          ]);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [buildId, phase, moduleName, addLog]);

  const handleSubmit = () => {
    if (!request.trim()) return;
    const id = `BLD-${Date.now().toString(36).toUpperCase()}`;
    const mod =
      moduleName.trim() ||
      request
        .split(" ")
        .slice(0, 2)
        .join("-")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");
    setBuildId(id);
    setModuleName(mod);
    setPhase("queued");
    setError(null);
    setDownloadUrl(null);
    setLogs([{ time: new Date().toLocaleTimeString("pt-BR"), msg: "⏳ Build iniciado" }]);
    addLog(`📝 Módulo: ${mod} | Modo: ${mode}`);
  };

  const currentPhase = PHASES.find((p) => p.id === phase);
  const progress = currentPhase?.pct || 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e4e4e7",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {/* ─── Header ─── */}
      <header
        style={{
          borderBottom: "1px solid #1e1e2e",
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: "linear-gradient(135deg, #6366f1, #06b6d4)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🏭
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
            LAI Software Factory
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: "#71717a", letterSpacing: 1 }}>
            TEXTO → BLUEPRINT → CÓDIGO PRONTO
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <span
            style={{
              padding: "4px 10px",
              background: "#1e1e2e",
              borderRadius: 6,
              fontSize: 11,
              color: "#22c55e",
            }}
          >
            ● ONLINE
          </span>
          <span
            style={{
              padding: "4px 10px",
              background: "#1e1e2e",
              borderRadius: 6,
              fontSize: 11,
              color: "#71717a",
            }}
          >
            V012
          </span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 0,
          height: "calc(100vh - 81px)",
        }}
      >
        {/* ─── Main Panel ─── */}
        <main style={{ padding: 32, overflowY: "auto" }}>
          {/* Input Section */}
          {!buildId && (
            <div
              style={{
                maxWidth: 720,
                margin: "0 auto",
              }}
            >
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  marginBottom: 8,
                  background: "linear-gradient(135deg, #c4b5fd, #67e8f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                O que você quer construir?
              </h2>
              <p style={{ color: "#71717a", fontSize: 13, marginBottom: 24 }}>
                Descreva o software em linguagem natural. A fábrica cuida do resto.
              </p>

              <textarea
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder="Ex: Quero um módulo de agendamento integrado ao CRM com notificações por WhatsApp e painel de gestão..."
                style={{
                  width: "100%",
                  minHeight: 140,
                  background: "#111118",
                  border: "1px solid #27272a",
                  borderRadius: 12,
                  padding: 16,
                  color: "#e4e4e7",
                  fontSize: 14,
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="nome-do-modulo"
                  style={{
                    background: "#111118",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    padding: "10px 14px",
                    color: "#e4e4e7",
                    fontSize: 13,
                    fontFamily: "inherit",
                    width: 180,
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    background: "#111118",
                    borderRadius: 8,
                    border: "1px solid #27272a",
                    overflow: "hidden",
                  }}
                >
                  {["SCAN", "DILIGENCE"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      style={{
                        padding: "10px 16px",
                        background: mode === m ? "#6366f1" : "transparent",
                        color: mode === m ? "#fff" : "#71717a",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "inherit",
                        fontWeight: mode === m ? 600 : 400,
                        transition: "all 0.2s",
                      }}
                    >
                      {m === "SCAN" ? "⚡ Rápido" : "🔬 Completo"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!request.trim()}
                  style={{
                    marginLeft: "auto",
                    padding: "10px 28px",
                    background: request.trim()
                      ? "linear-gradient(135deg, #6366f1, #06b6d4)"
                      : "#27272a",
                    color: request.trim() ? "#fff" : "#52525b",
                    border: "none",
                    borderRadius: 8,
                    cursor: request.trim() ? "pointer" : "default",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                >
                  🏭 Fabricar
                </button>
              </div>

              {/* Examples */}
              <div style={{ marginTop: 32 }}>
                <p style={{ fontSize: 11, color: "#52525b", marginBottom: 10, letterSpacing: 1 }}>
                  EXEMPLOS
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setRequest(ex)}
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        background: "#111118",
                        border: "1px solid #1e1e2e",
                        borderRadius: 8,
                        color: "#a1a1aa",
                        fontSize: 13,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = "#6366f1";
                        e.target.style.color = "#e4e4e7";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = "#1e1e2e";
                        e.target.style.color = "#a1a1aa";
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Build Progress */}
          {buildId && (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <button
                  onClick={() => {
                    setBuildId(null);
                    setPhase(null);
                    setRequest("");
                    setModuleName("");
                    setLogs([]);
                    setDownloadUrl(null);
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #27272a",
                    color: "#71717a",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                >
                  ← Novo build
                </button>
                <span style={{ fontSize: 12, color: "#52525b" }}>
                  Build: {buildId}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  background: "#111118",
                  borderRadius: 12,
                  padding: 24,
                  border: "1px solid #1e1e2e",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {currentPhase?.icon} {currentPhase?.label}
                  </span>
                  <span style={{ fontSize: 13, color: "#6366f1" }}>{progress}%</span>
                </div>

                <div
                  style={{
                    height: 6,
                    background: "#1e1e2e",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      background: phase === "done"
                        ? "#22c55e"
                        : "linear-gradient(90deg, #6366f1, #06b6d4)",
                      borderRadius: 3,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>

                {/* Phase Steps */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 16,
                    padding: "0 4px",
                  }}
                >
                  {PHASES.filter((_, i) => i % 2 === 0).map((p) => {
                    const isActive = phase === p.id;
                    const isDone = progress > p.pct;
                    return (
                      <div
                        key={p.id}
                        style={{
                          textAlign: "center",
                          fontSize: 10,
                          color: isActive ? "#6366f1" : isDone ? "#22c55e" : "#52525b",
                        }}
                      >
                        <div style={{ fontSize: 16, marginBottom: 2 }}>{p.icon}</div>
                        {p.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Request Summary */}
              <div
                style={{
                  background: "#111118",
                  borderRadius: 12,
                  padding: 20,
                  border: "1px solid #1e1e2e",
                  marginBottom: 24,
                }}
              >
                <p style={{ fontSize: 11, color: "#52525b", marginBottom: 8, letterSpacing: 1 }}>
                  REQUISIÇÃO
                </p>
                <p style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6, margin: 0 }}>
                  {request}
                </p>
              </div>

              {/* Download Button */}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "16px 32px",
                    background: "linear-gradient(135deg, #22c55e, #06b6d4)",
                    color: "#000",
                    borderRadius: 12,
                    textDecoration: "none",
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    marginBottom: 24,
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "scale(1.02)")}
                  onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                >
                  📦 Baixar Software Pronto
                </a>
              )}
            </div>
          )}
        </main>

        {/* ─── Sidebar ─── */}
        <aside
          style={{
            borderLeft: "1px solid #1e1e2e",
            background: "#0d0d14",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Logs */}
          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            <p style={{ fontSize: 11, color: "#52525b", marginBottom: 12, letterSpacing: 1 }}>
              {buildId ? "BUILD LOG" : "BUILDS RECENTES"}
            </p>

            {buildId && logs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {logs.map((log, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      display: "flex",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: "1px solid #111118",
                    }}
                  >
                    <span style={{ color: "#52525b", flexShrink: 0, fontSize: 10, marginTop: 2 }}>
                      {log.time}
                    </span>
                    <span style={{ color: "#a1a1aa" }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {!buildId && builds.length === 0 && (
              <p style={{ color: "#3f3f46", fontSize: 12, fontStyle: "italic" }}>
                Nenhum build ainda. Descreva seu software para começar.
              </p>
            )}

            {!buildId &&
              builds.map((b, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 12px",
                    background: "#111118",
                    borderRadius: 8,
                    marginBottom: 8,
                    border: "1px solid #1e1e2e",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{b.module}</span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: b.status === "done" ? "#052e16" : "#1e1e2e",
                        color: b.status === "done" ? "#22c55e" : "#71717a",
                      }}
                    >
                      {b.status === "done" ? "✅ Pronto" : "⏳ Rodando"}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#52525b" }}>
                    {b.id} · {b.date}
                  </span>
                </div>
              ))}
          </div>

          {/* Pipeline Diagram */}
          <div
            style={{
              padding: 20,
              borderTop: "1px solid #1e1e2e",
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: "#52525b",
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              PIPELINE
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                { label: "Texto", color: "#a78bfa" },
                { label: "Pré-Fábrica (Claude)", color: "#818cf8" },
                { label: "Blueprint + VS4", color: "#6366f1" },
                { label: "Pack0 (SRS)", color: "#4f46e5" },
                { label: "Pack1 (Código)", color: "#06b6d4" },
                { label: "PEC Chain", color: "#14b8a6" },
                { label: "Export Team-Safe", color: "#22c55e" },
              ].map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: step.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "#71717a" }}>{step.label}</span>
                  {i < 6 && (
                    <span
                      style={{
                        color: "#27272a",
                        marginLeft: "auto",
                      }}
                    >
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
