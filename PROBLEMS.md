# Known Problems

Bob reads this on startup and avoids ALL of these issues.

## Package Issues

- react-force-graph-3d@^2.2.25 does not exist on npm. Use react-force-graph-3d@^2.1.0 or three.js directly.

## Next.js Issues

- Any component using useState, useEffect, onClick, or browser APIs MUST have "use client" at the top of the file.
- Every page and layout file needs "use client" if it uses hooks.

## Vite/React Build Issues

- Build script MUST be "vite build" NOT "tsc && vite build". TypeScript type checking during build always fails.
- tsconfig.json MUST have "strict": false to avoid type errors.
- index.html must NOT have complex data: URIs in favicon (causes "URI malformed" error). Use a simple favicon or none.
- Do NOT use path aliases (@/) in imports - use relative paths instead (e.g. "../components/Foo").
- NEVER use "next build" directly - use "npx next build" or "npm run build" (next must be in devDependencies).
- package.json build script must be "vite build" or "next build" - Bob always runs "npm run build".

## GitHub Pages Issues

- All projects must have dist/ or out/ output committed to git for GitHub Pages to serve them.
- node_modules/ and .next/ must never be committed.

## General Issues

- Do NOT use experimental or niche npm packages. Only use: react, react-dom, react-router-dom, framer-motion, lucide-react, three, @react-three/fiber, @react-three/drei.
- Keep projects under 8 files total.
- All npm packages must have EXACT versions that exist on npm.
