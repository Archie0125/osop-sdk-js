/**
 * OSOP Report Generators (HTML + Text)
 *
 * HTML: Zero icons, zero JS, 5-color system, <15KB output.
 *       Uses native <details>/<summary> for expand/collapse.
 *       Dark mode via CSS prefers-color-scheme.
 *
 * Text: Plain ASCII + optional ANSI color. <2KB output.
 *
 * Depends only on js-yaml.
 */
import yaml from 'js-yaml';

// --- Types ---

interface Osop {
  osop_version?: string; id?: string; name?: string; description?: string;
  version?: string; owner?: string; tags?: string[];
  nodes?: Array<{ id: string; type: string; subtype?: string; name: string; description?: string; inputs?: any; outputs?: any; runtime?: any }>;
  edges?: Array<{ from: string; to: string; mode?: string; when?: string; label?: string }>;
  timeout?: string;
}

interface LogRecord {
  node_id: string; node_type: string; attempt: number; status: string;
  started_at?: string; ended_at?: string; duration_ms?: number;
  inputs?: any; outputs?: any;
  error?: { code: string; message: string; details?: string };
  ai_metadata?: { model?: string; provider?: string; prompt_tokens?: number; completion_tokens?: number; cost_usd?: number; confidence?: number };
  human_metadata?: { actor?: string; decision?: string; notes?: string };
  tools_used?: Array<{ tool: string; calls: number }>;
}

interface OsopLog {
  run_id?: string; workflow_id?: string; workflow_version?: string;
  mode?: string; status?: string;
  trigger?: { type?: string; actor?: string; timestamp?: string };
  started_at?: string; ended_at?: string; duration_ms?: number;
  runtime?: { agent?: string; model?: string };
  node_records?: LogRecord[];
  result_summary?: string;
  cost?: { total_usd?: number; breakdown?: Array<{ node_id: string; cost_usd: number }> };
}

export interface ReportOptions { theme?: 'light' | 'dark'; title?: string }

// ============================================================
// 5-color system
// ============================================================

const TYPE_COLOR: Record<string, string> = {
  human: '#ea580c', agent: '#7c3aed',
  api: '#2563eb', mcp: '#2563eb', cli: '#2563eb',
  git: '#475569', docker: '#475569', cicd: '#475569', system: '#475569', infra: '#475569', gateway: '#475569',
  db: '#059669', data: '#059669',
  company: '#ea580c', department: '#ea580c', event: '#475569',
};

function typeColor(t: string): string { return TYPE_COLOR[t] || '#475569'; }

// ============================================================
// Shared helpers
// ============================================================

function h(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function ms(v?: number): string {
  if (v == null) return '-';
  if (v < 1000) return v + 'ms';
  if (v < 60000) return (v / 1000).toFixed(1) + 's';
  return (v / 60000).toFixed(1) + 'm';
}

function usd(v?: number): string {
  if (!v) return '$0';
  return v < 0.01 ? '$' + v.toFixed(4) : '$' + v.toFixed(3);
}

function kvTable(obj: any): string {
  if (!obj || typeof obj !== 'object') return '';
  const entries = Object.entries(obj);
  if (entries.length === 0) return '';
  let t = '<table>';
  for (const [k, v] of entries) {
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
    const display = val.length > 100 ? val.slice(0, 97) + '...' : val;
    t += `<tr><td>${h(k)}</td><td>${h(display)}</td></tr>`;
  }
  return t + '</table>';
}

// ============================================================
// HTML Report
// ============================================================

const CSS = `*{margin:0;padding:0;box-sizing:border-box}
:root{--ok:#16a34a;--err:#dc2626;--warn:#d97706;--bg:#fff;--fg:#1e293b;--mu:#64748b;--bd:#e2e8f0;--cd:#f8fafc}
body{font:14px/1.6 system-ui,sans-serif;background:var(--bg);color:var(--fg);max-width:800px;margin:0 auto;padding:16px}
h1{font-size:1.4rem;font-weight:700}
.st{display:flex;gap:12px;flex-wrap:wrap;margin:6px 0}.st span{font-weight:600}
.s{padding:2px 8px;border-radius:3px;color:#fff;font-size:12px}.s.ok{background:var(--ok)}.s.err{background:var(--err)}
.desc{color:var(--mu);font-size:13px;margin:4px 0}
.meta{font:11px monospace;color:var(--mu);margin:4px 0}
.eb{background:#fef2f2;border:1px solid #fecaca;color:var(--err);padding:8px 12px;border-radius:6px;margin:12px 0;font-size:13px}

.n{border:1px solid var(--bd);border-radius:6px;margin:8px 0;overflow:hidden}
.n summary{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;background:var(--cd);font-size:13px;list-style:none}
.n summary::-webkit-details-marker{display:none}
.n.er{border-left:3px solid var(--err)}
.tp{color:#fff;padding:1px 6px;border-radius:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
.du{margin-left:auto;color:var(--mu);font-size:12px;font-family:monospace}
.br{height:4px;border-radius:2px;display:inline-block;min-width:2px}
.bd{padding:12px;font-size:13px;border-top:1px solid var(--bd)}
.bd p{color:var(--mu);margin-bottom:8px}
.bd table{width:100%;font-size:12px;border-collapse:collapse}
.bd td{padding:3px 8px;border-bottom:1px solid var(--bd);vertical-align:top}
.bd td:first-child{font-weight:600;color:var(--mu);width:30%;font-family:monospace;font-size:11px}
.ai{font-size:12px;color:#7c3aed;margin-top:8px;font-family:monospace}

.er-box{background:#fef2f2;color:var(--err);padding:8px;border-radius:4px;font-size:12px;margin-top:8px}

.rt{font-size:12px;color:var(--ok);margin-top:4px}
footer{text-align:center;padding:20px 0;color:var(--mu);font-size:11px}
footer a{color:#2563eb}`;

export function generateHtmlReport(osopYaml: string, osoplogYaml?: string, opts?: ReportOptions): string {
  const o = (yaml.load(osopYaml) as Osop) || {};
  const log: OsopLog | null = osoplogYaml ? (yaml.load(osoplogYaml) as OsopLog) || null : null;
  const isExec = !!log;
  const title = opts?.title || o.name || o.id || 'OSOP Report';

  // Build latest record per node
  const latest = new Map<string, LogRecord>();
  const failures: LogRecord[] = [];
  if (log?.node_records) {
    for (const r of log.node_records) {
      const prev = latest.get(r.node_id);
      if (!prev || r.attempt > prev.attempt) latest.set(r.node_id, r);
      if (r.status === 'FAILED') failures.push(r);
    }
  }

  const totalMs = log?.duration_ms;
  let body = '';

  // Header
  body += '<header>';
  body += `<h1>${h(title)}</h1>`;
  body += '<div class="st">';
  if (isExec && log) {
    const sc = log.status === 'COMPLETED' ? 'ok' : 'err';
    body += `<span class="s ${sc}">${h(log.status || 'UNKNOWN')}</span>`;
    body += `<span>${ms(log.duration_ms)}</span>`;
    if (log.cost?.total_usd) body += `<span>${usd(log.cost.total_usd)}</span>`;
    body += `<span>${latest.size} nodes</span>`;
  } else {
    body += `<span>${o.nodes?.length || 0} nodes</span>`;
    body += `<span>${o.edges?.length || 0} edges</span>`;
    if (o.version) body += `<span>v${h(o.version)}</span>`;
  }
  body += '</div>';
  if (o.description) body += `<p class="desc">${h(o.description)}</p>`;

  // Meta line
  const meta: string[] = [];
  if (o.id) meta.push(o.id);
  if (log?.run_id) meta.push('run:' + log.run_id.slice(0, 8));
  if (log?.mode) meta.push(log.mode);
  if (log?.runtime?.agent) meta.push(log.runtime.agent);
  if (log?.trigger?.actor) meta.push(log.trigger.actor);
  if (log?.started_at) meta.push(log.started_at.replace('T', ' ').replace('Z', ''));
  if (meta.length) body += `<div class="meta">${meta.map(h).join(' · ')}</div>`;
  body += '</header>';

  // Error banner
  if (failures.length > 0) {
    const retried = failures.filter(f => {
      const l = latest.get(f.node_id);
      return l && l.status === 'COMPLETED' && l.attempt > f.attempt;
    });
    for (const f of failures) {
      const retriedOk = retried.includes(f);
      body += `<div class="eb">${h(f.node_id)} failed: ${h(f.error?.code || '')} — ${h(f.error?.message || 'unknown')}`;
      if (retriedOk) body += ' — retried ok';
      body += '</div>';
    }
  }

  // Nodes — errors first, then by execution order
  body += '<main>';
  const nodes = o.nodes || [];
  const sorted = [...nodes].sort((a, b) => {
    const la = latest.get(a.id);
    const lb = latest.get(b.id);
    const aErr = la?.status === 'FAILED' ? 0 : 1;
    const bErr = lb?.status === 'FAILED' ? 0 : 1;
    if (aErr !== bErr) return aErr - bErr;
    return 0;
  });

  for (const node of sorted) {
    const rec = latest.get(node.id);
    const allRecs = log?.node_records?.filter(r => r.node_id === node.id) || [];
    const isFailed = rec?.status === 'FAILED';
    const hasRetry = allRecs.length > 1;
    const cls = isFailed ? 'n er' : 'n';
    const open = isFailed ? ' open' : '';

    body += `<details class="${cls}"${open}>`;
    body += '<summary>';
    body += `<span class="tp" style="background:${typeColor(node.type)}">${h(node.type.toUpperCase())}</span>`;
    body += `<strong>${h(node.name)}</strong>`;
    if (rec) {
      body += `<span class="du">${ms(rec.duration_ms)}</span>`;
      if (rec.status === 'COMPLETED') {
        const pct = totalMs ? Math.max(1, Math.round((rec.duration_ms || 0) / totalMs * 100)) : 0;
        body += `<span class="br" style="width:${pct}%;background:var(--ok)"></span>`;
      } else if (rec.status === 'FAILED') {
        body += '<span class="s err">FAILED</span>';
      } else {
        body += `<span class="s ok">${h(rec.status)}</span>`;
      }
    }
    body += '</summary>';

    body += '<div class="bd">';
    if (node.description) body += `<p>${h(node.description)}</p>`;

    const inputs = rec?.inputs || node.inputs;
    const outputs = rec?.outputs || node.outputs;
    if (inputs) body += kvTable(inputs);
    if (outputs) body += kvTable(outputs);

    if (rec?.ai_metadata) {
      const ai = rec.ai_metadata;
      const parts: string[] = [];
      if (ai.model) parts.push(ai.model);
      if (ai.prompt_tokens != null) parts.push(`${ai.prompt_tokens.toLocaleString()}→${(ai.completion_tokens || 0).toLocaleString()} tok`);
      if (ai.cost_usd) parts.push(usd(ai.cost_usd));
      if (ai.confidence != null) parts.push(`${(ai.confidence * 100).toFixed(0)}%`);
      if (parts.length) body += `<div class="ai">${parts.map(h).join(' · ')}</div>`;
    }

    if (rec?.human_metadata) {
      const hm = rec.human_metadata;
      const parts: string[] = [];
      if (hm.actor) parts.push(hm.actor);
      if (hm.decision) parts.push('decision=' + hm.decision);
      if (hm.notes) parts.push(hm.notes);
      if (parts.length) body += `<div style="font-size:12px;color:var(--mu);margin-top:4px">${parts.map(h).join(' · ')}</div>`;
    }

    if (rec?.tools_used?.length) {
      body += `<div style="font-size:12px;color:var(--mu);margin-top:4px">${rec.tools_used.map(t => h(t.tool) + 'x' + t.calls).join(', ')}</div>`;
    }

    if (rec?.error) {
      body += `<div class="er-box">${h(rec.error.code)}: ${h(rec.error.message)}`;
      if (rec.error.details) body += `<br>${h(rec.error.details)}`;
      body += '</div>';
    }

    if (hasRetry) {
      for (const r of allRecs) {
        if (r === rec) continue;
        body += `<div class="rt">Attempt ${r.attempt}: ${h(r.status)} ${ms(r.duration_ms)}`;
        if (r.error) body += ` — ${h(r.error.code)}`;
        body += '</div>';
      }
    }

    body += '</div></details>';
  }

  body += '</main>';

  if (log?.result_summary) {
    body += `<p style="margin:16px 0;padding:12px;background:var(--cd);border-radius:6px;font-size:13px;color:var(--mu)">${h(log.result_summary)}</p>`;
  }

  body += '<footer>OSOP v1.0 · <a href="https://osop.ai">osop.ai</a></footer>';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
}

// ============================================================
// Text Report
// ============================================================

// ANSI codes
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', B = '\x1b[34m', M = '\x1b[35m', O = '\x1b[38;5;208m', D = '\x1b[2m', BO = '\x1b[1m', X = '\x1b[0m';

const TYPE_ANSI: Record<string, string> = {
  human: O, agent: M, api: B, mcp: B, cli: B,
  git: D, docker: D, cicd: D, system: D, infra: D, gateway: D,
  db: G, data: G, company: O, event: D,
};

function pad(s: string, len: number): string { return s + ' '.repeat(Math.max(0, len - s.length)); }
function dots(name: string, max: number): string { return name + ' ' + '.'.repeat(Math.max(2, max - name.length)) + ' '; }

export function generateTextReport(osopYaml: string, osoplogYaml?: string, ansi = false): string {
  const o = (yaml.load(osopYaml) as Osop) || {};
  const log: OsopLog | null = osoplogYaml ? (yaml.load(osoplogYaml) as OsopLog) || null : null;
  const c = (code: string, text: string) => ansi ? code + text + X : text;

  const lines: string[] = [];
  const title = o.name || o.id || 'OSOP Report';
  lines.push(c(BO, `OSOP Report: ${title}`));
  lines.push('='.repeat(Math.min(60, title.length + 14)));

  if (log) {
    const sc = log.status === 'COMPLETED' ? c(G, 'COMPLETED') : c(R, log.status || 'UNKNOWN');
    const parts = [`Status: ${sc}`, ms(log.duration_ms)];
    if (log.cost?.total_usd) parts.push('$' + log.cost.total_usd.toFixed(3));
    const latest = new Map<string, LogRecord>();
    for (const r of log.node_records || []) {
      const prev = latest.get(r.node_id);
      if (!prev || r.attempt > prev.attempt) latest.set(r.node_id, r);
    }
    parts.push(latest.size + ' nodes');
    lines.push(parts.join(' | '));

    const logMeta: string[] = [];
    if (log.run_id) logMeta.push('Run: ' + log.run_id.slice(0, 8));
    if (log.runtime?.agent) logMeta.push('Agent: ' + log.runtime.agent);
    if (log.trigger?.actor) logMeta.push('Actor: ' + log.trigger.actor);
    if (logMeta.length) lines.push(c(D, logMeta.join(' | ')));

    // Errors first
    const failures = (log.node_records || []).filter(r => r.status === 'FAILED');
    if (failures.length) {
      lines.push('');
      for (const f of failures) {
        const l = latest.get(f.node_id);
        const retried = l && l.status === 'COMPLETED' && l.attempt > f.attempt;
        const suffix = retried ? c(G, ' -> retried ok') : '';
        lines.push(c(R, `! ${f.node_id} FAILED (attempt ${f.attempt})`) + ` -> ${f.error?.code || ''}: ${f.error?.message || ''}${suffix}`);
      }
    }

    // Node list
    lines.push('');
    const maxName = Math.max(...[...(o.nodes || [])].map(n => n.id.length), 10);
    const dotLen = maxName + 4;

    for (const node of o.nodes || []) {
      const rec = latest.get(node.id);
      if (!rec) continue;
      const tc = TYPE_ANSI[node.type] || D;
      const typeStr = pad(node.type.toUpperCase(), 7);
      const nameStr = dots(node.id, dotLen);
      const durStr = pad(ms(rec.duration_ms), 7);

      let status = rec.status === 'COMPLETED' ? c(G, 'ok') : c(R, rec.status);
      const extras: string[] = [];

      if ((log.node_records || []).filter(r => r.node_id === node.id).length > 1) extras.push('(retry)');
      if (rec.ai_metadata) {
        const ai = rec.ai_metadata;
        if (ai.prompt_tokens != null) extras.push(`${ai.prompt_tokens.toLocaleString()}->${(ai.completion_tokens || 0).toLocaleString()} tok`);
        if (ai.cost_usd) extras.push('$' + ai.cost_usd.toFixed(3));
        if (ai.confidence != null) extras.push((ai.confidence * 100).toFixed(0) + '%');
      }
      if (rec.human_metadata?.decision) extras.push('decision=' + rec.human_metadata.decision);

      const line = `  ${c(tc, typeStr)} ${nameStr}${durStr} ${status}${extras.length ? '  ' + c(D, extras.join('  ')) : ''}`;
      lines.push(line);
    }

    if (log.result_summary) {
      lines.push('');
      lines.push(c(D, 'Summary: ' + log.result_summary));
    }
  } else {
    // Spec mode
    lines.push(`${o.nodes?.length || 0} nodes, ${o.edges?.length || 0} edges`);
    lines.push('');
    for (const node of o.nodes || []) {
      const tc = TYPE_ANSI[node.type] || D;
      lines.push(`  ${c(tc, pad(node.type.toUpperCase(), 7))} ${node.name}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
