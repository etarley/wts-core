# Plugins

Plugins allow you to extend the functionality of `wts-core`. They can add new methods to the client, handle specific events, or integrate with external services.

## Using Plugins

To use a plugin, pass it to the `createClient` function.

```typescript
import { createClient } from "wts-core";
import { WelcomePlugin } from "wts-core";

const client = createClient({
  plugins: [new WelcomePlugin({ message: "Hello! Welcome to our bot." })],
  // ... other config
});
```

## Creating Plugins

A plugin is an object (or class instance) that implements the `WtsPlugin` interface.

```typescript
import { WtsPlugin, Client } from "wts-core";

export class MyPlugin implements WtsPlugin {
  constructor(private options: { name: string }) {}

  // Called when the client is initialized
  init(client: Client) {
    client.on("message", (ctx) => {
      console.log(`[${this.options.name}] Received message from ${ctx.from}`);
    });
  }

  // Optional: Extend the client API
  api(client: Client) {
    return {
      myCustomMethod: () => {
        console.log("Custom method called!");
      },
    };
  }
}
```

### Functional Plugins

You can also create simple functional plugins.

```typescript
const myPlugin: WtsPlugin = {
  init: (client) => {
    console.log("Plugin initialized");
  },
};
```
