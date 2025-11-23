import { createClient } from 'wts-core';

/**
 * Setup:
 * 1. Run: export WA_TOKEN="xxx" WA_PHONE_ID="xxx" WA_VERIFY="xxx"
 * 2. Run: bun run dev
 */
const client = createClient({
  cloudApi: {
    accessToken: process.env.WA_TOKEN || 'mock-token',
    phoneNumberId: process.env.WA_PHONE_ID || 'mock-id',
    webhookVerifyToken: process.env.WA_VERIFY || 'mock-verify',
    port: 3000
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
client.command('hello', async (ctx: any) => {
    return ctx.reply('Hello from Bun!');
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
client.on('message', (ctx: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(ctx as any).fromMe) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log(`Received: ${(ctx as any).body} from ${(ctx as any).from}`);
    }
});

console.log('Starting Bun Cloud Server on port 3000...');
// Automatically uses Bun.serve()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
client.start({} as any);
