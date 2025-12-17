import { Client } from '../src/core/Client';
import { Context } from '../src/core/Context';
import { logger, validator } from '../src/middleware';

// Mock Adapter for testing
class MockAdapter {
    mode = 'mock';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    private handlers: Map<string, Function[]> = new Map();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on(event: string, handler: Function) {
        if (!this.handlers.has(event)) this.handlers.set(event, []);
        this.handlers.get(event)?.push(handler);
    }

    emit(event: string, data: unknown) {
        this.handlers.get(event)?.forEach(fn => fn(data));
    }

    async connect() {
        this.emit('ready', undefined);
    }

    async sendMessage(jid: string, content: unknown) {
        console.log(`[Mock] Sending to ${jid}:`, content);
        return { key: { remoteJid: jid, id: 'mock-id' } };
    }
    
    handleWebhook() {}
}

// Define Context Variables Type
type MyVariables = {
    userId: string;
    validatedName?: string;
};

type MyEnv = {
    Variables: MyVariables;
};

const adapter = new MockAdapter();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = new Client<MyEnv>(adapter as any);

// 1. Use Global Middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
client.use(logger() as any);

// 2. Global Error Handler
client.onError((err, ctx) => {
    console.error(`[Global Error] ${err.message} in message from ${ctx.from}`);
});

// 3. Route-Specific Middleware: auth middleware
// 3. Route-Specific Middleware: auth middleware
const authMiddleware = async (ctx: Context<MyEnv>, next: () => Promise<void>) => {
    console.log('[Auth] Checking permissions...');
    // Simulate auth check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx.set('userId' as any, '12345' as any);
    await next();
};

// 4. Command with Route-Specific Middleware
client.command('admin', authMiddleware, async (ctx: Context<MyEnv>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = ctx.get('userId' as any);
    await ctx.reply(`Admin command executed by user ${userId}`);
});

// 5. Command with Validator
client.command('hello', validator<string>('name', (text) => {
    const parts = text.split(' ');
    if (parts.length < 2) return { valid: false, error: 'Missing name' };
    return { valid: true, value: parts[1] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any, async (ctx: Context<MyEnv>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const name = ctx.get('name' as any);
    await ctx.reply(`Hello, ${name}!`);
});

// 6. Regex Pattern
client.hear(/^ping$/i, async (ctx: Context<MyEnv>) => {
    await ctx.reply('pong');
});

// 7. Test Error Handling
client.command('error', async () => {
    throw new Error('Intentional error');
});

// Run Test
(async () => {
    console.log('--- Starting Test ---');
    await client.connect();

    // Simulate "ping"
    console.log('\n--- Testing "ping" ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '1' },
        message: { conversation: 'ping' }
    });

    // Simulate "admin" (with auth middleware)
    console.log('\n--- Testing "admin" (with auth middleware) ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '2' },
        message: { conversation: 'admin' }
    });

    // Simulate "hello world" (with validator)
    console.log('\n--- Testing "hello world" (with validator) ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '3' },
        message: { conversation: 'hello world' }
    });

    // Simulate "error"
    console.log('\n--- Testing "error" ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '4' },
        message: { conversation: 'error' }
    });
})();
