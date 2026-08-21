const assert = require('node:assert/strict');
const test = require('node:test');
const recruiterProxy = require('./api/workflow-recruiter-proxy.js');
const generatedRegistry = require('./api/workflow-verification-sources.generated.js');

test('public recruiter runtime consumes the generated verification registry directly', () => {
  assert.strictEqual(
    recruiterProxy.constants.VERIFICATION_SOURCES,
    generatedRegistry,
    'runtime must share the exact generated registry object rather than maintain a projection',
  );
  assert.equal(Object.isFrozen(generatedRegistry), true);
  assert.equal(Object.isFrozen(generatedRegistry['GlacierEQ/job-application']), true);
  assert.equal(
    Object.isFrozen(generatedRegistry['GlacierEQ/job-application'].workflow_names),
    true,
  );
  assert.equal(Object.keys(generatedRegistry).length, 8);
});
