# Deploying to Cloudflare Workers

`wts-core` is designed to be serverless-ready and works seamlessly on Cloudflare Workers.

> **Important**
>
> Cloudflare Workers support in `wts-core` targets the **WhatsApp Cloud API** (`CloudAdapter`) only.
> The **Baileys/Socket adapter** is not supported in Cloudflare Workers.

## Prerequisites

- A Cloudflare account
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- A WhatsApp Business Cloud API account

## Edge Compatibility & Optimizations

`wts-core` is optimized for Edge environments:

1.  **Tree-Shaking**: The library is marked as `sideEffects: false` to ensure unused code is removed from your bundle.
2.  **Optional Dependencies**: Heavy media processing libraries like `sharp` and `fluent-ffmpeg` are lazy-loaded. They are **not required** for Cloudflare Workers unless you explicitly call methods that need them (like `replySticker` with image processing).
    *   **Note**: Cloudflare Workers do not support Native Node.js modules like `sharp`. If you need sticker generation, consider using an external API or a separate microservice.
3.  **Polyfills**: The library handles necessary polyfills for `node:crypto` and others automatically in `nodejs_compat` mode.

## Setup

1. **Create a new Worker project**:

```bash
npm create cloudflare@latest my-whatsapp-bot
cd my-whatsapp-bot
```

2. **Install `wts-core`**:

```bash
npm install wts-core
```

3. **Configure `wrangler.toml`**:

Add the `nodejs_compat` compatibility flag and your environment variables to `wrangler.toml`.

```toml
compatibility_date = "2025-11-21"
compatibility_flags = ["nodejs_compat"]

[vars]
# Public variables
VERIFY_TOKEN = "my-verify-token"

# Secrets (do not commit these)
# ACCESS_TOKEN = "..."
# APP_SECRET = "..."
# PHONE_NUMBER_ID = "..."
```

## Implementation

Create your `src/index.ts` file:

```typescript
import { createClient } from "wts-core";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    // 1. Initialize Client with Cloud API Config
    const client = createClient({
      cloudApi: {
        accessToken: env.ACCESS_TOKEN,
        phoneNumberId: env.PHONE_NUMBER_ID,
        webhookVerifyToken: env.VERIFY_TOKEN,
        appSecret: env.APP_SECRET,
      },
    });

    // 2. Define Logic
    client.on("message", async (c) => {
      if (c.body === "ping") {
        await c.reply("pong from worker!");
      }
    });

    // 3. Handle Request
    // The adapter is accessible via client.adapter
    return client.adapter.handleWebhook(request, env, ctx);
  },
};
```

## Storage

For persistent storage on Cloudflare Workers, you have a few options:

### 1. LibSQL (Turso)

Use the `LibSQLAdapter` with a remote Turso database.

```bash
npm install @libsql/client
```

```typescript
import { createClient, LibSQLAdapter } from "wts-core";
import { createClient as createDbClient } from "@libsql/client/web";

// ... inside fetch ...
const db = createDbClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const client = createClient({
  cloudApi: {
    accessToken: env.ACCESS_TOKEN,
    phoneNumberId: env.PHONE_NUMBER_ID,
    webhookVerifyToken: env.VERIFY_TOKEN,
  },
  store: new LibSQLAdapter(db),
});
```

### 2. Cloudflare D1 (Coming Soon)

We are working on a native D1 adapter. For now, you can implement the `StorageAdapter` interface using D1.

## Deployment

Deploy your worker:

```bash
npx wrangler deploy
```

Set your Webhook URL in the WhatsApp Business Dashboard to your worker's URL (e.g., `https://my-whatsapp-bot.my-subdomain.workers.dev`).
