import { createClient } from './src/index';

const client = createClient({
    printQR: true,
    authStrategy: './auth_info',
});

client.on('message', async (ctx) => {
    console.log(`New message from ${ctx.sender} (Name: ${ctx.pushName})`);

    if (ctx.body.toLowerCase() === 'ping') {
        // 1. Reply (Text shortcut)
        const response = await ctx.reply('Pong! 🏓');

        // 2. React (Using strict types)
        // We know ctx.raw.key is valid, but TS reminds us it *could* be null on some system messages
        if (ctx.raw.key) {
            await client.chat.react(ctx.from, ctx.raw.key, '⚡');
        }
        
        // 3. Example of strictly typed Delete (if we wanted to delete our own response)
        // if (response?.key) {
        //    await client.chat.delete(ctx.from, response.key);
        // }
    }

    if (ctx.body.toLowerCase() === 'read') {
        await ctx.read();
        await ctx.reply('Marked as read! 👀');
    }
});

client.connect();