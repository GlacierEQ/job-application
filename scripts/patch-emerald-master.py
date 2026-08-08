from pathlib import Path

proxy = Path('deployment/vercel-source-bridge/api/compiler-proxy.js')
text = proxy.read_text(encoding='utf-8')

anchor = "const OUTPUT_SCHEMA = 'glaciereq.public-application-compiler.v1';\n"
if 'EMERALD_MOTION_LINK' not in text:
    if text.count(anchor) != 1:
        raise SystemExit('output schema anchor mismatch')
    text = text.replace(anchor, anchor + "const EMERALD_MOTION_LINK = '<link rel=\"stylesheet\" href=\"/assets/site.emerald-motion.css\">';\n", 1)

emerald_css = r'''const EMERALD_MOTION_CSS = `
/* Script-free presentation energy for the Master technical surface. */
.page-hero{
  background:
    radial-gradient(760px 430px at 14% 8%,rgba(73,255,177,.12),transparent 66%),
    radial-gradient(620px 360px at 86% 18%,rgba(31,210,154,.08),transparent 68%);
}
.master-grid{position:relative;isolation:isolate}
.master-card{
  position:relative;
  overflow:hidden;
  border-color:rgba(107,255,194,.24)!important;
  background:
    radial-gradient(420px 220px at 0% 0%,rgba(67,255,178,.085),transparent 70%),
    linear-gradient(150deg,rgba(8,38,34,.92),rgba(4,16,18,.96))!important;
  box-shadow:0 22px 70px rgba(0,0,0,.34),0 0 0 1px rgba(75,255,181,.035),0 0 38px rgba(39,226,154,.075)!important;
  transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease;
}
.master-card::before{
  content:"";
  position:absolute;
  inset:-2px;
  z-index:0;
  pointer-events:none;
  background:linear-gradient(112deg,transparent 14%,transparent 36%,rgba(142,255,212,.14) 48%,rgba(67,238,176,.055) 53%,transparent 66%,transparent 100%);
  transform:translateX(-145%);
  animation:emerald-master-sheen 8.8s cubic-bezier(.4,0,.2,1) infinite;
}
.master-card:nth-child(2n)::before{animation-delay:-4.1s}
.master-card>*{position:relative;z-index:1}
.master-card h2,.master-card h3{filter:drop-shadow(0 0 16px rgba(96,255,198,.075))}
.terminal{
  border-color:rgba(86,255,190,.24)!important;
  background:linear-gradient(180deg,rgba(40,255,176,.028),transparent 38%),#020a0b!important;
  box-shadow:inset 0 1px 0 rgba(128,255,210,.055),inset 0 0 55px rgba(35,225,151,.035),0 26px 80px rgba(0,0,0,.4),0 0 42px rgba(38,231,157,.07)!important;
  animation:emerald-terminal-breathe 6.4s ease-in-out infinite;
}
.terminal .prompt,.terminal strong,.terminal b{color:#a9ffd8}
.table-wrap{
  border-color:rgba(92,255,191,.2)!important;
  background:linear-gradient(145deg,rgba(7,31,29,.76),rgba(3,14,17,.82))!important;
  box-shadow:0 20px 58px rgba(0,0,0,.22),inset 0 1px 0 rgba(129,255,212,.035);
}
.table-wrap th{background:rgba(65,239,172,.055)!important;color:#c9ffe8}
.table-wrap tbody tr:hover{background:rgba(70,245,178,.035)}
.tree,.branch{border-color:rgba(85,247,183,.19)!important;box-shadow:inset 0 0 28px rgba(42,223,156,.025)}
.callout{
  border-color:rgba(91,255,190,.23)!important;
  background:radial-gradient(420px 180px at 8% 20%,rgba(56,244,169,.075),transparent 72%),linear-gradient(135deg,rgba(49,231,164,.055),rgba(139,220,255,.02))!important;
  box-shadow:0 18px 54px rgba(0,0,0,.2),0 0 38px rgba(39,226,154,.045);
}
@media(hover:hover) and (pointer:fine){
  .master-card:hover{transform:translateY(-3px);border-color:rgba(125,255,205,.4)!important;box-shadow:0 28px 86px rgba(0,0,0,.4),0 0 52px rgba(44,240,164,.13)!important}
}
@keyframes emerald-master-sheen{
  0%,17%{transform:translateX(-145%);opacity:0}
  23%{opacity:1}
  39%{transform:translateX(145%);opacity:.9}
  45%,100%{transform:translateX(145%);opacity:0}
}
@keyframes emerald-terminal-breathe{
  0%,100%{box-shadow:inset 0 1px 0 rgba(128,255,210,.055),inset 0 0 55px rgba(35,225,151,.035),0 26px 80px rgba(0,0,0,.4),0 0 34px rgba(38,231,157,.055)}
  50%{box-shadow:inset 0 1px 0 rgba(128,255,210,.08),inset 0 0 62px rgba(35,225,151,.055),0 26px 80px rgba(0,0,0,.4),0 0 54px rgba(38,231,157,.105)}
}
@media(max-width:640px){
  .master-card{box-shadow:0 16px 45px rgba(0,0,0,.3),0 0 26px rgba(39,226,154,.055)!important}
  .terminal{box-shadow:inset 0 0 38px rgba(35,225,151,.03),0 18px 52px rgba(0,0,0,.34)!important}
}
@media(prefers-reduced-motion:reduce){
  .master-card::before,.terminal{animation:none!important}
  .master-card{transition:none!important}
}
@media print{
  .master-card,.terminal,.table-wrap,.callout,.tree,.branch{box-shadow:none!important;background:#fff!important}
  .master-card::before{display:none!important}
}
`;

'''
css_anchor = 'const COMPILER_CSS = `\n'
if 'const EMERALD_MOTION_CSS' not in text:
    if text.count(css_anchor) != 1:
        raise SystemExit('compiler css anchor mismatch')
    text = text.replace(css_anchor, emerald_css + css_anchor, 1)

algerian_link = '  <link rel="stylesheet" href="/assets/site.algerian.css">\n'
emerald_html_link = '  <link rel="stylesheet" href="/assets/site.emerald-motion.css">\n'
if emerald_html_link not in text:
    if text.count(algerian_link) != 1:
        raise SystemExit('compiler html typography link anchor mismatch')
    text = text.replace(algerian_link, algerian_link + emerald_html_link, 1)

nav_fn = '''function injectCompilerNavigation(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let html = bytes.toString('utf8');
  if (!/<html\\b/i.test(html) || !/<nav class="links"/i.test(html)) return bytes;
  if (html.includes('href="/compiler/"')) return bytes;
  const navStart = html.search(/<nav class="links"/i);
  if (navStart < 0) return bytes;
  const navEnd = html.indexOf('</nav>', navStart);
  if (navEnd < 0) return bytes;
  html = `${html.slice(0, navEnd)}<a href="/compiler/">Compiler</a>${html.slice(navEnd)}`;
  return Buffer.from(html);
}
'''
replacement_fn = nav_fn + '''
function injectEmeraldMotion(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
  let html = bytes.toString('utf8');
  if (!/<\\/head>/i.test(html)) return bytes;
  const matches = html.match(/\\/assets\\/site\\.emerald-motion\\.css/g) || [];
  if (matches.length > 1) throw new Error('duplicate_emerald_motion_stylesheet');
  if (matches.length === 1) return bytes;
  const typography = '<link rel="stylesheet" href="/assets/site.algerian.css">';
  if (html.includes(typography)) html = html.replace(typography, `${typography}\\n  ${EMERALD_MOTION_LINK}`);
  else html = html.replace(/<\\/head>/i, `  ${EMERALD_MOTION_LINK}\\n</head>`);
  return Buffer.from(html);
}
'''
if 'function injectEmeraldMotion' not in text:
    if text.count(nav_fn) != 1:
        raise SystemExit('navigation function anchor mismatch')
    text = text.replace(nav_fn, replacement_fn, 1)

serve_anchor = '''function serveCompilerCss(res) {
  const body = Buffer.from(COMPILER_CSS);
  generatedSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, must-revalidate');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}
'''
serve_replacement = serve_anchor + '''
function serveEmeraldMotionCss(res) {
  const body = Buffer.from(EMERALD_MOTION_CSS);
  generatedSecurityHeaders(res);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, must-revalidate');
  res.setHeader('Content-Length', String(body.length));
  res.end(body);
}
'''
if 'function serveEmeraldMotionCss' not in text:
    if text.count(serve_anchor) != 1:
        raise SystemExit('serve compiler css anchor mismatch')
    text = text.replace(serve_anchor, serve_replacement, 1)

route_anchor = "  if (filePath === 'assets/application-compiler.css') return serveCompilerCss(res);\n"
if "assets/site.emerald-motion.css') return" not in text:
    if text.count(route_anchor) != 1:
        raise SystemExit('css route anchor mismatch')
    text = text.replace(route_anchor, route_anchor + "  if (filePath === 'assets/site.emerald-motion.css') return serveEmeraldMotionCss(res);\n", 1)

html_anchor = "  if (type.startsWith('text/html')) body = injectCompilerNavigation(body);\n"
if "filePath === 'master/index.html'" not in text:
    if text.count(html_anchor) != 1:
        raise SystemExit('inherited html anchor mismatch')
    text = text.replace(html_anchor, "  if (type.startsWith('text/html')) {\n    body = injectCompilerNavigation(body);\n    if (filePath === 'master/index.html') body = injectEmeraldMotion(body);\n  }\n", 1)

export_anchor = 'module.exports.injectCompilerNavigation = injectCompilerNavigation;\n'
if 'module.exports.injectEmeraldMotion' not in text:
    if text.count(export_anchor) != 1:
        raise SystemExit('export anchor mismatch')
    text = text.replace(export_anchor, export_anchor + 'module.exports.injectEmeraldMotion = injectEmeraldMotion;\nmodule.exports.EMERALD_MOTION_CSS = EMERALD_MOTION_CSS;\n', 1)

proxy.write_text(text, encoding='utf-8')

tests = Path('deployment/vercel-source-bridge/compiler-proxy.test.js')
t = tests.read_text(encoding='utf-8')
append = r'''

test('emerald motion restores technical energy without client script', () => {
  const css = compiler.EMERALD_MOTION_CSS;
  assert.ok(css.includes('.master-card::before'));
  assert.ok(css.includes('@keyframes emerald-master-sheen'));
  assert.ok(css.includes('@keyframes emerald-terminal-breathe'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('rgba(73,255,177'));
  assert.equal(/<script\\b/i.test(css), false);
});

test('emerald motion injection is idempotent', () => {
  const source = Buffer.from('<!doctype html><html><head><link rel="stylesheet" href="/assets/site.algerian.css"></head><body><main></main></body></html>');
  const once = compiler.injectEmeraldMotion(source).toString('utf8');
  const twice = compiler.injectEmeraldMotion(Buffer.from(once)).toString('utf8');
  assert.equal((once.match(/site\\.emerald-motion\\.css/g) || []).length, 1);
  assert.equal(twice, once);
});
'''
if "emerald motion restores technical energy" not in t:
    t += append
tests.write_text(t, encoding='utf-8')
