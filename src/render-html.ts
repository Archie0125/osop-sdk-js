/**
 * OSOP Standalone HTML/CLI Renderer — ZERO DEPENDENCIES
 * Generates self-contained HTML that matches osop.ai website style.
 * Copy this single file anywhere. It works alone.
 */

// ── Types ────────────────────────────────────────────────

export interface OsopNode { id: string; type: string; name: string; description?: string }
export interface OsopEdge { from: string; to: string; mode: string; label?: string }
export interface ParsedOsop { nodes: OsopNode[]; edges: OsopEdge[] }

// ── Parser ───────────────────────────────────────────────

export function parseOsopYaml(yaml: string): ParsedOsop {
  const nodes: OsopNode[] = []; const edges: OsopEdge[] = [];
  const nr = /- id: "([^"]+)"\s*\n\s*type: "([^"]+)"(?:\s*\n\s*subtype: "[^"]*")?(?:\s*\n\s*name: "([^"]*)")?(?:\s*\n\s*description: "([^"]*)")?/g;
  let m;
  while ((m = nr.exec(yaml)) !== null) nodes.push({ id: m[1], type: m[2], name: m[3] || m[1], description: m[4] });
  const er = /- from: "([^"]+)"\s*\n\s*to: "([^"]+)"\s*\n\s*mode: "([^"]+)"(?:\s*\n\s*(?:when|label|condition): "([^"]*)")?/g;
  while ((m = er.exec(yaml)) !== null) edges.push({ from: m[1], to: m[2], mode: m[3], label: m[4] });
  return { nodes, edges };
}

// ── Colors (matches OsopCodeBlock) ───────────────────────

export const DOT_COLORS: Record<string, string> = {
  human:"#3b82f6",agent:"#8b5cf6",api:"#22c55e",cli:"#f59e0b",db:"#06b6d4",
  system:"#94a3b8",event:"#f43f5e",cicd:"#f97316",mcp:"#6366f1",
  infra:"#14b8a6",data:"#10b981",git:"#ef4444",docker:"#0ea5e9",
};
export const EDGE_BADGE: Record<string, { bg: string; color: string }> = {
  sequential:{bg:"#f1f5f9",color:"#64748b"},conditional:{bg:"#fffbeb",color:"#d97706"},
  parallel:{bg:"#eef2ff",color:"#4f46e5"},fallback:{bg:"#fef2f2",color:"#dc2626"},
  loop:{bg:"#faf5ff",color:"#9333ea"},spawn:{bg:"#f0fdf4",color:"#16a34a"},
  error:{bg:"#fef2f2",color:"#dc2626"},timeout:{bg:"#fff7ed",color:"#ea580c"},
};

function esc(s: string): string { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

// ── Website-matching CSS ─────────────────────────────────

const SITE_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Inter",system-ui,-apple-system,sans-serif;background:#fff;color:#1e293b;-webkit-font-smoothing:antialiased;padding:24px;max-width:720px;margin:0 auto}
h1{font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;color:#0f172a;margin-bottom:8px}
h2{font-size:1.125rem;font-weight:700;color:#0f172a;margin:24px 0 4px;padding-top:12px}
h3{font-size:0.8125rem;font-weight:600;color:#334155;margin:0 0 6px}
p{font-size:0.875rem;color:#64748b;line-height:1.6}
a{color:#4f46e5;text-decoration:none}a:hover{color:#4338ca}
.card{border:1px solid #e2e8f0;border-radius:0.75rem;overflow:hidden;background:#fff}
.cb-header{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:#1e293b;border-bottom:1px solid rgba(148,163,184,0.1)}
.cb-dot{width:0.5rem;height:0.5rem;border-radius:50%}
.cb-label{margin-left:auto;font-size:0.6875rem;color:#64748b;font-family:"JetBrains Mono","Fira Code",monospace}
.cb-tabs{display:flex;gap:4px;padding:8px 16px;background:#fafafa;border-bottom:1px solid #f1f5f9}
.cb-tab{padding:4px 12px;font-size:11px;font-weight:500;border-radius:4px;border:none;cursor:pointer;font-family:inherit}
.cb-tab-active{background:#e0e7ff;color:#4338ca}
.cb-tab-inactive{background:#f8fafc;color:#64748b}
.cb-visual{padding:16px}
.cb-yaml{padding:16px;background:#0f172a}
.cb-yaml pre{font-family:"JetBrains Mono","Fira Code",monospace;font-size:0.6875rem;color:#cbd5e1;line-height:1.6;white-space:pre;overflow-x:auto;margin:0}
.node-row{padding:6px 12px;border-radius:8px;background:#f8fafc;margin-bottom:4px}
.node-flex{display:flex;align-items:center;gap:8px}
.node-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.node-name{font-size:0.75rem;font-weight:500;color:#334155}
.node-type{font-size:9px;color:#94a3b8;font-family:monospace;margin-left:auto}
.node-desc{font-size:0.6875rem;color:#94a3b8;line-height:1.4;margin:2px 0 0 18px}
.edge-row{margin-left:20px;display:flex;align-items:center;gap:6px;font-size:10px;color:#94a3b8;padding:2px 0}
.edge-arrow{color:#cbd5e1}
.edge-badge{padding:1px 4px;border-radius:3px;font-size:9px;font-family:monospace}
.actions{display:flex;gap:8px;padding:10px 16px;border-top:1px solid #f1f5f9}
.btn-primary{padding:4px 12px;font-size:0.6875rem;font-weight:500;background:#4f46e5;color:#fff;border-radius:8px;border:none;cursor:pointer;text-decoration:none}
.btn-outline{padding:4px 12px;font-size:0.6875rem;font-weight:500;border:1px solid #e2e8f0;color:#475569;border-radius:8px;background:none;cursor:pointer}
.meta{font-size:12px;color:#94a3b8;font-family:monospace;margin-bottom:4px}
.toc{margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
.toc-title{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.toc a{font-size:13px;font-weight:500;display:block;margin-bottom:4px}
.toc .count{font-size:11px;color:#94a3b8}
footer{text-align:center;padding:24px 0;font-size:11px;color:#94a3b8}
`;

// ── HTML: Visual Flow ────────────────────────────────────

export function renderVisualHtml(nodes: OsopNode[], edges: OsopEdge[]): string {
  let html = "";
  for (const node of nodes) {
    const dot = DOT_COLORS[node.type] || "#94a3b8";
    const outEdges = edges.filter(e => e.from === node.id);
    html += `<div class="node-row"><div class="node-flex">`;
    html += `<span class="node-dot" style="background:${dot}"></span>`;
    html += `<span class="node-name">${esc(node.name)}</span>`;
    html += `<span class="node-type">${esc(node.type)}</span>`;
    html += `</div>`;
    if (node.description) html += `<p class="node-desc">${esc(node.description)}</p>`;
    html += `</div>`;
    for (const edge of outEdges) {
      const tgt = nodes.find(n => n.id === edge.to);
      const b = EDGE_BADGE[edge.mode] || EDGE_BADGE.sequential;
      html += `<div class="edge-row"><span class="edge-arrow">↓</span>`;
      html += `<span class="edge-badge" style="background:${b.bg};color:${b.color}">${esc(edge.mode)}</span>`;
      html += `<span>→ ${esc(tgt?.name || edge.to)}</span></div>`;
    }
  }
  return html;
}

// ── HTML: Card (matches OsopCodeBlock) ───────────────────

export interface RenderOptions {
  title?: string;
  filename?: string;
  mode?: "visual" | "yaml" | "both";
  standalone?: boolean;
  showActions?: boolean;
}

export function renderOsopHtml(yaml: string, opts: RenderOptions = {}): string {
  const { title, filename, mode = "both", standalone = true, showActions = true } = opts;
  const { nodes, edges } = parseOsopYaml(yaml);
  const hasVisual = nodes.length > 0;
  const showTabs = mode === "both" && hasVisual;
  const uid = Math.random().toString(36).slice(2, 8);

  let card = `<div class="card">`;

  // macOS header (dark bar like website)
  card += `<div class="cb-header">`;
  card += `<span class="cb-dot" style="background:#f87171cc"></span>`;
  card += `<span class="cb-dot" style="background:#fbbf24cc"></span>`;
  card += `<span class="cb-dot" style="background:#4ade80cc"></span>`;
  if (filename) card += `<span class="cb-label">${esc(filename)}</span>`;
  card += `</div>`;

  // Tabs
  if (showTabs) {
    card += `<div class="cb-tabs">`;
    card += `<button class="cb-tab cb-tab-active" onclick="document.getElementById('v-${uid}').style.display='block';document.getElementById('y-${uid}').style.display='none';this.className='cb-tab cb-tab-active';this.nextElementSibling.className='cb-tab cb-tab-inactive'">Visual</button>`;
    card += `<button class="cb-tab cb-tab-inactive" onclick="document.getElementById('y-${uid}').style.display='block';document.getElementById('v-${uid}').style.display='none';this.className='cb-tab cb-tab-active';this.previousElementSibling.className='cb-tab cb-tab-inactive'">.osop</button>`;
    card += `</div>`;
  }

  // Visual
  if ((mode === "visual" || mode === "both") && hasVisual) {
    card += `<div id="v-${uid}" class="cb-visual">${renderVisualHtml(nodes, edges)}</div>`;
  }

  // YAML
  if (mode === "yaml" || mode === "both") {
    card += `<div id="y-${uid}" class="cb-yaml" style="display:${showTabs ? "none" : "block"}"><pre>${esc(yaml)}</pre></div>`;
  }

  // Fallback (no visual)
  if (!hasVisual && mode !== "yaml") {
    card += `<div class="cb-yaml"><pre>${esc(yaml)}</pre></div>`;
  }

  // Actions
  if (showActions) {
    card += `<div class="actions">`;
    card += `<a class="btn-primary" href="https://osop-editor.vercel.app?yaml=${encodeURIComponent(yaml)}" target="_blank">Open in Editor</a>`;
    card += `<button class="btn-outline" onclick="navigator.clipboard.writeText(this.closest('.card').querySelector('pre').textContent)">Copy YAML</button>`;
    card += `</div>`;
  }

  card += `</div>`;

  if (!standalone) return card;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title || filename || "OSOP")}</title><style>${SITE_CSS}</style></head><body>${title ? `<h1>${esc(title)}</h1>` : ""}${card}</body></html>`;
}

// ── CLI: ANSI Colors ─────────────────────────────────────

const A = { reset:"\x1b[0m",bold:"\x1b[1m",dim:"\x1b[2m",blue:"\x1b[34m",purple:"\x1b[35m",green:"\x1b[32m",yellow:"\x1b[33m",red:"\x1b[31m",cyan:"\x1b[36m",gray:"\x1b[90m" };
const TA: Record<string,string> = { human:A.blue,agent:A.purple,api:A.green,cli:A.yellow,db:A.cyan,system:A.gray,cicd:A.yellow,mcp:A.purple,git:A.red,docker:A.cyan,infra:A.cyan,data:A.green,event:A.red };
const MA: Record<string,string> = { sequential:A.gray,conditional:A.yellow,parallel:A.blue,fallback:A.red,loop:A.purple,spawn:A.green,error:A.red,timeout:A.yellow };

export function renderOsopCli(yaml: string, opts: { title?: string } = {}): string {
  const { nodes, edges } = parseOsopYaml(yaml);
  if (!nodes.length) return yaml;
  let o = opts.title ? `${A.bold}${opts.title}${A.reset}\n\n` : "";
  for (const n of nodes) {
    const tc = TA[n.type]||A.gray;
    o += `  ${tc}●${A.reset} ${A.bold}${n.name}${A.reset} ${A.dim}${n.type}${A.reset}\n`;
    if (n.description) o += `    ${A.gray}${n.description}${A.reset}\n`;
    for (const e of edges.filter(x => x.from === n.id)) {
      const tgt = nodes.find(x => x.id === e.to);
      o += `    ${A.dim}↓${A.reset} ${MA[e.mode]||A.gray}${e.mode}${A.reset} → ${tgt?.name||e.to}\n`;
    }
  }
  return o;
}

// Re-export CSS for use by render-sop
export { SITE_CSS };
