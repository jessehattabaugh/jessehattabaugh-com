# jessehattabaugh.com

Personal website of Jesse Hattabaugh.

## Architecture

This is a [Hypermedia-Driven Application](https://htmx.org/essays/hypermedia-driven-applications/) [AWS](https://aws.amazon.com/). The infrastructure is entirely defined in CloudFormation using JSON format. The URL and certificates are managed in AWS Route53.

### Static Assets

Static assets like images, fonts, stylesheets, and client-side JavaScript are stored in `/static`, and uploaded to S3.

### Pages

Pages of this site are built by Lambda functions called by API Gateway. Each directory in `/pages` contains an `index.js` which is the main entry point for a corresponging route in API Gateway. All responses are cached in CloudFront. HTML is built using [Marko](https://markojs.com/) templates. Shared templates and modules are stored in `/lib`.

## Deployment

This website is hosted at [jessehattabaugh.com](https://jessehattabaugh.com). To manually deploy run `npm run deploy`.

### Continuous Deployment

Any changes pushed to this repository are automatically deployed using AWS EventBridge and AWS CodeBuild. Changes pushed to the `main` branch are deployed to the bare domain. Changes pushed to any other branches are automatically deployed to a subdomain that matches the branch name _example: `https://feature-branch.jessehattabaugh.com`_.

## Testing

The functionality of this site is verified in real browsers accessing real servers using Playwright.

### Continuous Integration

After each deployment, the tests are automatically run against deployed code using CodeBuild. If the tests fail, the branch is invalidated in GitHub and not allowed to merge into `main`.
