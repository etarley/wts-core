import { z } from 'zod';
import type { Middleware, Env } from '../types';
import type { Context } from '../core/Context';

export const zValidator = <T extends z.ZodType, E extends Env = Env>(
    paramName: keyof E['Variables'],
    schema: T
): Middleware<E> => {
    return async (ctx: Context<E>, next) => {
        const body = ctx.body;
        
        // In a real scenario, we might want to parse JSON or arguments
        // For now, we'll assume the body text is what we're validating
        // or if it's a JSON schema, we try to parse it.
        
        let valueToValidate: unknown = body;

        // If schema is an object, try to parse body as JSON
        if (schema instanceof z.ZodObject || schema instanceof z.ZodRecord) {
            try {
                const trimmed = body.trim();
                // Case 1: The whole body is JSON
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    valueToValidate = JSON.parse(trimmed);
                } 
                // Case 2: It's a command with JSON args (e.g. "register {...}")
                else {
                    const firstBrace = trimmed.indexOf('{');
                    const firstBracket = trimmed.indexOf('[');
                    
                    let startIdx = -1;
                    if (firstBrace !== -1 && firstBracket !== -1) {
                        startIdx = Math.min(firstBrace, firstBracket);
                    } else {
                        startIdx = Math.max(firstBrace, firstBracket);
                    }

                    if (startIdx !== -1) {
                        const jsonPart = trimmed.substring(startIdx);
                        valueToValidate = JSON.parse(jsonPart);
                    }
                }
            } catch {
                // ignore error, treat as string or failed parse
            }
        }

        const result = schema.safeParse(valueToValidate);

        if (!result.success) {
            await ctx.reply(`Validation Error: ${result.error.message}`);
            return;
        }

        // Store validated value in context
        ctx.set(
            paramName, 
            result.data as E['Variables'][keyof E['Variables']]
        );
        
        await next();
    };
};
