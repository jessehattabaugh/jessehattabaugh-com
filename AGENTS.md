# Instructions for ChatGPT Codex

## Project Overview

This is [the website of Jesse Hattabaugh](https://jessehattabaugh.com). It is hosted on Netlify. It serves as a personal biography, contact information, resume, and portfolio of previous work, and current hobbies and interests. It is built using Modern Web APIs and cutting edge browser APIs. It uses only HTML, CSS, and JavaScript with minimal dependencies.

Also see @README.md

## Directory map

- `/functions` – Netlify Functions. `app.js` is the catch-all entry point that dispatches to page modules.
- `/lib` – JavaScript modules that are shared between pages
- `/pages` – Each module exports functions for handling HTTP requests. Directories represent sub paths from the root of the site, and `index.js` files handle the bare path.
- `/static` – Static assets served directly by Netlify CDN at `/static`
- `/tests` – End-to-end Playwright browser tests, and Node Test Runner Unit tests.

## Dev & Staging

- Local dev server: `npm run dev`
- Fix Lint Errors: `npm run lint:fix`
- Unit tests: `npm run test:unit`
- Staging deploy: `npm run deploy:staging`
- End-to-end Staging Tests: `npm run test:e2e:staging`

## Production

- Production deploy: git push to `main` (recommended) or `npm run deploy` for manual CLI deployment

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
