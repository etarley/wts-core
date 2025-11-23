import type { IAdapter } from '../core/interfaces';

export class ContactResource {
    constructor(private readonly adapter: IAdapter) {}

    async block(jid: string) {
        await this.adapter.blockContact(jid);
    }

    async unblock(jid: string) {
        await this.adapter.unblockContact(jid);
    }

    async getBlocklist() {
        if (this.adapter.mode === 'baileys') {
            return this.adapter.fetchBlocklist();
        }
        return [];
    }

    async subscribePresence(jid: string) {
        if (this.adapter.mode === 'baileys') {
            return this.adapter.presenceSubscribe(jid);
        }
    }

    async getProfilePicture(jid: string) {
        return this.adapter.getProfilePicture(jid);
    }

    async getStatus(jid: string) {
        return this.adapter.getStatus(jid);
    }

    async isOnWhatsApp(jid: string) {
        return this.adapter.isOnWhatsApp(jid);
    }
}
