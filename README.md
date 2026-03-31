# jessehattabaugh.com

Personal website of Jesse Hattabaugh.

## Architecture

This is a [Hypermedia-Driven Application](https://htmx.org/essays/hypermedia-driven-applications/) hosted on [Netlify](https://www.netlify.com/). Infrastructure is zero-config — deploy by pushing to git.

### Static Assets

Static assets like images, fonts, stylesheets, and client-side JavaScript are stored in `/static` and served directly by Netlify's CDN.

### Google Photos Sync

Public shared Google Photos albums are configured in `config/photos.albums.json`.

Generate or refresh local backups and responsive derivatives:

```bash
npm run photos:sync
```

Dry run without writing files:

```bash
npm run photos:sync:dry-run
```

Generated metadata lives under `/static/data/photos`, original backups under `/static/photos/originals`, and responsive derivatives under `/static/photos/derivatives`.

### Pages

Pages are built by a Netlify Function invoked via `functions/app.js`. Each file in `/pages` exports `get()`, `post()`, `put()`, and `del()` functions corresponding to the HTTP methods for that route. The function entry point discovers routes statically and dispatches requests accordingly.

HTML is built using tagged template literal helpers in `/lib`.

## Setup

```bash
npm install
```

For local development with live reload:

```bash
npm run dev
```

This starts `netlify dev` which serves static assets and runs Functions locally.

## Deployment

The site is hosted at [jessehattabaugh.com](https://jessehattabaugh.com) via Netlify.

### Git-integrated deploys (recommended)

Connect this repository to a Netlify site in the dashboard:

- Set **Publish directory** to `.` (project root)
- Set **Build command** to nothing (no build step required)
- Pushes to `main` deploy to production; other branches create deploy previews

### CLI deploy (optional)

```bash
npm run deploy           # deploy to production (requires NETLIFY_AUTH_TOKEN)
npm run deploy:staging   # deploy preview with staging alias (requires NETLIFY_AUTH_TOKEN)
```

Note: Git-integrated deployments via git push to `main` are recommended and
require no additional setup. CLI deploys are optional for manual deployments
outside of git workflows and require the `NETLIFY_AUTH_TOKEN` environment variable.

## Testing

### Staging / Preview

End-to-end tests run against the URL provided in `TEST_URL`.

```bash
npm test
```

Set the target URL to the Netlify deploy preview URL before running staging e2e tests:

```bash
TEST_URL=https://<deploy-preview-url>.netlify.app npm run test:e2e:staging
```
