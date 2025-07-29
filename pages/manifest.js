/**
 * Web App Manifest handler
 * Serves the PWA manifest from the root path
 * @param {Object} event - Lambda event object
 * @returns {Object} Response object with manifest JSON
 */
export async function get() {
	const manifest = {
		name: "Jesse Hattabaugh",
		short_name: "Jesse H",
		description: "Jesse Hattabaugh's personal website - Software developer passionate about creating amazing web experiences",
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#2563eb",
		categories: ["business", "technology"],
		lang: "en",
		orientation: "portrait-primary",
		scope: "/",
		icons: [
			{
				src: "/static/icons/icon-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any maskable"
			},
			{
				src: "/static/icons/icon-512x512.png", 
				sizes: "512x512",
				type: "image/png",
				purpose: "any maskable"
			}
		]
	};

	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/manifest+json',
			'Cache-Control': 'public, max-age=3600'
		},
		body: JSON.stringify(manifest, undefined, 2)
	};
}