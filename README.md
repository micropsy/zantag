# ZanTag - Digital Business Card Platform

ZanTag is a modern digital business card platform that allows professionals to share their contact information, manage leads, and host documents securely. Built entirely on Cloudflare's serverless platform (Workers, D1, R2), ZanTag delivers high performance, scalability, and cost-effectiveness.

## Features

- **Digital vCard**: Instantly share contact details via QR code or link.
- **Lead Manager**: Capture and organize leads efficiently.
- **Document Library**: Host and share professional documents.
- **Easy Sharing**: Dynamic URLs and QR codes for seamless networking.
- **Card & Invite Management**: Generate and manage NFC card profile IDs (`profileId`) with activation control.
- **Dynamic Invite Code Rotation**: Secure one-time secret keys that rotate on every visit to prevent reuse.
- **Role-Based Access Control**: Support for individual and business users with distinct URL structures.
- **Automatic Profile Population**: Pre-fill registration forms with invitation details.

## Prerequisites

- Node.js (v18 or later)
- npm
- Wrangler (Cloudflare CLI)

## Installation

```bash
npm install
```

## Local Development Setup

To run the project locally, you need to set up the Cloudflare D1 database and R2 storage bucket simulation.

### 1. Database Setup (D1)

Create the D1 database locally and apply the schema:

```bash
# Create the database (if not already created)
npx wrangler d1 create zantag-db

# Apply the full schema to your local D1 database
npx wrangler d1 execute zantag-db --local --file=./migrations/0001_schema_full.sql
```

This SQL file is idempotent – you can run it multiple times without errors.  
It aligns the D1 schema with `prisma/schema.prisma` (including `profileId`, `isActivated`, and all related models).

### 2. Storage Setup (R2)

Create the R2 bucket for local development:

```bash
npx wrangler r2 bucket create zantag-assets
```

### 3. Environment Variables

For local development secrets, create a `.dev.vars` file in the root directory:

```bash
# Example .dev.vars
SESSION_SECRET="your-super-secret-session-key"
APP_URL="http://localhost:8788"
```

### 4. Start Development Server

```bash
npm run dev
```

## Verification

To verify the codebase:

```bash
# Check for security vulnerabilities
npm audit

# Run linter
npm run lint

# Build the project
npm run build
```

## Deployment

The project is configured for Cloudflare Pages using the existing `zantag` project:

- Project name in `wrangler.toml`: `zantag`
- Production deploys: push to the `main` branch on GitHub

Cloudflare Pages will pick up the changes and deploy to the existing production environment (no `v2` / `v3` projects are created).

---

## System Architecture & Business Logic

### Technology Stack

- **Frontend**: Remix (full-stack web framework)
- **Backend**: Cloudflare Workers (JavaScript/TypeScript)
- **Database**: Cloudflare D1 (SQLite-based serverless database)
- **Object Storage**: Cloudflare R2 (S3-compatible object storage)
- **ORM**: Prisma
- **Authentication**: Custom authentication integrated with Cloudflare features

### Business Logic

#### 1. User Registration & Invitation Flow

Users are invited to the platform via a unique invitation link: `/c/{profileId}`. This link contains:
- `profileId`: The unique identifier for the invited user
- `inviteCode` (secretKey): A secure token stored in D1 for validation

When a user clicks the invitation link:
1. The system checks if the user exists in D1
2. If the user is **not activated**, a new secure `secretKey` is generated using `crypto.randomUUID()`
3. The database is immediately updated with this new key (dynamic rotation)
4. The user is redirected to `/register` with the `profileId` and new `secretKey` pre-filled
5. The user enters their email and password to complete registration
6. Upon successful registration, the user's `isActivated` flag is set to `true`

#### 2. Profile Access Control

- **Unactivated Users**: Attempting to access `/p/{profileId}` redirects them to registration with pre-filled invitation details
- **Activated Individual Users**: Redirected to `/p/{username}` (or `/p/{profileId}` if no username set)
- **Activated Business Users**: Redirected to `/b/{companyShortname}/{profileId}`

#### 3. Content Storage

User-uploaded content (profile pictures, banners) is stored in Cloudflare R2 with the following naming convention:
- Profile picture: `profile_{profileId}.png`
- Banner picture: `banner_{profileId}.png`

Files are organized by `profileId` to ensure efficient storage and retrieval.

### System Flow

```
1. Invitation Generation
   └─> Super admin generates invitation link: /c/{profileId}?inviteCode={secretKey}

2. User Clicks Link
   └─> /c/{profileId} route is accessed

3. Unactivated User Handling
   ├─> Generate new secure secretKey using crypto.randomUUID()
   ├─> Update D1 with new secretKey (dynamic rotation)
   └─> Redirect to /register?id={profileId}&inviteCode={newSecretKey}

4. Registration
   ├─> User enters email and password
   ├─> Backend validates inviteCode against D1 secretKey
   ├─> If valid: Set isActivated = true
   └─> User account is activated

5. Profile Access
   ├─> Activated users can access their public profile
   ├─> Individual users: /p/{username}
   └─> Business users: /b/{companyShortname}/{profileId}

6. Content Upload
   └─> Files stored in R2 with profileId-based naming
```

### Security Measures

#### 1. Secure Password Storage
- All passwords are securely hashed and salted before being stored in D1
- Uses industry-standard hashing algorithms

#### 2. Dynamic Invite Code Rotation
- Every time an unactivated user visits `/c/{profileId}`, a new `secretKey` is generated
- The old key becomes immediately invalid in the database
- Prevents replay attacks and invite code reuse
- Browser history or cached URLs become useless after the first visit

#### 3. Data Validation
- All user inputs are validated on both frontend and backend
- Prevents injection attacks (SQL, XSS, etc.)
- Input sanitization applied to all text fields

#### 4. Cloudflare Security Features
- DDoS protection at the edge
- Web Application Firewall (WAF)
- Rate limiting capabilities
- SSL/TLS encryption for all traffic

#### 5. Access Control
- Role-based access control (super admin, business staff, individual users)
- Profile access restricted to activated users
- Business users have separate namespace via company slug

### Unique Features

#### 1. Cloudflare-Native Stack
Built entirely on Cloudflare's serverless platform, providing:
- **Global Edge Network**: Content delivered from the closest edge location
- **Automatic Scaling**: Zero infrastructure management
- **Cost-Effective**: Pay only for what you use
- **Developer Experience**: Unified tooling with Wrangler

#### 2. Seamless D1 + R2 Integration
- Unified authentication context across database and storage
- ProfileId-based organization for efficient data retrieval
- Atomic operations for user activation and file storage

#### 3. Invitation-Based Onboarding
- Controlled user acquisition process
- Pre-filled registration forms reduce friction
- Automatic validation via secretKey
- Prevents spam and unauthorized signups

#### 4. Dynamic URL Structure
- **Permanent Invitation Link**: `/c/{profileId}` remains valid for the user's lifetime
- **Personalized Profile URLs**: `/p/{username}` for individuals
- **Business URLs**: `/b/{companyShortname}/{profileId}` for corporate users
- **Auto-Redirect**: Smart routing based on user activation and role

#### 5. Automatic Parameter Population
- `profileId` and `inviteCode` automatically extracted from URL
- Pre-filled in registration form for seamless onboarding
- Reduces user input errors and improves conversion

#### 6. Secure One-Time Secret Key Logic
- Every visit to `/c/{profileId}` generates a fresh `secretKey`
- Old keys immediately invalidated in database
- QR codes and links remain secure even if shared publicly
- Prevents invite code harvesting and replay attacks

#### 7. Super Admin Override
- Super admin users can access profiles regardless of activation status
- Enables testing and administrative tasks without full registration flow

---

## Database Schema

The D1 database includes the following key tables:

### User Table
- `id`: Primary key
- `profileId`: Unique identifier for invitation links
- `email`: User's email address
- `password`: Hashed password
- `role`: User role (SUPER_ADMIN, BUSINESS_STAFF, INDIVIDUAL)
- `isActivated`: Activation status
- `secretKey`: Dynamic invite code (rotates on each visit)
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

### Profile Table
- `id`: Primary key
- `userId`: Foreign key to User
- `username`: Unique username for profile URL
- `firstName`, `lastName`: User's name
- `bio`: User biography
- `createdAt`, `updatedAt`

### Company Table
- `id`: Primary key
- `slug`: URL-friendly company identifier
- `name`: Company name
- `createdAt`, `updatedAt`

### Relationship
- One User has one Profile
- One Profile belongs to one Company (for business users)

---

## File Structure

```
ZanTag/
├── app/
│   ├── routes/
│   │   ├── c.$profileId.tsx      # Invitation route with dynamic key rotation
│   │   ├── register.tsx          # User registration with auto-population
│   │   ├── p.$profileId.tsx      # Public profile display
│   │   ├── b.$company.$profileId.tsx  # Business profile display
│   │   └── ...
│   ├── utils/
│   │   ├── db.server.ts          # Database connection
│   │   └── ...
│   └── ...
├── migrations/
│   └── 0001_schema_full.sql      # Database schema
├── prisma/
│   └── schema.prisma             # Prisma schema definition
├── wrangler.toml                 # Cloudflare configuration
└── README.md
```

---

## Development Guidelines

### Adding New Features
1. Update `prisma/schema.prisma` with new models/fields
2. Generate Prisma client: `npx prisma generate`
3. Create migration: `npx prisma migrate dev --name feature_name`
4. Update `migrations/0001_schema_full.sql` with the new schema
5. Test locally with `npm run dev`
6. Run linting: `npm run lint`
7. Build: `npm run build`

### Security Best Practices
- Never commit `.dev.vars` or production secrets
- Use `crypto.randomUUID()` for generating secure tokens
- Validate all user inputs on both frontend and backend
- Hash passwords before storing
- Use Cloudflare's security features (WAF, rate limiting)

### Deployment Checklist
- [ ] Run `npm run lint` (exit code 0)
- [ ] Run `npm run build` (no errors)
- [ ] Run `npm audit` (fix any vulnerabilities)
- [ ] Commit all changes
- [ ] Push to `main` branch
- [ ] Verify Cloudflare Pages deployment

---

## Troubleshooting

### Common Issues

#### D1 Database Not Found
```bash
npx wrangler d1 create zantag-db
npx wrangler d1 execute zantag-db --local --file=./migrations/0001_schema_full.sql
```

#### R2 Bucket Missing
```bash
npx wrangler r2 bucket create zantag-assets
```

#### Session Errors
Ensure `.dev.vars` contains `SESSION_SECRET`:
```bash
SESSION_SECRET="your-super-secret-session-key"
```

#### Build Errors
```bash
npm run lint  # Fix any linting issues
npm audit fix # Fix security vulnerabilities
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Support

For support, please open an issue in the GitHub repository or contact the development team.
