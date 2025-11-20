import { BaseResource } from './BaseResource';
import type { WAPrivacyValue, WAPrivacyOnlineValue, WAPrivacyGroupAddValue, WAReadReceiptsValue } from '@whiskeysockets/baileys';

export class PrivacyResource extends BaseResource {
    /**
     * Get all privacy settings
     */
    async getSettings() {
        return this.adapter.fetchPrivacySettings();
    }

    /**
     * Update Last Seen privacy
     */
    async setLastSeen(value: WAPrivacyValue) {
        await this.adapter.updatePrivacySetting('last', value);
    }

    /**
     * Update Online status privacy
     */
    async setOnline(value: WAPrivacyOnlineValue) {
        await this.adapter.updatePrivacySetting('online', value);
    }

    /**
     * Update Profile Picture privacy
     */
    async setProfilePicture(value: WAPrivacyValue) {
        await this.adapter.updatePrivacySetting('profile', value);
    }

    /**
     * Update Status privacy
     */
    async setStatus(value: WAPrivacyValue) {
        await this.adapter.updatePrivacySetting('status', value);
    }

    /**
     * Update Read Receipts privacy
     */
    async setReadReceipts(value: WAReadReceiptsValue) {
        await this.adapter.updatePrivacySetting('readreceipts', value);
    }

    /**
     * Update Groups Add privacy
     */
    async setGroupsAdd(value: WAPrivacyGroupAddValue) {
        await this.adapter.updatePrivacySetting('groupadd', value);
    }
}
