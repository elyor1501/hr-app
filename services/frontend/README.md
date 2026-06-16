# HR App

The frontend for the **RM App** application, built with **Next.js**, **TypeScript**, and **Tailwind CSS** and connects to a **Supabase** backend.

---

### Installation

Install dependencies:

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env.local` file at the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Tech Stack

- [Next.js](https://nextjs.org/) – React framework for production
- [TypeScript](https://www.typescriptlang.org/) – Type-safe development
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS framework
- [Supabase](https://supabase.com/) – Backend-as-a-Service (Auth, DB, Storage)

---

## 📦 Project Structure

```
/hr-app
├── app/
├── components/
├── lib/
├── .env.local             # Environment variables (not committed)
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 🧪 Prerequisites

- Node.js (v18+ recommended)
- npm or pnpm
- Supabase Project & Credentials
- A configured `.env.local` file
