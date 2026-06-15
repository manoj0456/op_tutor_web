# op_tutor_web

**OpTutor** – Future-ready online tutoring platform web application.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **React Query**, and **Zustand**.

Live site: **https://optutor.com**

## Features

- 🎓 Pre-recorded courses with exercises (Technology, Math, Science, AI, Arts, Sports & more)
- 📺 Live classes with real-time interaction (scheduled & on-demand)
- 🎯 Visual learning aids — dynamic content synced to what the teacher is explaining
- 🧑‍🎓 Student dashboard with progress tracking
- 👨‍🏫 Teacher dashboard for curriculum building & live session management
- 🔐 Auth (email/password + Google OAuth via NextAuth)
- 📱 Fully responsive — works alongside the mobile app

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, static export) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + React Query |
| Auth | AWS Cognito (via AuthContext) |
| Forms | React Hook Form + Zod |
| Realtime | Socket.io |
| Video | Agora SDK (live) / React Player (recorded) |

## Project Structure

```
src/
├── app/          # App Router pages & layouts
├── components/   # UI, course, live, layout components
├── lib/          # API client, hooks, utils
├── store/        # Zustand stores
└── types/        # Shared TypeScript types
public/
└── logos/        # Brand assets (logo-brand.svg, logo-icon.svg)
```

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

---

## Architecture & Setup Notes

### Domain

The production site is at **https://optutor.com**, mapped as a CNAME to the CloudFront distribution (`dbjjk68kxe7ee.cloudfront.net`). The older domain `tutor.oppertunitypool.com` is no longer the primary domain — update any references, environment configs, and DNS if still pointing there.

### Deployment

Static export deployed to AWS via GitHub Actions on every push to `main`:

```
GitHub push → npm run build → out/ → s3 sync → tutor-oppertunitypool-com (us-east-2) → CloudFront invalidation
```

See `DEPLOYMENT.md` for full setup instructions including required GitHub secrets.

### Logo Setup

Logos live in `public/logos/` and are served as static assets via CloudFront:

| File | Usage |
|---|---|
| `public/logos/logo-brand.svg` | Navbar logo (`src/components/layout/Navbar.tsx`) |
| `public/logos/logo-icon.svg` | Favicon / apple-touch-icon (`src/app/layout.tsx`) |

**To update logos:** replace the files in `public/logos/` with new SVG or PNG files and update the `src`/`icon` references in `Navbar.tsx` and `layout.tsx` accordingly. Do **not** reference external S3 URLs — logos must be local so they are included in the static export and deployed to CloudFront.

> **Note:** The original logo was hosted at `optutor-com.s3.us-east-2.amazonaws.com/logos/logo-brand.png`. That bucket is not publicly accessible and the `/logos/*` CloudFront path routes to the Next.js app rather than S3. Local files are the correct approach.

### Public Routes (No Auth Required)

The following API routes are intentionally public — no Cognito authorizer:

| Route | Reason |
|---|---|
| `GET /courses` | Course catalogue browsable without login |
| `GET /live-sessions` | Live session schedule browsable without login |

All other API Gateway routes require a valid Cognito JWT. If you add new routes that should be public, remove the Cognito authorizer on that method in API Gateway (Method Request → Authorization → NONE) and redeploy the stage.

### Content Management

The `/content-management` page is visible in the navbar only to users with the `manage_courses` permission. Access is controlled via `PermissionContext`:

- **Who can access:** users whose Cognito group or role grants `manage_courses`
- **What they can do:** create/edit courses, upload content, manage curriculum
- **Super admins** (checked via `isSuperAdmin`) additionally see the `/roles` page for role management

To grant a user content management access, add them to the appropriate Cognito group that includes the `manage_courses` permission.

### Backend API

The backend is an AWS Lambda + API Gateway setup (see companion repo). The web app calls the API via the base URL configured in `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=https://your-api-id.execute-api.us-east-2.amazonaws.com/prod
```

---

## Companion App

Mobile app (iOS/Android): [op_tutor_app](https://github.com/manoj0456/op_tutor_app)

---

## Admin Features

### Roles & Permissions (`/admin/roles`)

Accessible to **ADMIN** and **SUPER_ADMIN** users. Contains three tabs:

**Students tab**
Lists all Cognito users in the `STUDENT` group. Columns: Name, Email, Enrolled Courses, Joined Date, Last Active. An **Add Employee** button (top-right) is visible to ADMIN and SUPER_ADMIN; clicking it opens a modal to create a new employee (name, email, role: Admin or Teacher) which calls `POST /employees`.

**Employees tab**
Lists all non-student Cognito users — those in the `SUPER_ADMIN`, `ADMIN`, or `TEACHER` groups — fetched from `GET /admin/users`. Columns: Name, Email, Current Role, Assign Role.
- **SUPER_ADMIN**: sees a role dropdown and can reassign any employee's Cognito group via `PUT /admin/users/{userId}/role`.
- **ADMIN**: sees roles as read-only text; role changes are not permitted.

**Roles tab**
Displays all roles defined in the system (fetched from `GET /roles`) with their associated permissions. No changes can be made from this tab.
