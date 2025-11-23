import { Client } from '../src/core/Client';
import { zValidator } from '../src/middleware/zod-validator';
import { z } from 'zod';
import type { ExecutionContext } from '../src/types';

// Mock Adapter
class MockAdapter {
    mode = 'mock';
    private handlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();
    public raw = { mock: true };

    on(event: string, handler: (...args: unknown[]) => void): void {
        if (!this.handlers.has(event)) this.handlers.set(event, []);
        this.handlers.get(event)?.push(handler);
    }

    emit(event: string, ...args: unknown[]): void {
        this.handlers.get(event)?.forEach(fn => fn(...args));
    }

    async connect(): Promise<void> {
        this.emit('ready');
    }

    async sendMessage(jid: string, content: unknown): Promise<unknown> {
        console.log(`[Mock] Sending to ${jid}:`, JSON.stringify(content));
        return { key: { remoteJid: jid, id: 'mock-id' } };
    }
    
    handleWebhook(): void {}
}

// Define Env Types
type MyBindings = {
    API_KEY: string;
    DB_URL: string;
};

type MyVariables = {
    user: { name: string; age: number };
};

type MyEnv = {
    Bindings: MyBindings;
    Variables: MyVariables;
};

// Mock Execution Context
const mockExecutionCtx: ExecutionContext = {
    waitUntil: (promise: Promise<unknown>) => {
        console.log('[ExecutionCtx] waitUntil called');
        promise.then(() => console.log('[ExecutionCtx] Promise resolved'));
    },
    passThroughOnException: () => {}
};

// Mock Env
const mockEnv: MyBindings = {
    API_KEY: 'secret-123',
    DB_URL: 'postgres://localhost:5432/db'
};

const adapter = new MockAdapter();
const client = new Client<MyEnv>(adapter as any);

// Middleware using Env
client.use(async (ctx, next) => {
    console.log(`[Middleware] Accessing Env: API_KEY=${ctx.env.API_KEY}`);
    await next();
});

// Zod Schema
const userSchema = z.object({
    name: z.string(),
    age: z.number().min(18)
});

// Route with Zod Validator
client.command('register', zValidator('user', userSchema), async (ctx) => {
    // Type-safe access via req.valid (simulated)
    const user = ctx.req.valid('user');
    
    console.log(`[Handler] Registering user: ${user.name}, Age: ${user.age}`);
    
    // Test waitUntil
    ctx.waitUntil(new Promise(resolve => {
        setTimeout(() => {
            console.log('[Background] Database updated');
            resolve(true);
        }, 100);
    }));
    
    await ctx.reply(`Registered ${user.name}`);
});

// Run Tests
(async () => {
    console.log('=== Testing Final Hono Parity ===\n');
    await client.connect();

    // Simulate incoming message with Env and ExecutionCtx
    // In a real Cloudflare Worker, these are passed by the adapter/runtime
    console.log('--- Testing "register" command ---');
    
    const msg = {
        key: { remoteJid: '123@s.whatsapp.net', fromMe: false, id: '1' },
        message: { conversation: 'register {"name": "Alice", "age": 25}' }
    };

    // Manually emit with env and ctx (simulating CloudAdapter behavior)
    adapter.emit('message', msg, mockEnv, mockExecutionCtx);

    // Wait for background tasks
    await new Promise(resolve => setTimeout(resolve, 200));
})();
