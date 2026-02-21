import { QRCodeCanvas } from "qrcode.react";
import { Button } from "~/components/ui/button";
import { Download, QrCode, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { toast } from "sonner";

interface ProfileActionsProps {
  slug: string;
  name: string;
  profileUrl: string; // Full relative URL e.g. /p/username or /b/company/username
}

export function ProfileActions({ slug, name, profileUrl }: ProfileActionsProps) {
  const downloadVCard = () => {
    window.location.href = `/api/vcard?slug=${slug}`;
  };

  const baseUrl =
    (typeof window !== "undefined" ? window.location.origin : "");
  const fullProfileUrl =
    baseUrl + profileUrl;

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${slug}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success("QR Code downloaded!");
    }
  };

  const shareProfile = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navigator as any).share) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator as any).share({
          title: `${name}'s Profile`,
          text: `Check out ${name}'s digital business card on ZanTag!`,
          url: fullProfileUrl,
        });
      } catch {
        toast.error("Could not open native share.");
      }
    } else {
      try {
        if (typeof window !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(fullProfileUrl);
          toast.success("Profile link copied to clipboard!");
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = fullProfileUrl;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          document.body.removeChild(textarea);
          if (copied) {
            toast.success("Profile link copied to clipboard!");
          } else {
            toast.message("Copy failed. Long-press to copy the link.");
          }
        }
      } catch {
        toast.message("Copy unavailable. Long-press to copy the link.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full tap-highlight-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button onClick={downloadVCard} className="py-6 text-base bg-[#0F172A] hover:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200" variant="default">
          <Download className="mr-2 h-5 w-5" /> Save Contact
        </Button>
        <Button onClick={shareProfile} variant="outline" className="py-6 text-base border-slate-200 rounded-2xl hover:bg-slate-50">
          <Share2 className="mr-2 h-5 w-5 text-slate-600" /> Share Profile
        </Button>
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full py-6 text-lg border-slate-200 rounded-2xl bg-white/50 backdrop-blur-sm hover:bg-white transition-all">
            <QrCode className="mr-2 h-5 w-5 text-[#06B6D4]" /> Show QR Code
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-[#0F172A]">{name}&apos;s QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
              <QRCodeCanvas 
                id="qr-code-canvas"
                value={fullProfileUrl} 
                size={240}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="flex flex-col w-full gap-3">
              <Button onClick={downloadQRCode} className="w-full py-6 bg-[#06B6D4] hover:bg-[#0891B2] rounded-2xl text-lg font-bold">
                <Download className="mr-2 h-5 w-5" /> Download QR Image
              </Button>
              <p className="text-sm text-slate-500 text-center font-medium">
                Others can scan this to view your profile instantly.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
