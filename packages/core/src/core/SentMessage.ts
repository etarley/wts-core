import type { Client } from './Client';

export class SentMessage {
    constructor(
        private client: Client,
        public to: string,
        public id: string
    ) {}

    /**
     * Waits for a reply to this specific message.
     * @param timeout - Timeout in milliseconds (default: 60000)
     */
    async waitForReply(timeout = 60000) {
        return this.client.waitFor('message', 
            (ctx) => ctx.from === this.to && ctx.quoted?.id === this.id, 
            timeout
        );
    }
}
