import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RDChecklist',
  description: 'Sistema de checklist de malotes — eventos, unidades e conferência.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
