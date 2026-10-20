# Vue Dashboard Template


## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=dashboard-vue&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fdashboard-vue&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fvue%2Fdashboard-dark.png&demo-url=https%3A%2F%2Fdashboard-vue-template.nuxt.dev%2F&demo-title=Vue%20Dashboard%20Template&demo-description=A%20dashboard%20template%20with%20multi-column%20layout%20for%20building%20sophisticated%20admin%20interfaces.)

## Setup

Make sure to install the dependencies:

```bash
pnpm install
```

## Development Server

Start the HTTPS development server on `https://localhost:5173`:

```bash
pnpm dev
```

The local certificate is self-signed. Trust it in your browser for development.

## Languages

The app supports English, Simplified Chinese, Spanish, Hindi, French, and Arabic.
Edit `src/i18n/locales.ts` to change `languageConfig.defaultLanguage`, the language
list, or the translation messages. English is the fallback language. The chosen
language is saved in local storage under `lzapp-language` and applies to every page.
Arabic uses right-to-left layout; the header actions remain on the right.

Use Vue I18n's `useI18n()` and `t('messageKey')` for new interface text, and add the
same key to every language. `src/App.vue` maps these languages to Nuxt UI locales
for built-in controls. Page headers share `src/components/AppNavbar.vue`.

The header has language and light/dark controls. The theme preference is saved
under `vueuse-color-scheme`; without an explicit choice, it follows the system.
Auth strings live in `src/i18n/auth.ts` with complete translations for English,
Simplified Chinese, Spanish, Hindi, French, and Arabic; existing translated
navigation and Nuxt UI controls are unchanged.

## Authentication

`/user/login`, `/user/register`, and `/user/reset-password` are public pages in
`src/pages/user/`. `/settings/exit`
also works with an expired session so leftover cookies can still be cleared.
All other routes restore the cookie session with `GET /user` on the configured API origin before rendering.
Login and registration accept only safe local return URLs. The Admin navigation and direct
`/admin/*` routes require an exact `admin` or `viewall` entry in the user's JSON
`access` array. This is a UI guard, not authorization; the backend must enforce
permissions on every protected endpoint.

Requests use `credentials: 'include'`; POSTs send JSON without a custom client header.
User endpoints do not reject requests based on their Origin header. Browser CORS
rules and SameSite cookie restrictions still apply; requests go directly to the API origin.
The backend returns the whole user from login/register and sets its configured
HttpOnly auth cookie. Only profile/access data is retained in reactive memory;
`api_token` is discarded and never persisted to browser storage.
Protected API responses with status 401 clear the cached session; subsequent
protected navigation returns to login. Failed public auth requests do not clear
an existing session, and stale 401 responses cannot clear a newer login.

CAPTCHA responses must be `{ captcha_id, image }`, with a PNG data URL. Every
email-code send and failed form submission refreshes the consumed CAPTCHA.
Successful login, registration, and password reset navigate without requesting
another CAPTCHA. Successful email-code sends start a 30-second resend cooldown.
Email purposes are `register` and `reset_password`. Reset uses the same email-code
flow, clears the local session on success, and returns to login. Password settings
links to that reset flow.

Exit calls `POST /user/logout` on the API origin with `{}` before clearing memory and accessible
cookies and replacing the route with `/user/login`. The server must expire HttpOnly
cookies; it does not rotate the API token. A failed server logout still clears the
local session and redirects, with a retry action for server-cookie cleanup.
Theme and language preferences are not session credentials and remain saved.

## API Endpoint

`src/config/api.ts` defines the API origin, defaulting to `https://localhost`
(the default HTTPS port, 443).
Only HTTPS URLs are accepted. Set `VITE_API_URL` in `.env.local` or the shell:

```bash
VITE_API_URL=https://api.xxx.com pnpm dev
VITE_API_URL=https://api.xxx.com pnpm build
```

The origin must not include an API path prefix. Requests go directly to that
origin, without a Vite proxy. Open API documentation at the API origin's `/docs`.
The browser must trust the API certificate too; for local development, visit
`https://localhost/health` and trust the local certificate (or use your configured
API origin).

Use `localhost` for both local servers. In production, serve the frontend over
HTTPS and keep it on the same site as the API, such as `https://xxx.com` and
`https://api.xxx.com`, for the API's Strict cookies. Credentialed CORS must be
enabled on the API. Static hosting needs SPA history fallback.

Run `pnpm typecheck` for Vue types, `pnpm exec tsc -p tsconfig.node.json` for
Vite config types, `pnpm lint` for source linting, and `pnpm test` for tests.

## Table search behavior

Main table Search actions always fetch fresh API data, even when the search
inputs have not changed. Paginated searches start at page 1; changing page size
also starts at page 1 and reloads data. Editing inputs alone does not apply them.

The Users toolbar Search reruns the applied filters; Apply filters in its drawer
commits the draft filters and runs the same search flow. Removing filter chips
or resetting filters also searches from page 1.

Users and referral statistics use server-side pagination. DBKV and EasyRoutine
fetch complete snapshots, apply the submitted filters locally, and paginate
those snapshots locally. EasyStatistics reloads its definition snapshot and
summary counts before applying the submitted name filter. Separate error-retry
actions and expanded record/log views retain their specialized behavior.

## Admin Users API

The dashboard page remains `/admin/users`. Its API requests use:

- `GET /admin/users/list` with the existing filters, `page`, and `page_size` query parameters.
- `POST /admin/users/create` with `name`, `email`, `password`, and `access` in the JSON body.
- `POST /admin/users/update` with the same fields plus a required positive `id` in the JSON body. An empty password keeps the current password.

Listing requires `admin` or `viewall`; creating and updating require `admin`.
While a user save is pending, the editor cannot be dismissed, changed, or
switched to another user. Failed saves keep the editor open for correction.
The old API routes `/admin/users` and `/admin/users/{id}` are not supported.

## Referrals

The lower-left account menu opens the referral-link generator. A user can generate
links only for their authenticated account. Enter a required channel of 3-32
ASCII letters, digits, hyphens, or underscores, starting and ending with a letter
or digit, then generate the link. The dashboard sends `{ channel }` to
`POST /user/ref`; changing the channel clears the previously generated link.

The registration URL uses `?ref=<token>&channel=<channel>`. The visible
`channel` parameter is only a label: editing or removing it does not
change attribution. The signed channel inside `ref` is authoritative.
Tokens contain two separately
Base64URL-encoded fields (user ID and channel), followed by an HMAC signature over the
exact dot-separated encoded fields. Every token is framed with `A` and `Z`.
Keep the backend `HMACKey` persistent and identical across application instances;
changing it invalidates previously shared links. Tokens are signed, not encrypted.

Before authentication redirects, the dashboard checks a new referral's token
shape locally, fetches the cookie lifetime from `GET /user/config`, and stores
the token in a host-only `ref` cookie. The lifetime must be a positive integer
no greater than 400 days; browser limits also apply. This does not validate the
signature or referrer's existence. Later token-shaped links can overwrite the
cookie even if their signatures are invalid; missing or malformed links and
configuration-fetch failures leave it unchanged. Registration submits the
remembered token in its JSON body. Logout clears the referral cookie with all
other cookies.

At registration, the backend verifies the signature, canonical user ID, channel
format, and current existence of the referring user. Missing or invalid
referrals are discarded without preventing registration; referrer lookup
errors return 503 rather than silently discarding attribution. If an invalid
referral accompanies a failed registration, the backend sends
`X-Clear-Referral: true` so the frontend can clear it.
The database stores the referring user ID and channel separately, exposed as
`ref_userid` and `ref_channel`. Admin users filter by referring user ID, then
optionally by channel; the channel filter requires a referring user ID.

`reg_ip` is assigned by the backend during public registration and is shown only
in admin responses. The backend uses the connection's socket address for both
registration IPs and IP-based rate limits; it ignores `X-Forwarded-For` and other
forwarded client-IP headers. Direct connections or an NLB configured to preserve
client IP addresses retain the original client IP. Behind an ALB or another
reverse proxy, the backend sees the proxy's source IP, so clients sharing that
IP also share public-endpoint IP quotas. There is currently no
`HTTPConfig.TrustedProxyCIDRs` setting. Supporting forwarded client IPs requires
an explicit trusted-proxy implementation and appropriate network restrictions.

## Sidebar Width

The sidebar defaults to 15rem on ordinary desktops and 20rem at viewport widths
of 1536px or more. Both sizes remain resizable up to 20rem. Custom widths are
remembered separately for ordinary and wide screens. Double-click the resize
handle to restore the default for the current screen size.

## Typography

Fonts are self-hosted through Fontsource and configured in `src/assets/css/main.css`.
Geist is the primary Latin font, with Noto Sans SC, Noto Sans Devanagari, and
Noto Sans Arabic providing matching coverage for the other supported scripts.
The browser downloads only the font subsets needed for the displayed text.

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```
