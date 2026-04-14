import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { InferenceProvider } from "@/context/InferenceContext";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SentinelIQ — Predictive Maintenance Platform",
  description:
    "Industrial-grade predictive maintenance for turbofan engines. NASA C-MAPSS RUL prediction with TCN deep learning, SHAP explainability, and real-time anomaly detection.",
  keywords: [
    "predictive maintenance",
    "RUL prediction",
    "NASA C-MAPSS",
    "turbofan engine",
    "anomaly detection",
    "TCN",
    "SHAP",
    "deep learning",
  ],
  openGraph: {
    title: "SentinelIQ — Predictive Maintenance Platform",
    description: "Real-time RUL monitoring powered by TCN deep learning.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* FOUC prevention: read saved theme and apply immediately before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                document.documentElement.classList.add('no-transitions');
                var saved = localStorage.getItem('sentineliq-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', saved);
              } catch(e){}
              requestAnimationFrame(function(){
                requestAnimationFrame(function(){
                  document.documentElement.classList.remove('no-transitions');
                });
              });
            })();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {/* Skip-to-main for keyboard/screen reader users */}
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <ThemeProvider>
          <AuthProvider>
            <NotificationsProvider>
              <InferenceProvider>
                {children}
              </InferenceProvider>
            </NotificationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
