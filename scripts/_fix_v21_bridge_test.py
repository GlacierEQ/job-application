from pathlib import Path
import re

path = Path('deployment/vercel-source-bridge/proxy.test.js')
text = path.read_text()
pattern = re.compile(
    r"test\('only __v20_verify advertises the V21 verification schema', \(\) => \{.*?\n\}\);",
    re.S,
)
replacement = """test('only __v21_verify advertises the V21 verification schema', () => {
  assert.match(proxySource, /raw === '__v21_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v20_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v19_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v18_verify'/);
  assert.doesNotMatch(proxySource, /raw === '__v15_verify'/);
});"""
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'versioned verifier test replacement count {count}')
path.write_text(text)
