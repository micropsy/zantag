import { json, type ActionFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
import { z } from "zod";
import { getDb } from "~/utils/db.server";
import { sendPasswordResetEmail } from "~/utils/email.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

export const loader = async () => {
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
    return json(
      { error: "Account not found. Please check your email or sign up.", success: false },
      { status: 400 }
    );
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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot Password?</h1>
            <p className="text-slate-500">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {actionData?.success ? (
            <div className="rounded-md bg-green-50 p-6 border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-base font-medium text-green-800">
                    Check your email
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      If an account exists with that email, we have sent a password reset link.
                    </p>
                  </div>
                  <div className="mt-6">
                    <Button asChild variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800">
                      <Link to="/login">
                        Back to Login
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
              
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  className="bg-slate-50 border-slate-200"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </Form>
          )}
        </div>
      </div>

      {/* Right Side - Hero/Image */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <blockquote className="space-y-6">
            <p className="text-2xl font-medium leading-relaxed">
              &quot;Security is not just a feature, it&apos;s a promise. We ensure your digital identity remains protected while you connect with the world.&quot;
            </p>
            <footer className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold">
                AS
              </div>
              <div>
                <div className="font-semibold">Alex Sarah</div>
                <div className="text-slate-400 text-sm">Head of Security, ZanTag</div>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
