import fs from 'node:fs';
const url = new URL(process.argv[2] || '');
if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash)
  throw new Error('Provide the HTTPS API origin only.');
fs.writeFileSync(
  'vercel.json',
  JSON.stringify(
    {
      framework: 'vite',
      buildCommand: 'pnpm build',
      installCommand: 'pnpm install --frozen-lockfile',
      outputDirectory: 'dist',
      rewrites: [
        { source: '/api/:path*', destination: url.origin + '/api/:path*' },
        { source: '/:path*', destination: '/index.html' },
      ],
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'no-referrer' },
            {
              key: 'Content-Security-Policy',
              value:
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
            },
          ],
        },
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log('Configured API proxy for ' + url.origin);
