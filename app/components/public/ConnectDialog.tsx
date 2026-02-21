import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toast } from "sonner";
import { useFetcher } from "@remix-run/react";

interface ConnectDialogProps {
  profileId: string;
  profileName: string;
}

export function ConnectDialog({ profileId, profileName }: ConnectDialogProps) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      profileId,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      notes: formData.get("notes") as string,
      source: "PROFILE_CONNECT",
    };

    fetcher.submit(data, {
      method: "post",
      action: "/api/leads",
      encType: "application/json",
    });
  };

  // Handle success/error side effects
  if (fetcher.data && (fetcher.data as { success?: boolean }).success && open) {
    setOpen(false);
    toast.success("Info sent successfully!");
    // Reset fetcher data? usually handled by remix but we can't easily reset it without navigation
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-slate-300 hover:bg-slate-100">
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect with {profileName}</DialogTitle>
          <DialogDescription>
            Share your contact details with {profileName}.
          </DialogDescription>
        </DialogHeader>
        <fetcher.Form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Your Name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="your@email.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+1234567890" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Message (Optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Hi, let's connect!" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Info"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
