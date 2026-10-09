import Link from 'next/link';
import { basePath } from '@/lib/shared';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center text-center flex-1 gap-6 px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${basePath}/logo.svg`} alt="coc-golang" width={128} height={128} />
      <h1 className="text-4xl font-bold">coc-golang</h1>
      <p className="max-w-xl text-fd-muted-foreground">
        Go language support for Vim and Neovim via coc.nvim, powered by gopls and
        the Go toolchain.
      </p>
      <div className="flex flex-row gap-3">
        <Link
          href="/docs"
          className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground"
        >
          Read the docs
        </Link>
        <a
          href="https://github.com/xiyaowong/coc-golang"
          className="rounded-lg border px-5 py-2.5 font-medium"
        >
          GitHub
        </a>
      </div>
    </div>
  );
}
