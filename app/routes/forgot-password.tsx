import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
import { z } from "zod";
import { getDb } from "~/utils/db.server";
import { sendPasswordResetEmail } from "~/utils/email.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const loader = async ({}: LoaderFunctionArgs) => {
  return json({});
};

const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");

  const result = ForgotPasswordSchema.safeParse({ email });

  if (!result.success) {
    return json(
      { error: result.error.flatten().fieldErrors.email?.[0] || "Invalid input", success: false },
      { status: 400 }
    );
  }

  const db = getDb(context);
  const user = await db.user.findUnique({ where: { email: result.data.email } });

  if (!user) {
    // For security, don't reveal if the email exists or not.
    return json({ success: true, error: null });
  }

  // Generate a reset token
  const resetToken = crypto.randomUUID();
  const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await db.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiresAt,
    },
  });

  try {
    await sendPasswordResetEmail(context, user.email, resetToken);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return json(
      { error: "Failed to send reset email. Please try again later.", success: false },
      { status: 500 }
    );
  }

  return json({ success: true, error: null });
};

export default function ForgotPassword() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {actionData?.success ? (
          <div className="rounded-md bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Check your email
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    If an account exists with that email, we have sent a password reset link.
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-green-800 hover:text-green-700 underline"
                  >
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Form method="post" className="mt-8 space-y-6">
            <div className="space-y-4">
              {actionData?.error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{actionData.error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Back to Login
              </Link>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}
