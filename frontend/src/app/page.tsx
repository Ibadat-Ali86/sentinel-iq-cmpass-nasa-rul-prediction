// Root page — redirect logic:
// Authenticated users → /dashboard
// Unauthenticated users → landing page (public)/page.tsx handles /
// This file ensures the root route always lands on the public landing page.
export { default } from "./(public)/page";
