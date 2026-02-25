# -*- coding: utf-8 -*-
"""Generate PDF: LAI Factory OS + CRM HubSpot 1:1 (internal)."""

import os, json, re, html, argparse
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics import renderPDF


def register_fonts():
    """Registra fontes TrueType.
    
    - Se `FONT_DIR` estiver definido, tenta carregar DejaVu a partir dele.
    - Caso contrário, procura em diretórios comuns (Linux/Mac/Windows).
    - Se não encontrar, o script faz fallback para fontes padrão do ReportLab
      (Helvetica/Helvetica-Bold/Courier) para evitar crash.
    """
    candidates = []
    env_dir = os.getenv("FONT_DIR")
    if env_dir:
        candidates.append(Path(env_dir))
    # Linux (containers)
    candidates += [
        Path("/usr/share/fonts/truetype/dejavu"),
        Path("/usr/share/fonts/truetype/liberation"),
        Path("/usr/share/fonts"),
    ]
    # macOS
    candidates += [Path("/System/Library/Fonts"), Path("/Library/Fonts")]
    # Windows
    candidates += [Path(os.environ.get("WINDIR", "C:\\Windows")) / "Fonts"]

    font_sets = [
        ("DejaVuSans.ttf", "DejaVuSans"),
        ("DejaVuSans-Bold.ttf", "DejaVuSans-Bold"),
        ("DejaVuSansMono.ttf", "DejaVuSansMono"),
    ]

    registered = set(pdfmetrics.getRegisteredFontNames())
    for d in candidates:
        if not d or not d.exists():
            continue
        for fname, name in font_sets:
            if name in registered:
                continue
            fp = d / fname
            if fp.exists():
                try:
                    pdfmetrics.registerFont(TTFont(name, str(fp)))
                    registered.add(name)
                except Exception:
                    pass

    return registered


_REGISTERED_FONTS = register_fonts()

# Font fallback seguro (evita crash em ambientes sem DejaVu)
BASE = "DejaVuSans" if "DejaVuSans" in _REGISTERED_FONTS else "Helvetica"
BASE_BOLD = "DejaVuSans-Bold" if "DejaVuSans-Bold" in _REGISTERED_FONTS else "Helvetica-Bold"
MONO = "DejaVuSansMono" if "DejaVuSansMono" in _REGISTERED_FONTS else "Courier"

class DrawingFlowable(Flowable):
    """Draw a vector diagram, auto-scaling to fit width."""

    def __init__(self, drawing, scale=1.0):
        super().__init__()
        self.drawing = drawing
        self.scale = scale
        self.width = drawing.width * scale
        self.height = drawing.height * scale

    def wrap(self, availWidth, availHeight):
        if self.width > availWidth:
            s = availWidth / self.width
            self.scale *= s
            self.width *= s
            self.height *= s
        return (self.width, self.height)

    def draw(self):
        self.canv.saveState()
        self.canv.scale(self.scale, self.scale)
        renderPDF.draw(self.drawing, self.canv, 0, 0)
        self.canv.restoreState()


def make_box(d, x, y, w, h, title, subtitle=None, fill=colors.whitesmoke, stroke=colors.HexColor("#94A3B8")):
    d.add(Rect(x, y, w, h, strokeColor=stroke, fillColor=fill, strokeWidth=1, rx=6, ry=6))
    d.add(String(x + 7, y + h - 16, title, fontName=BASE_BOLD, fontSize=9, fillColor=colors.HexColor("#0F172A")))
    if subtitle:
        d.add(String(x + 7, y + 7, subtitle, fontName=BASE, fontSize=7.2, fillColor=colors.HexColor("#334155")))


def arrow(d, x1, y1, x2, y2, color=colors.HexColor("#334155")):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1))
    import math

    ang = math.atan2(y2 - y1, x2 - x1)
    head_len = 6
    head_ang = 0.5
    xh, yh = x2, y2
    x3 = xh - head_len * math.cos(ang - head_ang)
    y3 = yh - head_len * math.sin(ang - head_ang)
    x4 = xh - head_len * math.cos(ang + head_ang)
    y4 = yh - head_len * math.sin(ang + head_ang)
    d.add(Polygon([xh, yh, x3, y3, x4, y4], fillColor=color, strokeColor=color))


def bullet(style, text, level=0):
    indent = level * 14
    return Paragraph(f"{'&nbsp;' * indent}• {html.escape(text)}", style)


def code_block(text, code_style):
    esc = html.escape(text).replace("\n", "<br/>")
    return Paragraph(esc, code_style)

def diagram_architecture():
    W, H = 520, 220
    d = Drawing(W, H)

    make_box(d, 10, 145, 120, 60, "Lovable Orquestrador", "UI + status + comandos", fill=colors.HexColor("#EEF2FF"))
    make_box(d, 160, 145, 140, 60, "Factory API", "REST + SSE/WebSocket", fill=colors.HexColor("#ECFDF5"))
    make_box(d, 330, 145, 180, 60, "Supabase", "Postgres + Auth + Storage", fill=colors.HexColor("#F1F5F9"))

    make_box(d, 160, 70, 140, 55, "Runner Captura UI", "Playwright trace/snap", fill=colors.HexColor("#FFF7ED"))
    make_box(d, 10, 70, 120, 55, "Runner Captura Rede", "mitmproxy HAR", fill=colors.HexColor("#FFF7ED"))
    make_box(d, 330, 70, 180, 55, "GitHub Actions", "Pack0/Pack1 + gates", fill=colors.HexColor("#FFE4E6"))

    make_box(d, 160, 10, 140, 45, "Artifact Store", "zips + logs + SBOM", fill=colors.HexColor("#F8FAFC"))
    make_box(d, 330, 10, 180, 45, "Repos + Releases", "repos LAI/CRM gerados", fill=colors.HexColor("#F8FAFC"))

    arrow(d, 130, 175, 160, 175)
    arrow(d, 300, 175, 330, 175)
    arrow(d, 230, 145, 230, 125)
    arrow(d, 180, 145, 70, 125)
    arrow(d, 300, 145, 420, 125)
    arrow(d, 230, 70, 230, 55)
    arrow(d, 70, 70, 230, 55)
    arrow(d, 330, 97, 300, 32)
    arrow(d, 420, 70, 420, 32)
    arrow(d, 300, 32, 330, 32)
    return d


def diagram_five_buttons():
    # Must fit within content width: ~482pt. We design at 470.
    W, H = 470, 120
    d = Drawing(W, H)
    boxes = [
        ("1) CAPTURE+EXTRACT", "trace + HAR + config"),
        ("2) BLUEPRINT", "blueprint + openapi"),
        ("3) PACK0", "docs + DoD + validate"),
        ("4) PACK1", "scaffold + CI gates"),
        ("5) PARITY", "E2E + visual + report"),
    ]
    x, y, w, h, gap = 10, 30, 84, 70, 7
    for i, (t, s) in enumerate(boxes):
        make_box(d, x, y, w, h, t, s, fill=colors.HexColor("#F8FAFC"))
        if i < len(boxes) - 1:
            arrow(d, x + w, y + h / 2, x + w + gap, y + h / 2)
        x += w + gap
    return d


def load_simulation():
    sim = {
        "pack0_val": None,
        "run_report": None,
        "approval": None,
        "snapshot_files": [],
    }
    sim_dir = Path("/mnt/data/_sim_out")
    if not sim_dir.exists():
        return sim

    for fn, key in [("pack0_validation.json", "pack0_val"), ("run_report.json", "run_report"), ("approval.json", "approval")]:
        p = sim_dir / fn
        if p.exists():
            try:
                sim[key] = json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                sim[key] = None

    snap = sim_dir / "snapshot_promoted.zip"
    if snap.exists():
        import subprocess

        out = subprocess.check_output(["unzip", "-l", str(snap)], text=True, errors="replace")
        for line in out.splitlines():
            m = re.match(r"\s*\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.*)$", line)
            if m:
                sim["snapshot_files"].append(m.group(1))

    return sim


def build_styles():
    styles = getSampleStyleSheet()
    styles["Normal"].fontName = BASE
    styles["Normal"].fontSize = 10.5
    styles["Normal"].leading = 14

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName=BASE_BOLD,
        fontSize=24,
        leading=28,
        spaceAfter=12,
        textColor=colors.HexColor("#0B1220"),
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName=BASE,
        fontSize=12,
        leading=16,
        spaceAfter=14,
        textColor=colors.HexColor("#334155"),
    )
    h1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontName=BASE_BOLD,
        fontSize=16,
        leading=20,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor("#0B1220"),
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName=BASE_BOLD,
        fontSize=12.5,
        leading=16,
        spaceBefore=8,
        spaceAfter=5,
        textColor=colors.HexColor("#0B1220"),
    )
    small = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontName=BASE,
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
    )
    code_style = ParagraphStyle(
        "Code",
        parent=styles["Normal"],
        fontName=MONO,
        fontSize=8.0,
        leading=10.0,
        textColor=colors.HexColor("#0F172A"),
        wordWrap="CJK",
    )
    return styles, title_style, subtitle_style, h1, h2, small, code_style


def header_footer_factory(doc_trace, doc_date):
    def _hf(canv, doc):
        canv.saveState()
        canv.setFont(BASE, 8.5)
        canv.setFillColor(colors.HexColor("#64748B"))
        canv.drawString(2 * cm, A4[1] - 1.2 * cm, "LAI Factory OS — plano diamante (interno)")
        canv.drawRightString(A4[0] - 2 * cm, A4[1] - 1.2 * cm, f"trace_id {doc_trace}")
        canv.drawString(2 * cm, 1.0 * cm, f"Data {doc_date} (UTC)")
        canv.drawRightString(A4[0] - 2 * cm, 1.0 * cm, f"Página {doc.page}")
        canv.restoreState()

    return _hf


def add_tool(story, styles, h2, name, what, why, cost, hidden, source=None):
    story.append(Paragraph(name, h2))
    story.append(Paragraph(f"<b>O que faz:</b> {html.escape(what)}", styles["Normal"]))
    story.append(Paragraph(f"<b>Por que é a melhor aqui:</b> {html.escape(why)}", styles["Normal"]))
    story.append(Paragraph(f"<b>Custo real:</b> {html.escape(cost)}", styles["Normal"]))
    story.append(Paragraph(f"<b>Custos ocultos:</b> {html.escape(hidden)}", styles["Normal"]))
    if source:
        story.append(Paragraph(f"<b>Fonte:</b> {html.escape(source)}", styles["Normal"]))
    story.append(Spacer(1, 8))


def build_pdf(out_path: str):
    now = datetime.now(timezone.utc)
    doc_date = now.strftime('%Y-%m-%d')
    doc_trace = f"LAI-DOC-{now.strftime('%Y%m%dT%H%M%SZ')}"

    styles, title_style, subtitle_style, h1, h2, small, code_style = build_styles()
    hf = header_footer_factory(doc_trace, doc_date)

    title = "LAI Factory OS + CRM HubSpot 1:1 — Plano Operacional Diamante"
    subtitle = "Orquestrador + Ferramentas + Gates para migração sem fricção (uso interno exclusivo)"

    sim = load_simulation()

    story = []

    # CAPA
    story.append(Paragraph("300 Franchising, a maior do mundo e nossa missão.", small))
    story.append(Spacer(1, 6))
    story.append(Paragraph(title, title_style))
    story.append(Paragraph(subtitle, subtitle_style))
    story.append(Paragraph(f"<b>Data:</b> {doc_date} (UTC)<br/><b>trace_id:</b> {doc_trace}<br/><b>Uso:</b> interno exclusivo (não comercial).", styles["Normal"]))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Este documento consolida o plano operacional para: (1) compatibilidade 1:1 com HubSpot na fase 1, (2) orquestração automática Pré-Fábrica + Fábrica + Gates, e (3) geração de packs e repositórios para o ecossistema LAI.",
        styles["Normal"],
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Premissa:</b> fase 1 não melhora nada. Ela copia comportamento para eliminar fricção. A melhora vem depois do corte (fase 2).",
        styles["Normal"],
    ))
    story.append(PageBreak())

    # DEFINIÇÃO 1:1
    story.append(Paragraph("Objetivo e definição de 1:1", h1))
    story.append(Paragraph(
        "1:1 aqui significa paridade no nível do usuário final: mesmos fluxos, cliques, telas, validações aparentes, atalhos, navegação, erros e performance percebida. Isso é engenharia de compatibilidade, não copiar tela.",
        styles["Normal"],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Critérios de paridade (fail-closed)", h2))
    for t in [
        "Fluxo e estados: o usuário chega no mesmo resultado (inclusive em erros).",
        "Microinteração: foco, tab-order, atalhos, habilitar/desabilitar, confirm dialogs e toasts.",
        "Rede: semântica de erros (4xx/5xx), paginação, filtros, rate limit e retries.",
        "Dados: entidades e associações críticas (contatos, empresas, deals, tasks, activities), ordenação e busca.",
        "Performance percebida: click-to-render e p95 dentro do budget definido no Pack0.",
    ]:
        story.append(bullet(styles["Normal"], t))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Caminho robusto: capturar uso real + tráfego + configuração, materializar contratos e provar paridade com testes automáticos.",
        styles["Normal"],
    ))
    story.append(PageBreak())

    # GOLDEN PATH
    story.append(Paragraph("Golden Path (execução automática em 5 botões)", h1))
    story.append(Paragraph(
        "O Orquestrador expõe 5 botões. Cada botão cria jobs, gera artifacts e dispara gates. Se qualquer gate falhar, o pipeline para (fail-closed).",
        styles["Normal"],
    ))
    story.append(Spacer(1, 10))
    story.append(DrawingFlowable(diagram_five_buttons()))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Artifacts obrigatórios por trace_id", h2))
    for t in [
        "Biblioteca de fluxos: trace.zip + screenshots + scripts reexecutáveis.",
        "Biblioteca de tráfego: HAR por fluxo (sanitizado por padrão).",
        "Config extraída (API/exports): pipelines, properties, stages, permissões, views.",
        "Contrato versionado: openapi.yaml + JSON Schemas + lint/diff.",
        "Pack0: docs + contratos + DoD + budgets + matriz de retenção.",
        "Pack1: front/back scaffold + mocks + CI gates + testes.",
        "Parity Gate: E2E + visual diff + relatório de divergências.",
    ]:
        story.append(bullet(styles["Normal"], t))
    story.append(PageBreak())

    # ARQUITETURA
    story.append(Paragraph("Arquitetura (Control Plane + Providers)", h1))
    story.append(Paragraph(
        "Lovable é o cockpit (UI). A Factory API controla jobs. Supabase guarda estado e artifacts. Runners executam captura pesada em ambiente isolado. GitHub Actions executa Pack0/Pack1/merge/gates.",
        styles["Normal"],
    ))
    story.append(Spacer(1, 10))
    story.append(DrawingFlowable(diagram_architecture()))
    story.append(Spacer(1, 10))
    story.append(Paragraph("State machine de run (resumo)", h2))
    for t in [
        "run.created -> capture.running -> capture.done",
        "extract_config.running -> extract_config.done",
        "blueprint.building -> blueprint.ready",
        "pack0.generating -> pack0.validated (validate-pack0 + run_report)",
        "pack1.generating -> pack1.ci_passed",
        "parity_gate.running -> parity_gate.passed|failed",
    ]:
        story.append(bullet(styles["Normal"], t))
    story.append(PageBreak())

    # DB
    story.append(Paragraph("Modelo de dados (DB) — mínimo operacional", h1))
    story.append(Paragraph("Banco recomendado: Postgres (Supabase). Regra: tudo é job + trace_id + artifacts.", styles["Normal"]))
    story.append(Spacer(1, 8))
    tables = [
        ("projects", "Projeto interno e sistema fonte (HubSpot)."),
        ("modules", "Módulos gerados (crm, connect, meetcore, etc.)."),
        ("jobs", "Execuções: capture, extract, blueprint, pack0, pack1, parity."),
        ("job_inputs", "Payload JSON por job (flows, allowlist, configs)."),
        ("artifacts", "Metadados + ponte para binários no Storage."),
        ("runs_github", "Job -> workflow run no GitHub Actions."),
        ("audit_events", "Log append-only (evento operacional + trace_id)."),
        ("hubspot_tokens", "Tokens criptografados (se usar API oficial)."),
    ]
    data = [["Tabela", "Função"]] + [list(x) for x in tables]
    tbl = Table(data, colWidths=[4.2 * cm, 12.2 * cm])
    tbl.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), BASE_BOLD),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E2E8F0')),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#CBD5E1')),
        ('FONTNAME', (0, 1), (-1, -1), BASE),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(tbl)
    story.append(PageBreak())

    # API
    story.append(Paragraph("API do Orquestrador (endpoints mínimos)", h1))
    story.append(Paragraph("Base: /api/v1. O Lovable só chama isso.", styles["Normal"]))
    story.append(Spacer(1, 6))
    api_blocks = [
        ("Projetos e módulos", ["POST /projects", "POST /projects/{id}/modules", "GET /projects/{id}"]),
        ("Jobs", ["POST /jobs (type, trace_id, payload_json)", "GET /jobs/{id}", "GET /jobs?project_id=&module_id=&state=", "POST /jobs/{id}/cancel"]),
        ("Artifacts", ["POST /artifacts/presign-upload", "POST /artifacts/commit", "GET /jobs/{id}/artifacts", "GET /artifacts/{id}/download-url"]),
        ("Execução", [
            "POST /execute/capture-ui",
            "POST /execute/capture-net",
            "POST /execute/extract-config",
            "POST /execute/openapi-build",
            "POST /execute/factory-pack (pack0|pack1)",
            "POST /execute/parity-gate",
            "POST /execute/publish-repo",
        ]),
    ]
    for sec, lines in api_blocks:
        story.append(Paragraph(sec, h2))
        txt = "<br/>".join([f"<font face='{MONO}' size='9'>{html.escape(l)}</font>" for l in lines])
        story.append(Paragraph(txt, styles["Normal"]))
        story.append(Spacer(1, 6))
    story.append(PageBreak())

    # BLUEPRINT BUILDER
    story.append(Paragraph("BUILD BLUEPRINT — o compilador que faltava", h1))
    story.append(Paragraph(
        "Este estágio transforma CAPTURE+CONFIG em blueprint.json (modelo do CRM), openapi.yaml (contrato) e paridade_matrix.json (o que provar).",
        styles["Normal"],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Entradas", h2))
    for t in [
        "UI traces (trace.zip) + screenshots baseline.",
        "HAR por fluxo (allowlist + sanitização PII).",
        "Config por API/exports: pipelines, properties, stages, permissões, views.",
    ]:
        story.append(bullet(styles["Normal"], t))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Saídas", h2))
    for t in [
        "blueprint.json: módulos/telas/entidades/RBAC/workflows.",
        "openapi.yaml + schemas: contrato versionado.",
        "paridade_matrix.json: catálogo de fluxos + critérios de aceite.",
    ]:
        story.append(bullet(styles["Normal"], t))

    blueprint_example = {
        "blueprint_id": "crm-hubspot-compat",
        "phase": "phase1_compat",
        "modules": [
            {"key": "crm", "screens": ["dashboard", "pipeline", "deal", "contact", "company", "tasks", "activity_log", "settings"]},
            {"key": "lai-connect", "screens": ["inbox", "templates", "routing", "webhooks"]},
        ],
        "entities": ["contact", "company", "deal", "task", "activity", "user", "team"],
        "rbac_roles": ["admin", "manager", "rep", "ops"],
        "workflows": ["create_deal", "move_stage", "log_activity", "create_task", "search_filter"],
    }
    parity_example = {
        "trace_id": "HS-CAPTURE-001",
        "flows": [
            {"id": "FLOW-001", "name": "Criar deal", "passes_if": ["deal_created", "toast_ok"], "visual_baseline": "shots/FLOW-001/*.png"},
            {"id": "FLOW-002", "name": "Mover stage", "passes_if": ["stage_changed", "history_logged"], "visual_baseline": "shots/FLOW-002/*.png"},
        ],
        "gates": {"e2e": "required", "visual": "required", "openapi_lint": "required", "security": "required"},
    }

    story.append(Spacer(1, 8))
    story.append(Paragraph("Exemplo mínimo — blueprint.json", h2))
    story.append(code_block(json.dumps(blueprint_example, ensure_ascii=False, indent=2), code_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Exemplo mínimo — paridade_matrix.json", h2))
    story.append(code_block(json.dumps(parity_example, ensure_ascii=False, indent=2), code_style))
    story.append(PageBreak())

    # PARITY GATE
    story.append(Paragraph("PARITY GATE — especificação (E2E + Visual + Contrato)", h1))
    story.append(Paragraph(
        "Parity Gate é o alarme. Ele prova que a fase 1 está 1:1 e bloqueia promoção se divergir.",
        styles["Normal"],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Gates obrigatórios", h2))
    for t in [
        "Sanitização de PII (HAR/traces) antes de persistir.",
        "Contract Gate: Spectral lint + openapi-diff.",
        "API Gate: Schemathesis contra mocks e backend.",
        "UI E2E Gate: Playwright + budgets (p95).",
        "Visual Gate: Playwright snapshots + Applitools (páginas) + Chromatic (componentes).",
        "Security Gate: secret scanning + SAST/SCA básico.",
    ]:
        story.append(bullet(styles["Normal"], t))
    story.append(PageBreak())

    # FERRAMENTAS (LISTA COMPLETA)
    story.append(Paragraph("Ferramentas — Stack Diamante (com custo e custos ocultos)", h1))
    story.append(Paragraph(
        "Critério: perfeição cirúrgica e velocidade primeiro. Custo vem depois. "
        "Os valores abaixo são os publicados (mudam). O custo real é dominado por assentos + volume + retenção.",
        styles["Normal"],
    ))
    story.append(Spacer(1, 10))

    # Camada 0
    story.append(Paragraph("Camada 0 — Control Plane", h1))
    add_tool(story, styles, h2, "Lovable (UI do Orquestrador)",
             "Cockpit (Runs/Artifacts/Settings/Blueprint Studio) e provider assistido opcional.",
             "Você ganha cockpit rápido e mantém export/CI como soberania.",
             "Por créditos mensais/anuais; top-ups por pacote de créditos.",
             "Crédito explode com geração pesada e prompts longos; mitigar com templates + MCP + WIP limit.",
             "https://docs.lovable.dev/introduction/plans-and-credits")

    add_tool(story, styles, h2, "Supabase (Postgres/Auth/Storage/Edge)",
             "Backend do Orquestrador e do CRM/LAI (fase 1).",
             "Entrega Postgres real + RLS + Storage + Edge sem DevOps pesado.",
             "Plano + compute + overages (egress/MAU/storage/logs) por projeto.",
             "Multiplica por projetos, egress, MAU e retenção; precisa spend caps e política de logs.",
             "https://supabase.com/docs/guides/platform/billing-on-supabase")

    add_tool(story, styles, h2, "Temporal Cloud (workflow engine)",
             "State machine confiável com retries/timeouts/idempotência.",
             "Tira humano do loop e impede 'run quebrado' virar caos.",
             "Base mensal + consumo por actions (publicado).",
             "Actions crescem com granularidade e runs; mitigar com batching e checkpoints por etapa.",
             "https://temporal.io/get-cloud/aws-marketplace")

    add_tool(story, styles, h2, "Upstash Redis + QStash",
             "Fila leve/cache e delivery confiável de eventos/cron.",
             "Infra pronta sem operar Redis; encaixa no Orquestrador.",
             "PAYG por comandos/mensagens + storage/bandwidth; Prod Pack adiciona custo fixo.",
             "Prod Pack e fan-out são os multiplicadores; retries mal configurados explodem.",
             "https://upstash.com/docs/redis/overall/pricing")

    add_tool(story, styles, h2, "GitHub + GitHub Actions",
             "Repos, PRs, CI gates, releases e artifacts.",
             "Sua Fábrica já é pack-first no GitHub; isso vira a linha de produção.",
             "Minutos de Actions + storage de artifacts/caches; macOS é caro.",
             "Explode com cross-browser/visual tests e retenção de artifacts (vídeos/traces).",
             "https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions")

    add_tool(story, styles, h2, "GitHub Advanced Security",
             "Secret scanning/push protection + CodeQL/dependency review.",
             "Reduz erro humano e bloqueia vazamento de segredos.",
             "Preço por active committer (janela móvel).",
             "Multiplica quando muitos devs committam; exige controle de repos e permissões.",
             "https://github.com/security/plans")

    add_tool(story, styles, h2, "1Password Business (Secrets)",
             "Gestão de segredos com vaults e auditoria.",
             "Mais rápido para adoção interna do que Vault/infra.",
             "Preço por usuário (plano business).",
             "Escala com seats; ainda exige rotação e política.",
             "https://1password.com/pricing")

    story.append(PageBreak())

    # Camada 1
    story.append(Paragraph("Camada 1 — CAPTURE 1:1", h1))
    add_tool(story, styles, h2, "Playwright", "E2E + trace.zip + screenshots + snapshots.",
             "Núcleo do Parity Gate; reexecutável e determinístico.",
             "$0 (open-source).",
             "Custo real é CI/compute e manutenção de locators; mitigar com role/text/testId.",
             "https://playwright.dev/")

    add_tool(story, styles, h2, "mitmproxy", "Proxy TLS para capturar requests/responses e gerar HAR.",
             "Automatiza biblioteca de tráfego filtrada por allowlist (só HubSpot).",
             "$0 (open-source).",
             "Certificados + PII; precisa ambiente isolado e sanitização por padrão.",
             "https://docs.mitmproxy.org/stable/")

    add_tool(story, styles, h2, "Fiddler Everywhere", "Proxy HTTP(S) com UI para debug rápido.",
             "Acelera investigação quando o HubSpot mudar.",
             "Preço por licença (plano pro/enterprise).",
             "Não instale em todo PC; use só em máquina de captura.",
             "https://www.telerik.com/fiddler/fiddler-everywhere")

    add_tool(story, styles, h2, "Flow Recorder", "Documentação/jornadas/replay no browser.",
             "Ótimo para catálogo de fluxos e treinamento interno.",
             "Preço mensal por plano (Startup/Pro/Business).",
             "Pode virar redundante se Playwright cobrir tudo; storage/retention cresce.",
             "https://flowrecorder.com/pricing")

    add_tool(story, styles, h2, "Sauce Labs / BrowserStack (cross-browser farm)",
             "Executa automação em múltiplos browsers/OS.",
             "Reduz risco de divergência em browsers do time.",
             "Preço por paralelos/planos.",
             "Multiplicador: paralelos x browsers x larguras x frequência.",
             "https://saucelabs.com/pricing")

    story.append(PageBreak())

    # Camada 2
    story.append(Paragraph("Camada 2 — EXTRACT CONFIG", h1))
    add_tool(story, styles, h2, "HubSpot Private App API + Exports", "Extrai pipelines, properties, stages, permissões e dados.",
             "Sem isso, UI igual vira placebo (regras diferentes).",
             "$0 licença; limitado por rate limits do plano HubSpot.",
             "Rate limit/paginação e PII exigem retries, logs e minimização.",
             "https://developers.hubspot.com/docs/api/overview")

    add_tool(story, styles, h2, "Airbyte / Fivetran (sync/migração)", "Sync automatizado de dados/config para dual-run e migração.",
             "Reduz engenharia manual para mover histórico e manter sincronismo.",
             "Preço por volume (linhas/GB) e conexões.",
             "Histórico é o multiplicador; ambientes duplicados dobram custo.",
             "https://airbyte.com/product/airbyte-cloud")

    story.append(PageBreak())

    # Camada 3
    story.append(Paragraph("Camada 3 — CONTRACT-FIRST", h1))
    add_tool(story, styles, h2, "Stoplight", "Editor OpenAPI/JSON schema + docs + mock.",
             "Acelera contrato versionado e reduz erro.",
             "Preço por plano + seats.",
             "Risco: virar fonte paralela ao repo; repo deve ser a fonte.",
             "https://stoplight.io/pricing")

    add_tool(story, styles, h2, "Postman", "Coleções, mocks, monitors e colaboração.",
             "Útil para explorar e depurar contrato.",
             "Preço por seat + overages (runs/monitors).",
             "Risco de drift se coleção divergir do OpenAPI no repo.",
             "https://www.postman.com/pricing/")

    add_tool(story, styles, h2, "Spectral + openapi-diff + AJV + Schemathesis", "Lint/diff/validação/teste gerado por contrato.",
             "É o gate automático de contrato/API (sem humano).",
             "$0 (open-source) + custo CI.",
             "Tempo CI e estabilização; mas isso é o preço do 1:1.",
             "https://spec.openapis.org/oas/latest.html")

    add_tool(story, styles, h2, "Prism + WireMock", "Mocks/stubs para desenvolver e testar sem backend final.",
             "Permite front/back em paralelo e acelera entrega.",
             "$0 (open-source).",
             "Se stub errado virar verdade, você cristaliza bug; versionar e comparar contra contrato.",
             "https://docs.stoplight.io/docs/prism")

    story.append(PageBreak())

    # Camada 4
    story.append(Paragraph("Camada 4 — Modelagem", h1))
    add_tool(story, styles, h2, "XState", "State machines para UI e fluxos.",
             "Controla comportamento 1:1 e reduz drift quando evoluir depois.",
             "$0 (open-source).",
             "Disciplina: se não modelar, vira if-else espalhado.",
             "https://stately.ai/docs/xstate")

    add_tool(story, styles, h2, "Mermaid / PlantUML", "Diagramas como código para docs e rastreio.",
             "Rastreabilidade e manutenção do ecossistema LAI.",
             "$0.",
             "Nenhum relevante.",
             "https://mermaid.js.org/")

    story.append(PageBreak())

    # Camada 5
    story.append(Paragraph("Camada 5 — PARITY (Visual/E2E)", h1))
    add_tool(story, styles, h2, "Applitools", "Visual regression com IA.",
             "Menos flake e mais sinal/ruído em paridade visual 1:1.",
             "Preço alto e geralmente anual (published).",
             "Baseline management e unidades de teste; cobertura sem estratégia vira ruído.",
             "https://applitools.com/platform-pricing/")

    add_tool(story, styles, h2, "Chromatic (Storybook)", "Visual regression por componente.",
             "Mata regressão no Design System; complementa página completa.",
             "Preço por plano + overage por snapshot.",
             "Snapshots explodem com variantes/browsers sem TurboSnap.",
             "https://www.chromatic.com/pricing")

    add_tool(story, styles, h2, "Percy", "Visual regression por screenshot.",
             "Alternativa; útil se você já usa BrowserStack.",
             "Preço por volume de screenshots.",
             "Multi-browser + multi-width explode volume.",
             "https://www.browserstack.com/docs/percy/overview")

    story.append(PageBreak())

    # Camada 6
    story.append(Paragraph("Camada 6 — Observabilidade + Incidente", h1))
    add_tool(story, styles, h2, "Sentry", "Erros + performance + traces.",
             "Reduz caça manual e acelera correção.",
             "Preço por plano + overages por eventos/spans.",
             "Volume e retenção são multiplicadores.",
             "https://sentry.io/pricing/")

    add_tool(story, styles, h2, "Datadog (ou Grafana Cloud)", "Logs/métricas/traces e alertas.",
             "Operação industrial do ecossistema LAI.",
             "Preço por host + logs por GB + retenção.",
             "Cardinalidade e logs indexados explodem custo.",
             "https://www.datadoghq.com/pricing/")

    add_tool(story, styles, h2, "PagerDuty", "Incident workflow / Andon cord.",
             "Para a linha quando gates falham sem depender de humano ver.",
             "Preço por usuário.",
             "Add-ons e crescimento de seats.",
             "https://www.pagerduty.com/pricing/")

    story.append(PageBreak())

    # Camada 7
    story.append(Paragraph("Camada 7 — Segurança", h1))
    add_tool(story, styles, h2, "Semgrep", "SAST/SCA/Secrets com bom sinal/ruído.",
             "Complementa CodeQL e captura patterns do seu stack.",
             "Preço por contributor + produto.",
             "Escala por contributors e regras; risco de alert fatigue.",
             "https://semgrep.dev/pricing")

    add_tool(story, styles, h2, "Trivy + Syft/Grype + Gitleaks", "Container scan + SBOM + secrets (open-source).",
             "Gates automáticos baratos.",
             "$0 + custo CI.",
             "Tempo CI e tuning.",
             "https://aquasecurity.github.io/trivy/")

    add_tool(story, styles, h2, "Presidio (PII sanitization)", "Detecção/máscara de PII em HAR/traces/logs.",
             "Evita vazamento e facilita retenção mínima.",
             "$0 (open-source).",
             "Demanda tuning de detectores e regras.",
             "https://microsoft.github.io/presidio/")

    story.append(PageBreak())

    # Camada 8
    story.append(Paragraph("Camada 8 — IA e automação", h1))
    add_tool(story, styles, h2, "GitHub Copilot", "Acelera codegen/review e reduz mão humana.",
             "Complementa a Fábrica para finalizar bordas e patches.",
             "Preço por usuário/planos.",
             "Uso descontrolado e requests premium viram custo.",
             "https://github.com/features/copilot")

    add_tool(story, styles, h2, "Cursor / Continue", "IDE agente para acelerar correções e PRs.",
             "Reduz tempo humano no 'último 10%'.",
             "Preço por seat + custo do modelo (se BYOK).",
             "Modelo caro vira vazamento; precisa budget e WIP.",
             "https://cursor.com/pricing")

    story.append(PageBreak())

    # Camada 9
    story.append(Paragraph("Camada 9 — Design System", h1))
    add_tool(story, styles, h2, "Figma", "Design system, componentes e handoff.",
             "Para 1:1 visual, você precisa de biblioteca de componentes controlada.",
             "Preço por seat.",
             "Escala por seats; governar quem precisa de full seat.",
             "https://www.figma.com/pricing/")

    story.append(PageBreak())

    # Camada 10
    story.append(Paragraph("Camada 10 — Knowledge (LAI)", h1))
    add_tool(story, styles, h2, "Pinecone / Weaviate / Qdrant", "Vector DB para docs/contratos/logs/run reports.",
             "Acelera busca e automação do ecossistema LAI.",
             "Preço por uso (storage + read/write) ou por recursos (CPU/RAM/disk).",
             "Dimensionamento e volume de queries são multiplicadores.",
             "https://www.pinecone.io/pricing/")

    add_tool(story, styles, h2, "Apify", "Scraping estruturado para pesquisa/ingestão automatizada.",
             "Alimenta Pré-Fábrica com dados estruturados sem humano.",
             "Preço por plano + compute/proxy.",
             "Proxies residenciais e compute unit explodem se não houver limites.",
             "https://apify.com/pricing")

    story.append(PageBreak())

    # SIMULAÇÃO (PROVA)
    story.append(Paragraph("Simulação (prova) — Pack Factory executando de verdade", h1))
    story.append(Paragraph(
        "Prova do núcleo da Fábrica (pack-first): gerar Pack0, validar, gerar RUN_REPORT, APPROVAL e promover snapshot (merge promoted).",
        styles["Normal"],
    ))
    story.append(Spacer(1, 8))

    cmd_rows = [
        ["Etapa", "Comando (curto)", "Saída"],
        ["1", "pack0 meetcore", "pack0-meetcore-0.0.1.zip"],
        ["2", "validate-pack0 pack0.zip", "pack0_validation.json"],
        ["3", "run-report pack0.zip", "run_report.json"],
        ["4", "approve-pack pack0.zip + rr.json", "approval.json"],
        ["5", "wrap-* + merge promoted", "snapshot_promoted.zip"],
    ]
    cmd_table = Table(cmd_rows, colWidths=[1.4 * cm, 9.2 * cm, 7.0 * cm])
    cmd_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), BASE_BOLD),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E2E8F0')),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#CBD5E1')),
        ('FONTNAME', (0, 1), (-1, -1), BASE),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    story.append(cmd_table)
    story.append(Spacer(1, 10))

    if sim.get('pack0_val'):
        story.append(Paragraph("validate-pack0 (resumo)", h2))
        pv = sim['pack0_val']
        slim = {
            "ok": pv.get("ok"),
            "trace_id": pv.get("trace_id"),
            "checked_paths": (pv.get("checked_paths") or [])[:12],
        }
        story.append(code_block(json.dumps(slim, ensure_ascii=False, indent=2), code_style))
        story.append(Spacer(1, 8))

    if sim.get('run_report'):
        story.append(Paragraph("RUN_REPORT (resumo)", h2))
        rr = sim['run_report']
        slim = {
            "pack_ref": rr.get("pack_ref"),
            "pack_sha256": rr.get("pack_sha256"),
            "result": rr.get("result"),
            "trace_id": rr.get("trace_id"),
            "timestamp": rr.get("timestamp"),
        }
        story.append(code_block(json.dumps(slim, ensure_ascii=False, indent=2), code_style))
        story.append(Spacer(1, 8))

    if sim.get('approval'):
        story.append(Paragraph("APPROVAL (resumo)", h2))
        ap = sim['approval']
        slim = {
            "pack_ref": ap.get("pack_ref"),
            "pack_sha256": ap.get("pack_sha256"),
            "decision": ap.get("decision"),
            "actor_id": ap.get("actor_id"),
            "trace_id": ap.get("trace_id"),
            "timestamp": ap.get("timestamp"),
        }
        story.append(code_block(json.dumps(slim, ensure_ascii=False, indent=2), code_style))
        story.append(Spacer(1, 8))

    if sim.get('snapshot_files'):
        story.append(Paragraph("Snapshot promovido contém (lista curta)", h2))
        story.append(code_block("\n".join(sim['snapshot_files']), code_style))

    story.append(PageBreak())

    # RUNBOOK 5 BOTÕES
    story.append(Paragraph("Runbook: 5 botões (o que cada um dispara)", h1))
    steps = [
        ("1) CAPTURE + EXTRACT", [
            "Dispara Playwright (UI) e mitmproxy (rede) no runner isolado.",
            "Extrai config por API/exports (pipelines/properties/permissions/views).",
            "Gera artifacts: trace.zip, screenshots.zip, flow.json, har, config.json.",
        ]),
        ("2) BUILD BLUEPRINT", [
            "Normaliza inputs e gera blueprint.json + openapi.yaml + paridade_matrix.json.",
            "Versiona por trace_id e salva no artifact store.",
        ]),
        ("3) GENERATE PACK0", [
            "Chama pack-factory pack0 + validate-pack0 + run-report.",
            "Se validate falhar: retorna gaps e bloqueia.",
        ]),
        ("4) GENERATE PACK1", [
            "Gera scaffold (front/back), mocks, contracts e testes base.",
            "Dispara CI gates e publica artifacts.",
        ]),
        ("5) PARITY GATE", [
            "Roda E2E + visual diff + contract tests.",
            "Se falhar: parity_report + diffs e bloqueia promoção.",
        ]),
    ]
    for st, items in steps:
        story.append(Paragraph(st, h2))
        for it in items:
            story.append(bullet(styles["Normal"], it))
        story.append(Spacer(1, 6))

    story.append(PageBreak())

    # REFERÊNCIAS
    story.append(Paragraph("Referências (links)", h1))
    refs = [
        "Lovable credits: https://docs.lovable.dev/introduction/plans-and-credits",
        "Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase",
        "Temporal pricing: https://temporal.io/get-cloud/aws-marketplace",
        "GitHub Actions billing: https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions",
        "Playwright: https://playwright.dev/",
        "mitmproxy: https://docs.mitmproxy.org/stable/",
        "Applitools: https://applitools.com/platform-pricing/",
        "Chromatic: https://www.chromatic.com/pricing",
        "Semgrep: https://semgrep.dev/pricing",
        "Presidio: https://microsoft.github.io/presidio/",
    ]
    for r in refs:
        story.append(Paragraph(html.escape(r), styles["Normal"]))

    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=1.6 * cm,
        title=title,
        author="LAI Factory OS",
    )
    doc.build(story, onFirstPage=hf, onLaterPages=hf)

    return doc_trace


if __name__ == '__main__':
    default_out = os.getenv("PDF_OUT", str(Path.cwd() / 'LAI_FACTORYOS_CRM_HUBSPOT_1_1_PLANO_DIAMANTE_v3.pdf'))
    ap = argparse.ArgumentParser(description='Gerar PDF: LAI Factory OS + CRM HubSpot 1:1')
    ap.add_argument('--out', default=default_out, help='Caminho de saída do PDF')
    args = ap.parse_args()
    out = args.out
    trace = build_pdf(out)
    print(out)
    print(trace)
