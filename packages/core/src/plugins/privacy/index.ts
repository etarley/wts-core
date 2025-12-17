import type { WAPrivacyValue, WAPrivacyOnlineValue, WAPrivacyGroupAddValue, WAReadReceiptsValue } from '@whiskeysockets/baileys';
import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const privacy = () => {
    return {
        id: "privacy",
        api: (client: Client) => ({
            privacy: {
                async getSettings() {
                    return client.adapter.fetchPrivacySettings();
                },
                /**
                 * Update Last Seen privacy
                 */
                async setLastSeen(value: WAPrivacyValue) {
                    await client.adapter.updatePrivacySetting('last', value);
                },
                /**
                 * Update Online status privacy
                 */
                async setOnline(value: WAPrivacyOnlineValue) {
                    await client.adapter.updatePrivacySetting('online', value);
                },
                /**
                 * Update Profile Picture privacy
                 */
                async setProfilePicture(value: WAPrivacyValue) {
                    await client.adapter.updatePrivacySetting('profile', value);
                },
                /**
                 * Update Status privacy
                 */
                async setStatus(value: WAPrivacyValue) {
                    await client.adapter.updatePrivacySetting('status', value);
                },
                /**
                 * Update Read Receipts privacy
                 */
                async setReadReceipts(value: WAReadReceiptsValue) {
                    await client.adapter.updatePrivacySetting('readreceipts', value);
                },
                /**
                 * Update Groups Add privacy
                 */
                async setGroupsAdd(value: WAPrivacyGroupAddValue) {
                    await client.adapter.updatePrivacySetting('groupadd', value);
                }
            }
        })
    } satisfies WtsPlugin;
};
