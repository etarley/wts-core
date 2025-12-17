import type { IAdapter } from '../core/interfaces';

export abstract class BaseResource {
    constructor(protected readonly adapter: IAdapter) {}
}
