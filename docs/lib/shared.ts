import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'coc-golang';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

// Set by the build (see next.config.mjs); empty for local development.
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const gitConfig = {
  user: 'xiyaowong',
  repo: 'coc-golang',
  branch: 'main',
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: `${basePath}${getContentUrl(segments, page.locale)}` };
}

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: `${basePath}${getImageUrl(segments, page.locale)}` };
}
