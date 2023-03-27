# jessehattabaugh-com

Personal website of Jesse Hattabaugh <https://www.jessehattabaugh.com>

## Installation

After cloning the repo run `npm install`.

## Development

To start the local development server run `npm start` then open [http://localhost:3333](http://localhost:3333) in a browser.

## Deployment

I followed [the architect instructions to deploy to AWS with CloudFront](https://arc.codes/docs/en/guides/domains/registrars/route53-and-cloudfront)

Staging: https://q4mdjvrxu0.execute-api.us-east-1.amazonaws.com
Production: https://rba5mrs9pb.execute-api.us-east-1.amazonaws.com

Staging API Gateway domain name: https://d-wkx1pw21j6.execute-api.us-east-1.amazonaws.com
Production API Gateway: https://rba5mrs9pb.execute-api.us-east-1.amazonaws.com/

DNS is on Route53

Oh, and CloudFront is serving HTTP3