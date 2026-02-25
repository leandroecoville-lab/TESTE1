import { useState, useRef, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `Você é o Engenheiro LAI Factory. Você gera código React funcional.

REGRAS:
1. Retorne APENAS código JSX válido, sem markdown, sem \`\`\`, sem explicação
2. Use Tailwind CSS para estilização
3. O componente deve ser uma função default export
4. Use useState, useEffect se necessário (já importados)
5. Gere código COMPLETO e FUNCIONAL, nunca placeholders
6. Use dados mock realistas em português
7. Sempre comece com: export default function App() {

ESTILO:
- Design moderno, limpo, profissional
- Cores: azul (#2563eb), cinza (#f3f4f6), branco
- Bordas arredondadas, sombras suaves
- Responsivo
- Ícones via emoji quando necessário

Quando o usuário pedir um sistema/tela, gere a interface COMPLETA funcionando com dados mock.`;

const PREFAB_SYSTEM = `Você é o assistente da Pré-Fábrica LAI. Seu papel é entender o que o usuário quer construir e refinar os requisitos.

REGRAS:
1. Seja direto e objetivo
2. Faça perguntas estruturadas (máximo 3 por vez)
3. Quando tiver informação suficiente, diga "PRONTO PARA GERAR" e resuma o que vai construir
4. Foque em: entidades, fluxos, permissões, integrações
5. Responda em português
6. Seja conciso - máximo 4 linhas por resposta

Quando o usuário confirmar, responda com JSON assim:
{"ready": true, "prompt": "descrição técnica detalhada para gerar o código"}`;

const DEFAULT_CODE = `export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-lg text-center">
        <div className="text-6xl mb-6">🏭</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">LAI Factory</h1>
        <p className="text-gray-500 text-lg mb-8">Descreva o software que você quer construir no chat ao lado</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">CRM</span>
          <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">Dashboard</span>
          <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">Kanban</span>
          <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">Formulários</span>
        </div>
      </div>
    </div>
  );
}`;

const QUICK_PROMPTS = [
  { icon: "📊", label: "CRM de Vendas", prompt: "Crie um CRM de vendas com pipeline kanban, lista de contatos com foto/nome/empresa/valor, e dashboard com métricas" },
  { icon: "📋", label: "Kanban Board", prompt: "Crie um quadro kanban de projetos com colunas: A Fazer, Em Progresso, Revisão, Concluído. Com cards arrastáveis, tags coloridas e avatares" },
  { icon: "📈", label: "Dashboard", prompt: "Crie um dashboard financeiro com cards de métricas (receita, despesas, lucro, clientes), gráfico de barras mensal e tabela de transações recentes" },
  { icon: "👥", label: "Gestão de Equipe", prompt: "Crie uma tela de gestão de equipe com lista de membros, foto, cargo, departamento, status (ativo/férias/licença) e filtros" },
];

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Olá! 👋 Sou o engenheiro da LAI Factory.\n\nDescreva o software que você quer e eu construo na hora. Pode ser um CRM, dashboard, kanban, formulário... qualquer coisa.\n\nOu escolha um dos exemplos abaixo para começar rápido." }
  ]);
  const [input, setInput] = useState("");
  const [code, setCode] = useState(DEFAULT_CODE);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("direct"); // "direct" or "prefab"
  const [phase, setPhase] = useState("chat"); // "chat" or "refining"
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("preview");
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (code && iframeRef.current) {
      renderPreview(code);
    }
  }, [code, activeTab]);

  const renderPreview = useCallback((sourceCode) => {
    if (!iframeRef.current) return;
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback, useMemo } = React;
    ${sourceCode}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App || (() => React.createElement('div', null, 'Erro no componente'))));
  <\/script>
</body>
</html>`;
    
    const blob = new Blob([html], { type: "text/html" });
    iframeRef.current.src = URL.createObjectURL(blob);
  }, []);

  const callClaude = async (userMessages, system) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: system,
        messages: userMessages,
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || "";
  };

  const generateCode = async (prompt) => {
    setLoading(true);
    setError(null);
    try {
      const codeMessages = [{ role: "user", content: prompt }];
      let result = await callClaude(codeMessages, SYSTEM_PROMPT);
      
      // Clean up response
      result = result.replace(/```jsx?\n?/g, "").replace(/```\n?/g, "").trim();
      if (!result.includes("export default")) {
        result = `export default function App() {\n  return (\n    <div className="p-8"><p>Erro na geração. Tente novamente.</p></div>\n  );\n}`;
      }
      
      setCode(result);
      setHistory(prev => [...prev, { prompt, code: result, timestamp: new Date().toLocaleTimeString() }]);
      setActiveTab("preview");
    } catch (err) {
      setError("Erro ao gerar código. Verifique a conexão.");
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);

    if (mode === "direct") {
      setMessages(prev => [...prev, { role: "assistant", content: "⚡ Gerando interface..." }]);
      await generateCode(userMsg);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "✅ Interface gerada! Veja o preview ao lado.\n\nQuer ajustar algo? Me diga o que mudar." };
        return updated;
      });
    } else {
      setLoading(true);
      try {
        const apiMessages = messages
          .filter(m => m.role !== "system")
          .concat([{ role: "user", content: userMsg }])
          .map(m => ({ role: m.role, content: m.content }));
        
        const response = await callClaude(apiMessages, PREFAB_SYSTEM);
        
        if (response.includes('"ready": true') || response.includes('"ready":true')) {
          try {
            const jsonMatch = response.match(/\{[\s\S]*"ready"[\s\S]*"prompt"[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setMessages(prev => [...prev, { role: "assistant", content: `✅ Requisitos definidos!\n\n⚡ Gerando interface...` }]);
              await generateCode(parsed.prompt);
              setMessages(prev => [...prev, { role: "assistant", content: "🎉 Software gerado! Veja o preview.\n\nQuer ajustar algo?" }]);
              setPhase("chat");
              setLoading(false);
              return;
            }
          } catch {}
        }
        
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
      } catch {
        setMessages(prev => [...prev, { role: "assistant", content: "Erro na comunicação. Tente novamente." }]);
      }
      setLoading(false);
    }
  };

  const handleQuickPrompt = async (prompt) => {
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    setMessages(prev => [...prev, { role: "assistant", content: "⚡ Gerando interface..." }]);
    await generateCode(prompt);
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: "assistant", content: "✅ Interface gerada! Veja o preview ao lado.\n\nQuer ajustar algo?" };
      return updated;
    });
  };

  const handleIterate = async (instruction) => {
    setMessages(prev => [...prev, { role: "user", content: instruction }]);
    setMessages(prev => [...prev, { role: "assistant", content: "⚡ Ajustando..." }]);
    await generateCode(`Código atual:\n${code}\n\nAjuste pedido: ${instruction}\n\nRetorne o código completo atualizado.`);
    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: "assistant", content: "✅ Atualizado! Confira o preview." };
      return updated;
    });
  };

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      {/* SIDEBAR - Chat */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🏭</div>
            <div>
              <h1 className="text-white font-bold text-lg">LAI Factory</h1>
              <p className="text-blue-100 text-xs">Fábrica de Software Autônoma</p>
            </div>
          </div>
          {/* Mode toggle */}
          <div className="flex mt-3 bg-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setMode("direct")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "direct" ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white"}`}
            >
              ⚡ Direto
            </button>
            <button
              onClick={() => setMode("prefab")}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${mode === "prefab" ? "bg-white text-blue-700 shadow-sm" : "text-white/80 hover:text-white"}`}
            >
              🔍 Pré-Fábrica
            </button>
          </div>
        </div>

        {/* Quick prompts */}
        {messages.length <= 2 && mode === "direct" && (
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 mb-2 font-medium">INÍCIO RÁPIDO</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  disabled={loading}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left disabled:opacity-50"
                >
                  <span className="text-lg">{qp.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: "0ms"}}/>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}}/>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: "300ms"}}/>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200">
          {error && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={mode === "direct" ? "Descreva o que quer construir..." : "Descreva sua ideia de software..."}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              →
            </button>
          </div>
          {code !== DEFAULT_CODE && (
            <div className="flex gap-1.5 mt-2">
              <button onClick={() => handleIterate("Mude as cores para um tema escuro")} className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors">🌙 Tema escuro</button>
              <button onClick={() => handleIterate("Adicione mais dados mock e melhore o visual")} className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors">✨ Melhorar</button>
              <button onClick={() => handleIterate("Adicione filtros e busca")} className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors">🔍 Filtros</button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN - Preview/Code */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 px-4 flex items-center justify-between h-12 flex-shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "preview" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              👁 Preview
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "code" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
            >
              {"</>"} Código
            </button>
            {history.length > 0 && (
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "history" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
              >
                📜 Histórico ({history.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"/> Gerando...
              </span>
            )}
            {code !== DEFAULT_CODE && (
              <button
                onClick={() => {
                  setCode(DEFAULT_CODE);
                  setMessages([messages[0]]);
                  setHistory([]);
                }}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                ✕ Limpar
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-gray-50">
          {activeTab === "preview" && (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          )}
          {activeTab === "code" && (
            <pre className="w-full h-full overflow-auto p-6 text-sm font-mono bg-gray-900 text-green-400 leading-relaxed">
              {code}
            </pre>
          )}
          {activeTab === "history" && (
            <div className="p-6 overflow-auto h-full">
              <div className="space-y-4 max-w-3xl">
                {history.map((item, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-400">Versão {i + 1} — {item.timestamp}</span>
                      <button
                        onClick={() => { setCode(item.code); setActiveTab("preview"); }}
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                      >
                        Restaurar
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{item.prompt.slice(0, 150)}...</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
