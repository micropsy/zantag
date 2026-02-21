import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { ArrowRight, CreditCard, Share2, Users, FileText, Scan, BarChart3, ShieldCheck, Building2 } from "lucide-react";
import { LandingHeader } from "~/components/LandingHeader";
import { getUser } from "~/utils/session.server";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const user = await getUser(request, context);
  // For now, hardcode invitation only mode as requested
  const isInvitationOnly = true; 
  return json({ user, isInvitationOnly });
};

export default function Index() {
  const { isInvitationOnly } = useLoaderData<typeof loader>();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <LandingHeader isInvitationOnly={isInvitationOnly} />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#0F172A] tracking-tight mb-6">
            Your Professional Identity, <br />
            <span className="text-[#06B6D4]">Simplified.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl">
            Create a stunning digital business card, manage your leads, and share documents with ease. The all-in-one platform for modern professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to={isInvitationOnly ? "/signup" : "/signup"}>
              <Button size="lg" className="bg-[#0F172A] hover:bg-slate-800 text-white px-8 h-14 text-lg">
                {isInvitationOnly ? "Redeem Invitation" : "Create Your Card Now"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            {isInvitationOnly && (
              <Button size="lg" variant="outline" className="px-8 h-14 text-lg border-slate-200">
                Contact for Invitation
              </Button>
            )}
            {!isInvitationOnly && (
              <Button size="lg" variant="outline" className="px-8 h-14 text-lg border-slate-200">
                Learn More
              </Button>
            )}
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <CreditCard className="text-slate-900 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Digital vCard</h3>
              <p className="text-slate-600 leading-relaxed">Instantly share your contact details with a simple scan or link.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-6">
                <Users className="text-cyan-500 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Lead Manager</h3>
              <p className="text-slate-600 leading-relaxed">Capture and organize leads from manual entry, OCR, or forms.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                <FileText className="text-slate-900 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Doc Library</h3>
              <p className="text-slate-600 leading-relaxed">Securely host and share your professional documents and PDFs.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-6">
                <Share2 className="text-cyan-500 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">Easy Sharing</h3>
              <p className="text-slate-600 leading-relaxed">Dynamic URLs and QR codes for seamless networking everywhere.</p>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="px-6 py-24 bg-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 text-center mb-16 tracking-tight">How it Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center hover:bg-white hover:shadow-md transition-all">
                <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Scan className="w-7 h-7 text-slate-700" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-slate-900">Scan</h3>
                <p className="text-slate-600">Scan QR or tap NFC to open your card instantly.</p>
              </div>
              <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center hover:bg-white hover:shadow-md transition-all">
                <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-7 h-7 text-cyan-600" />
                </div>
                <h3 className="font-bold text-xl mb-3 text-slate-900">Connect</h3>
                <p className="text-slate-600">Share links and documents with one tap.</p>
              </div>
              <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-center hover:bg-white hover:shadow-md transition-all">
                <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-7 h-7 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <h3 className="font-bold text-xl mb-3 text-slate-900">Save</h3>
                <p className="text-slate-600">Add contacts via vCard into your phone.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Business Solutions */}
        <section className="px-6 py-24 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Business Solutions</h2>
              <p className="text-lg text-slate-600">Manage teams, standardize branding, and measure impact.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="text-cyan-500 w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Team Management</h3>
                <p className="text-slate-600 leading-relaxed">Create and manage digital cards for all employees with centralized control.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
                  <ShieldCheck className="text-slate-900 w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Brand Control</h3>
                <p className="text-slate-600 leading-relaxed">Ensure consistent templates and color themes across your organization.</p>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="text-cyan-500 w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Analytics</h3>
                <p className="text-slate-600 leading-relaxed">Track scans, shares, and conversions with detailed dashboards.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose ZanTag */}
        <section className="px-6 py-24 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Why Choose ZanTag</h2>
              <p className="text-lg text-slate-600">Premium, minimalist, and mobile-optimized.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                <h3 className="text-lg font-bold mb-3 text-slate-900">OCR Accuracy</h3>
                <p className="text-slate-600 text-sm leading-relaxed">High-quality OCR to capture business cards reliably.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                <h3 className="text-lg font-bold mb-3 text-slate-900">PWA Capability</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Install as an app for fast, offline-ready access.</p>
              </div>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                <h3 className="text-lg font-bold mb-3 text-slate-900">Data Privacy</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Secure storage with user control over shared data.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0F172A] text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="ZanTag Logo" width={32} height={32} className="rounded-lg bg-white/10 p-0.5" />
            <span className="text-xl font-bold">ZanTag</span>
          </div>
          <p className="text-slate-400 text-sm">
            © 2026 ZanTag. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
