// The (auth) route group exists solely as a placeholder.
// All protected routes are implemented at the flat route level
// (e.g., /app/dashboard/page.tsx) using the DashboardLayout component
// for authentication. The (auth)/layout.tsx is not used.
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
