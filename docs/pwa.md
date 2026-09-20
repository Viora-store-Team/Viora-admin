# Admin PWA

The existing backend and authentication APIs are unchanged. Deploy with HTTPS
(localhost also works). The service worker registers only in production:

```sh
npm run build
npm start
```

The manifest uses `/` as its identity, scope and start URL. The top bar shows an
install button when the browser provides an installation prompt. On iPhone/iPad
it provides Safari instructions; installed standalone windows hide the button.
Icons use a burgundy V monogram; the editable source is `public/icons/source.svg`.

Only `public/offline.html` is cached. Full page navigation always uses the
network and falls back to this document when the request fails. API calls,
mutations and Next.js client navigation requests are not intercepted or cached.
An offline banner also appears in an already open app. Offline administration
and queued writes are not supported. A successful online visit is required
before the offline fallback is available.

When changing the offline document, bump the cache version in `public/sw.js`.
Activation removes only older caches with this app's prefix. No forced page
reload occurs on activation. The worker script has revalidation/no-store headers.

Production verification:

- Inspect the manifest and icons in browser application tools.
- Install in Chrome/Edge and verify standalone launch; verify Add to Home Screen
  in Safari on a real iPhone/iPad.
- After the worker activates, go offline and reload a nested route: the Arabic
  fallback should appear. Reconnect and retry to restore that same route.
- Inspect Cache Storage: only the public offline document should be present.
- Confirm login/logout and authorization with the deployed backend.
