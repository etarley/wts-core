import { createClient } from './index';
import { chat } from './plugins/chat';
import { group } from './plugins/group';
import { user } from './plugins/user';

async function main() {
    console.log('Initializing client with plugins...');
    
    const client = createClient({
        phoneNumber: '1234567890',
        plugins: [chat(), group(), user()]
    });

    console.log('Client initialized.');

    // Test type inference and runtime availability
    if (client.chat && typeof client.chat.send === 'function') {
        console.log('✅ Chat plugin loaded correctly');
    } else {
        console.error('❌ Chat plugin failed to load');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((client as any).group && typeof (client as any).group.create === 'function') {
        console.log('✅ Group plugin loaded correctly');
    } else {
        console.error('❌ Group plugin failed to load');
    }

    if (client.user && typeof client.user.updateName === 'function') {
        console.log('✅ User plugin loaded correctly');
    } else {
        console.error('❌ User plugin failed to load');
    }

    console.log('Verification complete.');
}

main().catch(console.error);
