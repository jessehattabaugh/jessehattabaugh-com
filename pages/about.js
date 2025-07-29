import { html } from '../lib/html.js';

/**
 * About page handler
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<div class="about-content">
		<h2>About Jesse</h2>
		<p>
			I'm a passionate software developer with experience in building modern web applications
			and cloud-based solutions.
		</p>

		<section class="skills">
			<h3>Skills & Expertise</h3>
			<ul>
				<li><strong>Frontend Development:</strong> HTML, CSS, JavaScript, React, Vue.js</li>
				<li>
					<strong>Backend Development:</strong> Node.js, Python, serverless architectures
				</li>
				<li>
					<strong>Cloud Platforms:</strong> AWS, Lambda functions, CloudFormation, CDK
				</li>
				<li><strong>DevOps:</strong> CI/CD pipelines, infrastructure as code</li>
			</ul>
		</section>

		<section class="experience">
			<h3>What I'm Working On</h3>
			<p>
				Currently focused on building scalable serverless applications and exploring the
				latest web technologies. I enjoy creating efficient, maintainable code that solves
				real-world problems.
			</p>
		</section>

		<section class="contact">
			<h3>Get In Touch</h3>
			<p>
				Interested in working together or have a question? Feel free to
				<a href="/contact">reach out</a>!
			</p>
		</section>
	</div>`;
}
