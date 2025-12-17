# Events Reference

The `Client` class emits various events that you can listen to using `client.on()`.

## Core Events

### `ready`

Emitted when the client has successfully connected to WhatsApp.

```typescript
client.on("ready", () => {
  console.log("Client is ready!");
});
```

### `message`

Emitted when a new message is received. This is also handled by the middleware system, so you might not need to listen to this directly if you are using `client.on('message', handler)`.

**Payload**: `Context`

```typescript
client.on("message", (ctx) => {
  console.log("New message from:", ctx.from);
});
```

### `message.status`

Emitted when the status of a sent message changes (e.g., sent, delivered, read).

**Payload**:

```typescript
{
  id: string; // Message ID
  status: "SENT" | "DELIVERED" | "READ" | "FAILED" | "PLAYED";
  remoteJid: string; // Recipient JID
  fromMe: boolean;
}
```

```typescript
client.on("message.status", (status) => {
  console.log(`Message ${status.id} is now ${status.status}`);
});
```

### `group-participants-update`

Emitted when participants are added, removed, promoted, or demoted in a group.

**Payload**:

```typescript
{
    group: string;        // Group JID
    participants: string[]; // Array of participant JIDs
    action: 'add' | 'remove' | 'promote' | 'demote';
}
```

```typescript
client.on("group-participants-update", (event) => {
  console.log(`${event.action} on group ${event.group}`);
});
```

### `chat.update`

Emitted when a chat is updated (e.g., new message, archive status change).

**Payload**: `Partial<Chat>`

```typescript
client.on("chat.update", (chat) => {
  console.log("Chat updated:", chat.id);
});
```

## Adapter Specific Events

Some adapters might emit additional events.

### BaileysAdapter

- `connection.update`: Raw connection updates from Baileys.
- `creds.update`: When credentials are updated (handled internally by AuthStrategy).

### CloudAdapter

- `message`: Normalized message event.
- `message.status`: Normalized status event.
