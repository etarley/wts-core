# Commerce

`wts-core` supports WhatsApp Commerce features like Catalogs, Products, and Orders.

## Sending Products

You can send a single product or a multi-product message (catalog).

### Single Product

```typescript
await client.commerce.sendProduct(
  "USER_PHONE_NUMBER",
  "CATALOG_ID",
  "PRODUCT_RETAILER_ID",
  "Check out this item!"
);
```

### Multi-Product

```typescript
await client.commerce.sendMultiProduct(
  "USER_PHONE_NUMBER",
  "Check out our collection",
  [
    {
      title: "Summer Collection",
      product_retailer_ids: ["ID_1", "ID_2"],
    },
    {
      title: "Winter Collection",
      product_retailer_ids: ["ID_3", "ID_4"],
    },
  ],
  "CATALOG_ID",
  "View Items"
);
```

## Handling Orders

When a user places an order, you receive a message with type `order`.

```typescript
client.on("message", async (ctx) => {
  if (ctx.message.order) {
    const order = ctx.message.order;
    console.log("Received order:", order.catalog_id, order.product_items);

    // Acknowledge order?
    await ctx.reply("Thank you for your order!");
  }
});
```
