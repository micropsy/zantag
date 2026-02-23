import { type AppLoadContext } from "@remix-run/cloudflare";

// Upload asset to R2 using profileId as folder structure
// Path: r2-bucket/users/{profileId}/{filename}
export async function uploadAsset(
  context: AppLoadContext, 
  profileId: string, 
  file: File, 
  folder: string = "assets"
): Promise<string> {
  const env = context.cloudflare.env;
  if (!env.BUCKET) {
    throw new Error("BUCKET binding is missing");
  }

  const key = `users/${profileId}/${folder}/${file.name}`;
  
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

export async function deleteUserFolder(context: AppLoadContext, profileId: string) {
    const env = context.cloudflare.env;
    if (!env.BUCKET) {
      throw new Error("BUCKET binding is missing");
    }

    const prefix = `users/${profileId}/`;
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
