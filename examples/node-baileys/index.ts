import { createClient } from 'wts-core';

// 1. Create the client (Defaults to Baileys Adapter)
const client = createClient({
  printQR: true,
  authStrategy: './auth_info', // Folder for session files
});

// 2. Add commands
client.command('ping', async (ctx) => {
  console.log(`Ping received from ${ctx.pushName}`);
  await ctx.reply('Pong! 🏓');
  await ctx.react('✅');
});

// 3. Add event listeners
client.on('message', (ctx) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(ctx as any).fromMe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log(`Received: ${(ctx as any).body} from ${(ctx as any).from}`);
  }
});

// 4. Start
console.log('Starting Node.js Client...');
client.start();
