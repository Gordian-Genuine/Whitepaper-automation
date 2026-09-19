/// <reference types="astro/client" />
type Env = {
  MAILCHIMP_API_KEY?: string;   // e.g. abcd1234-us21
  MAILCHIMP_LIST_ID?: string;   // audience id
  PDF_URL?: string;             // source PDF, defaults to the Webflow asset
  WATERMARK_SECRET?: string;    // optional: enables signed links without Mailchimp lookup
};
type Runtime = import('@astrojs/cloudflare').Runtime<Env>;
declare namespace App { interface Locals extends Runtime {} }
