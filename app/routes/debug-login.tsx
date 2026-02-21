import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { getDb } from "~/utils/db.server";
import { hash } from "bcrypt-ts";

export const loader = async ({ context }: LoaderFunctionArgs) => {
  try {
    const db = getDb(context);
    const users = await db.user.findMany({
      select: { email: true, id: true, role: true }
    });
    return json({ users });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Failed to load users" }, { status: 500 });
  }
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const newPassword = formData.get("password") as string;

  if (!email || !newPassword) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const db = getDb(context);
    const hashedPassword = await hash(newPassword, 10);
    
    const user = await db.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    return json({ success: true, message: `Password updated for ${user.email}` });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Failed to update password" }, { status: 500 });
  }
};

export default function DebugLogin() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const users = 'users' in data ? data.users : [];
  const loaderError = 'error' in data ? data.error : null;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Login & Password Reset</h1>
      
      {loaderError && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
          Error loading users: {loaderError}
        </div>
      )}
      
      {!loaderError && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Existing Users</h2>
          <ul className="space-y-2">
            {users.map((user: { id: string; email: string; role: string }) => (
              <li key={user.id} className="p-2 bg-gray-100 rounded flex justify-between">
                <span>{user.email}</span>
                <span className="text-sm text-gray-500">{user.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white p-6 rounded shadow border">
        <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
        {actionData && 'error' in actionData && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {actionData.error}
          </div>
        )}
        {actionData && 'success' in actionData && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            {actionData.message}
          </div>
        )}
        
        <Form method="post" className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input 
              id="email"
              name="email" 
              type="email" 
              required 
              className="w-full p-2 border rounded"
              placeholder="Enter user email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">New Password</label>
            <input 
              id="password"
              name="password" 
              type="text" 
              required 
              className="w-full p-2 border rounded"
              placeholder="Enter new password"
              defaultValue="password123"
            />
          </div>
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reset Password
          </button>
        </Form>
      </div>
    </div>
  );
}