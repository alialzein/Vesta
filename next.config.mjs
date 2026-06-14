/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The /user-guide site reads docs/guides/*.md. It is statically generated, so
    // the read happens at build — but trace the Markdown into the bundle anyway so
    // the route keeps working if it is ever rendered dynamically on the server.
    outputFileTracingIncludes: {
      '/user-guide/[[...slug]]': ['./docs/guides/*.md'],
    },
  },
};

export default nextConfig;
