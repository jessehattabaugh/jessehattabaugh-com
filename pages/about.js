import { html } from '../lib/html.js';

/**
 * About page handler
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<div class="about-content">
		<h1>About This Website</h1>

		<section class="bio">
			<h2>Built by Jesse Hattabaugh</h2>
			<p>
				This website was designed and built by Jesse Hattabaugh, a passionate software
				developer with years of experience creating modern web applications. The site
				showcases expertise in web standards, serverless architecture, and cloud
				infrastructure. For full details of Jesse's experience and capabilities, check out
				his <a href="/resume">resume</a>.
			</p>
		</section>

		<section class="technical-details">
			<h3>Technical Architecture</h3>
			<p>
				This website is built using modern serverless architecture and follows best
				practices for performance, security, and maintainability.
			</p>

			<div class="skill-category">
				<h4>Frontend</h4>
				<ul>
					<li>Tagged template literal strings for HTML templating</li>
					<li>Responsive CSS design with mobile-first approach</li>
					<li>JavaScript with TypeScript via JSDoc comment blocks</li>
					<li>Semantic HTML5 markup for accessibility</li>
					<li>ES modules throughout</li>
				</ul>
			</div>

			<div class="skill-category">
				<h4>Backend</h4>
				<ul>
					<li>Netlify Functions runtime for serverless execution</li>
					<li>Netlify rewrites for catch-all request routing</li>
					<li>Custom HTTP method handlers (GET, POST, PUT, DELETE)</li>
				</ul>
			</div>

			<div class="skill-category">
				<h4>Cloud & DevOps</h4>
				<ul>
					<li>Netlify for hosting and Git-integrated deployments</li>
					<li>Netlify global CDN for performance</li>
					<li>Netlify DNS and managed TLS</li>
					<li>Netlify CLI for deployment configuration</li>
					<li>Automated end-to-end browser testing with Playwright</li>
				</ul>
			</div>
		</section>

		<section class="features">
			<h3>Website Features</h3>
			<ul>
				<li>
					<strong>Serverless Runtime:</strong> Netlify Functions handle dynamic requests
					with low operational overhead
				</li>
				<li><strong>Global CDN:</strong> Netlify network for fast static asset delivery</li>
				<li>
					<strong>Security First:</strong> HTTPS enforced, header injection prevention,
					HTML output escaping
				</li>
				<li>
					<strong>Responsive Design:</strong> Mobile-friendly layout that works on all
					devices
				</li>
				<li>
					<strong>Modern Web Standards:</strong> Semantic HTML, CSS Grid/Flexbox, ES
					modules
				</li>
				<li><strong>Testing:</strong> Comprehensive end-to-end browser test coverage</li>
				<li>
					<strong>CI/CD:</strong> Git-integrated deployment pipeline with preview and
					production environments
				</li>
			</ul>
			<p>
				While built with modern web standards and responsive design, this site is not
				currently configured as a Progressive Web App (PWA), though the architecture
				supports future PWA enhancements.
			</p>
		</section>

		<section class="contact">
			<h3>Get In Touch</h3>
			<p>
				Interested in working together or have questions about the technology stack?
				<a href="/hello" class="cta-button">Say Hello</a>
			</p>
		</section>
	</div>`;
}
