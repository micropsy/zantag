import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs, unstable_parseMultipartFormData, type UploadHandler } from "@remix-run/cloudflare";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { FileText, Trash2, ExternalLink, Upload, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "~/components/dashboard/EmptyState";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);

  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!profile) {
    return redirect("/dashboard");
  }

  const documents = await db.document.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" }
  });

  return json({ documents, profileId: profile.id });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const db = getDb(context);
  const bucket = context.cloudflare.env.BUCKET;

  // Verify profile ownership
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!profile) {
    return json({ error: "Profile not found" }, { status: 404 });
  }

  // Handle file upload
  const uploadHandler: UploadHandler = async ({ name, filename, data, contentType }) => {
    if (name !== "file") {
      return undefined;
    }
    
    // Convert AsyncIterable<Uint8Array> to ReadableStream
    // Cloudflare R2 put expects: string | ReadableStream | ArrayBuffer | ArrayBufferView | Blob
    // The `data` here is AsyncIterable<Uint8Array>
    
    const chunks = [];
    for await (const chunk of data) {
      chunks.push(chunk);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await new Blob(chunks as any).arrayBuffer();
    
    const key = `${profile.id}/${Date.now()}-${filename}`;
    
    // Use R2 binding
    if (!bucket) {
      console.error("R2 Bucket binding not found");
      throw new Error("Storage configuration error");
    }
    
    await bucket.put(key, buffer, {
      httpMetadata: { contentType }
    });
    
    return key; // Return the key as the stored value
  };

  try {
    const formData = await unstable_parseMultipartFormData(request, uploadHandler);
    const intent = formData.get("intent");

    if (intent === "upload-document") {
        const fileKey = formData.get("file");
        const title = formData.get("title");

        if (!fileKey || typeof fileKey !== "string") {
            return json({ error: "File upload failed" }, { status: 400 });
        }

        // Create document record
        await db.document.create({
            data: {
                profileId: profile.id,
                title: (title as string) || "Untitled Document",
                // description field does not exist in schema
                url: `/api/documents/${fileKey}`, // We'll serve it via a resource route
                type: "file",
            }
        });

        return json({ success: true });
    }

    if (intent === "delete-document") {
        const documentId = formData.get("documentId") as string;
        
        // Find document to get key
        const doc = await db.document.findUnique({
            where: { id: documentId }
        });

        if (doc) {
             // Extract key from URL if possible, or we should store key separately
             // url format: /api/documents/profileId/timestamp-filename
             const key = doc.url.replace("/api/documents/", "");
             
             if (bucket) {
                 await bucket.delete(key);
             }

             await db.document.delete({
                 where: { id: documentId }
             });
        }
        
        return json({ success: true });
    }

  } catch (error) {
    console.error("Upload error:", error);
    return json({ error: "Upload failed" }, { status: 500 });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
};

import { PageHeader } from "~/components/ui/page-header";

export default function DashboardDocuments() {
  const { documents } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = fetcher.data as any;
    if (fetcher.state === "idle" && data) {
      if (data.success) {
        toast.success("Document updated successfully");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else if (data && data.error) {
        toast.error(data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Documents" 
        description="Upload and share documents with your contacts." 
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Upload Document</CardTitle>
                <CardDescription>Share PDFs, images, or other files</CardDescription>
            </CardHeader>
            <CardContent>
                <fetcher.Form method="post" encType="multipart/form-data" className="space-y-4">
                    <input type="hidden" name="intent" value="upload-document" />
                    
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input name="title" id="title" placeholder="e.g. Product Brochure" required />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input name="description" id="description" placeholder="Brief description of the file" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">File</Label>
                        <Input ref={fileInputRef} name="file" id="file" type="file" required />
                    </div>

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Upload className="mr-2 h-4 w-4 animate-bounce" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isSubmitting ? "Uploading..." : "Upload"}
                    </Button>
                </fetcher.Form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Library</CardTitle>
                <CardDescription>Manage your shared files</CardDescription>
            </CardHeader>
            <CardContent>
                {documents.length === 0 ? (
                    <EmptyState 
                        icon={FolderOpen}
                        title="No documents yet"
                        description="Upload your first document to get started."
                    />
                ) : (
                    <div className="space-y-4">
                        {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-primary/10 text-primary rounded-md flex-shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{doc.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-foreground">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                    <fetcher.Form method="post">
                                        <input type="hidden" name="intent" value="delete-document" />
                                        <input type="hidden" name="documentId" value={doc.id} />
                                        <button type="submit" className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </fetcher.Form>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
