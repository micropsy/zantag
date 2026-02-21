import { type AppLoadContext } from "@remix-run/cloudflare";
import { getDb } from "~/utils/db.server";
import { UserRole } from "~/types";

const GRACE_PERIOD_DAYS = 30;

// Helper to check if delete is allowed
export function canDeleteStaff(separatedAt: Date | null): boolean {
  if (!separatedAt) return false;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - separatedAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= GRACE_PERIOD_DAYS;
}

// Get organization stats including seat usage
export async function getOrganizationStats(context: AppLoadContext, organizationId: string) {
  const db = getDb(context);
  
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      profiles: {
        include: {
          user: true
        }
      }
    }
  });

  if (!organization) return null;

  const totalSeats = organization.maxSeats;
  // Count occupied seats: Active staff + Grace Period users + Finalized Inactive Individuals (if we keep them linked)
  // Logic: "After 30 days, the user becomes a permanent Individual, and their seat remains 'Inactive' in the company’s package usage."
  // This implies we need to track them even after they become INDIVIDUAL if they are still "occupying" a seat.
  // However, the schema says "companyId = null" for finalized individuals.
  // If companyId is null, we can't count them via `profiles`.
  // Wait, the prompt says: "After 30 days... seat remains 'Inactive' in the company’s package usage."
  // This suggests we might need a way to track these "ghost" seats.
  // For now, let's assume "Grace Period" users are still linked.
  // If they are finalized (fully separated), do they still take a seat?
  // "Scenario B: 20 days pass... Admin cannot delete. Seat permanently occupied."
  // This means we should NOT set companyId to null if we want to count them as a seat.
  // Or we need a separate table for "Licenses" or "Seats".
  // Given the current schema `Profile.companyId`, if we set it to null, we lose the link.
  // SO: For finalized individuals who consume a seat, we must KEEP `companyId` but change `User.role` to `INDIVIDUAL` and `User.status` to `INACTIVE` (or `SEPARATED`).
  
  const occupiedSeats = organization.profiles.filter(p => {
    // Count if User is associated
    return p.userId; 
  }).length;

  return {
    maxSeats: totalSeats,
    occupiedSeats,
    availableSeats: totalSeats - occupiedSeats
  };
}

// Remove staff (Start Grace Period)
export async function removeStaff(context: AppLoadContext, adminId: string, staffUserId: string) {
  const db = getDb(context);
  
  // Verify Admin
  const admin = await db.user.findUnique({ where: { id: adminId }, include: { organizationsAdmin: true } });
  if (!admin || (admin.role !== UserRole.BUSINESS_ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
    throw new Error("Unauthorized");
  }

  // Get Staff
  const staff = await db.user.findUnique({ where: { id: staffUserId } });
  if (!staff) throw new Error("Staff not found");

  // Update Status
  return db.user.update({
    where: { id: staffUserId },
    data: {
      status: "GRACE_PERIOD",
      separatedAt: new Date(),
    }
  });
}

// Finalize Separation (Hard Delete or Permanent Inactive)
export async function finalizeSeparation(context: AppLoadContext, adminId: string, staffUserId: string) {
  const db = getDb(context);
  const staff = await db.user.findUnique({ where: { id: staffUserId } });
  if (!staff) throw new Error("Staff not found");

  if (canDeleteStaff(staff.separatedAt)) {
    // Within 30 days: Hard Delete (Release Seat)
    // Delete User (Cascade deletes Profile)
    return db.user.delete({
      where: { id: staffUserId }
    });
  } else {
    // After 30 days: Permanent Inactive (Seat Occupied)
    // Change Role to INDIVIDUAL, Keep Company Link (to consume seat), Set Status INACTIVE
    return db.user.update({
      where: { id: staffUserId },
      data: {
        role: UserRole.INDIVIDUAL,
        status: "INACTIVE", // Seat still occupied
        separatedAt: null // Clear timer
      }
    });
  }
}
