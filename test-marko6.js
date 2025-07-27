#!/usr/bin/env node

// Test compiled Marko 6 templates
async function testMarko6() {
	try {
		console.log('🚀 Testing compiled Marko 6 templates...');

		// Import and test the base page template (compiled)
		const pageTemplate = await import('./lib/templates/page.marko.js');
		console.log('✅ Successfully imported page template');

		// Test rendering with sample data
		const result = await pageTemplate.default.render({
			title: 'Marko 6 Test',
			content: '<p>This is a test of Marko 6 template rendering!</p>',
		});

		console.log('✅ Template rendered successfully');
		console.log('📄 Output length:', result.toString().length, 'characters');
		console.log('🎉 Marko 6 upgrade successful!');

		return true;
	} catch (error) {
		console.error('❌ Marko 6 test failed:', error.message);
		console.error('🔍 Error details:', error);
		return false;
	}
}

try {
	const success = await testMarko6();
	process.exit(success ? 0 : 1);
} catch (error) {
	console.error('❌ Script failed:', error);
	process.exit(1);
}
