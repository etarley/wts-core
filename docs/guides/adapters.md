# Adapters

Adapters are the core component that allows `wts-core` to communicate with WhatsApp. We support two adapters: **CloudAdapter** and **BaileysAdapter**.

## CloudAdapter

The `CloudAdapter` uses the official WhatsApp Cloud API. It requires a Meta Developer account and a configured WhatsApp App.

### Configuration

```typescript
const client = createClient({
  cloudApi: {
    accessToken: "YOUR_ACCESS_TOKEN",
    phoneNumberId: "YOUR_PHONE_NUMBER_ID",
    verifyToken: "YOUR_VERIFY_TOKEN",
    graphUrl: "https://graph.facebook.com", // Optional, defaults to v21.0
    version: "v21.0", // Optional
  },
});
```

### Webhook Setup

The Cloud API relies on webhooks to receive messages. You need to expose a public URL (e.g., using `ngrok` for local development) and configure it in the Meta App Dashboard.

```typescript
// Starts a server on port 3000 and listens for webhooks at /webhook
client.start({ port: 3000, webhookPath: "/webhook" });
```

### Rate Limiting

`wts-core` automatically handles rate limiting for the Cloud API to prevent `429 Too Many Requests` errors. It uses an internal queue to ensure messages are sent within the allowed limits.

## BaileysAdapter

The `BaileysAdapter` uses the [Baileys](https://github.com/WhiskeySockets/Baileys) library to connect via WebSocket. It emulates a real device and requires scanning a QR code.

### Configuration

```typescript
const client = createClient({
  // No cloudApi config implies Baileys mode
  auth: {
    // Optional: Custom auth strategy
    // strategy: new LocalAuthStrategy(),
  },
  // Optional: Baileys specific options
  mobile: false, // Set to true for mobile API (experimental)
  browser: ["My Bot", "Chrome", "1.0.0"],
});
```

### Authentication

By default, `BaileysAdapter` uses a local file-based authentication state. You can customize this by providing a custom `AuthStrategy`.

```typescript
import { LocalAuthStrategy } from "wts-core";

const client = createClient({
  auth: {
    strategy: new LocalAuthStrategy("./my-auth-folder"),
  },
});
```

### QR Code

When connecting for the first time, you will need to scan a QR code.

```typescript
client.on("qr", (qr) => {
  // Render the QR code (e.g., using qrcode-terminal)
  console.log("QR:", qr);
});
```
