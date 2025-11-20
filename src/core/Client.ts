import type { IAdapter } from './interfaces';
import { Context } from './Context';
import { proto } from '@whiskeysockets/baileys';
import type { EventHandler } from '../types';
import { ChatResource } from '../resources/ChatResource';

export class Client {
    public readonly chat: ChatResource;

    constructor(private readonly adapter: IAdapter) {
        this.chat = new ChatResource(adapter);

        this.adapter.on('message', (rawMsg: unknown) => {
            // In Baileys mode, we know this is a WebMessageInfo.
            // In Cloud mode, the adapter will normalize it to this structure before emitting.
            const msg = rawMsg as proto.IWebMessageInfo;
            
            if (msg) {
                const ctx = new Context(msg, this.adapter);
                this.handleMessage(ctx);
            }
        });

        this.adapter.on('ready', () => {
            console.log('🚀 Client is ready!');
        });
    }

    private messageHandlers: EventHandler[] = [];

    /**
     * Connect to the provider
     */
    async connect(): Promise<void> {
        return this.adapter.connect();
    }

    /**
     * Register a message handler
     */
    on(event: 'message', handler: EventHandler): void {
        if (event === 'message') {
            this.messageHandlers.push(handler);
        }
    }

    /**
     * Execute all registered handlers
     */
    private async handleMessage(ctx: Context): Promise<void> {
        for (const handler of this.messageHandlers) {
            await handler(ctx);
        }
    }
}