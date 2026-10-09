import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/account", permanent: false },
      { source: "/admin/owners", destination: "/account/owners", permanent: false },
      { source: "/admin/builder", destination: "/account/builder", permanent: false },
      { source: "/admin/roles", destination: "/account/roles", permanent: false },
      { source: "/announcements", destination: "/feed?view=notices", permanent: false },
      { source: "/events", destination: "/feed?view=events", permanent: false },
      { source: "/polls", destination: "/feed?view=polls", permanent: false },
    ];
  },
};

export default nextConfig;
