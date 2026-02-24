import { type ActionFunctionArgs, json, redirect, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useActionData, useNavigation, Link, useSearchParams, useLoaderData } from "@remix-run/react";
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

import { isInvitationOnlyMode } from "~/utils/settings.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const userId = await getUserId(request, context);
  if (userId) return redirect("/dashboard");
  
  const isInvitationOnly = await isInvitationOnlyMode(context);
  return json({ isInvitationOnly });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const inviteCode = formData.get("inviteCode");
  const profileIdRaw = formData.get("profileId");

  const isInvitationOnly = await isInvitationOnlyMode(context);

  const hasProfileId =
    typeof profileIdRaw === "string" && profileIdRaw.trim().length > 0;
  const hasInviteCode =
    typeof inviteCode === "string" && inviteCode.trim().length > 0;

  if (
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return json(
      { error: "Email and Password are required." },
      { status: 400 }
    );
  }

  if (isInvitationOnly && (!hasProfileId || !hasInviteCode)) {
    return json(
      { error: "Registration is by invitation only." },
      { status: 400 }
    );
  }

  const db = getDb(context);

  try {
    let inviteRole = "INDIVIDUAL";
    let inviteOrgName: string | undefined;
    let inviteOrgSlug: string | undefined;

    const profileId =
      typeof profileIdRaw === "string" && profileIdRaw.trim().length > 0
        ? profileIdRaw.trim()
        : undefined;

    const existingCardUser =
      profileId
        ? await db.user.findUnique({
            where: { profileId },
          })
        : null;

    let isCardActivation = false;

    if (profileId) {
      if (typeof inviteCode !== "string" || !inviteCode.trim()) {
        if (isInvitationOnly) {
          return json(
            { error: "Registration is by invitation only." },
            { status: 400 }
          );
        }

        return json(
          { error: "Invalid card link. Invite code is missing." },
          { status: 400 }
        );
      }

      if (!existingCardUser) {
        if (isInvitationOnly) {
          return json(
            { error: "Registration is by invitation only." },
            { status: 400 }
          );
        }

        return json(
          { error: "Invalid card profile. Please contact support." },
          { status: 400 }
        );
      }

      if (existingCardUser.isActivated) {
        return json(
          { error: "This card is already activated. Please login instead." },
          { status: 400 }
        );
      }

      if (
        !existingCardUser.secretKey ||
        existingCardUser.secretKey !== inviteCode
      ) {
        if (isInvitationOnly) {
          return json(
            { error: "Registration is by invitation only." },
            { status: 400 }
          );
        }

        return json(
          { error: "Invalid invite code for this card." },
          { status: 400 }
        );
      }

      isCardActivation = true;
    }

    if (!isCardActivation && inviteCode) {
      const validCode = await db.inviteCode.findUnique({
        where: { code: inviteCode as string },
      });

      if (!validCode) {
        return json({ error: "Invalid invite code." }, { status: 400 });
      }

      if (validCode.isUsed) {
        return json(
          { error: "Invite code has already been used." },
          { status: 400 }
        );
      }

      inviteRole = validCode.role;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      inviteOrgName = validCode.organizationName || undefined;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      inviteOrgSlug = validCode.organizationSlug || undefined;
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return json(
        { error: "Email already registered. Please login instead." },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 10);
    const verificationToken = crypto.randomUUID();

    let newUser;

    if (isCardActivation && existingCardUser) {
      newUser = await db.user.update({
        where: { id: existingCardUser.id },
        data: {
          email,
          password: hashedPassword,
          role: inviteRole,
          isActivated: true,
          verificationToken,
        },
      });
    } else {
      newUser = await createUser(context, {
        email,
        passwordHash: hashedPassword,
        inviteCode: typeof inviteCode === "string" ? inviteCode : undefined,
        role: inviteRole,
        profileId,
      });

      if (
        !isInvitationOnly &&
        !profileId &&
        (!inviteCode || typeof inviteCode !== "string" || !inviteCode.trim())
      ) {
        const secretKey = crypto.randomUUID();
        await db.user.update({
          where: { id: newUser.id },
          data: { secretKey },
        });
      }

      await db.user.update({
        where: { id: newUser.id },
        data: { verificationToken },
      });
    }

    if (inviteRole === "BUSINESS_ADMIN" && inviteOrgName && inviteOrgSlug) {
      const existingOrg = await db.organization.findUnique({
        where: { slug: inviteOrgSlug },
      });

      let finalSlug = inviteOrgSlug;
      if (existingOrg) {
        finalSlug = `${inviteOrgSlug}-${Math.floor(Math.random() * 1000)}`;
      }

      await db.organization.create({
        data: {
          name: inviteOrgName,
          slug: finalSlug,
          adminId: newUser.id,
        },
      });
    }

    if (!isCardActivation && inviteCode) {
      await db.inviteCode.update({
        where: { code: inviteCode as string },
        data: {
          isUsed: true,
          userId: newUser.id,
        },
      });
    }

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
  const { isInvitationOnly } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get("profileId") || "";
  const defaultInviteCode =
    searchParams.get("inviteCode") ||
    searchParams.get("invite") ||
    "";
  const isCardActivation = Boolean(profileId && defaultInviteCode);
  const showInviteCodeField = isInvitationOnly && Boolean(profileId);

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

          {isInvitationOnly && !profileId && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
              Registration is by invitation only. Scan your ZanTag card to continue.
            </p>
          )}

          <Form method="post" className="space-y-6">
            <input type="hidden" name="profileId" value={profileId} />
            {profileId && (
              <div className="space-y-2">
                <Label htmlFor="profileIdDisplay">Profile ID</Label>
                <Input
                  id="profileIdDisplay"
                  name="profileIdDisplay"
                  value={profileId}
                  readOnly
                  className="bg-slate-50 border-slate-200"
                />
              </div>
            )}
            {showInviteCodeField && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  required
                  defaultValue={defaultInviteCode}
                  placeholder="Enter your invite code"
                  className="bg-slate-50 border-slate-200"
                  readOnly={isCardActivation}
                />
              </div>
            )}

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
