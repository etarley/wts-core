# Deployment

`wts-core` can be deployed to various environments.

## Node.js

You can run `wts-core` as a standard Node.js application.

```bash
npm start
```

Ensure you have a process manager like `pm2` for production.

## Bun

`wts-core` is compatible with Bun.

```bash
bun run index.ts
```

## Cloudflare Workers

`wts-core` can run on Cloudflare Workers (Cloud API only).

1.  **Install Wrangler**: `npm install -g wrangler`
2.  **Create `wrangler.toml`**:

```toml
name = "my-whatsapp-bot"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[vars]
CLOUD_API_ACCESS_TOKEN = "..."
# ... other vars
```

3.  **Update Entry Point**:

Cloudflare Workers use a `fetch` handler. You need to adapt your entry point.

```typescript
import { createClient } from "wts-core";

const client = createClient({
  /* ... */
});

export default {
  async fetch(request: Request, env: any, ctx: any) {
    // Pass the request to the client's handler
    return client.handler(request);
  },
};
```

4.  **Deploy**: `wrangler deploy`
