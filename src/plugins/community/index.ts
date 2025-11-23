import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const community = () => {
    return {
        id: "community",
        api: (client: Client) => ({
            community: {
                /**
                 * Create a new Community
                 */
                async create(subject: string, description?: string) {
                    if (client.adapter.mode === 'baileys') {
                        return client.adapter.communityCreate(subject, description);
                    }
                    throw new Error('Community not supported on Cloud API');
                },
                /**
                 * Deactivate a Community
                 */
                async deactivate(jid: string) {
                    if (client.adapter.mode === 'baileys') {
                        return client.adapter.communityDeactivate(jid);
                    }
                    throw new Error('Community not supported on Cloud API');
                },
                /**
                 * Get Community Metadata
                 */
                async getMetadata(jid: string) {
                    if (client.adapter.mode === 'baileys') {
                        return client.adapter.groupMetadata(jid);
                    }
                    throw new Error('Community not supported on Cloud API');
                }
            }
        })
    } satisfies WtsPlugin;
};
