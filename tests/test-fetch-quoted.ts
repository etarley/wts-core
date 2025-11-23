import { CloudAdapter } from '../src/adapters/cloud/CloudAdapter';
import { Client } from '../src/core/Client';
import { Store } from '../src/core/Store';
import { MemoryAdapter } from '../src/core/storage/MemoryAdapter';
import { CloudNormalizer } from '../src/adapters/cloud/CloudNormalizer';
import assert from 'assert';

console.log('Running fetchQuoted Test...');

const adapter = new CloudAdapter({
    cloudApi: {
        accessToken: 'fake',
        phoneNumberId: '1234567890',
        webhookVerifyToken: 'fake'
    }
});

const client = new Client(adapter);
client.store = new Store(new MemoryAdapter());
client.store.bind(client);

// 1. Simulate receiving the original message
const originalMsg = CloudNormalizer.normalizeMessage({
    from: '1234567890',
    id: 'msg-1',
    timestamp: '1672531200',
    type: 'text',
    text: { body: 'Original Message Content' }
}, { display_phone_number: '123', phone_number_id: '456' });

// Manually trigger upsert since we are not running a server
client.emit('messages.upsert', { messages: [originalMsg], type: 'notify' });

// 2. Simulate receiving a reply
const replyMsg = CloudNormalizer.normalizeMessage({
    from: '1234567890',
    id: 'msg-2',
    timestamp: '1672531205',
    type: 'text',
    text: { body: 'Reply Message' },
    context: {
        from: '1234567890',
        id: 'msg-1'
    }
}, { display_phone_number: '123', phone_number_id: '456' });

// Create context for the reply
import { Context } from '../src/core/Context';
const ctx = new Context(replyMsg, adapter, client);

// 3. Test fetchQuoted
(async () => {
    try {
        console.log('Fetching quoted message...');
        const quoted = await ctx.fetchQuoted();
        
        assert.ok(quoted, 'Quoted message should be found');
        assert.strictEqual(quoted?.body, 'Original Message Content', 'Quoted body mismatch');
        assert.strictEqual(quoted?.id, 'msg-1', 'Quoted ID mismatch');
        
        console.log('✅ fetchQuoted Test Passed!');
    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    }
})();
