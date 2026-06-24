function normalizeBasePath(value) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.endsWith("/") ? prefixed.slice(0, -1) : prefixed;
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_APP_BASE_PATH);

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
