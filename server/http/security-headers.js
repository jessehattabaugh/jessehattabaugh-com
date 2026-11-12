export const SECURITY_HEADERS = {
	// Cloudflare injects the Web Analytics script and reports to the same origin.
	'Content-Security-Policy':
		"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self' https://api.open-meteo.com; form-action 'self'",
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
};
