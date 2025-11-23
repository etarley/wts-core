import type { Context } from './core/Context';
import type { Handler, Next, Env } from './types';

/**
 * Compose middleware functions into a single function.
 * Based on koa-compose and Hono's implementation.
 */
export const compose = <E extends Env = Env>(
    middleware: Handler<E>[],
    onError?: (err: Error, ctx: Context<E>) => void,
    onNotFound?: (ctx: Context<E>) => Promise<void>
): ((context: Context<E>, next?: Next) => Promise<void>) => {
    return (context, next) => {
        let index = -1;
        return dispatch(0);

        async function dispatch(i: number): Promise<void> {
            if (i <= index) throw new Error('next() called multiple times');
            index = i;

            let handler: Handler<E> | undefined = middleware[i];
            
            if (i === middleware.length) {
                handler = next as Handler<E> | undefined;
            }

            if (!handler) {
                if (onNotFound) await onNotFound(context);
                return;
            }

            try {
                await handler(context, dispatch.bind(null, i + 1));
            } catch (err) {
                if (err instanceof Error && onError) {
                    onError(err, context);
                } else {
                    throw err;
                }
            }
        }
    };
};
