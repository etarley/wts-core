import { logger } from '../src/plugins/LoggerPlugin';
import type { IAdapter } from '../src/core/interfaces';
import { EventEmitter } from 'events';

// Mock Adapter
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class MockAdapter extends EventEmitter {
    async init() {}
    async close() {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async send(jid: string, content: any) {
        console.log('MockAdapter.send called with:', jid, content);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { key: { id: 'mock-id' } } as any;
    }
    async downloadMedia() {
        console.log('MockAdapter.downloadMedia called');
        return Buffer.from('mock-media');
    }
    async getGroupMetadata(jid: string) {
        console.log('MockAdapter.getGroupMetadata called');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { id: jid, participants: [] } as any;
    }
}

import { Client } from '../src/core/Client';

const runTestDirect = async () => {
    console.log('Starting Evolution Features Test (Direct Client)...');

    const adapter = new MockAdapter();
    const client = new Client(adapter as unknown as IAdapter, [logger()]);
    
    await client.connect();
    console.log('Client initialized');
    console.log('LoggerPlugin registered.');

    // 3. Simulate Event
    console.log('Simulating message event...');
    const mockMsg = {
        key: { remoteJid: '123@s.whatsapp.net' },
        message: { conversation: 'Hello Evolution!' }
    };
    
    (adapter as unknown as EventEmitter).emit('message', mockMsg);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('--- Test Completed ---');
}

runTestDirect().catch(console.error);


