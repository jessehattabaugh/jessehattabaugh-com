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
				This website was designed and built by Jesse Hattabaugh, a passionate software developer with years of experience
				creating modern web applications. The site showcases expertise in web standards, serverless architecture, and cloud infrastructure.
				For full details of Jesse's experience and capabilities, check out his <a href="/resume">resume</a>.
			</p>
		</section>

		<section class="technical-details">
			<h3>Technical Architecture</h3>
			<p>
				This website is built using modern serverless architecture and follows best practices
				for performance, security, and maintainability.
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
					<li>Node.js serverless functions</li>
					<li>AWS Lambda for compute</li>
					<li>API Gateway for request routing</li>
					<li>Custom HTTP method handlers</li>
				</ul>
			</div>

			<div class="skill-category">
				<h4>Cloud & DevOps</h4>
				<ul>
					<li>AWS cloud deployment</li>
					<li>AWS CDK for infrastructure as code</li>
					<li>CloudFront CDN for global performance</li>
					<li>S3 for static asset hosting</li>
					<li>Route53 for DNS management</li>
					<li>Amazon Certificate Manager for SSL certificates</li>
					<li>Automated testing with Playwright and Node.js test runner</li>
				</ul>
			</div>
		</section>

		<section class="features">
			<h3>Website Features</h3>
			<ul>
				<li><strong>Serverless Architecture:</strong> Built on AWS Lambda for automatic scaling and cost efficiency</li>
				<li><strong>Global CDN:</strong> CloudFront distribution for fast loading worldwide</li>
				<li><strong>Security First:</strong> HTTPS enforced, CORS configured, S3 bucket policies</li>
				<li><strong>Responsive Design:</strong> Mobile-friendly layout that works on all devices</li>
				<li><strong>Modern Web Standards:</strong> Semantic HTML, CSS Grid/Flexbox, ES modules</li>
				<li><strong>Testing:</strong> Comprehensive e2e and unit test coverage</li>
				<li><strong>CI/CD:</strong> Automated deployment pipeline with staging and production environments</li>
			</ul>
			<p>
				While built with modern web standards and responsive design, this site is not currently 
				configured as a Progressive Web App (PWA), though the architecture supports future PWA enhancements.
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
