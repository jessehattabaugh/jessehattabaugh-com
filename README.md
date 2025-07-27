# jessehattabaugh.com

Personal website of Jesse Hattabaugh.

## Architecture

This is a [Hypermedia-Driven Application](https://htmx.org/essays/hypermedia-driven-applications/) [AWS](https://aws.amazon.com/). The infrastructure is entirely defined in CDK using JavaScript.

### Static Assets

Static assets like images, fonts, stylesheets, and client-side JavaScript are stored in `/static`, and uploaded to S3.

### Pages

Pages of this site are built by Lambda functions called by API Gateway. Each directory in `/pages` contains an `index.js` which is the main entry point for a corresponging route in API Gateway. All responses are cached in CloudFront. HTML is built using [Marko](https://markojs.com/) templates. Shared templates and modules are stored in `/lib`.

## Deployment

The URL and certificates are managed in AWS Route53.

### Production

This website is hosted at [jessehattabaugh.com](https://jessehattabaugh.com).

To deploy the production environment run `npm run deploy`.

### Staging

The staging environment is [staging.jessehattabaugh.com](https://staging.jessehattabaugh.com)

To deploy the staging environment run `npm run deploy:staging`.

## Testing

The functionality of this site is verified in real browsers accessing real servers using Playwright.

To test the staging environment run `npm test`.
