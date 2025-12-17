export class WhatsAppError extends Error {
    constructor(
        override message: string,
        public override cause?: unknown,
        public code?: number,
        public details?: unknown
    ) {
        super(message);
        this.name = 'WhatsAppError';
    }
}

export class RateLimitError extends WhatsAppError {
    constructor(cause?: unknown) {
        super('Rate limit exceeded', cause, 131048); // Common rate limit code
        this.name = 'RateLimitError';
    }
}

export class AuthenticationError extends WhatsAppError {
    constructor(cause?: unknown) {
        super('Authentication failed', cause, 190); // OAuth error
        this.name = 'AuthenticationError';
    }
}

export class ValidationError extends WhatsAppError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'ValidationError';
    }
}

export class MediaUploadError extends WhatsAppError {
    constructor(message: string, cause?: unknown) {
        super(message, cause);
        this.name = 'MediaUploadError';
    }
}

export class ReEngagementMessageError extends WhatsAppError {
    constructor(cause?: unknown) {
        super('Message failed: more than 24 hours passed since last user message', cause, 131047);
        this.name = 'ReEngagementMessageError';
    }
}
