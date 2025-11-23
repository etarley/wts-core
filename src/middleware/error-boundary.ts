import type { Context } from '../core/Context';

export interface ErrorBoundaryOptions {
    /**
     * Custom error handler. If not provided, logs to console.error
     */
    onError?: (error: Error, ctx: Context) => void | Promise<void>;
    
    /**
     * Whether to rethrow the error after handling. Default: false
     */
    rethrow?: boolean;
}

/**
 * Error boundary middleware to catch unhandled errors in the middleware chain.
 * Prevents application crashes from uncaught exceptions in plugins or handlers.
 * Inspired by the Recovery middleware in go-whatsapp-web-multidevice.
 * 
 * @example
 * ```typescript
 * import { errorBoundary } from 'wts-core';
 * 
 * client.use(errorBoundary({
 *     onError: (err, ctx) => {
 *         console.error('Error in message:', ctx.raw.key?.id, err);
 *     }
 * }));
 * ```
 */
export const errorBoundary = (options: ErrorBoundaryOptions = {}) => {
    return async (ctx: Context, next: () => Promise<void>): Promise<void> => {
        try {
            await next();
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            
            // Call custom error handler or log to console
            if (options.onError) {
                await options.onError(err, ctx);
            } else {
                console.error('[Error Boundary] Caught unhandled error:', {
                    message: err.message,
                    stack: err.stack,
                    messageId: ctx.raw.key?.id,
                    sender: ctx.sender,
                });
            }
            
            // Optionally rethrow
            if (options.rethrow) {
                throw error;
            }
        }
    };
};
