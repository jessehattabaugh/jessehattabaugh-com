# jessehattabaugh.com

Personal website of Jesse Hattabaugh.

## Architecture

This is a [Hypermedia-Driven Application](https://htmx.org/essays/hypermedia-driven-applications/) hosted on [Cloudflare Pages](https://pages.cloudflare.com/). Infrastructure is zero-config — deploy by pushing to git.

### Static Assets

Static assets like images, fonts, stylesheets, and client-side JavaScript are stored in `/static` and served directly by Cloudflare Pages' CDN.

### Pages

Pages are built by Cloudflare Pages Functions invoked via `functions/[[path]].js`. Each file in `/pages` exports `get()`, `post()`, `put()`, and `del()` functions corresponding to the HTTP methods for that route. The functions entry point discovers routes statically and dispatches requests accordingly.

HTML is built using tagged template literal helpers in `/lib`.

## Setup

```bash
npm install
```

For local development with live reload:

```bash
npm run dev
```

This starts `wrangler pages dev` which serves static assets and runs Pages Functions locally.

## Deployment

The site is hosted at [jessehattabaugh.com](https://jessehattabaugh.com) via Cloudflare Pages.

### Git-integrated deploys (recommended)

Connect this repository to a Cloudflare Pages project in the dashboard:

- Set **Build output directory** to `.` (project root)
- Set **Build command** to nothing (no build step required)
- Pushes to `main` deploy to production; other branches create preview deployments

### CLI deploy

```bash
npm run deploy           # deploy to production
npm run deploy:staging   # deploy staging branch
```

Note: The deploy script automatically skips the Wrangler API upload when running
inside Cloudflare Pages Git-integrated builds (`CF_PAGES=1`). This avoids
build-time authentication failures because Git-integrated Pages deployments do
not require a secondary Wrangler upload.

## Testing

### Staging / Preview

End-to-end tests run against the Cloudflare Pages preview domain by default:

```bash
npm test
```

Override the target URL with `TEST_URL`:

```bash
TEST_URL=https://<preview-hash>.jessehattabaugh-com.pages.dev npm run test:e2e:staging
```

### Unit tests

```bash
npm run test:unit
```
