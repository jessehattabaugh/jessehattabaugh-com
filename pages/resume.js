import { html, raw } from '../lib/html.js';

/**
 * Resume page handler with h-resume microformatting
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<div class="h-resume">
		<header>
			<h2 class="p-name">Jesse Hattabaugh</h2>
			<div class="p-contact h-card">
				<p class="p-title">Senior Frontend Engineer</p>
				<p>Portland, OR 97211</p>
				<p class="p-tel">(503) 893-9375</p>
				<p class="p-email">me@jessehattabaugh.com</p>
				<p>
					<a class="p-url u-url" href="https://jessehattabaugh.com"
						>jessehattabaugh.com</a
					>
					${raw('&middot;')}
					<a href="https://github.com/jessehattabaugh">GitHub</a>
					${raw('&middot;')}
					<a href="https://www.linkedin.com/in/jessehattabaugh/">LinkedIn</a>
				</p>
			</div>
		</header>

		<section>
			<h3>Professional Summary</h3>
			<p class="p-summary">
				Frontend engineer with 15+ years building for the web platform. Specializing in
				JavaScript-heavy applications using React, Node.js, and modern browser APIs. Strong
				track record of improving build pipelines, introducing testing culture, and
				migrating legacy codebases to modern tooling. Ships progressively enhanced,
				accessible, standards-first software.
			</p>
		</section>

		<section>
			<h3>Professional Experience</h3>

			<div class="p-experience h-event">
				<h4 class="p-name">Senior Web Developer</h4>
				<div>
					<a class="p-org" href="https://www.autofi.com/">AutoFi</a>
					<time class="dt-start" datetime="2021-08">Aug 2021</time> –
					<time class="dt-end" datetime="2023-07">Jul 2023</time>
				</div>
				<ul>
					<li>
						Built NextJS/GraphQL apps for automotive financing workflows and internal
						CRM tools used by dealership staff
					</li>
					<li>
						Established component-driven testing workflow using Storybook, Jest, and
						Cypress with full end-to-end coverage
					</li>
					<li>
						Designed and implemented K6 load-testing suite to surface performance
						regressions in downstream APIs before they reached production
					</li>
				</ul>
			</div>

			<div class="p-experience h-event">
				<h4 class="p-name">Fullstack React Developer</h4>
				<div>
					<a class="p-org" href="https://www.thekrogerco.com/">Kroger Technology</a>
					<time class="dt-start" datetime="2019-02">Feb 2019</time> –
					<time class="dt-end" datetime="2019-11">Nov 2019</time>
				</div>
				<ul>
					<li>
						Developed TypeScript/React tools for grocery delivery picking operations
						with Redux/Sagas state management
					</li>
					<li>
						Owned end-to-end testing in Cypress; collaborated with designers and product
						managers to define REST API contracts with backend teams
					</li>
					<li>
						Managed CI/CD pipelines in GitLab with Docker-based build and deploy
						workflows
					</li>
				</ul>
			</div>

			<div class="p-experience h-event">
				<h4 class="p-name">Lead Frontend Developer</h4>
				<div>
					<a class="p-org" href="https://www.chegg.com/flashcards"
						>StudyBlue (acq. Chegg)</a
					>
					<time class="dt-start" datetime="2016-11">Nov 2016</time> –
					<time class="dt-end" datetime="2017-12">Dec 2017</time>
				</div>
				<ul>
					<li>
						Overhauled build pipeline from legacy tooling to Webpack, cutting bundle
						size and improving page load times
					</li>
					<li>
						Introduced the first React component into a Backbone codebase, establishing
						the migration path for the frontend
					</li>
					<li>
						Mentored junior developers through code reviews; led technical interviews
						and evaluated code challenges
					</li>
				</ul>
			</div>

			<div class="p-experience h-event">
				<h4 class="p-name">Senior Frontend Developer</h4>
				<div>
					<a class="p-org" href="https://www.planet.com/">Planet Labs</a>
					<time class="dt-start" datetime="2015-08">Aug 2015</time> –
					<time class="dt-end" datetime="2016-09">Sep 2016</time>
				</div>
				<ul>
					<li>
						Built web UIs for satellite imagery applications using React and OpenLayers
						for consumer-facing mapping tools
					</li>
					<li>
						Maintained public API documentation and published updates to internal NPM
						packages
					</li>
					<li>Developed custom build scripts and tooling for the frontend team</li>
				</ul>
			</div>

			<div class="p-experience h-event">
				<h4 class="p-name">Frontend Developer</h4>
				<div>
					<a class="p-org" href="https://www.linkedin.com/company/eveo/">Eveo</a>
					<time class="dt-start" datetime="2012-08">Aug 2012</time> –
					<time class="dt-end" datetime="2015-06">Jun 2015</time>
				</div>
				<ul>
					<li>
						Led a team building interactive presentations and mobile apps for
						pharmaceutical clients
					</li>
					<li>
						Set up Gulp/Browserify build workflows and enforced unit testing with Mocha
						across the team
					</li>
				</ul>
			</div>

			<div class="p-experience h-event earlier-roles">
				<h4>Earlier Roles</h4>
				<div>
					<time class="dt-start" datetime="2008-09">2008</time> –
					<time class="dt-end" datetime="2010-11">2010</time>
				</div>
				<p>
					<em>Ruby on Rails Developer</em> at CubeTree ${raw('&middot;')}
					<em>Full Stack Developer</em> at CBS Interactive (TV.com)
				</p>
			</div>
		</section>

		<section>
			<h3>Technical Skills</h3>

			<div>
				<h4>Core</h4>
				<ul class="skills-list">
					<li class="p-skill">JavaScript (ES2024+)</li>
					<li class="p-skill">TypeScript</li>
					<li class="p-skill">HTML</li>
					<li class="p-skill">CSS</li>
					<li class="p-skill">React</li>
					<li class="p-skill">Node.js</li>
				</ul>
			</div>

			<div>
				<h4>Architecture</h4>
				<ul class="skills-list">
					<li class="p-skill">NextJS</li>
					<li class="p-skill">GraphQL</li>
					<li class="p-skill">REST APIs</li>
					<li class="p-skill">Express</li>
					<li class="p-skill">Serverless (AWS Lambda)</li>
				</ul>
			</div>

			<div>
				<h4>Platform</h4>
				<ul class="skills-list">
					<li class="p-skill">Web Components</li>
					<li class="p-skill">Progressive Web Apps</li>
					<li class="p-skill">Accessibility (WCAG)</li>
					<li class="p-skill">Performance Profiling</li>
				</ul>
			</div>

			<div>
				<h4>Testing</h4>
				<ul class="skills-list">
					<li class="p-skill">Playwright</li>
					<li class="p-skill">Cypress</li>
					<li class="p-skill">Jest</li>
					<li class="p-skill">K6</li>
					<li class="p-skill">Storybook</li>
					<li class="p-skill">Testing Library</li>
				</ul>
			</div>

			<div>
				<h4>Infrastructure</h4>
				<ul class="skills-list">
					<li class="p-skill">AWS (S3, CloudFront, DynamoDB, Route 53)</li>
					<li class="p-skill">Docker</li>
					<li class="p-skill">CI/CD</li>
					<li class="p-skill">Git</li>
				</ul>
			</div>

			<div>
				<h4>Data</h4>
				<ul class="skills-list">
					<li class="p-skill">PostgreSQL</li>
					<li class="p-skill">MongoDB</li>
					<li class="p-skill">Redis</li>
				</ul>
			</div>
		</section>
	</div>`;
}
