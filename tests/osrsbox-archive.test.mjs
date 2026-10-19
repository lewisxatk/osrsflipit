import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256, archiveKey } from '../scripts/archive-osrsbox.mjs';

test('OSRSBox archive SHA-256 is deterministic', () => {
  assert.equal(sha256(Buffer.from('osrshub')), '6a70f6773a72075ab5300e95184f35befdd1fe7c5fc76f9532d4af04f23c16f7');
});

test('OSRSBox archive keys are commit-versioned', () => {
  assert.equal(archiveKey('0123456789abcdef0123456789abcdef01234567'), 'osrsbox/snapshots/osrsbox-db-0123456789abcdef0123456789abcdef01234567.zip');
});
