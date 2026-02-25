import type { SocketConfig, proto } from '@whiskeysockets/baileys';
import { Context } from './core/Context';
import type { IStore } from './core/Store';
import type { Client } from './core/Client';

import type { AuthStrategy } from './core/auth/AuthStrategy';

export interface ClientEvents<E extends Env> {
    'ready': void;
    'message': Context<E>;
    'qr': string;
    'pairing-code': string;
    'message.status': { id: string; status: proto.WebMessageInfo.Status; remoteJid: string; fromMe: boolean };
    'group-participants': { group: string; participants: string[]; action: 'add' | 'remove' | 'promote' | 'demote' };
    'call': WtsCall;
    'group.join_request': unknown;
    'chat.update': unknown;
}

export interface WtsCall {
    id: string;
    to: string;
    from: string;
    timestamp: number;
    event: string;
}

export type WtsPlugin<API = unknown> = {
    id: string;
    /**
     * Logic to run when the client initializes (e.g., event listeners)
     */
    init?: (client: Client) => void;
    /**
     * API methods to attach to the client instance
     */
    api?: (client: Client) => API;
};

// Helper to merge plugin API types
export type UnionToIntersection<U> = 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type InferPluginAPI<P extends WtsPlugin[]> = UnionToIntersection<
    P[number] extends { api: (client: Client) => infer T } ? T : object
>;

export interface UniversalOptions<P extends WtsPlugin[] = WtsPlugin[]> {
    printQR?: boolean;
    readConfirmations?: boolean;
    /**
     * Ignore messages sent by the bot itself to prevent infinite loops.
     * @default true
     */
    ignoreOwnMessages?: boolean;
    authStrategy?: AuthStrategy | string; 
    phoneNumber?: string;
    /**
     * WhatsApp Web version tuple passed to Baileys `socketConfig.version`.
     * @default [2, 3000, 1033893291]
     */
    waWebVersion?: SocketConfig['version'];
    socketConfig?: Partial<SocketConfig>;
    /**
     * Optional store for tracking state (contacts, chats, messages)
     */
    store?: IStore;
    /**
     * Custom Signal Repository factory for Baileys (useful for swapping libsignal-node with libsignal-js)
     */
    makeSignalRepository?: SocketConfig['makeSignalRepository'];
    /**
     * Disable automatic thumbnail generation to avoid using 'sharp' or 'jimp'
     * which are not compatible with Edge runtimes.
     */
    disableThumbnailGeneration?: boolean;
    cloudApi?: {
        readonly accessToken: string;
        readonly phoneNumberId: string;
        readonly webhookVerifyToken: string;
        readonly appSecret?: string;
        readonly port?: number;
        readonly flowPrivateKey?: string;
        /**
         * Enable rate limiting to prevent 429 errors.
         * When enabled, requests are queued and throttled to 20 req/s.
         * @default true
         */
        readonly rateLimit?: boolean;
    };
    /**
     * List of plugins to load
     */
    plugins?: P;
}

export type Env = {
    Bindings?: Record<string, unknown>;
    Variables?: Record<string, unknown>;
};

export type PluginEnv<V = Record<string, unknown>> = {
    Variables: V;
};

export interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
}

// Expanded Event Definitions
export type MessageHandler = (ctx: Context) => void | Promise<void>;
export type GroupParticipantHandler = (event: { 
    group: string; 
    participants: string[]; 
    action: 'add' | 'remove' | 'promote' | 'demote' 
}) => void | Promise<void>;

export type Next = () => Promise<void>;

export type Handler<E extends Env = Env> = (
    ctx: Context<E>,
    next: Next
) => void | Promise<void>;

export type Middleware<E extends Env = Env> = Handler<E>;

export type FilterFn<E extends Env = Env> = (ctx: Context<E>) => boolean | undefined | Promise<boolean | undefined>;

export const filters = {
    text: (ctx: Context) => ctx.type === 'text',
    photo: (ctx: Context) => ctx.type === 'image',
    command: (cmd: string) => (ctx: Context) => ctx.body.startsWith(`/${cmd}`),

    // Logical composition
    and: <E extends Env = Env>(...fns: FilterFn<E>[]) => async (ctx: Context<E>) => {
        for (const fn of fns) if (!await fn(ctx)) return false;
        return true;
    },
    or: <E extends Env = Env>(...fns: FilterFn<E>[]) => async (ctx: Context<E>) => {
        for (const fn of fns) if (await fn(ctx)) return true;
        return false;
    },
    not: <E extends Env = Env>(fn: FilterFn<E>) => async (ctx: Context<E>) => !await fn(ctx)
};
