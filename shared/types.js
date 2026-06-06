/**
 * @typedef {Object} Env
 * @property {Fetcher} ASSETS
 * @property {D1Database} DB
 * @property {string} [ADMIN_AUTH_SECRET]
 * @property {string} [ADMIN_WEBAUTHN_CREDENTIAL_ID]
 * @property {string} [ADMIN_WEBAUTHN_PUBLIC_KEY]
 * @property {string} [ADMIN_WEBAUTHN_RP_ID]
 * @property {string} [ADMIN_WEBAUTHN_ORIGIN]
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
 * @property {string} created_at
 */

export {};
