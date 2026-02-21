import { type AppLoadContext } from "@remix-run/cloudflare";

// Upload asset to R2 using shortCode as folder structure
// Path: r2-bucket/users/{shortCode}/{filename}
export async function uploadAsset(
  context: AppLoadContext, 
  shortCode: string, 
  file: File, 
  folder: string = "assets"
): Promise<string> {
  const env = context.cloudflare.env;
  if (!env.BUCKET) {
    throw new Error("BUCKET binding is missing");
  }

  const key = `users/${shortCode}/${folder}/${file.name}`;
  
  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Assuming R2 public access or worker proxy
  // Return the public URL or the key
  const publicUrl = env.PUBLIC_ASSETS_URL || "";
  return `${publicUrl}/${key}`;
}

export async function deleteAsset(context: AppLoadContext, key: string) {
  const env = context.cloudflare.env;
  if (!env.BUCKET) {
    throw new Error("BUCKET binding is missing");
  }
  return env.BUCKET.delete(key);
}

// Clean up entire user folder (e.g. on hard delete)
// Note: R2 doesn't support folder deletion, must list and delete objects
export async function deleteUserFolder(context: AppLoadContext, shortCode: string) {
    const env = context.cloudflare.env;
    if (!env.BUCKET) {
      throw new Error("BUCKET binding is missing");
    }

    const prefix = `users/${shortCode}/`;
    let truncated = true;
    let cursor: string | undefined;

    while (truncated) {
        const list = await env.BUCKET.list({ prefix, cursor });
        truncated = list.truncated;
        if (list.truncated) {
            cursor = list.cursor;
        } else {
            cursor = undefined;
        }

        const keys = list.objects.map((obj) => obj.key);
        if (keys.length > 0) {
            await env.BUCKET.delete(keys);
        }
    }
}
