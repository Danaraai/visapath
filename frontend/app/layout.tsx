import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VisaPath — Autonomous Visa Preparation',
  description: 'AI-powered visa preparation agent. Strategy, documents, and appointment monitoring — all automated.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
