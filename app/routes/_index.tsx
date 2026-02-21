import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData, Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { ArrowRight, Contact, Share2, Users, FileText, Scan, BarChart3, ShieldCheck, Building2 } from "lucide-react";
import { LandingHeader } from "~/components/LandingHeader";
import { getUser } from "~/utils/session.server";
import { RouteErrorBoundary } from "~/components/RouteErrorBoundary";

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

        {/* Feature Grid */}
        <section className="px-6 py-20 bg-white border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-cyan-50 rounded-lg flex items-center justify-center text-cyan-600 mb-4">
                  <Contact className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Digital Business Card</h3>
                <p className="text-slate-600 leading-relaxed">
                  Create a professional profile that showcases your bio, social links, and contact info. Always up-to-date and easily shareable.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Easy Sharing</h3>
                <p className="text-slate-600 leading-relaxed">
                  Share your profile via QR code, link, or NFC. No app required for others to view your card or save your contact.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Lead Capture</h3>
                <p className="text-slate-600 leading-relaxed">
                  Collect contact information from people you meet. Manage and export your leads directly from your dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Extended Features */}
        <section className="px-6 py-20 bg-slate-50">
           <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                 <h2 className="text-3xl font-bold text-slate-900 mb-4">More than just a card</h2>
                 <p className="text-slate-600 max-w-2xl mx-auto">
                    Powerful tools to help you grow your network and manage your business relationships.
                 </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <FileText className="w-8 h-8 text-blue-500 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Document Sharing</h3>
                    <p className="text-slate-600 text-sm">Upload and share brochures, catalogs, and presentations directly from your profile.</p>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <Scan className="w-8 h-8 text-purple-500 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">QR Code Generator</h3>
                    <p className="text-slate-600 text-sm">Download high-quality QR codes for your marketing materials and business cards.</p>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <BarChart3 className="w-8 h-8 text-emerald-500 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Analytics</h3>
                    <p className="text-slate-600 text-sm">Track views and clicks to understand how your profile is performing.</p>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <ShieldCheck className="w-8 h-8 text-orange-500 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Privacy Control</h3>
                    <p className="text-slate-600 text-sm">Manage who sees your information with password protection and visibility settings.</p>
                 </div>
                 <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <Building2 className="w-8 h-8 text-slate-700 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Team Management</h3>
                    <p className="text-slate-600 text-sm">Manage profiles for your entire organization from a central admin dashboard.</p>
                 </div>
              </div>
           </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 bg-[#0F172A] text-white text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to upgrade your networking?</h2>
            <p className="text-slate-300 mb-10 text-lg">
              Join thousands of professionals who are making better connections with ZanTag.
            </p>
            <Link to="/signup">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-8 h-14 text-lg font-bold">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="font-bold text-xl tracking-tight text-slate-900">ZanTag</div>
          </div>
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} ZanTag. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export { RouteErrorBoundary as ErrorBoundary };
