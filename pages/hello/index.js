const marko = require('marko');

import mainTemplate from '../../lib/templates/page.marko';

exports.handler = async (event) => {
    const html = await mainTemplate.render({});
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString(),
    };
};
