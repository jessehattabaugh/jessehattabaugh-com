export const SECURITY_HEADERS = {
	// connect-src allows the Rainbow Hour app's device-side weather check
	// (api.open-meteo.com); everything else stays same-origin.
	'Content-Security-Policy':
		"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.open-meteo.com; form-action 'self'",
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
};
