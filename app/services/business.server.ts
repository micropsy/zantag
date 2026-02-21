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
  // Count occupied seats: Active staff + Grace Period users + Finalized Inactive Individuals
  // Requirement: "Even if a staff is 'Separated' and becomes an 'Individual' after 30 days, 
  // their profile must still count as an 'Occupied Seat' (Inactive status) in the Organization table 
  // IF the Admin did not delete them within the 30-day window."
  const occupiedSeats = organization.profiles.filter(p => {
    // Check if user exists and match status criteria
    return p.userId && (
      p.user.status === "ACTIVE" || 
      p.user.status === "GRACE_PERIOD" || 
      p.user.status === "INACTIVE"
    );
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
export async function deleteStaffMember(context: AppLoadContext, adminId: string, staffUserId: string) {
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
    // After 30 days: Admin CANNOT delete
    throw new Error("Staff member has passed the 30-day grace period and cannot be deleted. Seat remains occupied.");
  }
}
