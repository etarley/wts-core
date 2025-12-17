import type { Middleware, Env } from '../types';
import type { Context } from '../core/Context';

type ValidatorFn<T> = (value: string) => { valid: boolean; value?: T; error?: string };

export const validator = <T, E extends Env = Env>(
    paramName: string, 
    validatorFn: ValidatorFn<T>
): Middleware<E> => {
    return async (ctx: Context<E>, next) => {
        // Simple argument parsing: assumes params are positional or key-value
        // For this example, we'll just look for the param in the body for simplicity
        // In a real router, we'd parse the command arguments more robustly.
        
        const result = validatorFn(ctx.body); // Simplified
        if (!result.valid) {
            await ctx.reply(`Invalid ${paramName}: ${result.error}`);
            return;
        }

        // Store validated value in context
        // We use type assertion here because TypeScript cannot match the runtime logic
        // of storing arbitrary validated values in the generic Variables type
        ctx.set(
            paramName as unknown as keyof E['Variables'], 
            result.value as unknown as E['Variables'][keyof E['Variables']]
        );
        
        await next();
    };
};
