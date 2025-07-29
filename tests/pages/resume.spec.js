import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('Resume Page', () => {
	test('should load the resume page successfully', async ({ page }) => {
		await page.goto(`${baseURL}/resume`);

		// Check that the page loads
		await expect(page).toHaveTitle(/Jesse Hattabaugh/);

		// Check for h-resume microformat container
		await expect(page.locator('.h-resume')).toBeVisible();

		// Check for main heading with p-name microformat
		await expect(page.locator('.p-name')).toContainText('Jesse Hattabaugh');

		// Check for contact information with h-card microformat
		await expect(page.locator('.p-contact.h-card')).toBeVisible();
		await expect(page.locator('.p-title')).toContainText('Software Developer');
		await expect(page.locator('.p-email')).toContainText('jesse@jessehattabaugh.com');
		await expect(page.locator('.p-url')).toContainText('https://jessehattabaugh.com');

		// Check for professional summary with p-summary microformat
		await expect(page.locator('.p-summary')).toContainText('Passionate software developer');
		await expect(page.locator('.p-summary')).toContainText('cloud-based solutions');

		// Check for navigation including resume link
		await expect(page.locator('nav a[href="/"]')).toBeVisible();
		await expect(page.locator('nav a[href="/hello"]')).toBeVisible();
		await expect(page.locator('nav a[href="/about"]')).toBeVisible();
		await expect(page.locator('nav a[href="/resume"]')).toBeVisible();
	});

	test('should display work experience with proper microformats', async ({ page }) => {
		await page.goto(`${baseURL}/resume`);

		// Check for experience section
		await expect(page.locator('h3')).toContainText('Professional Experience');

		// Check for experience entries with p-experience and h-event microformats
		const experienceEntries = page.locator('.p-experience.h-event');
		await expect(experienceEntries).toHaveCount(3);

		// Check first experience entry
		const firstExperience = experienceEntries.first();
		await expect(firstExperience.locator('.p-name')).toContainText('Senior Software Developer');
		await expect(firstExperience.locator('.p-org')).toContainText('Tech Solutions Inc.');
		await expect(firstExperience.locator('.dt-start')).toBeVisible();
		await expect(firstExperience.locator('.dt-end')).toBeVisible();

		// Check that experience duties are listed
		await expect(firstExperience.locator('.experience-duties li')).toContainText('Lead development');
		await expect(firstExperience.locator('.experience-duties li')).toContainText('serverless architectures');
	});

	test('should display education with proper microformats', async ({ page }) => {
		await page.goto(`${baseURL}/resume`);

		// Check for education section
		await expect(page.locator('h3')).toContainText('Education');

		// Check for education entry with p-education and h-event microformats
		const educationEntry = page.locator('.p-education.h-event');
		await expect(educationEntry).toBeVisible();
		await expect(educationEntry.locator('.p-name')).toContainText('Bachelor of Science in Computer Science');
		await expect(educationEntry.locator('.p-org')).toContainText('State University');
		await expect(educationEntry.locator('.dt-start')).toBeVisible();
		await expect(educationEntry.locator('.dt-end')).toBeVisible();
	});

	test('should display technical skills with p-skill microformats', async ({ page }) => {
		await page.goto(`${baseURL}/resume`);

		// Check for skills section
		await expect(page.locator('h3')).toContainText('Technical Skills');

		// Check for skills categories
		await expect(page.locator('h4')).toContainText('Frontend Development');
		await expect(page.locator('h4')).toContainText('Backend Development');
		await expect(page.locator('h4')).toContainText('Cloud & DevOps');

		// Check for specific skills with p-skill microformat
		await expect(page.locator('.p-skill')).toContainText('JavaScript/TypeScript');
		await expect(page.locator('.p-skill')).toContainText('React');
		await expect(page.locator('.p-skill')).toContainText('Node.js');
		await expect(page.locator('.p-skill')).toContainText('AWS');

		// Check that skills are displayed as styled tags
		const skillTags = page.locator('.p-skill');
		await expect(skillTags.first()).toHaveCSS('background-color', 'rgb(52, 152, 219)');
		await expect(skillTags.first()).toHaveCSS('color', 'rgb(255, 255, 255)');
	});

	test('should display notable projects section', async ({ page }) => {
		await page.goto(`${baseURL}/resume`);

		// Check for projects section
		await expect(page.locator('h3')).toContainText('Notable Projects');

		// Check for project entries
		const projects = page.locator('.project');
		await expect(projects).toHaveCount(3);

		// Check first project
		await expect(projects.first().locator('h4')).toContainText('Personal Website & Portfolio');
		await expect(projects.first().locator('p')).toContainText('serverless website using AWS CDK');
	});

	test('should navigate to other pages from resume page', async ({ page }) => {
		await page.goto(`${baseURL}/resume`);

		// Test navigation to home
		await page.click('nav a[href="/"]');
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.locator('h2')).toContainText('Welcome to my personal website!');

		// Go back to resume
		await page.goto(`${baseURL}/resume`);

		// Test navigation to about
		await page.click('nav a[href="/about"]');
		await expect(page).toHaveURL(`${baseURL}/about`);
		await expect(page.locator('h2')).toContainText('About Jesse');

		// Go back to resume
		await page.goto(`${baseURL}/resume`);

		// Test navigation to hello
		await page.click('nav a[href="/hello"]');
		await expect(page).toHaveURL(`${baseURL}/hello`);
	});

	test('should be responsive on mobile devices', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto(`${baseURL}/resume`);

		// Check that the page is still functional on mobile
		await expect(page.locator('.h-resume')).toBeVisible();
		await expect(page.locator('.p-name')).toContainText('Jesse Hattabaugh');

		// Check that navigation is still accessible
		await expect(page.locator('nav a[href="/resume"]')).toBeVisible();

		// Check that skills are properly wrapped on mobile
		await expect(page.locator('.skills-list')).toBeVisible();
		await expect(page.locator('.p-skill')).toBeVisible();
	});
});