
import { describe, it, expect, mock } from 'bun:test';
import { CloudAdapter } from '../src/adapters/cloud/CloudAdapter';
import type { CloudWebhookPayload } from '../src/adapters/cloud/types';

describe('CloudAdapter Webhook Reproduction', () => {
    it('should fail to emit "call" event for incoming call webhook', async () => {
        const adapter = new CloudAdapter({
            cloudApi: {
                accessToken: 'test-token',
                phoneNumberId: '123456789',
                webhookVerifyToken: 'test-verify-token',
            }
        });

        const callListener = mock(() => {});
        adapter.on('call', callListener);

        const payload: CloudWebhookPayload = {
            object: 'whatsapp_business_account',
            entry: [{
                id: '123456789',
                changes: [{
                    value: {
                        messaging_product: 'whatsapp',
                        metadata: {
                            display_phone_number: '16505551111',
                            phone_number_id: '123456123'
                        },
                        calls: [
                            {
                                id: 'ABGGFlA5Fpa',
                                to: '18005551180',
                                from: '16315551181',
                                timestamp: 1504902988,
                                event: 'connect'
                            }
                        ],
                        contacts: [
                            {
                                profile: {
                                    name: 'test user name'
                                },
                                wa_id: '16315551181'
                            }
                        ]
                    },
                    field: 'messages' // Note: The user said "field": "calls", but Cloud API usually sends "messages" or "calls" inside value? 
                    // Actually, the example shows "field": "calls" at the top level of the change object? 
                    // Let's re-read the user request carefully. 
                    // The user provided JSON structure:
                    // { "field": "calls", "value": { ... "calls": [...] } }
                }]
            }]
        };

        // Fix the payload structure to match user report more closely if needed, 
        // but CloudWebhookPayload type usually expects `field` to be a string.
        // Let's assume the user's `field` "calls" is correct for this specific notification type.
        // However, `processWebhook` iterates `entry.changes`.
        
        // Let's access the private processWebhook method for testing purposes 
        // or emulate a fetch request if we want to be fully black-box.
        
        // Accessing private method via any cast for unit testing simplicity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (adapter as any).processWebhook(payload);

        // Wait a tick just in case
        await new Promise(resolve => setTimeout(resolve, 10))

        expect(callListener).toHaveBeenCalled();
    });
});
