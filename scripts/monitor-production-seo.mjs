import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const BASE = new URL(process.env.SEO_MONITOR_BASE_URL || 'https://casey-barton-glaciereq.vercel.app');
const SITEMAP = new URL('/sitemap.xml', BASE);
const OUTPUT = path.resolve(process.env.SEO_MONITOR_OUTPUT || 'artifacts/production-seo-monitor.json');
const MIN_SITEMAP_URLS = Number.parseInt(process.env.SEO_MONITOR_MIN_SITEMAP_URLS || '175', 10);
const CONCURRENCY = Math.max(1, Number.parseInt(process.env.SEO_MONITOR_CONCURRENCY || '12', 10));
const TIMEOUT_MS = Math.max(1_000, Number.parseInt(process.env.SEO_MONITOR_TIMEOUT_MS || '20000', 10));

function clean(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|quot|#39|lt|gt);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function attributes(tag) {
  const result = new Map();
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function firstMeta(html, name, property = false) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if ((property ? attrs.get('property') : attrs.get('name'))?.toLowerCase() === name.toLowerCase()) {
      return clean(attrs.get('content'));
    }
  }
  return '';
}

function jsonLdRecords(html) {
  const records = [];
  const pattern = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      records.push({ valid: true, value: JSON.parse(match[1]) });
    } catch {
      records.push({ valid: false });
    }
  }
  return records;
}

function internalLinks(html, pageUrl) {
  const links = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    const href = match[1] ?? match[2] ?? match[3] ?? '';
    if (!href || href.startsWith('#')) continue;
    try {
      const url = new URL(href, pageUrl);
      if (url.origin !== BASE.origin || !['http:', 'https:'].includes(url.protocol)) continue;
      url.hash = '';
      url.search = '';
      links.add(url.href);
    } catch {
      // Malformed hrefs do not form an external request target; they remain visible in the source report.
    }
  }
  return [...links].sort();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'GlacierEQ-ProductionSEO-Monitor/1.0 (+public site audit)' },
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await response.text();
    return {
      url,
      final_url: response.url,
      status: response.status,
      redirected: response.url !== url,
      content_type: response.headers.get('content-type') || '',
      elapsed_ms: Date.now() - started,
      body,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function collect(items, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        output[index] = await worker(items[index]);
      } catch (error) {
        output[index] = {
          url: items[index],
          final_url: null,
          status: null,
          redirected: false,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        };
      }
    }
  }));
  return output;
}

function pageRecord(response) {
  const html = response.body;
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const images = [...html.matchAll(/<img\b[^>]*>/gi)];
  const schema = jsonLdRecords(html);
  return {
    url: response.url,
    final_url: response.final_url,
    status: response.status,
    redirected: response.redirected,
    elapsed_ms: response.elapsed_ms,
    content_type: response.content_type,
    title: clean(titleMatch?.[1]),
    description: firstMeta(html, 'description'),
    lang: attributes(html.match(/<html\b[^>]*>/i)?.[0] || '').get('lang') || '',
    viewport: firstMeta(html, 'viewport'),
    h1_count: h1Count,
    json_ld_count: schema.length,
    json_ld_invalid: schema.filter((entry) => !entry.valid).length,
    image_count: images.length,
    images_missing_alt: images.filter((match) => !attributes(match[0]).has('alt')).length,
    internal_links: internalLinks(html, response.final_url || response.url),
  };
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = String(selector(item));
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function duplicateTitles(records) {
  const grouped = new Map();
  for (const record of records) {
    if (!record.title) continue;
    grouped.set(record.title, [...(grouped.get(record.title) || []), record.url]);
  }
  return Object.fromEntries([...grouped.entries()].filter(([, urls]) => urls.length > 1));
}

function violationsFor(summary) {
  const violations = [];
  const checks = [
    ['sitemap URL count below baseline', summary.sitemap_urls < MIN_SITEMAP_URLS, `${summary.sitemap_urls} < ${MIN_SITEMAP_URLS}`],
    ['non-200 sitemap URL', summary.non_200_sitemap_urls.length > 0, summary.non_200_sitemap_urls.join(', ')],
    ['redirecting sitemap URL', summary.redirecting_sitemap_urls.length > 0, summary.redirecting_sitemap_urls.join(', ')],
    ['missing title', summary.missing_title.length > 0, summary.missing_title.join(', ')],
    ['duplicate title group', Object.keys(summary.duplicate_titles).length > 0, Object.keys(summary.duplicate_titles).join(', ')],
    ['missing description', summary.missing_description.length > 0, summary.missing_description.join(', ')],
    ['missing language declaration', summary.missing_lang.length > 0, summary.missing_lang.join(', ')],
    ['missing viewport declaration', summary.missing_viewport.length > 0, summary.missing_viewport.join(', ')],
    ['H1 count is not exactly one', summary.h1_not_exactly_one.length > 0, summary.h1_not_exactly_one.join(', ')],
    ['missing JSON-LD', summary.missing_schema.length > 0, summary.missing_schema.join(', ')],
    ['invalid JSON-LD', summary.invalid_schema.length > 0, summary.invalid_schema.join(', ')],
    ['image missing alt attribute', summary.images_missing_alt.length > 0, summary.images_missing_alt.join(', ')],
    ['broken internal link', summary.broken_internal_links.length > 0, summary.broken_internal_links.map((item) => `${item.source} -> ${item.target}`).join(', ')],
    ['redirecting internal link', summary.redirecting_internal_links.length > 0, summary.redirecting_internal_links.map((item) => `${item.source} -> ${item.target}`).join(', ')],
  ];
  for (const [name, failed, detail] of checks) {
    if (failed) violations.push({ name, detail: detail || 'See report artifact.' });
  }
  return violations;
}

async function writeReport(report) {
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main() {
  if (!Number.isInteger(MIN_SITEMAP_URLS) || MIN_SITEMAP_URLS < 1) throw new Error('SEO_MONITOR_MIN_SITEMAP_URLS must be a positive integer');
  const sitemapResponse = await fetchWithTimeout(SITEMAP.href);
  if (sitemapResponse.status !== 200) throw new Error(`sitemap request returned ${sitemapResponse.status}`);
  const sitemapUrls = [...sitemapResponse.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]);
  if (!sitemapUrls.length) throw new Error('sitemap contains no URLs');

  const rawPages = await collect(sitemapUrls, fetchWithTimeout);
  const pages = rawPages
    .filter((response) => String(response.content_type || '').toLowerCase().includes('html'))
    .map(pageRecord);
  const allInternalTargets = [...new Set(pages.flatMap((page) => page.internal_links))].sort();
  const targets = await collect(allInternalTargets, fetchWithTimeout);

  const summary = {
    audit_time_utc: new Date().toISOString(),
    base_url: BASE.href,
    sitemap_url: SITEMAP.href,
    sitemap_urls: sitemapUrls.length,
    html_pages: pages.length,
    status_counts: countBy(rawPages, (record) => record.status),
    non_200_sitemap_urls: rawPages.filter((record) => record.status !== 200).map((record) => record.url),
    redirecting_sitemap_urls: rawPages.filter((record) => record.redirected).map((record) => record.url),
    missing_title: pages.filter((page) => !page.title).map((page) => page.url),
    duplicate_titles: duplicateTitles(pages),
    missing_description: pages.filter((page) => !page.description).map((page) => page.url),
    missing_lang: pages.filter((page) => !page.lang).map((page) => page.url),
    missing_viewport: pages.filter((page) => !page.viewport).map((page) => page.url),
    h1_not_exactly_one: pages.filter((page) => page.h1_count !== 1).map((page) => page.url),
    missing_schema: pages.filter((page) => page.json_ld_count === 0).map((page) => page.url),
    invalid_schema: pages.filter((page) => page.json_ld_invalid > 0).map((page) => page.url),
    images_missing_alt: pages.filter((page) => page.images_missing_alt > 0).map((page) => page.url),
    internal_link_targets: allInternalTargets.length,
    internal_link_status_counts: countBy(targets, (record) => record.status),
    broken_internal_links: pages.flatMap((page) => page.internal_links
      .map((target) => ({ source: page.url, target, result: targets.find((record) => record.url === target) }))
      .filter(({ result }) => !result || result.status !== 200)
      .map(({ source, target, result }) => ({ source, target, status: result?.status ?? null, error: result?.error ?? null }))),
    redirecting_internal_links: pages.flatMap((page) => page.internal_links
      .map((target) => ({ source: page.url, target, result: targets.find((record) => record.url === target) }))
      .filter(({ result }) => result?.redirected)
      .map(({ source, target, result }) => ({ source, target, final_url: result.final_url }))),
  };
  const violations = violationsFor(summary);
  const report = { summary, violations, pages, targets };
  await writeReport(report);
  console.log(JSON.stringify({ status: violations.length ? 'FAIL' : 'PASS', summary, violations, report: OUTPUT }, null, 2));
  if (violations.length) process.exitCode = 1;
}

main().catch(async (error) => {
  const report = {
    summary: { audit_time_utc: new Date().toISOString(), base_url: BASE.href, sitemap_url: SITEMAP.href },
    violations: [{ name: 'monitor execution failure', detail: error instanceof Error ? error.message : String(error) }],
  };
  try { await writeReport(report); } catch { /* Preserve the original monitor failure. */ }
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
