import type { Client } from '../core/Client';
import { Context } from '../core/Context';
import type { Env } from '../types';

export const logger = () => ({
    id: 'logger',
    init: (client: Client<Env>) => {
        client.on('message', (ctx: unknown) => {
            const context = ctx as Context<Env>;
            console.log(`[LoggerPlugin] Received message from ${context.from}: ${context.body}`);
        });
    }
});
