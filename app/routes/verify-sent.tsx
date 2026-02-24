import { Link, useSearchParams } from "@remix-run/react";
import { Mail } from "lucide-react";

export default function VerifySent() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md w-full">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
        <p className="text-slate-500 mb-6">
          We&apos;ve sent a verification link to <span className="font-medium text-slate-900">{email}</span>.
          Please check your inbox to continue.
        </p>
        <div className="text-sm text-slate-400">
          Didn&apos;t receive the email? <Link to="/register" className="text-primary hover:underline">Try again</Link>
        </div>
      </div>
    </div>
  );
}
