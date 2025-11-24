import { WhatsAppError, RateLimitError, AuthenticationError, ReEngagementMessageError } from '../../core/WhatsAppError';

export class TemplateParamCountMismatchError extends WhatsAppError {
    constructor(message = 'Template parameter count mismatch', cause?: unknown) {
        super(message, cause);
        this.name = 'TemplateParamCountMismatchError';
    }
}

export class SpamRateLimitError extends RateLimitError {
    constructor(cause?: unknown) {
        super(cause);
        this.name = 'SpamRateLimitError';
        this.message = 'Spam rate limit hit';
    }
}

// Mapping of Cloud API error codes to Error classes
export const CloudErrorMapping: Record<number, new (cause?: unknown) => WhatsAppError> = {
    131048: RateLimitError,
    131026: SpamRateLimitError, // Example code for spam/policy violation often related
    190: AuthenticationError,
    131047: ReEngagementMessageError,
} as const;

export function mapCloudError(error: unknown): WhatsAppError {
    const code = (error as { code?: number })?.code;
    const message = (error as { message?: string })?.message || 'Unknown Cloud API Error';
    
    if (code && CloudErrorMapping[code]) {
        return new CloudErrorMapping[code](error);
    }
    
    // Specific check for template param mismatch if code is generic but message is specific
    if (code === 132000 && message.includes('parameter count mismatch')) { // Hypothetical check
         return new TemplateParamCountMismatchError(message, error);
    }
    
    return new WhatsAppError(message, error, code, error);
}
