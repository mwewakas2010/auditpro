export default async function handler(req, res) {
  return res.status(200).json({
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'present' : 'MISSING',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'MISSING',
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
  })
}
