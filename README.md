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
    verifyToken: process.env.CLOUD_API_VERIFY_TOKEN!,
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
client.start({ port: 3000 });
```

## Documentation

For detailed documentation, please visit the [docs](./docs) folder:

- [**Introduction**](./docs/intro/getting-started.md): Installation and setup.
- [**Guides**](./docs/guides/adapters.md): In-depth guides on Adapters, Plugins, and more.
- [**API Reference**](./docs/reference/client.md): Detailed API documentation.
- [**Examples**](./docs/examples/basic-bot.md): Ready-to-run examples.

## License

MIT
