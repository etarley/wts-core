import type { IAdapter } from '../core/interfaces';

export class CallResource {
    constructor(private readonly adapter: IAdapter) {}

    /**
     * Reject an incoming call
     * @param callId - The unique ID of the call event
     * @param from - The JID of the caller
     */
    async reject(callId: string, from: string): Promise<void> {
        await this.adapter.rejectCall(callId, from);
    }
}
