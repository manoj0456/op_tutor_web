# op_tutor_web

**OpTutor** – Future-ready online tutoring platform web application.

Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **React Query**, and **Zustand**.

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
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand + React Query |
| Auth | NextAuth.js |
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
```

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Companion App

Mobile app (iOS/Android): [op_tutor_app](https://github.com/manoj0456/op_tutor_app)
