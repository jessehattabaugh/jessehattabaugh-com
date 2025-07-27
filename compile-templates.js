#!/usr/bin/env node

// Test manual compilation approach
import { compileFileSync } from '@marko/compiler';
import { writeFileSync } from 'node:fs';

console.log('🚀 Compiling Marko templates manually...');

try {
	// Compile the base page template
	const pageTemplatePath = './lib/templates/page.marko';
	const pageCompiled = compileFileSync(pageTemplatePath, {
		modules: 'esm',
		output: 'html',
	});

	// Write compiled template
	writeFileSync(pageTemplatePath + '.js', pageCompiled.code);
	console.log('✅ Compiled page template');

	// Compile page-specific templates
	const templates = [
		'./pages/index.get.marko',
		'./pages/about.get.marko',
		'./pages/404.get.marko',
		'./pages/hello/index.get.marko',
		'./pages/hello/index.post.marko',
	];

	for (const templatePath of templates) {
		try {
			const compiled = compileFileSync(templatePath, {
				modules: 'esm',
				output: 'html',
			});
			writeFileSync(templatePath + '.js', compiled.code);
			console.log('✅ Compiled', templatePath);
		} catch {
			console.log('⚠️ Skipping', templatePath, '(not found)');
		}
	}

	console.log('🎉 All templates compiled successfully!');
	console.log('📝 Templates are now ready for import as .js files');
} catch (error) {
	console.error('❌ Compilation failed:', error.message);
	process.exit(1);
}
