/**
 * @typedef {Object} Env
 * @property {import('@cloudflare/workers-types').Fetcher} ASSETS
 * @property {import('@cloudflare/workers-types').D1Database} DB
 * @property {import('@cloudflare/workers-types').SendEmail} [EMAIL] Email sending binding (Cloudflare Email Service)
 * @property {string} [EMAIL_FROM]        From address for verification emails, e.g. "no-reply@jessehattabaugh.com"
 * @property {string} SESSION_SECRET      Secret for HMAC-SHA256 session signing (base64url, 32+ bytes)
 * @property {string} [VAPID_PUBLIC_KEY]  Uncompressed P-256 public key for VAPID (base64url, 65 bytes)
 * @property {string} [VAPID_PRIVATE_KEY] PKCS8 P-256 private key for VAPID (base64url)
 * @property {string} [VAPID_CONTACT]     mailto: address used as VAPID JWT sub
 * @property {string} [OWNER_SETUP_TOKEN] One-time secret to promote first registered user to owner
 */

/**
 * @typedef {Object} RouteContext
 * @property {Request} request
 * @property {Env} env
 * @property {Record<string, string | undefined>} params
 */

/**
 * @typedef {Object} Route
 * @property {string} method
 * @property {URLPattern} pattern
 * @property {(ctx: RouteContext) => Promise<Response> | Response} handle
 */

/**
 * @typedef {Object} ContactMessage
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {string} message
 * @property {string} createdAt
 */

export {};
