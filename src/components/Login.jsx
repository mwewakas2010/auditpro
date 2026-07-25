import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-md p-8 w-full max-w-sm">
        <div className="font-display text-2xl font-bold text-navy mb-1">AuditPro</div>
        <div className="text-xs text-inksoft mb-6 uppercase tracking-wide font-mono">SentinelPro Consultants</div>

        <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-line rounded text-sm mb-4"
        />

        <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-line rounded text-sm mb-5"
        />

        {error && <div className="text-xs text-major bg-majorbg border border-major rounded p-2 mb-4">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white py-2.5 rounded font-medium text-sm disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="text-[11px] text-inksoft mt-4 text-center">
          Accounts are created in the Supabase dashboard, not here — see README.
        </div>
      </form>
    </div>
  )
}
