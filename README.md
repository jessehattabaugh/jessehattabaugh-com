# jessehattabaugh.com

Personal website of Jesse Hattabaugh.

## Architecture

This is a [Hypermedia-Driven Application](https://htmx.org/essays/hypermedia-driven-applications/) [AWS](https://aws.amazon.com/). The infrastructure is entirely defined in CDK using JavaScript.

### Static Assets

Static assets like images, fonts, stylesheets, and client-side JavaScript are stored in `/static`, and uploaded to S3.

### Pages

Pages of this site are built by Lambda functions called by API Gateway. Each directory in `/pages` contains an `index.js` which is the main entry point for a corresponding route in API Gateway. Each `index.js` file can export `get()`, `post()`, `put()`, and `del()` functions, which will be used to respond to requests for the `GET`, `POST`, `PUT`, and `DELETE` HTTP methods.

HTML is built using [Marko](https://markojs.com/) templates. Shared templates and modules are stored in `/lib`.

## Setup

Copy the environment template and configure your certificate:

```bash
cp .env.example .env
```

Edit `.env` and replace `YOUR_CERTIFICATE_ID` with your actual certificate ID. You can find your certificate ID by running:

```bash
aws acm list-certificates --region us-east-1
```

The certificate ARN will be automatically constructed using your AWS account ID from your profile.

## Deployment

The URL and certificates are managed in AWS Route53.

### Production

This website is hosted at [jessehattabaugh.com](https://jessehattabaugh.com).

To deploy the production environment run `npm run deploy`.

All responses from the production environment are cached in CloudFront.

### Staging

The staging environment is [staging.jessehattabaugh.com](https://staging.jessehattabaugh.com)

To deploy the staging environment run `npm run deploy:staging`.

## Testing

The functionality of this site is verified in real browsers accessing real servers using Playwright.

To test the staging environment run `npm test`.
