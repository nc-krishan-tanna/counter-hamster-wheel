import type { FastifyReply, FastifyRequest } from 'fastify';

/** The Fetch API request for a Fastify request (Better Auth and the MCP transport speak Fetch). */
export function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) headers.append(name, v);
  }
  const hasBody =
    request.method !== 'GET' && request.method !== 'HEAD' && request.body !== undefined;
  return new Request(`https://${request.headers.host ?? 'localhost'}${request.url}`, {
    method: request.method,
    headers,
    ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
  });
}

/** Sends a Fetch API response through Fastify, keeping every Set-Cookie header. */
export async function sendWebResponse(reply: FastifyReply, response: Response) {
  reply.code(response.status);
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie' && name !== 'content-length') reply.header(name, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) reply.header('set-cookie', cookies);
  return reply.send(response.body ? Buffer.from(await response.arrayBuffer()) : null);
}
