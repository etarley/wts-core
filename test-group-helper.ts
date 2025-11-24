import { createClient } from 'wts-core';

const client = createClient({
  printQR: true,
  authStrategy: './auth_info',
});

client.on('message', async (ctx) => {
  // Usage 1: Direct call (returns string | null)
  const potentialName = await ctx.getGroupName();
  if (potentialName) {
    console.log('Direct call name:', potentialName);
  }

  // Usage 2: With type narrowing (returns string)
  if (ctx.isGroup()) {
    // TypeScript knows these are NOT null here because of isGroup()
    const name = await ctx.getGroupName(); 
    const metadata = await ctx.getGroupMetadata(); 
    
    if (name && metadata) {
        console.log('Narrowed name:', name);
        console.log('Narrowed desc:', metadata.desc);
    }
  }
});

console.log('Testing group name helper...');
