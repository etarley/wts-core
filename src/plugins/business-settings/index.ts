import type { Client } from '../../core/Client';
import type { WtsPlugin } from '../../types';

export const businessSettings = () => ({
    id: "businessSettings",
    api: (client: Client) => ({
        settings: {
            getPhoneInfo: async () => {
                if (client.adapter.mode === 'cloud') return client.adapter.getBusinessPhoneNumber();
                return null;
            },
            updateWebhook: async (url: string, token: string) => {
                // Useful for overriding WABA level webhooks per phone
                if (client.adapter.mode === 'cloud') {
                    return client.adapter.updateBusinessSettings({
                        webhook_configuration: { override_callback_uri: url, verify_token: token }
                    });
                }
            }
        }
    })
} satisfies WtsPlugin);




