import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { leadSchema, type LeadFormValues } from "~/utils/schemas";

interface LeadFormProps {
  profileId: string;
}

export function LeadForm({ profileId }: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
  });

  const onSubmit = async (data: LeadFormValues) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Sending your information...");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, profileId, source: "FORM" }),
      });

      if (response.ok) {
        setIsSuccess(true);
        toast.success("Information shared successfully!", { id: toastId });
        reset();
      } else {
        throw new Error("Failed to send information");
      }
    } catch (error) {
      console.error("Failed to submit lead", error);
      toast.error("Failed to send information. Please try again.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-8 bg-teal-50 border border-teal-100 rounded-3xl text-center space-y-3 animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-teal-900">Information Sent!</h3>
        <p className="text-teal-700 text-sm">
          Your contact details have been shared. Thank you for connecting!
        </p>
        <Button 
          variant="outline" 
          onClick={() => setIsSuccess(false)}
          className="mt-4 border-teal-200 text-teal-700 hover:bg-teal-100 hover:text-teal-800 rounded-xl"
        >
          Send Another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 tap-highlight-none">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-slate-900">Share Your Info Back</h3>
        <p className="text-slate-500 text-sm">Fill in your details to stay in touch.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-slate-700">Full Name</Label>
          <div className="relative">
            <Input 
              placeholder="Your Full Name" 
              {...register("name")} 
              autoComplete="name"
              className={`h-14 text-base rounded-2xl bg-white border-slate-200 focus:border-[#06B6D4] focus:ring-[#06B6D4]/10 transition-all ${errors.name ? 'border-red-300 focus:ring-red-200' : ''}`}
            />
          </div>
          {errors.name && <p className="text-red-500 text-xs ml-1 font-medium">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium text-slate-700">Email Address</Label>
          <Input 
            type="email"
            placeholder="Email Address" 
            {...register("email")} 
            autoComplete="email"
            inputMode="email"
            className={`h-14 text-base rounded-2xl bg-white border-slate-200 focus:border-[#06B6D4] focus:ring-[#06B6D4]/10 transition-all ${errors.email ? 'border-red-300 focus:ring-red-200' : ''}`}
          />
          {errors.email && <p className="text-red-500 text-xs ml-1 font-medium">{errors.email.message}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium text-slate-700">Phone Number</Label>
          <Input 
            type="tel"
            placeholder="Phone Number" 
            {...register("phone")} 
            autoComplete="tel"
            inputMode="tel"
            className="h-14 text-base rounded-2xl bg-white border-slate-200 focus:border-[#06B6D4] focus:ring-[#06B6D4]/10 transition-all"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium text-slate-700">Notes</Label>
          <Textarea 
            placeholder="Add a note (optional)" 
            {...register("notes")} 
            className="min-h-[100px] text-base rounded-2xl bg-white border-slate-200 focus:border-[#06B6D4] focus:ring-[#06B6D4]/10 transition-all resize-none"
          />
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full h-14 text-lg font-bold bg-[#06B6D4] hover:bg-[#0891B2] text-white rounded-2xl shadow-lg shadow-[#06B6D4]/20 transition-all active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin mr-2">◌</span>
              Sharing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Share Information
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
