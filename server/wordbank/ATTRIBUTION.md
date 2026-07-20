# words.txt attribution

Sourced from the [`word-list`](https://github.com/sindresorhus/word-list) npm
package (MIT License, © Sindre Sorhus), a curated ~274k-word English word
list. Copied into this repo as a static asset (rather than depending on the
package at runtime) so the deployed serverless functions don't rely on
`node_modules` file-tracing to find it - see `server/wordbank/dictionary.ts`.

MIT License terms: permission is granted to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies, provided the copyright
notice and permission notice are retained. This file serves as that notice.
