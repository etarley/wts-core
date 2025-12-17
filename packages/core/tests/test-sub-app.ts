import { Client } from '../src/core/Client';
import { Router } from '../src/router';
import { Context } from '../src/core/Context';
import { logger } from '../src/middleware';

// Mock Adapter for testing
class MockAdapter {
    mode = 'mock';
    private handlers: Map<string, ((data: unknown) => void)[]> = new Map();

    on(event: string, handler: (data: unknown) => void): void {
        if (!this.handlers.has(event)) this.handlers.set(event, []);
        this.handlers.get(event)?.push(handler);
    }

    emit(event: string, data: unknown): void {
        this.handlers.get(event)?.forEach(fn => fn(data));
    }

    async connect(): Promise<void> {
        this.emit('ready', undefined);
    }

    async sendMessage(jid: string, content: unknown): Promise<unknown> {
        console.log(`[Mock] Sending to ${jid}:`, content);
        return { key: { remoteJid: jid, id: 'mock-id' } };
    }
    
    handleWebhook(): void {}
}

// Define Context Variables Type
type MyVariables = {
    role: string;
};

type MyEnv = {
    Variables: MyVariables;
};

const adapter = new MockAdapter();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = new Client<MyEnv>(adapter as any);

// Global middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
client.use(logger() as any);

// ========================================
// Admin Router (Sub-App)
// ========================================
const adminRouter = new Router<MyEnv>();

// Admin-specific middleware
adminRouter.use(async (ctx: Context<MyEnv>, next: () => Promise<void>) => {
    console.log('[Admin Middleware] Checking admin permissions...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx.set('role' as any, 'admin' as any);
    await next();
});

adminRouter.command('ban', async (ctx) => {
    await ctx.reply('User banned! (admin only)');
});

adminRouter.command('unban', async (ctx) => {
    await ctx.reply('User unbanned! (admin only)');
});

adminRouter.command('stats', async (ctx) => {
    await ctx.reply('Server stats: 100 users, 50 groups');
});

// Mount admin router with "admin" prefix
// "ban" becomes "admin ban", "stats" becomes "admin stats"
client.route('admin', adminRouter);

// ========================================
// User Router (Sub-App)
// ========================================
const userRouter = new Router<MyEnv>();

userRouter.command('profile', async (ctx) => {
    await ctx.reply('Your profile: John Doe');
});

userRouter.command('settings', async (ctx) => {
    await ctx.reply('Settings: Language=EN, Notifications=ON');
});

// Mount user router WITHOUT prefix
// "profile" stays as "profile"
client.route(userRouter);

// ========================================
// Main App Routes
// ========================================
client.command('start', async (ctx: Context<MyEnv>) => {
    await ctx.reply('Welcome! Use /help for commands.');
});

client.hear(/^help$/i, async (ctx: Context<MyEnv>) => {
    await ctx.reply(`
Available commands:
- start: Get started
- profile: View your profile
- settings: View settings
- admin ban: Ban a user (admin)
- admin unban: Unban a user (admin)
- admin stats: View stats (admin)
    `.trim());
});

// ========================================
// Run Tests
// ========================================
(async () => {
    console.log('=== Testing Sub-App Pattern ===\n');
    await client.connect();

    // Test main route
    console.log('--- Testing "start" (main app) ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '1' },
        message: { conversation: 'start' }
    });

    // Test user router (no prefix)
    console.log('\n--- Testing "profile" (user router, no prefix) ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '2' },
        message: { conversation: 'profile' }
    });

    // Test admin router (with "admin" prefix)
    console.log('\n--- Testing "admin ban" (admin router, prefixed) ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '3' },
        message: { conversation: 'admin ban' }
    });

    console.log('\n--- Testing "admin stats" (admin router, prefixed) ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '4' },
        message: { conversation: 'admin stats' }
    });

    // Test help
    console.log('\n--- Testing "help" (pattern match) ---');
    adapter.emit('message', {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '5' },
        message: { conversation: 'help' }
    });
})();
