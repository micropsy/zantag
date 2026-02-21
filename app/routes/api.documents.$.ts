import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const key = params["*"];
  if (!key) {
    return new Response("Missing key", { status: 400 });
  }

  const bucket = context.cloudflare.env.BUCKET;
  if (!bucket) {
    console.error("R2 Bucket binding not found");
    return new Response("Storage configuration error", { status: 500 });
  }

  const object = await bucket.get(key);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, {
    headers,
  });
};
