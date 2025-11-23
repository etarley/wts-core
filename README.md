# wts-core

**wts-core** is a powerful, type-safe, and modular TypeScript library for building WhatsApp bots and applications. It provides a unified API that works seamlessly with both the **WhatsApp Cloud API** and **Baileys** (WebSocket), allowing you to write your code once and deploy it anywhere.

## Key Features

- **Unified API**: Switch between Cloud API and Baileys without changing your business logic.
- **Type-Safe**: Built with TypeScript for robust type checking and autocompletion.
- **Modular Architecture**: Plugin-based system for easy extensibility.
- **Modern Features**: Support for WhatsApp Flows, Commerce, Interactive Messages, and more.
- **Cross-Platform**: Runs on Node.js, Bun, and Cloudflare Workers.
- **Developer Experience**: Built-in helpers for common tasks, middleware support, and a powerful router.

## Quick Start

### Installation

```bash
npm install wts-core
# or
bun add wts-core
```

### Basic Usage

Here's a simple echo bot example:

```typescript
import { createClient, Env } from "wts-core";

// 1. Create the client
const client = createClient<Env>({
  // For Cloud API
  cloudApi: {
    accessToken: process.env.CLOUD_API_ACCESS_TOKEN!,
    phoneNumberId: process.env.CLOUD_API_PHONE_NUMBER_ID!,
    webhookVerifyToken: process.env.CLOUD_API_VERIFY_TOKEN!, // Make sure this matches Meta's console
  },
  // Or for Baileys
  // auth: { ... }
});

// 2. Add event listeners
client.on("message", async (ctx) => {
  if (ctx.content.text?.body) {
    await ctx.reply(`You said: ${ctx.content.text.body}`);
  }
});

// 3. Start the client
// This will start the server and handle the webhook verification automatically.
// You will see "✅ Webhook verified successfully!" in the console when Meta verifies your token.
client.start({ port: 3000 });
```

### Webhook Verification

When using the Cloud API, you need to configure the **Callback URL** and **Verify Token** in the [Meta App Dashboard](https://developers.facebook.com/apps/).

1. Set your **Callback URL** to `https://your-domain.com/webhook`.
2. Set your **Verify Token** to the same string you passed to `webhookVerifyToken` in your config.
3. Click **Verify and Save**.
4. `wts-core` will automatically handle the verification request.
   - If successful, you'll see: `✅ Webhook verified successfully!`
   - If failed, you'll see: `❌ Webhook verification failed! Token mismatch.`

## Documentation

For detailed documentation, please visit the [docs](./docs) folder:

- [**Introduction**](./docs/intro/getting-started.md): Installation and setup.
- [**Guides**](./docs/guides/adapters.md): In-depth guides on Adapters, Plugins, and more.
- [**API Reference**](./docs/reference/client.md): Detailed API documentation.
- [**Examples**](./docs/examples/basic-bot.md): Ready-to-run examples.

## License

MIT
