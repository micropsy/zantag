import { Link, useLocation, Form } from "@remix-run/react";
import { cn } from "~/lib/utils";
import { LogOut } from "lucide-react";
import { navigationItems } from "~/components/dashboard/navigation";

interface SidebarProps {
  user?: {
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const role = user?.role || "INDIVIDUAL";

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 z-40 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <img src="/logo.png" alt="ZanTag" className="w-8 h-8 rounded-lg" />
        <h1 className="text-2xl font-bold text-teal-400">ZanTag</h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navigationItems
          .filter((item) => {
            if (item.roles) return item.roles.includes(role);
            return !item.adminOnly || role === "SUPER_ADMIN";
          })
          .map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-teal-500/10 text-teal-400 border-l-4 border-teal-500 rounded-l-none" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-teal-400" : "text-slate-400 group-hover:text-white"
              )} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Form action="/logout" method="post">
          <button 
            type="submit"
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </Form>
      </div>
    </aside>
  );
}
