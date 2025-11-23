import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const call = () => {
    return {
        id: "call",
        api: (client: Client) => ({
            call: {
                /**
                 * Reject an incoming call
                 * @param callId - The unique ID of the call event
                 * @param from - The JID of the caller
                 */
                async reject(callId: string, from: string) {
                    await client.adapter.rejectCall(callId, from);
                }
            }
        })
    } satisfies WtsPlugin;
};
