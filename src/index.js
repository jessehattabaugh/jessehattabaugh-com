const marko = require('marko');
const helloTemplate = require('./templates/hello.marko');

exports.handler = async (event) => {
    const html = await helloTemplate.render({});
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString(),
    };
};
