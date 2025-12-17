# Getting Started

## Installation

Install `wts-core` using your preferred package manager:

```bash
npm install wts-core
# or
yarn add wts-core
# or
pnpm add wts-core
# or
bun add wts-core
```

## Setup

`wts-core` supports two modes: **Cloud API** and **Baileys**.

### Cloud API Setup

To use the WhatsApp Cloud API, you need a Meta Developer account and a configured WhatsApp App.

1.  Go to [Meta for Developers](https://developers.facebook.com/).
2.  Create a new App (Type: Business).
3.  Add the **WhatsApp** product to your app.
4.  Get your **Access Token**, **Phone Number ID**, and configure your **Verify Token**.

```typescript
import { createClient } from "wts-core";

const client = createClient({
  cloudApi: {
    accessToken: "YOUR_ACCESS_TOKEN",
    phoneNumberId: "YOUR_PHONE_NUMBER_ID",
    verifyToken: "YOUR_VERIFY_TOKEN",
  },
});

client.start({ port: 3000, webhookPath: "/webhook" });
```

#### Retrieving Phone Number ID

You can retrieve your **Phone Number ID** by making a GET request to the Facebook Graph API:

```bash
curl -X GET "https://graph.facebook.com/v24.0/YOUR_BUSINESS_ACCOUNT_ID/phone_numbers?access_token=YOUR_ACCESS_TOKEN"
```

Replace `YOUR_BUSINESS_ACCOUNT_ID` with your WhatsApp Business Account ID and `YOUR_ACCESS_TOKEN` with your System User Access Token.

### Baileys Setup

To use Baileys (WebSocket connection), you don't need a Meta Developer account. You just need a phone with WhatsApp installed.

```typescript
import { createClient } from "wts-core";

const client = createClient({
  // No cloudApi config implies Baileys mode
});

client.on("qr", (qr) => {
  console.log("Scan this QR code:", qr);
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.start();
```

## Next Steps

- Learn about the [Architecture](./architecture.md).
- Explore the [Guides](../guides/adapters.md).
- Check out the [API Reference](../reference/client.md).
