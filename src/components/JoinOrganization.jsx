import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { redeemInvite } from '../lib/orgInviteRepo'

export default function JoinOrganization({ token, orgName, onJoined, onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Account created — please check your email to confirm, then come back to this invite link to finish joining.')
      setLoading(false)
      return
    }

    try {
      await redeemInvite(token)
      onJoined()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  if (!orgName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="bg-white border border-line rounded-md p-8 w-full max-w-sm text-center">
          <div className="font-display text-xl font-bold text-navy mb-2">Invite not found</div>
          <div className="text-sm text-inksoft">
            This invite link is invalid, expired, or has already been used. Ask whoever sent it for a new one.
          </div>
          <button onClick={onSwitchToLogin} className="text-xs text-navy2 mt-4">
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-md p-8 w-full max-w-sm">
        <div className="font-display text-2xl font-bold text-navy mb-1">AuditPro</div>
        <div className="text-sm text-inksoft mb-6">
          You've been invited to join <strong>{orgName}</strong>. Create your account to join.
        </div>

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
          minLength={6}
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
          {loading ? 'Joining…' : `Join ${orgName}`}
        </button>

        <button type="button" onClick={onSwitchToLogin} className="w-full text-xs text-navy2 mt-4 text-center">
          Already have an account? Sign in instead
        </button>
      </form>
    </div>
  )
}
