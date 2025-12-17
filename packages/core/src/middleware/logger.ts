import type { Middleware } from '../types';

export const logger = (): Middleware => {
    return async (ctx, next) => {
        const start = Date.now();
        console.log(`[<] ${ctx.from} (${ctx.sender}): ${ctx.body.substring(0, 50)}...`);
        
        await next();
        
        const duration = Date.now() - start;
        console.log(`[>] Processed in ${duration}ms`);
    };
};
