/**
 * Request validation comes from `api/openapi/v1.yaml`, the single source of truth for /v1 (C1).
 * The document is written in JSON form (valid YAML 1.2), so it is read without a YAML parser.
 */
import { readFileSync } from 'node:fs';

type Node = unknown;
interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: Node;
}
interface Operation {
  parameters?: Node[];
  requestBody?: { content: { 'application/json': { schema: Node } } };
}
export interface OpenApiDocument {
  paths: Record<string, Record<string, Operation>>;
  components: Record<string, Record<string, Node>>;
}

export const openApiDocument = JSON.parse(
  readFileSync(new URL('../openapi/v1.yaml', import.meta.url), 'utf8'),
) as OpenApiDocument;

/** Inlines every local `$ref` (`#/components/...`), so Fastify gets self-contained schemas. */
function deref(node: Node, doc: OpenApiDocument): Node {
  if (Array.isArray(node)) return node.map((n) => deref(n, doc));
  if (!node || typeof node !== 'object') return node;
  const ref = (node as { $ref?: string }).$ref;
  if (ref) {
    const target = ref
      .replace(/^#\//, '')
      .split('/')
      .reduce<Node>((at, key) => (at as Record<string, Node>)[key], doc);
    return deref(target, doc);
  }
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deref(v, doc)]));
}

/** `/items/{itemId}` becomes Fastify's `/v1/items/:itemId`. */
export const fastifyPath = (path: string) => `/v1${path.replace(/\{(\w+)\}/g, ':$1')}`;

/** Fastify's `/v1/items/:itemId` becomes the documented `/v1/items/{itemId}`. */
export const documentedPath = (url: string) => url.replace(/:(\w+)/g, '{$1}');

/** The Fastify route schema (params, querystring, headers, body) of one documented operation. */
export function routeSchema(path: string, method: string, doc: OpenApiDocument = openApiDocument) {
  const operation = doc.paths[path]?.[method];
  if (!operation) throw new Error(`${method.toUpperCase()} ${path} is not in api/openapi/v1.yaml`);
  const parameters = (operation.parameters ?? []).map((p) => deref(p, doc) as Parameter);
  const group = (where: Parameter['in']) => {
    const list = parameters.filter((p) => p.in === where);
    if (list.length === 0) return undefined;
    const key = (p: Parameter) => (where === 'header' ? p.name.toLowerCase() : p.name);
    return {
      type: 'object',
      properties: Object.fromEntries(list.map((p) => [key(p), p.schema])),
      required: list.filter((p) => p.required).map(key),
    };
  };
  const body = operation.requestBody?.content['application/json'].schema;
  const parts = {
    params: group('path'),
    querystring: group('query'),
    headers: group('header'),
    body: body ? deref(body, doc) : undefined,
  };
  // Only the parts the operation has: Fastify warns about a part given as undefined.
  return Object.fromEntries(Object.entries(parts).filter(([, schema]) => schema !== undefined));
}
