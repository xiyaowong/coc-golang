import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import './global.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata = {
  metadataBase: new URL('https://xiyaowong.github.io/coc-golang/'),
  title: {
    default: 'coc-golang',
    template: '%s | coc-golang',
  },
  description: 'Go language support for coc.nvim, powered by gopls.',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      {/* suppressHydrationWarning also covers <body>: browser extensions (e.g.
          Grammarly) stamp attributes onto it before React hydrates, which
          would otherwise be reported as a mismatch. */}
      <body className="flex flex-col min-h-screen" suppressHydrationWarning>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
