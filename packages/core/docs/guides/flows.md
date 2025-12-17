# WhatsApp Flows

WhatsApp Flows allow you to build structured interactions (forms, quizzes, appointments) directly within WhatsApp.

## Prerequisites

- **Cloud API**: Flows are currently only supported on the Cloud API.
- **Flow JSON**: You need to design your flow in the WhatsApp Flow Builder and get the JSON definition.

## Handling Flow Requests

When a user interacts with a Flow, WhatsApp sends a request to your webhook. You need to handle these requests to provide dynamic data or process the submission.

```typescript
import { createClient } from "wts-core";

const client = createClient({
  /* ... */
});

client.onFlowRequest(async (request) => {
  const { screen, data, action } = request;

  if (action === "INIT") {
    return {
      screen: "WELCOME_SCREEN",
      data: {
        greeting: "Hello!",
      },
    };
  }

  if (action === "data_exchange") {
    // Handle form submission or data exchange
    if (screen === "WELCOME_SCREEN") {
      return {
        screen: "NEXT_SCREEN",
        data: {
          // ...
        },
      };
    }
  }

  throw new Error("Unknown action");
});
```

## Sending a Flow

To send a Flow to a user:

```typescript
await client.flows.sendFlow(
  "USER_PHONE_NUMBER",
  {
    flow_id: "YOUR_FLOW_ID",
    flow_token: "UNIQUE_TOKEN",
    flow_cta: "Start Survey",
    flow_action: "navigate",
    flow_action_payload: {
      screen: "WELCOME_SCREEN",
    },
  },
  {
    body: "Please complete this survey",
  }
);
```

## Flow Builder (Experimental)

`wts-core` provides a `FlowBuilder` helper to construct Flow JSON programmatically (work in progress).

```typescript
import { FlowBuilder } from "wts-core";

const flow = new FlowBuilder("My Flow")
  .addScreen("WELCOME_SCREEN", (screen) => {
    screen.addText("Welcome!");
    // ...
  })
  .build();
```
