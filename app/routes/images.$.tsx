import { type LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ context, params }: LoaderFunctionArgs) {
  const bucket = context.cloudflare.env.BUCKET;
  const key = params["*"];

  if (!bucket || !key) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await bucket.get(key);

  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  const metadata = object.httpMetadata as { contentType?: string } | null;
  if (metadata?.contentType) {
    headers.set("Content-Type", metadata.contentType);
  }
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, {
    headers,
  });
}
