# jessehattabaugh.com

Personal website of Jesse Hattabaugh.

## Architecture

This is a [Hypermedia-Driven Application](https://htmx.org/essays/hypermedia-driven-applications/)
It's pages are served from API Gateway. HTML is built using [Marko](https://markojs.com/) templates. All responses are cached in CloudFront. Static assets like images, fonts, stylesheets, and client-side JavaScript are hosted in S3.

## Deployment

This website is hosted at [jessehattabaugh.com](https://jessehattabaugh.com) using [AWS](https://aws.amazon.com/). The infrastructure is entirely defined in CloudFormation using JSON format. The URL and certificates are managed in AWS Route53.

### Continuous Deployment

Any changes pushed to this repository are automatically deployed using AWS EventBridge and AWS CodeBuild. Changes pushed to the `main` branch are deployed to the bare domain. Changes pushed to any other branches are automatically deployed to a subdomain that matches the branch name _example: `https://feature-branch.jessehattabaugh.com`_.

## Testing

The functionality of this site is verified in real browsers accessing real servers using Playwright.

### Continuous Integration

After each deployment, the tests are automatically run against deployed code using CodeBuild. If the tests fail, the branch is invalidated in GitHub and not allowed to merge into `main`.
