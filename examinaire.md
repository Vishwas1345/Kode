# 🎓 Project Examiner Guide (Viva & Code Explanation)

This document is specifically created to help you explain your entire project to an examiner. It breaks down the architecture, tech stack, data flow, and key files so you can answer any question confidently!

---

## 1. 🚀 Project Objective
**What is this project?**
It is an advanced **AI-powered Website Builder** (similar to `bolt.new`). Users can type a prompt (e.g., "Create a portfolio website for a developer"), and the application uses Google Gemini AI to generate a complete, multi-file **Next.js + TailwindCSS** project. It then automatically boots up a real cloud server (sandbox) to run and preview the generated website live in the browser!

---

## 2. 💎 Premium UX/UI Enhancements (IMPORTANT for extra marks)
If the examiner asks *“What makes this project stand out from a standard CRUD app?”*:

- **Animated Typewriter Prompts:** Instead of simple static placeholders, we engineered a custom React `useTypewriter` hook tying state delays to simulate a real user typing various complex prompts, driving user inspiration.
- **Multi-Step Contextual Loading:** Instead of a lazy spinner, during AI generation, users see a dynamic rotating status bar (e.g., "Designing database...", "Writing React..."). This greatly improves perceived performance and UX.
- **Glassmorphism Bento Box Dashboard:** The user's project history is rendered in a highly modern asymmetrical "Bento Grid" using responsive tailwind columns, deep transluscent blur effects, and glowing hover states imitating premium SaaS dashboards.
- **Split-Pane Editor:** Inside the generated project view, we built a split-screen UI (just like CodeSandbox) that allows users to simultaneously view raw React code changing on the left, and the Live Sandbox `iframe` executing on the right.
- **Satisfying Micro-Animations:** Tying into psychological rewards patterns, downloading the project source code triggers a customized confetti explosion using Canvas APIs.

---

## 3. 🛠 Tech Stack & Tools (The "Why")
If the examiner asks *“What technologies did you use and why?”*:

- **Next.js 15 (React Framework):** Used for both the frontend UI and the backend API routes.
- **Clerk:** Handles user Authentication (Login, Sign-up, User Sessions). It is highly secure and easy to integrate with Next.js.
- **Neon Database (Serverless PostgreSQL):** The primary database. Used because it's fast, serverless, and scales infinitely.
- **Prisma ORM:** Used as the database bridge. It makes querying the database type-safe and easy.
- **Google Gemini AI (gemini-2.5-pro):** The "Brain" of the app. It takes the user's prompt and writes the raw React code.
- **Inngest:** Handles heavy background jobs. AI code generation takes 1-2 minutes. If we did this on the main server, the browser would timeout. Inngest runs this heavy task reliably in the background.
- **E2B (Sandbox/Code Interpreter):** This is the magic behind the "Live Preview." It creates a tiny, secure Linux cloud container in seconds, installs the NPM dependencies the AI wrote, builds the Next.js app, and gives us a live URL to show the user.

---

## 4. 🔄 The Complete Flow (Step-by-Step)
If the examiner asks *“How does the application work from start to finish?”*:

1. **User Input:** The user logs in and goes to the home page (`page.tsx`). They type a prompt into the floating input box (`project-form.tsx`) and hit "Build now".
2. **Database Save:** The app creates a new `Project` record in our Neon Postgres database using Prisma.
3. **Background Task Triggered:** An event is sent to **Inngest**. The main UI stops loading and displays the Multi-Step "AI Thinking" progress element.
4. **AI Code Generation (`prompt.ts`):** 
   - Inngest feeds the user's prompt, along with our strict "System Prompt" into the **Google Gemini API**.
   - Gemini returns a massive JSON array containing the exact paths and code for multiple files.
5. **Fragment Saved:** The generated files are saved into the `Fragment` table in the database as JSON data.
6. **E2B Sandbox Boot-up (`lib/sandbox/index.ts`):** 
   - The frontend detects that the code is ready and calls `/api/sandbox`.
   - The server contacts **E2B** to spin up an isolated virtual machine, runs `npm install`, and starts the app.
7. **Live Split-Preview:** E2B returns a deployed URL. The frontend puts this URL inside an `<iframe>` split alongside the raw code so the user can see everything!

---

## 5. 📂 Key Files to Show the Examiner
If the examiner asks *“Show me the code for X”*:

- **The Main UI / Typewriter Logic:** `src/app/(home)/page.tsx` & `src/client/modules/home/components/project-form.tsx`
- **The Split View / Sandbox Execution:** `src/client/modules/projects/components/fragment-web.tsx`
- **The System Prompt (How we control the AI):** `src/server/inngest/prompt.ts`.
- **The Sandbox Logic (How the live preview works):** `src/server/lib/sandbox/index.ts`
