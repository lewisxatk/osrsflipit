#!/usr/bin/env node
/**
 * Create a versioned, full-repository OSRSBox archive and optionally upload it to Cloudflare R2.
 * Does not connect to or write to D1. Requires Node 20+; upload requires Wrangler auth and an existing R2 bucket.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'data-archive');
const REPO_API = 'https://api.github.com/repos/osrsbox/osrsbox-db';
const USER_AGENT = 'OSRSHub-OSRSBox-Archive/1.0 (source archive; respectful download)';

export function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
export function archiveKey(commit) { return `osrsbox/snapshots/osrsbox-db-${commit}.zip`; }

async function fetchChecked(url, headers = {}) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } });
  if (!response.ok) throw new Error(`Download failed (${response.status}) for ${url}`);
  return response;
}

export async function createArchive({ outputDir = OUT_DIR, upload = false, bucket = 'osrshub-osrs-archive' } = {}) {
  const metaResponse = await fetchChecked(`${REPO_API}/commits/master`, { Accept: 'application/vnd.github+json' });
  const commitInfo = await metaResponse.json();
  const commit = String(commitInfo?.sha || '').trim();
  if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error('GitHub did not return a valid 40-character commit SHA.');

  const archiveUrl = `https://codeload.github.com/osrsbox/osrsbox-db/zip/${commit}`;
  const archiveResponse = await fetchChecked(archiveUrl);
  const bytes = Buffer.from(await archiveResponse.arrayBuffer());
  if (bytes.length < 1000 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Downloaded source did not look like a valid ZIP archive.');

  await mkdir(outputDir, { recursive: true });
  const zipPath = resolve(outputDir, `osrsbox-db-${commit}.zip`);
  const manifestPath = resolve(outputDir, `osrsbox-db-${commit}.manifest.json`);
  const manifest = {
    archive: 'OSRSBox osrsbox-db repository snapshot',
    repository: 'https://github.com/osrsbox/osrsbox-db',
    commit,
    commitUrl: `https://github.com/osrsbox/osrsbox-db/commit/${commit}`,
    downloadedAt: new Date().toISOString(),
    bytes: bytes.length,
    sha256: sha256(bytes),
    archiveKey: archiveKey(commit),
    use: 'Versioned source archive only. The searchable website database is populated separately by the budget-governed OSRS Hub ingestion worker.',
    licensingReminder: 'Retain upstream licence and attribution files. Check dataset-specific terms before redistributing or using any non-commercially licensed content commercially.'
  };
  await writeFile(zipPath, bytes);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (upload) {
    for (const [file, key, contentType] of [
      [zipPath, manifest.archiveKey, 'application/zip'],
      [manifestPath, `osrsbox/manifests/${commit}.json`, 'application/json']
    ]) {
      const args = ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, `--file=${file}`, `--content-type=${contentType}`, '--remote'];
      const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
      if (result.status !== 0) throw new Error(`R2 upload failed for ${key}. The local archive is still available at ${zipPath}.`);
    }
  }
  return { zipPath, manifestPath, manifest, uploaded: upload };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const upload = process.argv.includes('--upload');
  const bucketArg = process.argv.find(x => x.startsWith('--bucket='));
  const bucket = bucketArg ? bucketArg.slice('--bucket='.length) : 'osrshub-osrs-archive';
  try {
    const result = await createArchive({ upload, bucket });
    console.log(`Archive saved: ${result.zipPath}`);
    console.log(`Manifest saved: ${result.manifestPath}`);
    console.log(`Commit: ${result.manifest.commit}`);
    console.log(`Size: ${(result.manifest.bytes / 1024 / 1024).toFixed(2)} MiB`);
    console.log(`SHA-256: ${result.manifest.sha256}`);
    console.log(upload ? `Uploaded to R2 bucket: ${bucket}` : 'Local archive only. Add --upload after creating the R2 bucket to upload it.');
  } catch (error) {
    console.error(`OSRSBox archive failed: ${error.message}`);
    process.exitCode = 1;
  }
}
