# Middleware

Middleware functions sit between the incoming event and your handlers. They are executed in the order they are registered.

## Using Middleware

You can register middleware using `client.use()`.

```typescript
client.use(async (ctx, next) => {
  console.log(`Processing message from ${ctx.from}`);

  // Modify context
  ctx.locals.startTime = Date.now();

  // Call next() to proceed to the next middleware/handler
  await next();

  const duration = Date.now() - ctx.locals.startTime;
  console.log(`Processed in ${duration}ms`);
});
```

## Common Use Cases

- **Logging**: Log incoming messages and errors.
- **Authentication**: Check if the user is allowed to use the bot.
- **Rate Limiting**: Prevent spam.
- **Session Management**: Load user session data.

## Error Handling

Errors thrown in middleware can be caught by an error boundary middleware or the global error handler.

```typescript
client.onError((err, ctx) => {
  console.error("Global error handler:", err);
  ctx.reply("Something went wrong!");
});
```
