import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'CareFlow — Hospital Operations',
  description: 'Virus Quarantine and Treatment Centre — Operations Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-navy-900 antialiased">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
