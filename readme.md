# jessehattabaugh-com

Personal website of Jesse Hattabaugh <https://www.jessehattabaugh.com>

## Installation

After cloning this repo use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to install nodejs by running `nvm use`. Then run `npm install`.

## Tests

To run the [playwright](https://playwright.dev/docs/intro) tests run `npm test`.

To record new tests run `npm run test:codegen`.

To run the tests in the playwright ui run `npm run test:ui`.

To update the snapshots after making changes run `npm run test:update`.

## Development

To start the local development server run `npm start` then open [http://localhost:3333](http://localhost:3333) in a browser.

## Deployment

DNS for jessehattabaugh.com is Route 53.

AWS is configured according to [the architect instructions to deploy to AWS with CloudFront](https://arc.codes/docs/en/guides/domains/registrars/route53-and-cloudfront). The one change was that I enabled http3.

### Staging

To deploy staging run `npm run stage`.

-   [The public staging url](https://staging.jessehattabaugh.com)
-   [The internal AWS staging url](https://q4mdjvrxu0.execute-api.us-east-1.amazonaws.com)
-   [Staging API Gateway url](https://d-wkx1pw21j6.execute-api.us-east-1.amazonaws.com)

### Production

To deploy production run `npm run prod`.

-   [The public production url](https://jessehattabaugh.com)
-   [The internal AWS staging url](https://rba5mrs9pb.execute-api.us-east-1.amazonaws.com)
-   [Production API Gateway url](https://rba5mrs9pb.execute-api.us-east-1.amazonaws.com/)
