# Detailed Implementation Plan: ZanTag 2.0 Refactoring

## 1. Database Schema Changes (`prisma/schema.prisma`)

We will update the schema to support the 4 Master Business Flows.

```prisma
model User {
  id                String      @id @default(cuid())
  email             String      @unique
  // ... existing fields
  role              String      @default("INDIVIDUAL") // INDIVIDUAL, SUPER_ADMIN, BUSINESS_ADMIN, BUSINESS_STAFF
  
  // NEW FIELDS
  shortCode         String?     @unique // The unique 5-character code (e.g., 11julq)
  status            String      @default("ACTIVE") // ACTIVE, INACTIVE, GRACE_PERIOD
  separatedAt       DateTime?   // Timestamp when staff was removed (start of 30-day grace)
  
  // Relations
  profile           Profile?
  organizationsAdmin Organization[] // Companies managed by this user
}

model Organization {
  id        String    @id @default(cuid())
  name      String
  slug      String    @unique // company_shortname
  // ... existing fields
  
  // NEW FIELDS
  maxSeats          Int       @default(5) // Package limit
  // occupiedSeats can be calculated via count of linked Profiles
  
  adminId   String
  admin     User      @relation(fields: [adminId], references: [id], onDelete: Cascade)
  profiles  Profile[] // Staff profiles linked to this company
}
```

## 2. Services Layer Structure (`app/services/`)

We will move business logic out of routes into dedicated service files.

- **`app/services/auth.server.ts`**
  - Login, Signup, Session management (cookie handling).
  - Password hashing/verification.

- **`app/services/user.server.ts`**
  - User creation (assigning `shortCode` automatically).
  - Role management.
  - Profile retrieval.

- **`app/services/business.server.ts`**
  - **Seat Management:** Check `maxSeats` before adding staff.
  - **Grace Period Logic:** 
    - `removeStaff(userId)`: Sets `separatedAt = now()`, `status = GRACE_PERIOD`.
    - `finalizeSeparation(userId)`: Called after 30 days or manually. Sets `companyId = null`, `role = INDIVIDUAL`, `status = ACTIVE`.
  - Organization CRUD.

- **`app/services/redirect.server.ts`**
  - **Master Redirection Logic:**
    - Input: `shortCode`
    - Output: Redirect URL
    - Logic:
      - Fetch User + Role + Profile + Company.
      - If `INDIVIDUAL` -> `/p/:username`
      - If `BUSINESS_STAFF` -> `/:company_slug/:username`

- **`app/services/storage.server.ts`**
  - R2 Wrapper using `{shortCode}` folder structure.
  - `uploadAsset(shortCode, file)` -> `r2-bucket/users/{shortCode}/...`

## 3. Redirection Logic Implementation

We will create a specific route to handle the short links.

- **File:** `app/routes/c.$shortCode.ts` (Resource Route)
- **Logic:**
  ```typescript
  export const loader = async ({ params }) => {
    const target = await resolveShortCode(params.shortCode);
    return redirect(target);
  };
  ```

## 4. Refactoring & Cleanup Map

| Current Location | New Location / Action | Description |
| :--- | :--- | :--- |
| `app/utils/session.server.ts` | `app/services/auth.server.ts` | Consolidate auth logic. |
| `app/routes/admin.*` | `app/routes/admin.*` | Refactor to use `business.server.ts` for logic. |
| `app/routes/api.admin.*` | `app/services/*` | Move logic to services, keep routes thin or remove if unused. |
| `temp_reference/` | **DELETE** | Confirm deletion (already done). |
| `temp_zantag_vercel/` | **DELETE** | Confirm deletion (already done). |
| `app/components/ui/*` | `app/components/ui/*` | Keep atomic components. |
| `app/components/dashboard/*` | `app/components/dashboard/*` | Keep dashboard-specific components. |
| **NEW** | `app/routes/p.$username.tsx` | Public profile route for Individuals. |
| **NEW** | `app/routes/$company.$username.tsx` | Public profile route for Business Staff. |

## 5. Execution Steps

1.  **Schema Update:** Apply changes to `prisma/schema.prisma` and push to DB.
2.  **Service Creation:** specific `*.server.ts` files in `app/services/`.
3.  **Route Implementation:**
    - Create `/c/$shortCode`.
    - Create `/p/$username`.
    - Create `/$company/$username`.
4.  **Dashboard Refactoring:** Update Admin/Business dashboards to use new Seat/Grace logic.
5.  **Cleanup:** Remove any remaining legacy code.

**Awaiting your approval to proceed.**
