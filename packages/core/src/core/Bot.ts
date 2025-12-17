import type { Env } from '../types';
import type { Context } from './Context';

/**
 * Abstract base class for creating Bots.
 * A Bot is a self-contained unit of logic that can handle specific messages.
 */
export abstract class BaseBot<E extends Env = Env> {
    /**
     * Determine if this bot should handle the current context.
     * @param ctx The message context
     */
    abstract shouldTrigger(ctx: Context<E>): boolean | Promise<boolean>;

    /**
     * Handle the message.
     * @param ctx The message context
     */
    abstract handle(ctx: Context<E>): Promise<void>;
}
