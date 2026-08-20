const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const recruiterProxy = require('./api/workflow-recruiter-proxy.js');

const registryPath = path.resolve(__dirname, '../../config/workflow-verification-sources.json');

test('public recruiter runtime cannot drift from authoritative verification-source registry', () => {
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  assert.equal(registry.schema, 'glaciereq.verification-source-registry.v1');
  const expected = Object.fromEntries(
    Object.entries(registry.repositories)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([repository, config]) => [repository, [...config.workflow_names]]),
  );
  const actual = Object.fromEntries(
    Object.entries(recruiterProxy.constants.VERIFICATION_SOURCES)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([repository, names]) => [repository, [...names]]),
  );
  assert.deepEqual(actual, expected);
});
