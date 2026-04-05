/**
 * OSOP .sop Document Renderer — ZERO DEPENDENCIES
 * Renders a complete SOP document (.sop = collection of .osop workflows).
 * Copy this single file anywhere. It works alone. Does NOT import render-html.
 *
 * Usage:
 *   import { parseSopFile, renderSopDocHtml, renderSopDocCli } from './render-sop';
 */

// ══════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════

export interface SopWorkflowRef { ref: string; title?: string; description?: string }
export interface SopSection { name: string; description?: string; workflows: SopWorkflowRef[] }
export interface SopDocument {
  sop_version: string; id: string; name: string; description?: string;
  author?: string; version?: string; base_url?: string; tags?: string[];
  sections: SopSection[];
}
export interface SopDocRenderOptions { standalone?: boolean }

interface Node { id: string; type: string; name: string; description?: string }
interface Edge { from: string; to: string; mode: string }

// ══════════════════════════════════════════════════════════
// .sop Parser (self-contained)
// ══════════════════════════════════════════════════════════

export function parseSopFile(yaml: string): SopDocument {
  const lines = yaml.split("\n");
  const doc: any = { sections: [] };
  let sec: any = null;
  let wf: any = null;
  let inSections = false, inWfs = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;

    if (!inSections) {
      if (t === "sections:" || t.startsWith("sections:")) { inSections = true; continue; }
      const kv = t.match(/^(\w[\w_]*):\s*"?([^"]*)"?$/);
      if (kv) { doc[kv[1]] = kv[2]; continue; }
      const tags = t.match(/^tags:\s*\[(.+)\]$/);
      if (tags) { doc.tags = tags[1].split(",").map((s: string) => s.trim()); continue; }
    } else {
      if (t.startsWith("- name:")) {
        sec = { name: t.replace(/^- name:\s*"?([^"]*)"?$/, "$1"), workflows: [] };
        doc.sections.push(sec); inWfs = false; wf = null; continue;
      }
      if (t.startsWith("description:") && sec && !inWfs) {
        sec.description = t.replace(/^description:\s*"?([^"]*)"?$/, "$1"); continue;
      }
      if (t === "workflows:" || t.startsWith("workflows:")) { inWfs = true; continue; }
      if (inWfs && t.startsWith("- ref:")) {
        wf = { ref: t.replace(/^- ref:\s*"?([^"]*)"?$/, "$1") };
        sec?.workflows.push(wf); continue;
      }
      if (inWfs && wf && t.startsWith("title:")) {
        wf.title = t.replace(/^title:\s*"?([^"]*)"?$/, "$1"); continue;
      }
    }
  }
  return doc as SopDocument;
}

// ══════════════════════════════════════════════════════════
// .osop Parser (self-contained, same regex as render-html)
// ══════════════════════════════════════════════════════════

function parseOsop(yaml: string): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []; const edges: Edge[] = [];
  const nr = /- id: "([^"]+)"\s*\n\s*type: "([^"]+)"(?:\s*\n\s*subtype: "[^"]*")?(?:\s*\n\s*name: "([^"]*)")?(?:\s*\n\s*description: "([^"]*)")?/g;
  let m;
  while ((m = nr.exec(yaml)) !== null) nodes.push({ id: m[1], type: m[2], name: m[3] || m[1], description: m[4] });
  const er = /- from: "([^"]+)"\s*\n\s*to: "([^"]+)"\s*\n\s*mode: "([^"]+)"/g;
  while ((m = er.exec(yaml)) !== null) edges.push({ from: m[1], to: m[2], mode: m[3] });
  return { nodes, edges };
}

// ══════════════════════════════════════════════════════════
// Colors (self-contained, same as render-html)
// ══════════════════════════════════════════════════════════

const DOT: Record<string, string> = {
  human:"#3b82f6",agent:"#8b5cf6",api:"#22c55e",cli:"#f59e0b",db:"#06b6d4",
  system:"#94a3b8",event:"#f43f5e",cicd:"#f97316",mcp:"#6366f1",
  infra:"#14b8a6",data:"#10b981",git:"#ef4444",docker:"#0ea5e9",
};
const BADGE: Record<string, { bg: string; c: string }> = {
  sequential:{bg:"#f1f5f9",c:"#64748b"},conditional:{bg:"#fffbeb",c:"#d97706"},
  parallel:{bg:"#eef2ff",c:"#4f46e5"},fallback:{bg:"#fef2f2",c:"#dc2626"},
  loop:{bg:"#faf5ff",c:"#9333ea"},spawn:{bg:"#f0fdf4",c:"#16a34a"},
  error:{bg:"#fef2f2",c:"#dc2626"},timeout:{bg:"#fff7ed",c:"#ea580c"},
};

function h(s: string): string { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

const CSS = `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Inter",system-ui,-apple-system,sans-serif;background:#fff;color:#1e293b;-webkit-font-smoothing:antialiased;padding:24px;max-width:720px;margin:0 auto}
h1{font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;color:#0f172a;margin-bottom:8px}
h2{font-size:1.125rem;font-weight:700;color:#0f172a;margin:24px 0 4px;padding-top:12px}
h3{font-size:0.8125rem;font-weight:600;color:#334155;margin:0 0 6px}
p{font-size:0.875rem;color:#64748b;line-height:1.6}
a{color:#4f46e5;text-decoration:none}a:hover{color:#4338ca}
.card{border:1px solid #e2e8f0;border-radius:0.75rem;overflow:hidden;background:#fff}
.cb-header{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;background:#1e293b;border-bottom:1px solid rgba(148,163,184,0.1)}
.cb-dot{width:0.5rem;height:0.5rem;border-radius:50%}
.cb-label{margin-left:auto;font-size:0.6875rem;color:#64748b;font-family:monospace}
.cb-tabs{display:flex;gap:4px;padding:8px 16px;background:#fafafa;border-bottom:1px solid #f1f5f9}
.cb-tab{padding:4px 12px;font-size:11px;font-weight:500;border-radius:4px;border:none;cursor:pointer;font-family:inherit}
.cb-tab-active{background:#e0e7ff;color:#4338ca}
.cb-tab-inactive{background:#f8fafc;color:#64748b}
.cb-visual{padding:16px}
.cb-yaml{padding:16px;background:#0f172a}
.cb-yaml pre{font-family:monospace;font-size:0.6875rem;color:#cbd5e1;line-height:1.6;white-space:pre;overflow-x:auto;margin:0}
.node-row{padding:6px 12px;border-radius:8px;background:#f8fafc;margin-bottom:4px}
.node-flex{display:flex;align-items:center;gap:8px}
.node-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.node-name{font-size:0.75rem;font-weight:500;color:#334155}
.node-type{font-size:9px;color:#94a3b8;font-family:monospace;margin-left:auto}
.node-desc{font-size:0.6875rem;color:#94a3b8;line-height:1.4;margin:2px 0 0 18px}
.edge-row{margin-left:20px;display:flex;align-items:center;gap:6px;font-size:10px;color:#94a3b8;padding:2px 0}
.edge-arrow{color:#cbd5e1}
.edge-badge{padding:1px 4px;border-radius:3px;font-size:9px;font-family:monospace}
.meta{font-size:12px;color:#94a3b8;font-family:monospace;margin-bottom:4px}
.toc{margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
.toc-title{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.toc a{font-size:13px;font-weight:500;display:block;margin-bottom:4px}
.toc .count{font-size:11px;color:#94a3b8}
footer{text-align:center;padding:24px 0;font-size:11px;color:#94a3b8}`;

// ══════════════════════════════════════════════════════════
// Inline .osop → HTML (self-contained)
// ══════════════════════════════════════════════════════════

function osopCardHtml(yaml: string, filename?: string): string {
  const { nodes, edges } = parseOsop(yaml);
  const hasVisual = nodes.length > 0;
  const uid = Math.random().toString(36).slice(2, 8);

  let card = `<div class="card">`;
  card += `<div class="cb-header"><span class="cb-dot" style="background:#f87171cc"></span><span class="cb-dot" style="background:#fbbf24cc"></span><span class="cb-dot" style="background:#4ade80cc"></span>`;
  if (filename) card += `<span class="cb-label">${h(filename)}</span>`;
  card += `</div>`;

  if (hasVisual) {
    card += `<div class="cb-tabs">`;
    card += `<button class="cb-tab cb-tab-active" onclick="document.getElementById('v-${uid}').style.display='block';document.getElementById('y-${uid}').style.display='none';this.className='cb-tab cb-tab-active';this.nextElementSibling.className='cb-tab cb-tab-inactive'">Visual</button>`;
    card += `<button class="cb-tab cb-tab-inactive" onclick="document.getElementById('y-${uid}').style.display='block';document.getElementById('v-${uid}').style.display='none';this.className='cb-tab cb-tab-active';this.previousElementSibling.className='cb-tab cb-tab-inactive'">.osop</button>`;
    card += `</div>`;
    card += `<div id="v-${uid}" class="cb-visual">`;
    for (const node of nodes) {
      const dot = DOT[node.type] || "#94a3b8";
      card += `<div class="node-row"><div class="node-flex"><span class="node-dot" style="background:${dot}"></span><span class="node-name">${h(node.name)}</span><span class="node-type">${h(node.type)}</span></div>`;
      if (node.description) card += `<p class="node-desc">${h(node.description)}</p>`;
      card += `</div>`;
      for (const edge of edges.filter(e => e.from === node.id)) {
        const tgt = nodes.find(n => n.id === edge.to);
        const b = BADGE[edge.mode] || BADGE.sequential;
        card += `<div class="edge-row"><span class="edge-arrow">↓</span><span class="edge-badge" style="background:${b.bg};color:${b.c}">${h(edge.mode)}</span><span>→ ${h(tgt?.name || edge.to)}</span></div>`;
      }
    }
    card += `</div>`;
  }

  card += `<div id="y-${uid}" class="cb-yaml" style="display:${hasVisual ? "none" : "block"}"><pre>${h(yaml)}</pre></div>`;
  card += `</div>`;
  return card;
}

// ══════════════════════════════════════════════════════════
// .sop → HTML (self-contained)
// ══════════════════════════════════════════════════════════

export function renderSopDocHtml(doc: SopDocument, osopFiles: Map<string, string>, opts: SopDocRenderOptions = {}): string {
  const { standalone = true } = opts;
  let body = "";

  // Header
  body += `<div style="margin-bottom:32px">`;
  body += `<h1 style="font-size:24px;font-weight:800;color:#0f172a;margin:0 0 8px">${h(doc.name)}</h1>`;
  if (doc.description) body += `<p style="font-size:14px;color:#64748b;margin:0 0 8px">${h(doc.description)}</p>`;
  const meta: string[] = [];
  if (doc.author) meta.push(doc.author);
  if (doc.version) meta.push(`v${doc.version}`);
  if (doc.base_url) meta.push(doc.base_url);
  const total = doc.sections.reduce((s, sec) => s + sec.workflows.length, 0);
  meta.push(`${total} workflows`);
  meta.push(`${doc.sections.length} sections`);
  body += `<p class="meta">${meta.map(h).join(" · ")}</p>`;
  body += `</div>`;

  // TOC
  body += `<nav class="toc"><p class="toc-title">Contents</p>`;
  for (const sec of doc.sections) {
    body += `<a href="#${h(sec.name.toLowerCase().replace(/\s+/g,"-"))}">${h(sec.name)} <span class="count">(${sec.workflows.length})</span></a>`;
  }
  body += `</nav>`;

  // Sections
  for (const sec of doc.sections) {
    const anchor = sec.name.toLowerCase().replace(/\s+/g, "-");
    body += `<section id="${h(anchor)}" style="margin-bottom:40px">`;
    body += `<h2>${h(sec.name)}</h2>`;
    if (sec.description) body += `<p style="margin-bottom:16px">${h(sec.description)}</p>`;

    for (const wf of sec.workflows) {
      const yaml = osopFiles.get(wf.ref);
      body += `<div style="margin-bottom:12px">`;
      body += `<h3>${h(wf.title || wf.ref)}</h3>`;
      body += yaml ? osopCardHtml(yaml, wf.ref.split("/").pop()) : `<p style="color:#94a3b8;font-style:italic">File not found: ${h(wf.ref)}</p>`;
      body += `</div>`;
    }
    body += `</section>`;
  }

  if (!standalone) return body;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(doc.name)}</title><style>${CSS}</style></head><body>${body}<footer>Generated by <a href="https://osop.ai">OSOP</a> · SOP Doc</footer></body></html>`;
}

// ══════════════════════════════════════════════════════════
// .sop → CLI (self-contained)
// ══════════════════════════════════════════════════════════

const C = { reset:"\x1b[0m",bold:"\x1b[1m",dim:"\x1b[2m",underline:"\x1b[4m",gray:"\x1b[90m",purple:"\x1b[35m",blue:"\x1b[34m",green:"\x1b[32m",yellow:"\x1b[33m",red:"\x1b[31m",cyan:"\x1b[36m" };
const TA: Record<string,string> = { human:C.blue,agent:C.purple,api:C.green,cli:C.yellow,db:C.cyan,system:C.gray,cicd:C.yellow,mcp:C.purple,git:C.red,docker:C.cyan,infra:C.cyan,data:C.green,event:C.red };
const MA: Record<string,string> = { sequential:C.gray,conditional:C.yellow,parallel:C.blue,fallback:C.red,loop:C.purple,spawn:C.green,error:C.red,timeout:C.yellow };

function osopCli(yaml: string, title?: string): string {
  const { nodes, edges } = parseOsop(yaml);
  if (!nodes.length) return yaml;
  let o = title ? `${C.bold}${title}${C.reset}\n\n` : "";
  for (const n of nodes) {
    const tc = TA[n.type]||C.gray;
    o += `  ${tc}●${C.reset} ${C.bold}${n.name}${C.reset} ${C.dim}${n.type}${C.reset}\n`;
    if (n.description) o += `    ${C.gray}${n.description}${C.reset}\n`;
    for (const e of edges.filter(x => x.from === n.id)) {
      const tgt = nodes.find(x => x.id === e.to);
      o += `    ${C.dim}↓${C.reset} ${MA[e.mode]||C.gray}${e.mode}${C.reset} → ${tgt?.name||e.to}\n`;
    }
  }
  return o;
}

export function renderSopDocCli(doc: SopDocument, osopFiles: Map<string, string>): string {
  let o = `${C.bold}${doc.name}${C.reset}\n`;
  if (doc.description) o += `${C.gray}${doc.description}${C.reset}\n`;
  const meta: string[] = [];
  if (doc.author) meta.push(doc.author);
  if (doc.version) meta.push(`v${doc.version}`);
  if (doc.base_url) meta.push(doc.base_url);
  if (meta.length) o += `${C.dim}${meta.join(" · ")}${C.reset}\n`;
  o += "\n";

  for (const sec of doc.sections) {
    o += `${C.bold}${C.underline}${sec.name}${C.reset}`;
    if (sec.description) o += ` ${C.gray}— ${sec.description}${C.reset}`;
    o += "\n\n";
    for (const wf of sec.workflows) {
      const yaml = osopFiles.get(wf.ref);
      o += yaml ? osopCli(yaml, wf.title) : `  ${C.gray}(not found: ${wf.ref})${C.reset}\n`;
      o += "\n";
    }
  }
  return o;
}
