import { useState, useRef, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus, Save, ScanLine } from "lucide-react";
import { useFetcher } from "@remix-run/react";

import { leadSchema, type LeadFormValues } from "~/utils/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface ManualLeadFormProps {
  profileId: string;
}

export function ManualLeadForm({ profileId }: ManualLeadFormProps) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    }
  });

  const onSubmit = (data: LeadFormValues) => {
    fetcher.submit(
      { ...data, profileId, source: "MANUAL" },
      { method: "post", action: "/api/leads" }
    );
  };

  useEffect(() => {
    const data = fetcher.data as { success?: boolean; error?: string } | undefined;
    if (fetcher.state === "idle" && data) {
      if (data.success) {
        toast.success("New lead captured!");
        reset();
      } else if (data.error) {
        toast.error(data.error);
      }
    }
  }, [fetcher.state, fetcher.data, reset]);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const toastId = toast.loading("Analyzing business card with OCR...");

    try {
      const worker = await createWorker("eng");
      const imageUrl = URL.createObjectURL(file);
      const { data: { text } } = await worker.recognize(imageUrl);
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);

      // Parsing logic - keeping it here for client-side performance, but could be moved to a shared util
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;

      let email = "";
      let phone = "";
      let name = "";

      // Improved parsing logic
      for (const line of lines) {
        if (!email && emailRegex.test(line)) {
          email = line.match(emailRegex)?.[0] || "";
        } else if (!phone && phoneRegex.test(line)) {
          phone = line.match(phoneRegex)?.[0] || "";
        } else if (!name && !line.includes("@") && !/\d{5,}/.test(line)) {
          // Assume the first reasonably short line without many digits or @ is the name
          name = line;
        }
      }

      const currentValues = watch();
      setValue("name", name || currentValues.name);
      setValue("email", (email || currentValues.email) || "");
      setValue("phone", phone || currentValues.phone);
      setValue("notes", currentValues.notes ? `${currentValues.notes}\n[OCR Scanned]` : "[OCR Scanned]");

      toast.success("Card details extracted!", { id: toastId });
    } catch (error) {
      console.error("OCR_ERROR", error);
      toast.error("Failed to read card. Please enter manually.", { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Add New Lead
        </CardTitle>
        <CardDescription>
          Manually enter details or scan a business card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-20 flex flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning || isSubmitting}
          >
            {isScanning ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ScanLine className="w-6 h-6 text-primary" />}
            <span className="text-xs font-medium">Scan Card (OCR)</span>
          </Button>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleScan}
          />
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-20 flex flex-col gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5"
            onClick={() => reset()}
            disabled={isSubmitting}
          >
             <UserPlus className="w-6 h-6 text-primary" />
             <span className="text-xs font-medium">Reset Form</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input 
              id="name" 
              placeholder="John Doe" 
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="john@example.com" 
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="+1 234 567 890" 
                {...register("phone")}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              placeholder="Met at Tech Conference..." 
              className="resize-none"
              {...register("notes")}
            />
            {errors.notes && <p className="text-sm text-red-500">{errors.notes.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Lead
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
