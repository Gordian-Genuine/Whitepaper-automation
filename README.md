# GENUINE white paper service (Webflow Cloud)

Astro app mounted at `/app` on genuine.agency. One endpoint:

`GET /app/whitepaper?email=<address>` → checks the Mailchimp audience (status must be `subscribed`, i.e. double opt-in confirmed), stamps the PDF with name, e-mail and date on every page and returns it as a download.

Environment variables (set in the Webflow Cloud dashboard, env `main`):

| Key | Value |
|---|---|
| `MAILCHIMP_API_KEY` | Mailchimp API key, ends with the data center, e.g. `…-us21` (secret) |
| `MAILCHIMP_LIST_ID` | Audience ID (Mailchimp → Audience → Settings → Audience name and defaults) |
| `PDF_URL` | optional, defaults to the Webflow asset of the current PDF |
| `WATERMARK_SECRET` | optional, enables signed links `?email&name&exp&sig` without Mailchimp lookup |

Mailchimp side: audience with double opt-in on, final welcome e-mail on, link in it:
`https://genuine.agency/affiliate-map-download?email=*|EMAIL|*`

Local: `npm install && npm run build`.
