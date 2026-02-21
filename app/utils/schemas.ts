import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export const profileSchema = z.object({
  displayName: z.string().min(1, "Display Name is required"),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  bio: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
