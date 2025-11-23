import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const contact = () => {
    return {
        id: "contact",
        api: (client: Client) => ({
            contact: {
                async block(jid: string) {
                    await client.adapter.blockContact(jid);
                },
                async unblock(jid: string) {
                    await client.adapter.unblockContact(jid);
                },
                async getProfilePicture(jid: string) {
                    return client.adapter.getProfilePicture(jid);
                },
                async getStatus(jid: string) {
                    return client.adapter.getStatus(jid);
                },
                async isOnWhatsApp(jid: string) {
                    return client.adapter.isOnWhatsApp(jid);
                },
                async getBlockList() {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.getBlockList();
                    }
                    if (client.adapter.mode === 'baileys') {
                        return client.adapter.fetchBlocklist();
                    }
                    return [];
                }
            }
        })
    } satisfies WtsPlugin;
};
