/** @jsx h */
/** @jsxFrag Fragment */
import { createClient, chat, user, Context, Media, } from 'wts-core';

// Set to true if you want to test by sending messages to yourself
const ALLOW_SELF_MESSAGES = true;

// 1. Create the client
console.log(
    "WTS_CLOUD_API_ACCESS_TOKEN",process.env.WTS_CLOUD_API_ACCESS_TOKEN,
    "WTS_CLOUD_API_PHONE_NUMBER_ID",process.env.WTS_CLOUD_API_PHONE_NUMBER_ID,
    "WTS_CLOUD_API_WEBHOOK_VERIFY_TOKEN",process.env.WTS_CLOUD_API_WEBHOOK_VERIFY_TOKEN
)

const client = createClient({
  cloudApi: {
    accessToken: process.env.WTS_CLOUD_API_ACCESS_TOKEN!,
    phoneNumberId: process.env.WTS_CLOUD_API_PHONE_NUMBER_ID!,
    webhookVerifyToken: process.env.WTS_CLOUD_API_WEBHOOK_VERIFY_TOKEN!,
  },
  plugins: [chat(), user()]
});

client.useBot({
    shouldTrigger(ctx: Context) {
        return ctx.body.toLowerCase() === 'hello' ? true : false;
    },
    handle(ctx: Context): Promise<void> {
        return ctx.reply('Hello!').then(() => {
            return;
        });
    }
});

// 1. Middleware Example
client.use(async (ctx: Context, next) => {
    try {
        const msgId = ctx.raw.key?.id || 'unknown';
        console.log(`[Middleware] Incoming message ID: ${msgId} from ${ctx.sender}`);
        console.log(`[Middleware] Message body: "${ctx.body}" | fromMe: ${ctx.fromMe}`);
        
        // Example: Ignore messages from self (unless testing)
        // Note: Using ctx.fromMe is more reliable than comparing sender IDs
        if (ctx.fromMe && !ALLOW_SELF_MESSAGES) {
            console.log(`[Middleware] Skipping message from self`);
            return;
        }
        
        console.log(`[Middleware] Calling next() - message will be processed`);
        await next();
        console.log(`[Middleware] next() completed successfully`);
    } catch (error) {
        console.error(`[Middleware] ERROR:`, error);
        throw error;
    }
});

client.on('message', async (context: unknown) => {
    const ctx = context as Context;
    console.log(`New message from ${ctx.sender} (Name: ${ctx.pushName}) [${ctx.fromMe ? 'OUTGOING' : 'INCOMING'}]`);
    console.log(`Type: ${ctx.type}`);
    const body = ctx.body.toLowerCase();

    // 2. Basic Reply & React
    if (body === 'ping') {
        await ctx.reply('Pong! 🏓');
        await ctx.react('⚡');
    }

    // 3. Media Download
    if (body === 'media') {
        try {
            const buffer = await ctx.download();
            if (!buffer) {
                await ctx.reply('Failed to download media');
                return;
            }
            await ctx.reply(`Received media of size: ${buffer.length} bytes`);
        } catch (error) {
            console.error('Download failed:', error);
            await ctx.reply('Failed to download media');
        }
    }

    //not working
    // 4. Quoted Message
    if (body === 'quoted') {
        try {
            const quoted = await ctx.fetchQuoted();
            console.log('Quoted message:', quoted?.content, quoted?.body, quoted?.sender);
            if (quoted) {
                await ctx.reply(`You replied to: ${quoted.body}`);
            } else {
                await ctx.reply('Please reply to a message with "quoted"');
            }
        } catch (error) {
            console.error('Fetch quoted failed:', error);
            await ctx.reply('Failed to fetch quoted message');
        }
    }

    //not working
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

    // not available without an official business account (OBA) - requires WhatsApp Business API access
    if (body === 'group' && ctx.isGroup()) {
        const code = await client.groups.inviteCode(ctx.from);
        if (code) {
            await ctx.reply(`Group Invite Code: ${code}`);
        } else {
            await ctx.reply('Unable to get invite code. You must be a group admin.');
        }
    }

    // 8. Framework Parity Features
    if (body === 'forward') {
        if (ctx.isForwarded) return; // Prevent infinite loop when testing with self-messages
        
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

    //not working in the cloud
    if (body === 'ephemeral') {
        await client.chat.toggleEphemeral(ctx.from, 604800);
        await ctx.reply('Disappearing messages enabled for 7 days');
    }

    //the methods are not available in the cloud API
    if (body === 'presence') {
        await ctx.typing();
        await new Promise(r => setTimeout(r, 2000));
        await ctx.recording();
        await new Promise(r => setTimeout(r, 2000));
        await ctx.reply('Done simulating presence');
    }

    // requires official business account
    if (body === 'create_group') {
        const group = await client.groups.create('Test Group', [ctx.sender]);
        await ctx.reply(`Created group: ${group.id}`);
    }

    // 10. JSX Message
    if (body === 'jsx') {
        await ctx.render(
            <text body="Hello from JSX!" />
        );
    }

    // failed
    // 11. Sticker (New Feature)
    if (body === 'sticker') {
        // Send a sample sticker from a URL
        const stickerUrl = 'https://images.unsplash.com/photo-1761839256545-4268b03606c0?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
        await ctx.replySticker(stickerUrl, {
            pack: 'MyPack',
            author: 'MyBot'
        });
    }

    // 12. Context Info (New Feature)
    if (body === 'context') {
        const info = [
            `*Context Info*`,
            `ID: ${ctx.raw.key?.id}`,
            `Sender: ${ctx.sender}`,
            `Is Group: ${ctx.isGroup}`,
            `From Me: ${ctx.fromMe}`,
            `Type: ${ctx.type}`,
            `Is Forwarded: ${ctx.isForwarded}`,
            `Mentions Me: ${ctx.mentionsMe}` 
        ].join('\n');
        await ctx.reply(info);
    }

    // 13. Save Media (New Feature)
    if (body === 'save') {
       const quoted = ctx.quoted || await ctx.fetchQuoted();
        if (quoted) {
            const savedPath = await quoted.saveMedia();
            if (savedPath) {
                await ctx.reply(`Media saved to: ${savedPath}`);
            } else {
                await ctx.reply('No media found in quoted message.');
            }
        } else {
            await ctx.reply('Please reply to a media message with "save"');
        }
    }

    // 14. Mark Read (New Feature)
    if (body === 'read') {
        await ctx.read();
        await ctx.reply('Marked this chat as read.');
    }

    // 16. Error Handling (New Feature)
    if (body === 'error') {
        throw new Error('This is a test error to trigger the error handler.');
    }

    if (body === 'buttons') {
        // Cloud API only supports reply buttons in the button interactive type
        // URL and copy buttons are not supported in the same message
        await ctx.sendButtons('Choose an option', [
            { id: 'btn1', text: 'Option 1', type: 'reply' },
            { id: 'btn2', text: 'Option 2', type: 'reply' },
            { id: 'btn3', text: 'Option 3', type: 'reply' }
        ], 'Powered by wts-core', 'Interactive Buttons');
    }

    if (body === 'list') {
        await ctx.sendList('Select a fruit', 'Open Fruit List', [
            {
                title: 'Citrus',
                rows: [
                    { id: 'lemon', title: 'Lemon', description: 'Sour' },
                    { id: 'orange', title: 'Orange', description: 'Sweet' }
                ]
            },
            {
                title: 'Berries',
                rows: [
                    { id: 'strawberry', title: 'Strawberry' },
                    { id: 'blueberry', title: 'Blueberry' }
                ]
            }
        ], 'Fruit Selection');
    }


    if (body === 'carousel') {
        await ctx.sendCarousel([
            {
                body: 'Check out our latest product!',
                header: { image: { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop' } },
                buttons: [{ id: 'b1', text: 'View Product', type: 'url', url: 'https://example.com/product1' }]
            },
            {
                body: 'Amazing deal on this item!',
                header: { image: { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop' } },
                buttons: [{ id: 'b2', text: 'Shop Now', type: 'url', url: 'https://example.com/product2' }]
            }
        ], "Check out our latest offers!");
    }

    if (body === 'contact') {
        await ctx.sendContact('Test Contact', '1234567890');
    }
});

// Global Error Handler
client.onError((err, ctx: Context) => {
    console.error(`[Global Error] Captured error in message ${ctx.raw.key?.id}:`, err);
});

// 9. Group Events
client.on('group-participants', (e) => {
    const event = e as { action: string; group: string; id?: string; participants: (string | { id: string })[] };
    console.log(event)
    const groupId = event.group || event.id;
    const participants = Array.isArray(event.participants) 
        ? event.participants.map(p => typeof p === 'string' ? p : p.id).join(', ')
        : String(event.participants);
    console.log(`[Group Event] ${event.action} in ${groupId}: ${participants}`);
});

client.on('ready', () => {
    console.log('Client is fully ready!');
});

client.connect();