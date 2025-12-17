import type { IAdapter, CloudAdapterInterface } from '../core/interfaces';
import { BaseResource } from './BaseResource';

export class FlowsResource extends BaseResource {
    constructor(adapter: IAdapter) {
        super(adapter);
    }

    private get cloudAdapter(): CloudAdapterInterface {
        if (this.adapter.mode !== 'cloud') {
            throw new Error('Flows are only supported in Cloud API mode');
        }
        return this.adapter as CloudAdapterInterface;
    }

    /**
     * Create a new Flow
     * @param name Name of the flow
     * @param categories Categories for the flow
     * @param flowJson The JSON definition of the flow
     */
    async create(name: string, categories: string[], flowJson: object): Promise<{ id: string }> {
        const result = await this.cloudAdapter.createFlow(name, categories, flowJson);
        return result as { id: string };
    }

    /**
     * Publish a Flow
     * @param flowId The ID of the flow to publish
     */
    async publish(flowId: string): Promise<void> {
        await this.cloudAdapter.publishFlow(flowId);
    }

    /**
     * Delete a Flow
     * @param flowId The ID of the flow to delete
     */
    async delete(flowId: string): Promise<void> {
        await this.cloudAdapter.deleteFlow(flowId);
    }

    /**
     * List all Flows
     */
    async list(): Promise<unknown> {
        return this.cloudAdapter.getFlows();
    }
}
