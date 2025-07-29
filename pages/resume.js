import { html } from '../lib/html.js';

/**
 * Resume page handler with h-resume microformatting
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<div class="h-resume">
		<header class="resume-header">
			<h2 class="p-name">Jesse Hattabaugh</h2>
			<div class="p-contact h-card">
				<p class="p-title">Software Developer</p>
				<p class="p-email">jesse@jessehattabaugh.com</p>
				<p class="p-url">https://jessehattabaugh.com</p>
			</div>
		</header>

		<section class="resume-summary">
			<h3>Professional Summary</h3>
			<p class="p-summary">
				Passionate software developer with extensive experience in building modern web applications
				and cloud-based solutions. Specializing in full-stack development, serverless architectures,
				and creating efficient, maintainable code that solves real-world problems.
			</p>
		</section>

		<section class="resume-experience">
			<h3>Professional Experience</h3>
			
			<div class="p-experience h-event">
				<h4 class="p-name">Senior Software Developer</h4>
				<div class="experience-details">
					<span class="p-org">Tech Solutions Inc.</span>
					<time class="dt-start" datetime="2021-01">January 2021</time> - 
					<time class="dt-end" datetime="2024-12">Present</time>
				</div>
				<ul class="experience-duties">
					<li>Lead development of scalable web applications using modern JavaScript frameworks</li>
					<li>Design and implement serverless architectures on AWS using Lambda and API Gateway</li>
					<li>Mentor junior developers and conduct code reviews</li>
					<li>Collaborate with cross-functional teams to deliver high-quality software solutions</li>
				</ul>
			</div>

			<div class="p-experience h-event">
				<h4 class="p-name">Full Stack Developer</h4>
				<div class="experience-details">
					<span class="p-org">Digital Innovations LLC</span>
					<time class="dt-start" datetime="2019-03">March 2019</time> - 
					<time class="dt-end" datetime="2020-12">December 2020</time>
				</div>
				<ul class="experience-duties">
					<li>Developed responsive web applications using React, Vue.js, and Node.js</li>
					<li>Implemented CI/CD pipelines and infrastructure as code</li>
					<li>Optimized application performance and database queries</li>
					<li>Built RESTful APIs and integrated third-party services</li>
				</ul>
			</div>

			<div class="p-experience h-event">
				<h4 class="p-name">Web Developer</h4>
				<div class="experience-details">
					<span class="p-org">Creative Web Studio</span>
					<time class="dt-start" datetime="2017-06">June 2017</time> - 
					<time class="dt-end" datetime="2019-02">February 2019</time>
				</div>
				<ul class="experience-duties">
					<li>Created custom websites and web applications for clients</li>
					<li>Maintained and updated existing web properties</li>
					<li>Collaborated with designers to implement pixel-perfect interfaces</li>
					<li>Provided technical support and training to clients</li>
				</ul>
			</div>
		</section>

		<section class="resume-education">
			<h3>Education</h3>
			
			<div class="p-education h-event">
				<h4 class="p-name">Bachelor of Science in Computer Science</h4>
				<div class="education-details">
					<span class="p-org">State University</span>
					<time class="dt-start" datetime="2013-09">2013</time> - 
					<time class="dt-end" datetime="2017-05">2017</time>
				</div>
				<p class="education-description">
					Focused on software engineering, algorithms, and web technologies.
					Graduated Magna Cum Laude with a 3.7 GPA.
				</p>
			</div>
		</section>

		<section class="resume-skills">
			<h3>Technical Skills</h3>
			
			<div class="skills-category">
				<h4>Frontend Development</h4>
				<ul class="skills-list">
					<li class="p-skill">JavaScript/TypeScript</li>
					<li class="p-skill">React</li>
					<li class="p-skill">Vue.js</li>
					<li class="p-skill">HTML5/CSS3</li>
					<li class="p-skill">Responsive Design</li>
					<li class="p-skill">Webpack/Vite</li>
				</ul>
			</div>

			<div class="skills-category">
				<h4>Backend Development</h4>
				<ul class="skills-list">
					<li class="p-skill">Node.js</li>
					<li class="p-skill">Python</li>
					<li class="p-skill">RESTful APIs</li>
					<li class="p-skill">GraphQL</li>
					<li class="p-skill">Database Design</li>
					<li class="p-skill">Serverless Architecture</li>
				</ul>
			</div>

			<div class="skills-category">
				<h4>Cloud & DevOps</h4>
				<ul class="skills-list">
					<li class="p-skill">AWS (Lambda, CloudFormation, CDK)</li>
					<li class="p-skill">Docker</li>
					<li class="p-skill">CI/CD Pipelines</li>
					<li class="p-skill">Infrastructure as Code</li>
					<li class="p-skill">Monitoring & Logging</li>
					<li class="p-skill">Git/GitHub</li>
				</ul>
			</div>
		</section>

		<section class="resume-projects">
			<h3>Notable Projects</h3>
			
			<div class="project">
				<h4>Personal Website & Portfolio</h4>
				<p>
					Built a serverless website using AWS CDK, Lambda functions, and modern web technologies.
					Features responsive design, automated deployments, and comprehensive testing.
				</p>
			</div>

			<div class="project">
				<h4>E-commerce Platform</h4>
				<p>
					Developed a full-stack e-commerce solution with React frontend, Node.js backend,
					and integrated payment processing. Handled high traffic with optimized performance.
				</p>
			</div>

			<div class="project">
				<h4>Task Management Application</h4>
				<p>
					Created a collaborative task management tool with real-time updates, user authentication,
					and mobile-responsive design using Vue.js and Firebase.
				</p>
			</div>
		</section>
	</div>`;
}