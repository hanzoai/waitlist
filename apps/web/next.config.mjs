import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle for the container runtime.
  output: 'standalone',
  // This app lives in a pnpm workspace; point file-tracing at the repo
  // root so the @hanzo/waitlist workspace dep is bundled into standalone.
  outputFileTracingRoot: join(__dirname, '../../'),
}

export default nextConfig
