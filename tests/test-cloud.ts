import { createClient } from '../src/index';

const PORT = 3001;

const client = createClient({
    cloudApi: {
        accessToken: 'test-token',
        phoneNumberId: 'test-phone-id',
        webhookVerifyToken: 'test-verify-token',
        port: PORT
    }
});

client.on('ready', async () => {
    console.log('Client ready');
    
    // Simulate incoming webhook
    const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
            id: 'test-entry',
            changes: [{
                field: 'messages',
                value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                        display_phone_number: '1234567890',
                        phone_number_id: 'test-phone-id'
                    },
                    messages: [{
                        from: '1234567890',
                        id: 'wamid.test',
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'text',
                        text: {
                            body: 'Hello Cloud API'
                        }
                    }]
                }
            }]
        }]
    };

    try {
        // Wait a bit for the server to start
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Sending webhook...');
        const response = await fetch(`http://localhost:${PORT}/webhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });
        console.log('Webhook sent:', response.status);
    } catch (error) {
        console.error('Failed to send webhook:', error);
        process.exit(1);
    }
});

import { Context } from '../src/core/Context';

client.on('message', (msg: Context) => {
    console.log('Received message:', msg.body);
    if (msg.body === 'Hello Cloud API') {
        console.log('Test Passed!');
        process.exit(0);
    } else {
        console.error('Test Failed: Unexpected message content');
        process.exit(1);
    }
});

console.log('Starting client...');
client.connect();

// Timeout
setTimeout(() => {
    console.error('Test Timed Out');
    process.exit(1);
}, 10000);
