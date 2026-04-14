import { SignIn1 } from "@/components/ui/modern-stunning-sign-in";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative bg-transparent">
      
      {/* Subtle ambient lighting for the background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <SignIn1 />
      </div>
    </div>
  );
}
