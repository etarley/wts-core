import type { IAdapter } from '../core/interfaces';

export class UserResource {
    constructor(private readonly adapter: IAdapter) {}

    get id(): string {
        return this.adapter.getMe()?.id || '';
    }

    async updateProfilePicture(buffer: Buffer) {
        const me = this.adapter.getMe();
        if (me?.id) {
            await this.adapter.updateProfilePicture(me.id, buffer);
        }
    }

    async removeProfilePicture() {
        const me = this.adapter.getMe();
        if (me?.id) {
            await this.adapter.removeProfilePicture(me.id);
        }
    }

    async updateStatus(text: string) {
        await this.adapter.updateStatus(text);
    }

    async updateName(name: string) {
        await this.adapter.updateName(name);
    }

    async getMe() {
        return this.adapter.getMe();
    }
}
