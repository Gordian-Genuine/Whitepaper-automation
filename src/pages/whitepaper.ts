import type { APIRoute } from 'astro';
import SparkMD5 from 'spark-md5';
import { watermarkPdf } from '../lib/watermark';

const DEFAULT_PDF = 'https://cdn.prod.website-files.com/6931628fa2e19aa6da06c119/6ab100df04ca9fd1329166fa_genuine-tiktok-shop-eu-creator-report-2026.pdf';

function page(status: number, title: string, text: string, link?: { href: string; label: string }) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="robots" content="noindex"></head>
<body style="font-family:Montserrat,system-ui,sans-serif;background:#0b172e;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0">
<div style="max-width:32rem;padding:2rem"><h1 style="font-size:1.5rem">${title}</h1><p style="color:#b9c0cc;line-height:1.5">${text}</p>
${link ? `<a href="${link.href}" style="display:inline-block;margin-top:1rem;padding:.8rem 1.4rem;border-radius:999px;background:#e8157e;color:#fff;text-decoration:none;font-weight:600">${link.label}</a>` : ''}</div></body></html>`;
  return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

export const GET: APIRoute = async (ctx) => {
  try {
    return await handle(ctx);
  } catch (e: any) {
    console.error('whitepaper endpoint failed:', e && e.stack ? e.stack : e);
    const msg = (e && e.message) ? String(e.message).slice(0, 200) : 'unknown error';
    return page(500, 'Could not prepare your copy', `Something went wrong while preparing the file (${msg}). Please try again in a minute or write to info@genuine.agency.`);
  }
};

async function handle({ request, locals }: Parameters<APIRoute>[0]): Promise<Response> {

  const env = (locals as any).runtime?.env ?? {};
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || url.searchParams.get('e') || '').trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return page(400, 'Missing e-mail address', 'Please use the download link from your confirmation e-mail.', { href: '/affiliate-map', label: 'Request the report' });
  }

  let name = '';
  let allowed = false;

  // Path A: signed link (no Mailchimp lookup): ?email=..&name=..&exp=..&sig=..
  const sig = url.searchParams.get('sig');
  if (sig && env.WATERMARK_SECRET) {
    const n = url.searchParams.get('name') || '';
    const exp = url.searchParams.get('exp') || '';
    const expect = await hmac(env.WATERMARK_SECRET, `${email}|${n}|${exp}`);
    if (expect === sig && (!exp || Date.now() < Number(exp))) { allowed = true; name = n; }
  }

  // Path B: Mailchimp membership check (double opt-in enforced by Mailchimp)
  if (!allowed && env.MAILCHIMP_API_KEY && env.MAILCHIMP_LIST_ID) {
    const dc = env.MAILCHIMP_API_KEY.split('-').pop();
    const hash = SparkMD5.hash(email);
    const r = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}/members/${hash}?fields=status,merge_fields`, {
      headers: { authorization: 'Basic ' + btoa('anystring:' + env.MAILCHIMP_API_KEY) },
    });
    if (r.status === 200) {
      const m: any = await r.json();
      if (m.status === 'subscribed') {
        allowed = true;
        name = [m.merge_fields?.FNAME, m.merge_fields?.LNAME].filter(Boolean).join(' ').trim();
      } else if (m.status === 'pending') {
        return page(403, 'Please confirm your e-mail first', `We sent a confirmation e-mail to ${email}. Click the link in it, then come back to this page.`);
      }
    }
  }

  if (!allowed) {
    if (!env.MAILCHIMP_API_KEY && !env.WATERMARK_SECRET) return page(503, 'Service not configured', 'The report service is missing its Mailchimp configuration.');
    return page(403, 'No subscription found', `We could not find a confirmed subscription for ${email}.`, { href: '/affiliate-map', label: 'Request the report' });
  }

  if (!name) name = email.split('@')[0];
  const pdfUrl = env.PDF_URL || DEFAULT_PDF;
  const cache = (typeof caches !== 'undefined' && (caches as any).default) ? ((caches as any).default as Cache) : undefined;
  let srcRes: Response | undefined;
  try { srcRes = cache ? await cache.match(pdfUrl) : undefined; } catch (e) { console.warn('cache.match failed', e); }
  if (!srcRes) {
    srcRes = await fetch(pdfUrl, { cf: { cacheEverything: true } } as any);
    if (cache && srcRes.ok) { try { await cache.put(pdfUrl, srcRes.clone()); } catch (e) { console.warn('cache.put failed', e); } }
  }
  if (!srcRes.ok) return page(502, 'Source file unavailable', 'The report file could not be loaded. Please try again later.');

  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const bytes = await watermarkPdf(await srcRes.arrayBuffer(), name, email, date);
  const safe = name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'personal';
  return new Response(bytes, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="GENUINE-TikTok-Shop-EU-Creator-Report-2026-${safe}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
