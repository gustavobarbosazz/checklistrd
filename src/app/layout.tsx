import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RDChecklist',
  description: 'Sistema de checklist de malotes — eventos, unidades e conferência.',
};

// Roda antes da primeira renderização, direto no <head>, para aplicar o tema
// salvo (localStorage) sem "piscar" a tela com o tema errado por um instante.
const themeInitScript = `
(function(){
  try {
    var saved = localStorage.getItem('rdc-theme');
    var theme = saved === 'light' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
