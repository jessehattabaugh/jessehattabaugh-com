import mainTemplate from '../../lib/templates/page.marko';

export async function handler(event) {
    const html = await mainTemplate.render({
        title: 'Hello Page',
        content: 'Welcome to the Hello page!',
    });
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: html.toString(),
    };
}
