import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { toast } from "sonner";
import { UserRole } from "~/types";

export function SystemConfig({ user }: { user: { role: string } }) {
  const [invitationOnly, setInvitationOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json() as { invitationOnly: boolean };
          setInvitationOnly(data.invitationOnly);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.role === UserRole.SUPER_ADMIN) {
      fetchSettings();
    } else if (user) {
      setIsLoading(false);
    }
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationOnly: checked }),
      });
      if (res.ok) {
        setInvitationOnly(checked);
        toast.success(`Invitation system ${checked ? "enabled" : "disabled"}`);
      } else {
        toast.error("Failed to update settings");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const isAdmin = user?.role === UserRole.SUPER_ADMIN;

  return (
    <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-600" />
          <CardTitle>System Config</CardTitle>
        </div>
        <CardDescription>Configure global platform settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading settings...</div>
        ) : isAdmin ? (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-0.5">
              <Label className="text-base font-medium text-slate-900">Invitation-Only Mode</Label>
              <p className="text-sm text-slate-500">
                When enabled, new users must have a valid invite code to register.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                {invitationOnly ? "Enabled" : "Disabled"}
              </span>
              <Switch 
                checked={invitationOnly} 
                onCheckedChange={handleToggle} 
                className="data-[state=unchecked]:bg-slate-200 data-[state=checked]:bg-teal-600" 
              />
            </div>
          </div>
        ) : (
          <p className="text-slate-600 text-sm">
            Only administrators can change system configurations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
