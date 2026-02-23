import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, useLoaderData, Link } from "@remix-run/react";
import { z } from "zod";
import { getDb } from "~/utils/db.server";
import { hash } from "bcrypt-ts";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { token } = params;

  if (!token) {
    return redirect("/forgot-password");
  }

  const db = getDb(context);
  const user = await db.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return json({ error: "Invalid or expired password reset token.", valid: false });
  }

  return json({ valid: true, token, error: null });
};

const ResetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { token } = params;
  if (!token) return redirect("/forgot-password");

  const formData = await request.formData();
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  const result = ResetPasswordSchema.safeParse({ password, confirmPassword });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    return json(
      { error: errors.password?.[0] || errors.confirmPassword?.[0] || "Invalid input", success: false },
      { status: 400 }
    );
  }

  const db = getDb(context);
  const user = await db.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return json(
      { error: "Invalid or expired password reset token.", success: false },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(result.data.password, 10);

  await db.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiresAt: null,
    },
  });

  return redirect("/login?reset=success");
};

export default function ResetPassword() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (!loaderData.valid) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
             <div className="flex justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900">Invalid Link</h2>
             <p className="text-gray-600 mt-2">{loaderData.error}</p>
             <div className="mt-6">
                <Button asChild>
                  <a href="/forgot-password">Request a new link</a>
                </Button>
             </div>
          </div>
        </div>
     );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center lg:justify-start">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="ZanTag Logo" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-slate-900">ZanTag</span>
            </Link>
          </div>
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reset Password</h1>
            <p className="text-slate-500">
              Enter your new password below.
            </p>
          </div>

          <Form method="post" className="space-y-6">
            {actionData?.error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{actionData.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </Form>
        </div>
      </div>

      {/* Right Side - Hero/Image */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1932&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <blockquote className="space-y-6">
            <p className="text-2xl font-medium leading-relaxed">
              &quot;Innovation distinguishes between a leader and a follower. ZanTag empowers you to lead with a strong digital presence.&quot;
            </p>
            <footer className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold">
                MJ
              </div>
              <div>
                <div className="font-semibold">Michael Jordan</div>
                <div className="text-slate-400 text-sm">CEO, InnovateX</div>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
