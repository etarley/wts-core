import type { IAdapter } from '../core/interfaces';
import type { AnyMessageContent } from '@whiskeysockets/baileys';

export class StatusResource {
    constructor(private readonly adapter: IAdapter) {}

    async broadcast(content: AnyMessageContent) {
        return this.adapter.sendStatus(content);
    }
}
