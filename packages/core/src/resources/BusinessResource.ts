import type { IAdapter } from '../core/interfaces';

export class BusinessResource {
    constructor(private readonly adapter: IAdapter) {}

    /**
     * Update the business profile settings.
     * @param settings - The profile settings to update
     */
    async updateProfile(settings: { 
        about?: string; 
        address?: string; 
        email?: string; 
        websites?: string[]; 
        vertical?: string; 
    }) {
        if (this.adapter.mode === 'cloud') {
            await this.adapter.businessUpdateProfile(settings);
        } else {
            throw new Error('Business profile update not supported by this adapter');
        }
    }

    /**
     * Get the business profile settings.
     */
    async getProfile() {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.getBusinessProfile();
        }
        throw new Error('Getting business profile not supported by this adapter');
    }

    /**
     * Register the phone number for WhatsApp Business API (Two-Step Verification).
     * @param pin - The 6-digit PIN to set
     */
    async registerPhone(pin: string) {
        if (this.adapter.mode === 'cloud') {
            await this.adapter.registerPhone(pin);
        } else {
            throw new Error('Phone registration not supported by this adapter');
        }
    }

    /**
     * Deregister the phone number.
     * @param pin - The current 6-digit PIN
     */
    async deregisterPhone(pin: string) {
        if (this.adapter.mode === 'cloud') {
            await this.adapter.deregisterPhone(pin);
        } else {
            throw new Error('Phone deregistration not supported by this adapter');
        }
    }

    /**
     * Block a user.
     * @param jid - The user's JID
     */
    async blockUser(jid: string) {
        await this.adapter.blockContact(jid);
    }

    /**
     * Unblock a user.
     * @param jid - The user's JID
     */
    async unblockUser(jid: string) {
        await this.adapter.unblockContact(jid);
    }
}
