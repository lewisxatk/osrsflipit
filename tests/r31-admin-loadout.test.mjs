import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../worker.js';

const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/upgrade.css', import.meta.url), 'utf8');
const workerSource = await readFile(new URL('../worker.js', import.meta.url), 'utf8');

test('R31 administrator page is hidden from public navigation and contains both private tools', () => {
  assert.match(source, /admin:"\/admin-control-room"/);
  assert.match(source, /PATH_TABS\["\/admin-control-room"\]="admin"/);
  assert.match(source, /function AdminControlRoom\(/);
  assert.match(source, /<DataControlCentre\/><OsrsKnowledgeSearch\/>/);
  assert.doesNotMatch(source.slice(source.indexOf('function IntelligencePage'), source.indexOf('function AccountStudio')), /<DataControlCentre\/>|<OsrsKnowledgeSearch\/>/);
  assert.doesNotMatch(source.slice(source.indexOf('function IntelligenceLab'), source.indexOf('function OsrsKnowledgeSearch')), /<OsrsKnowledgeSearch\/>/);
});

test('R31 private health and knowledge APIs fail closed without a signed admin session', async () => {
  for (const path of ['/api/data/health', '/api/data/knowledge?q=dragon']) {
    const response = await worker.fetch(new Request(`https://hub.example${path}`), {});
    assert.equal(response.status, 401);
    assert.equal((await response.json()).adminRequired, true);
  }
  const noSecret = await worker.fetch(new Request('https://hub.example/api/admin/session'), {});
  assert.equal(noSecret.status, 503);
});

test('R31 admin login issues an expiring HttpOnly cookie and session/logout endpoints work', async () => {
  const env = { ADMIN_PASSWORD: 'test-only-long-admin-password-2026' };
  const bad = await worker.fetch(new Request('https://hub.example/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json','Origin':'https://hub.example'}, body:JSON.stringify({password:'wrong'}) }), env);
  assert.equal(bad.status, 401);
  const login = await worker.fetch(new Request('https://hub.example/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json','Origin':'https://hub.example'}, body:JSON.stringify({password:env.ADMIN_PASSWORD}) }), env);
  assert.equal(login.status, 200);
  const cookie = login.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Strict/);
  const cookiePair = cookie.split(';')[0];
  const session = await worker.fetch(new Request('https://hub.example/api/admin/session', { headers:{Cookie:cookiePair} }), env);
  assert.equal((await session.json()).ok, true);
  const logout = await worker.fetch(new Request('https://hub.example/api/admin/logout', {method:'POST',headers:{Cookie:cookiePair}}), env);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0/);
});

test('R31 Loadout rejects cross-style gear, omits non-ranged ammunition, and remembers explicit item exclusions', () => {
  assert.match(source, /const styleCompatible=/);
  assert.match(source, /slot==="ammo"&&style!=="ranged"/);
  assert.match(source, /const isExcludedItem=/);
  assert.match(source, /osrshub-loadout-excluded-items/);
  assert.match(source, /styleCompatible\(x,slot\)/);
  assert.match(source, /styleCompatible\(x,editing\.slot\)/);
  assert.match(source, /styleScore\(b,slot\)-styleScore\(a,slot\)\|\|gpPrice\(a\)-gpPrice\(b\)/);
});

test('R31 upgrade pathway compares estimated DPS and exposes an explicit full equipment scan', () => {
  assert.match(source, /const estimateDps=/);
  assert.match(source, /const scanUpgradePath=async/);
  assert.match(source, /Current gear → next best upgrades/);
  assert.match(source, /estimated DPS/);
  assert.match(styles, /\.upgradePathLine/);
});

test('R31 OSRSBox static mirror fallback and backend sync wording are present', () => {
  assert.match(workerSource, /raw\.githubusercontent\.com\/osrsbox\/osrsbox-db\/master\/docs\/items-json-slot/);
  assert.match(workerSource, /items-summary\.json.*raw\.githubusercontent\.com/);
  assert.match(source, /Backend market collection sync/);
  assert.match(source, /not each browser price refresh/);
});
