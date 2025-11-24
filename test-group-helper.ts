import { createClient } from 'wts-core';

const client = createClient({
  printQR: true,
  authStrategy: './auth_info',
});

client.on('message', async (ctx) => {
  // TypeScript knows these methods are available after isGroup() check
  if (ctx.isGroup()) {
    const groupName = await ctx.getGroupName();
    const metadata = await ctx.getGroupMetadata();
    
    console.log('Group Name:', groupName);
    console.log('Group Description:', metadata.desc);
    console.log('Participants:', metadata.participants?.length);
  }
});

console.log('Testing group name helper...');
