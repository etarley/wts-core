import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const user = () => {
    return {
        id: "user",
        api: (client: Client) => ({
            user: {
                get id(): string {
                    return client.adapter.getMe()?.id || '';
                },
                async updateProfilePicture(buffer: Buffer) {
                    const me = client.adapter.getMe();
                    if (me?.id) {
                        await client.adapter.updateProfilePicture(me.id, buffer);
                    }
                },
                async updateStatus(text: string) {
                    await client.adapter.updateStatus(text);
                },
                async updateName(name: string) {
                    await client.adapter.updateName(name);
                },
                async getMe() {
                    return client.adapter.getMe();
                }
            }
        })
    } satisfies WtsPlugin;
};
