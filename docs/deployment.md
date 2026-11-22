# Deploy either app

Both apps produce ordinary static files. Build from the repository root:

```sh
npm ci
npm run build
```

| App | Publish directory |
| :--- | :--- |
| Astra | `apps/astra/dist` |
| Sol | `apps/sol/dist` |

Publish each directory independently on an HTTPS static host. Use a clean target rather than importing someone else’s hosting configuration. No environment variable or map API key is required. An account-specific CLI setup is intentionally not included.

Serve JavaScript as JavaScript and JSON as JSON. Astra uses JSON module imports; a current browser is required. Both builds use relative asset paths and can be hosted under a subdirectory. Test the actual deployed URL rather than only the development copy.

Check that all map JSON, vendor modules and license notices are present. Open each app, walk, orbit, stomp, reset, release movement keys, change tabs and refresh. A successful upload alone is not a playable result. Preserve the OpenStreetMap credit and the downloadable map database/license links. The local Node server is a development helper, not a production service.

## Publication changes

The public applications are copies of the completed benchmark outputs. Personal branding was replaced with build labels. Build scripts now work from a clean workspace install, and browser scripts discover their executable portably. Source OSM editor/contact metadata was removed without changing geometry. Hosting account links and project IDs were excluded. Sol’s Vite build dependency was patched from the measured 7.2.2 to 7.3.8 after the dependency audit. This maintenance change is documented separately from the benchmark.

These changes do not rewrite the recorded measurements. New gameplay work should be treated as a later revision.
