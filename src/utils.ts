import { Server } from "bun";
import { IncomingMessage, ServerResponse } from "http";

// Used internally by Bun, needed or else req.socket will be a mock object
const INTERNAL_SOCKET_DATA = Symbol.for("::bunternal::");

/**
 * Converts a Bun Request object to a Node Request object
 * @param req The Bun Request object
 * @param reply Callback for sending the response
 */
export function convertRequestToNode(
  req: Request,
  reply: (response: Response) => void,
  server: Server
): [IncomingMessage, ServerResponse] {
  const http_req = new IncomingMessage(req);
  const http_res = new ServerResponse({
    // @ts-expect-error - this is a hack
    reply,
    req: http_req,
  });

  // fix the socket
  // @ts-expect-error
  http_req.socket[INTERNAL_SOCKET_DATA] = [server, http_res, req];

  return [http_req, http_res];
}
