import type { Middleware } from '../types';
import type { Context } from '../core/Context';

export interface SessionStore {
    get(key: string): Promise<Record<string, unknown> | undefined>;
    set(key: string, value: Record<string, unknown>): Promise<void>;
    delete(key: string): Promise<void>;
}

export class MemorySessionStore implements SessionStore {
    private sessions = new Map<string, Record<string, unknown>>();

    async get(key: string): Promise<Record<string, unknown> | undefined> {
        return this.sessions.get(key);
    }

    async set(key: string, value: Record<string, unknown>): Promise<void> {
        this.sessions.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.sessions.delete(key);
    }
}

export interface SessionOptions {
    store?: SessionStore;
    getSessionKey?: (ctx: Context) => string;
}

export const session = (options: SessionOptions = {}): Middleware => {
    const store = options.store || new MemorySessionStore();
    const getSessionKey = options.getSessionKey || ((ctx) => `${ctx.from}`);

    return async (ctx, next) => {
        const key = getSessionKey(ctx);
        const sessionData = await store.get(key) || {};

        // Inject session into context
        ctx.session = sessionData;

        await next();

        // Save session after middleware chain completes
        if (ctx.session) {
            await store.set(key, ctx.session);
        }
    };
};
