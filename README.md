# jessehattabaugh-com

my website

## Development

To start a local dev server with HMR: `npm run dev`

To deploy to a staging url: `npm run stage`

To format all the code with prettier: `npm run format`

To remove all build products, caches, and test screenshots: `npm run clean`

## Tests

This project uses `puppeteer` to take screenshots of the local dev server, and then `looks-same` is used to compare those to reference screenshots. Screenshots are stored in the `shots` directory. Screenshots that end in `*.ref.png` are reference screenshots and are tracked in git. Screenshots that end in `*.curr.png` represent the current state of the app. Screenshots that end in `*.diff.png` represent the differences between the reference and current screenshots, with the pixels which have changed highlighted in pink. Both the `diff` and `curr` screenshots are ignored by git.

To start the server and run the tests: `npm test`

To run the tests against an already running local server: `npm run e2e`

To accept the differences, either rename the `*.curr.png` to `*.ref.png` or delete the `*ref.png` and run `npm test` again to regenerate them.

## git hooks

This project uses `husky` to excute scripts before certain git commands. 

Before `commit` `npm run format` is run. 

Before `push` `npm run e2e`.
