import path from "node:path"

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/**" }]
      : [],
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),

      "@": path.resolve(process.cwd(), "src"),
    }

    return config
  },
}

export default nextConfig
