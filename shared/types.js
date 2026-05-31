/**
 * @typedef {Object} Env
 * @property {Fetcher} ASSETS
 * @property {D1Database} DB
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
