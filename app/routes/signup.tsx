import { type ActionFunctionArgs, json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link, useSearchParams } from "@remix-run/react";
import { getDb } from "~/utils/db.server";
import { sendEmail } from "~/utils/email.server";
import { getVerifyEmailHtml } from "~/components/email/templates";
import { getUserId } from "~/utils/session.server";
import { hash } from "bcrypt-ts";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

import { createUser } from "~/services/user.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await getUserId(request, context);
  if (userId) return redirect("/dashboard");
  return json({});
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const inviteCode = formData.get("inviteCode");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof inviteCode !== "string"
  ) {
    return json(
      { error: "Email, Password, and Invite Code are required." },
      { status: 400 }
    );
  }

  const db = getDb(context);

  try {
    // 1. Verify Invite Code
    const validCode = await db.inviteCode.findUnique({
      where: { code: inviteCode },
    });

    if (!validCode) {
      return json({ error: "Invalid invite code." }, { status: 400 });
    }

    if (validCode.isUsed) {
      return json({ error: "Invite code has already been used." }, { status: 400 });
    }

    // 2. Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return json(
        { error: "Email already registered. Please login instead." },
        { status: 400 }
      );
    }

    // 3. Create User (Unverified)
    const hashedPassword = await hash(password, 10);
    const verificationToken = crypto.randomUUID();

    const newUser = await createUser(context, {
      email,
      passwordHash: hashedPassword,
      inviteCode
    });
    
    // Update verification token (since createUser doesn't set it)
    await db.user.update({
      where: { id: newUser.id },
      data: { verificationToken }
    });

    // 4. Mark invite code as used
    await db.inviteCode.update({
      where: { code: inviteCode },
      data: {
        isUsed: true,
        userId: newUser.id,
      },
    });

    // 5. Send Verification Email
    const verifyUrl = `${new URL(request.url).origin}/verify?token=${verificationToken}`;
    
    await sendEmail(context, {
      to: email,
      subject: "Verify your email address",
      html: getVerifyEmailHtml(verifyUrl),
      text: `Please verify your email by clicking here: ${verifyUrl}`,
    });

    return redirect(`/verify-sent?email=${email}`);

  } catch (error) {
    console.error("Signup error:", error);
    return json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
};

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const defaultInviteCode = searchParams.get("invite") || "";

  useEffect(() => {
    if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create an account</h1>
            <p className="text-slate-500">
              Enter your details to get started with ZanTag
            </p>
          </div>

          <Form method="post" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                required
                defaultValue={defaultInviteCode}
                placeholder="Enter your invite code"
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
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
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </Form>

          <div className="text-center text-sm">
            <span className="text-slate-500">Already have an account? </span>
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Hero/Image */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <blockquote className="space-y-6">
            <p className="text-2xl font-medium leading-relaxed">
              &ldquo;The best way to predict the future is to create it. Join a community of forward-thinking professionals.&rdquo;
            </p>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
