import { createClient } from './src/index';
import { Context } from './src/core/Context';
import { Media } from './src/core/Media';

const client = createClient({
    printQR: true,
    authStrategy: './auth_info'
});

// 1. Middleware Example
client.use(async (ctx, next) => {
    console.log(`[Middleware] Incoming message from ${ctx.sender}`);
    // Example: Ignore messages from self (though Baileys usually handles this, good for logic)
    if (ctx.sender === client.user.id) return;
    await next();
});

client.on('message', async (ctx: Context) => {
    console.log(`New message from ${ctx.sender} (Name: ${ctx.pushName}) [${ctx.fromMe ? 'OUTGOING' : 'INCOMING'}]`);
    const body = ctx.body.toLowerCase();

    // 2. Basic Reply & React
    if (body === 'ping') {
        await ctx.reply('Pong! 🏓');
        await ctx.react('⚡');
    }

    // 3. Media Download
    if (body === 'media') {
        const buffer = await ctx.download();
        if (buffer) {
            await ctx.reply(`Received media of size: ${buffer.length} bytes`);
        } else {
            await ctx.reply('No media found in this message.');
        }
    }

    // 4. Quoted Message
    if (body === 'quoted') {
        if (ctx.quoted) {
            await ctx.reply(`You replied to: ${ctx.quoted.body}`);
        } else {
            await ctx.reply('Please reply to a message with "quoted"');
        }
    }

    // 5. Polls
    if (body === 'poll') {
        await ctx.sendPoll('Pizza or Burger?', ['Pizza', 'Burger']);
    }

    // 6. Media Utility
    if (body === 'image') {
        // Echo back an image (assuming one exists locally for test, or use URL)
        // await ctx.reply(await Media.fromFile('./test.png'));
        await ctx.reply(await Media.fromUrl('https://images.unsplash.com/photo-1761839256545-4268b03606c0?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'));
    }

    // 7. Resources
    if (body === 'me') {
        const me = await client.user.getMe();
        await ctx.reply(`My JID: ${me?.id}\nMy Name: ${me?.name}`);
    }

    if (body === 'group' && ctx.isGroup) {
        const code = await client.group.inviteCode(ctx.from);
        if (code) {
            await ctx.reply(`Group Invite Code: ${code}`);
        } else {
            await ctx.reply('Unable to get invite code. You must be a group admin.');
        }
    }

    // 8. Framework Parity Features
    if (body === 'forward') {
        // Forward the current message to self
        await ctx.forward(client.user.id);
        await ctx.reply('Message forwarded to self');
    }

    if (body === 'location') {
        await ctx.sendLocation(37.7749, -122.4194);
    }

    if (body === 'mentions') {
        await ctx.replyWithMentions(`Hello @${ctx.sender.split('@')[0]}`, [ctx.sender]);
    }

    if (body === 'ephemeral') {
        await client.chat.toggleEphemeral(ctx.from, 604800);
        await ctx.reply('Disappearing messages enabled for 7 days');
    }

    if (body === 'presence') {
        await ctx.typing();
        await new Promise(r => setTimeout(r, 2000));
        await ctx.recording();
        await new Promise(r => setTimeout(r, 2000));
        await ctx.reply('Done simulating presence');
    }

    if (body === 'create_group') {
        const group = await client.group.create('Test Group', [ctx.sender]);
        await ctx.reply(`Created group: ${group.id}`);
    }
});

// 9. Group Events
client.on('group-participants', (event) => {
    console.log(`[Group Event] ${event.action} in ${event.group}: ${event.participants.join(', ')}`);
});

client.on('ready', () => {
    console.log('Client is fully ready!');
});

client.connect();