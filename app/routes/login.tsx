import { json, type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link } from "@remix-run/react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { getDb } from "~/utils/db.server";
import { createUserSession, getUserId } from "~/utils/session.server";
import { compare } from "bcrypt-ts";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useEffect } from "react";
import { toast } from "sonner";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/dashboard");
  return json({});
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return json({ error: "Invalid form data" }, { status: 400 });
  }

  const db = getDb(context);
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !(await compare(password, user.password))) {
    return json({ error: "Invalid email or password" }, { status: 400 });
  }

  return createUserSession(user.id, "/dashboard");
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Dark Panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0F172A] p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] to-[#083344] z-0" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo.png" alt="ZanTag" width={40} height={40} className="rounded-lg bg-white/10 p-1" />
          <span className="text-2xl font-bold tracking-tight">ZanTag</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Welcome back to your <span className="text-[#06B6D4]">digital identity.</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Access your dashboard, manage your leads, and update your professional profile all in one place.
          </p>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">
          © 2026 ZanTag. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:hidden mb-6">
              <img src="/logo.png" alt="ZanTag" width={48} height={48} className="rounded-lg" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-600">Enter your email to sign in to your account</p>
          </div>

          <Form method="post" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm font-medium text-[#06B6D4] hover:text-[#0891B2]">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-12 text-base"
              />
            </div>

            {actionData?.error && (
              <div className="text-red-500 text-sm font-medium text-center p-2 bg-red-50 rounded-lg">
                {actionData.error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#06B6D4] hover:bg-[#0891B2] h-12 text-base font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Sign In
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button variant="outline" type="button" className="w-full h-12 text-base font-medium border-slate-200" disabled>
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google (Coming Soon)
            </Button>
          </Form>

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-[#06B6D4] hover:text-[#0891B2] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
