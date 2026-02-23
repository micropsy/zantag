import { useState } from "react";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "~/lib/utils";

interface LandingHeaderProps {
  isInvitationOnly: boolean;
}

export function LandingHeader({ isInvitationOnly }: LandingHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="ZanTag Logo" width={32} height={32} className="rounded-lg" />
          <span className="text-xl font-bold text-[#0F172A]">ZanTag</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-[#06B6D4] hover:bg-[#0891B2] text-white">
              {isInvitationOnly ? "Redeem Invite" : "Get Started"}
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      <div className={cn(
        "fixed inset-0 top-[65px] bg-white z-40 md:hidden transition-all duration-300 ease-in-out",
        isOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
      )}>
        <div className="flex flex-col p-6 gap-4">
          <Link to="/login" onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full justify-center h-12 text-lg">
              Login
            </Button>
          </Link>
          <Link to="/signup" onClick={() => setIsOpen(false)}>
            <Button className="w-full justify-center h-12 text-lg bg-[#06B6D4] hover:bg-[#0891B2] text-white">
              {isInvitationOnly ? "Redeem Invite" : "Get Started"}
            </Button>
          </Link>
          
          <div className="mt-8 pt-8 border-t border-slate-100">
            <p className="text-sm text-slate-500 text-center">
            &copy; 2026 ZanTag. Your Professional Identity, Simplified.
          </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
