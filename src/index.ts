import Elysia from "elysia";
import { initialize } from "next/dist/server/lib/router-server";
import { convertRequestToNode } from "./utils";
import assert from "assert";

const EMPTY_BUFFER = Buffer.alloc(0);
type NextInitializeOptions = Parameters<typeof initialize>[0];

/**
 * Configuration options for ElysiaNext.
 * Many of these options are directly passed to Next.js.
 */
export type ElysiaNextOptions = Partial<NextInitializeOptions> & {
  /**
   * The directory of the Next.js application being served.
   * @default process.cwd()
   */
  dir?: string;

  /**
   * The port that Elysia will listen on, should be the same as what you pass into your app.listen(...)
   */
  port: number;

  /**
   * Whether or not to run in development mode.
   * @default process.env.NODE_ENV !== "production"
   */
  dev?: boolean;

  /**
   * Automatically mount the Next.js application to serve all requests that aren't handled by Elysia.
   * @default true
   */
  autoMount?: boolean;

  /**
   * The main elysia server instance.
   */
  app: Elysia;
};

/**
 * Creates a new Elysia server with Next.js configured.
 * @param opts Configuration options for ElysiaNext.
 *
 * @example
 * ```ts
 * import Elysia from "elysia";
 * import elysiaNext from "elysia-next";
 *
 * new Elysia()
 *  .use(elysiaNext({ port: 3000 }))
 *  .listen({ port: 3000 });
 * ```
 */
export default async function elysiaNext(opts: ElysiaNextOptions) {
  // build the config object
  const config = {
    ...opts,
    dir: opts.dir ?? process.cwd(),
    dev: opts.dev ?? process.env.NODE_ENV !== "production",
    isNodeDebugging: opts.isNodeDebugging ?? false,
  } satisfies NextInitializeOptions;

  // start Next.JS and Elysia
  const [requestHandler, upgradeHandler] = await initialize(config);

  const elysia = new Elysia({
    name: "elysia-next",
  })
    .decorate(
      "renderNext",
      /**
       * Renders the Next.js application.
       * @param ctx The Elysia context or request.
       * @param path Optional custom path to render, defaults to the request path.
       */
      (request: Request, path?: string) => {
        return new Promise<Response | void>((resolve) => {
          assert(opts.app.server != null, "Elysia server is not initialized");
          const [nodeReq, nodeRes] = convertRequestToNode(
            request,
            resolve,
            opts.app.server
          );

          // set the URL
          nodeReq.url = path ?? nodeReq.url;

          requestHandler(nodeReq, nodeRes);
        });
      }
    )
    .decorate(
      "upgradeNext",
      /**
       *
       * @param ctx The Elysia context.
       * @param head Optional custom head buffer, defaults to an empty buffer.
       */
      (request: Request, head: Buffer = EMPTY_BUFFER) => {
        return new Promise<void>((resolve) => {
          assert(opts.app.server != null, "Elysia server is not initialized");
          const [nodeReq] = convertRequestToNode(
            request,
            () => resolve(),
            opts.app.server
          );

          // @ts-expect-error - Bun types are missing the socket property
          upgradeHandler(nodeReq, nodeReq.socket, head);
        });
      }
    );

  // add HMR support
  if (config.dev) {
    elysia.onRequest(async (ctx) => {
      if (
        ctx.request.headers.get("upgrade") &&
        ctx.path === "/_next/webpack-hmr"
      ) {
        await ctx.upgradeNext(ctx.request);
      }
    });
  }

  // auto mount Next.js
  if (opts.autoMount ?? true) {
    elysia.onError(async (ctx) => {
      console.log(ctx.error);
      console.log("aaaaaaaaa");
      if (ctx.error.message === "NOT_FOUND") {
        return await ctx.renderNext(ctx.request);
      }
    });
  }

  return elysia;
}
