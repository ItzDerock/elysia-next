# Elysia-Next
A plugin to serve your Next.js application with Elysia on Bun. Derived from [this demo](https://github.com/ItzDerock/bun-elysia-nextjs).

> ⚠️ This plugin is still in development and has not been released yet. 
> If you need Next.js support, please see the demo linked above.

## Installation
```sh
bun add elysia-next
```

## Usage
```ts
import Elysia from "elysia";
import elysiaNext from "elysia-next";

const app = new Elysia();

// register the plugin
app.register(elysiaNext({
  port: 3000, // this must match the port your Elysia server will run on.
  app, // you need to pass in your main Elysia app instance, as this is the only way to get the Bun server instance.
}));

// by default, the plugin will serve your Next.js app on any route not handled by Elysia.
// you can change this by setting `autoMount` to false, then you can render by using the `renderNext` function.
app.get("/", (ctx) => {
  ctx.renderNext(ctx.request, /* optional custom path parameter */);
});

// start the app
app.listen(3000);
```

## Configuration
soon™️