import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// GitHub Pages serves a project site under a sub-path; set this during the
// deploy build (see .github/workflows/docs.yml). Empty for local development.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // This app is nested in the extension repo, which has its own AGENTS.md; don't
  // let `next dev` write a second one here.
  agentRules: false,
  // The docs app lives inside the extension repo; without this, Turbopack walks
  // up to the repo root and tries to compile the extension's own sources.
  turbopack: { root: import.meta.dirname },
  // basePath already prefixes `_next/*` and next/image; do not also set assetPrefix.
  ...(basePath ? { basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default withMDX(config);
