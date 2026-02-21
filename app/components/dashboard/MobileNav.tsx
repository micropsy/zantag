import { Link, useLocation } from "@remix-run/react";
import { cn } from "~/lib/utils";
import { navigationItems } from "~/components/dashboard/navigation";

export function MobileNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 px-2 pb-[env(safe-area-inset-bottom)] flex justify-around items-center h-[calc(60px+env(safe-area-inset-bottom))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {navigationItems
        .filter(item => !item.roles && item.href !== "/dashboard/settings") // Simple filter for mobile
        .map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 flex-1 h-full pt-2",
              isActive ? "text-[#06B6D4]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div className={cn(
              "p-1 rounded-full transition-all duration-300",
              isActive ? "bg-[#06B6D4]/10 -translate-y-1" : "bg-transparent"
            )}>
              <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
            </div>
            <span className={cn(
              "text-[10px] font-medium tracking-tight transition-all duration-300",
              isActive ? "text-[#06B6D4] font-bold" : "text-slate-400 scale-90"
            )}>{item.mobileLabel || item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
