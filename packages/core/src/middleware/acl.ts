import type { Middleware } from '../types';

/**
 * Access Control List Middleware.
 * Restricts access to specific users.
 * 
 * @param allowedIds Array of JIDs allowed to access the route/bot.
 */
export const acl = (allowedIds: string[]): Middleware => {
    return async (ctx, next) => {
        if (allowedIds.includes(ctx.sender)) {
            await next();
        } else {
            await ctx.reply("⛔ You do not have permission.");
        }
    };
};
