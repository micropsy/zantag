import { json, type ActionFunctionArgs, type LoaderFunctionArgs, redirect } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link, useSearchParams } from "@remix-run/react";
import { Loader2 } from "lucide-react";
import { getDb } from "~/utils/db.server";
import { createUserSession, getUserId } from "~/utils/session.server";
import { compare } from "bcrypt-ts";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useEffect } from "react";
import { toast } from "sonner";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await getUserId(request, context);
  if (userId) return redirect("/dashboard");
  return json({});
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  try {
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

    return createUserSession(user.id, "/dashboard", context);
  } catch (error) {
    console.error("Login error:", error);
    return json({ 
      error: error instanceof Error ? error.message : "An unexpected error occurred during login" 
    }, { status: 500 });
  }
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  useEffect(() => {
    if (resetSuccess) {
      toast.success("Password reset successfully. Please login with your new password.");
    }
    if (actionData?.error) {
      toast.error(actionData.error);
    }
  }, [actionData, resetSuccess]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="text-slate-500">
              Enter your credentials to access your account
            </p>
          </div>

          <Form method="post" className="space-y-6">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
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
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </Form>

          <div className="text-center text-sm">
            <span className="text-slate-500">Don&apos;t have an account? </span>
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Hero/Image */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 max-w-lg">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-8 border border-white/20">
            <div className="font-bold text-2xl text-white">Z</div>
          </div>
          <blockquote className="space-y-6">
            <p className="text-2xl font-medium leading-relaxed">
              &quot;ZanTag has completely transformed how I network. The digital business card is sleek, professional, and always makes a great first impression.&quot;
            </p>
            <footer className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold">
                JD
              </div>
              <div>
                <div className="font-semibold">John Doe</div>
                <div className="text-slate-400 text-sm">Marketing Director, TechFlow</div>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
