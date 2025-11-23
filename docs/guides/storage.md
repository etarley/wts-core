# Storage Adapters

`wts-core` provides a flexible storage system to persist sessions, chats, contacts, and messages.

## Storage Types

There are two main types of storage in `wts-core`:

1.  **Session Storage (Auth)**: Handles authentication credentials (keys, tokens). This uses a Key-Value store approach.
2.  **Data Storage (Store)**: Handles message history, chat metadata, and contacts. This uses a structured (SQL-like) approach.

## Session Storage

Authentication state is handled by `AuthStrategy`.

-   `LocalAuthStrategy`: Stores credentials in JSON files (default).
-   `StoreAuthStrategy`: Stores credentials in a database using `KVStorageAdapter`.

## Data Storage

By default, `wts-core` uses `MemoryAdapter` for data. This is suitable for testing and stateless environments.

```typescript
import { createClient } from "wts-core";

const client = createClient({
  // ... options
}); // Uses MemoryAdapter by default
```

## SQL Adapters

For production use, we recommend using a SQL database. We provide adapters for SQLite and LibSQL.

### BetterSQLite3 (Node.js)

Best for traditional Node.js servers.

```bash
npm install better-sqlite3
```

```typescript
import { createClient, BetterSQLite3Adapter } from "wts-core";
import Database from "better-sqlite3";

const db = new Database("bot.db");

const client = createClient({
  // ... adapter options
  store: new BetterSQLite3Adapter(db),
});
```

### BunSQLite (Bun)

Best for Bun environments. Uses the native `bun:sqlite` module.

```typescript
import { createClient, BunSQLiteAdapter } from "wts-core";
import { Database } from "bun:sqlite";

const db = new Database("bot.db");

const client = createClient({
  // ... adapter options
  store: new BunSQLiteAdapter(db),
});
```

### LibSQL / Turso (Serverless/Edge)

Best for serverless environments (Cloudflare Workers, Vercel) or distributed databases.

```bash
npm install @libsql/client
```

```typescript
import { createClient, LibSQLAdapter } from "wts-core";
import { createClient as createDbClient } from "@libsql/client";

const db = createDbClient({
  url: "libsql://...",
  authToken: "...",
});

const client = createClient({
  // ... adapter options
  store: new LibSQLAdapter(db),
});
```

## Custom Storage

You can implement your own storage adapter by implementing the `StorageAdapter` interface.

```typescript
import type { StorageAdapter } from 'wts-core';

class MyStorage implements StorageAdapter {
    async init() { ... }
    async saveMessages(messages) { ... }
    // ... implement other methods
}
```
