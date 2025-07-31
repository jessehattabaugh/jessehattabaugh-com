# Instructions for ChatGPT Codex

## Project Overview

This is [the website of Jesse Hattabaugh](https://jessehattabaugh.com). It is hosted on AWS using CDK for Infrastructure as Code. It serves as a personal biography, contact information, resume, and portfolio of previous work, and current hobbies and interests. It is built using Modern Web APIs and cutting edge browser APIs. It uses only HTML, CSS, and JavaScript with minimal dependencies.

Also see @README.md

## Directory map

- `/infrastructure` – AWS CDK JavaScript, stacks, aspects, and constructs.
- `/lib` – JavaScript modules that are shared between pages
- `/pages` – Each module in this directory exports functions for handling HTTP requests from AWS API Gateway. Directories represent sub paths from the root of the site, and `index.js` files handle the bare path.
- `/static` – Static assets which get uploaded to S3 and served at `/static`
- `/tests` – End-to-end Playwright browser tests, and Node Test Runner Unit tests.

## Dev & Staging

- Fix Lint Errors: `npm run lint:fix`
- Unit tests: `npm run test:unit`
- Staging build: `npm run build:staging`
- Staging deploy: `npm run deploy:staging`
- End-to-end Staging Tests: `npm run test:e2e:staging`

## Production

- Production build: `npm run build`
- Production deploy: `npm run deploy`

## Coding Guidelines

- General: @.github/copilot-instructions.md
- JavaScript: @.github/instructions/codeGeneration.instructions.md
- End-to-end tests: @.github/instructions/e2eTestGeneration.instructions.md
- Unit tests: @.github/instructions/unitTestGeneration.instructions.md
- Infrastructure: @.github/instructions/infrastructureGeneration.instructions.md
- Styles: @.github/instructions/styleGeneration.instructions.md
- Markup: @.github/instructions/markupGeneration.instructions.md
- Code Review: @.github/instructions/reviewSelection.instructions.md
- Commit Messages: @.github/instructions/commitMessageGeneration.instructions.md

## Security

- Secrets live in `.env`; don’t commit or echo them

## PR checklist

1. No lint errors
2. Unit tests pass locally
3. Staging deploys successfully
4. E2E tests against staging pass
