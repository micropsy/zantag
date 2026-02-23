import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { getDb } from "~/utils/db.server";
import { requireUserId } from "~/utils/session.server";
import { User } from "lucide-react";
import { profileSchema } from "~/utils/schemas";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request, context);
  const db = getDb(context);

  const profile = await db.profile.findUnique({
    where: { userId },
  });

  if (profile) {
    return redirect("/dashboard");
  }

  return json({});
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const userId = await requireUserId(request, context);
  const formData = await request.formData();
  
  const rawData = {
    username: formData.get("username") as string,
    displayName: formData.get("displayName") as string,
    bio: formData.get("bio") as string,
  };

  const result = profileSchema.safeParse(rawData);
  if (!result.success) {
    return json({ errors: result.error.flatten().fieldErrors }, { status: 400 });
  }

  const { username, displayName, bio } = result.data;

  const db = getDb(context);

  try {
    // Check if username is taken
    const existingProfile = await db.profile.findUnique({
      where: { username },
    });

    if (existingProfile) {
      return json({ errors: { username: ["Username is already taken."] } }, { status: 400 });
    }

    await db.profile.create({
      data: {
        userId,
        username,
        displayName,
        bio,
      },
    });

    return redirect("/dashboard");
  } catch (error) {
    console.error("Setup error:", error);
    return json({ errors: { _global: ["An unexpected error occurred."] } }, { status: 500 });
  }
};

interface ActionData {
  errors?: {
    username?: string[];
    displayName?: string[];
    bio?: string[];
    _global?: string[];
  };
}

export default function Setup() {
  const actionData = useActionData<typeof action>() as ActionData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Setup Your Profile</h1>
            <p className="text-slate-500">
              Let&apos;s get your digital business card ready.
            </p>
          </div>

          <Form method="post" className="space-y-6">
            {actionData?.errors?._global && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                {actionData.errors._global[0]}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="username"
                  id="username"
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    actionData?.errors?.username ? "border-red-500" : "border-slate-300"
                  }`}
                  placeholder="johndoe"
                />
              </div>
              {actionData?.errors?.username && (
                <p className="text-sm text-red-500">{actionData.errors.username[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                id="displayName"
                className={`block w-full px-3 py-2 border rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  actionData?.errors?.displayName ? "border-red-500" : "border-slate-300"
                }`}
                placeholder="John Doe"
              />
              {actionData?.errors?.displayName && (
                <p className="text-sm text-red-500">{actionData.errors.displayName[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
                Bio (Optional)
              </label>
              <textarea
                name="bio"
                id="bio"
                rows={3}
                className="block w-full px-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Tell us about yourself"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Profile..." : "Complete Setup"}
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
