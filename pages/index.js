const marko = require('marko');
const helloTemplate = require('../lib/templates/page.marko');

exports.handler = async (event) => {
    const html = await helloTemplate.render({
		title: 'Jesse Hattabaugh',
		content: 'Welcome to my personal website!',
	});
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString(),
    };
};
