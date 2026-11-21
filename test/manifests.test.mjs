// The native packages (Gemini CLI extension, Claude Code plugin) point at the one CULT+MATH server.
// CULT+MATH · Ipalibo Da-Wariboko · November 20, 2026
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const j = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const SERVER = 'https://cultmath.com/mcp';

test('Gemini CLI extension: root manifest, named for its folder, remote server, context file present', () => {
  const g = j('gemini-extension.json');
  assert.match(g.name, /^[a-z0-9-]+$/);
  assert.equal(g.mcpServers.cultmath.httpUrl, SERVER);
  assert.ok(fs.existsSync(new URL(`../${g.contextFileName}`, import.meta.url)));
});

test('Claude Code marketplace and plugin: one plugin, one http server, a skill with frontmatter', () => {
  const m = j('.claude-plugin/marketplace.json');
  assert.ok(m.name && m.owner?.name && m.plugins.length === 1);
  const p = j('plugins/cultmath/.claude-plugin/plugin.json');
  assert.equal(p.name, m.plugins[0].name);
  assert.deepEqual(j('plugins/cultmath/.mcp.json').mcpServers.cultmath, { type: 'http', url: SERVER });
  const skill = fs.readFileSync(new URL('../plugins/cultmath/skills/cultmath-evidence/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /^---\nname: cultmath-evidence\ndescription: .{40,}\n---/);
  assert.match(skill, /Never pay without the user's explicit approval/);
});

test('the npm package ships none of the plugin files', () => {
  assert.deepEqual(j('package.json').files, ['src', 'README.md', 'LICENSE']);
});
