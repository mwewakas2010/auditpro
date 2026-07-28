import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { createOrganizationForCurrentUser } from '../lib/orgRepo'

export default function Signup({ onSwitchToLogin }) {
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // Stashed here in case email confirmation is required — the org gets
      // created using this name whichever moment the user actually gets a
      // valid session, whether that's immediately or after confirming.
      options: { data: { pending_org_name: orgName } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Auto-confirmed - create the organization right away.
      try {
        await createOrganizationForCurrentUser(orgName)
      } catch (err) {
        setError(err.message)
      }
    } else {
      setPendingConfirm(true)
    }
    setLoading(false)
  }

  if (pendingConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="bg-white border border-line rounded-md p-8 w-full max-w-sm text-center">
          <div className="font-display text-2xl font-bold text-navy mb-3">Check your email</div>
          <div className="text-sm text-inksoft">
            We've sent a confirmation link to <strong>{email}</strong>. Click it, then come back and sign in — your
            organization "{orgName}" will be set up automatically the first time you log in.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-md p-8 w-full max-w-sm">
        <div className="font-display text-2xl font-bold text-navy mb-1">AuditPro</div>
        <div className="text-xs text-inksoft mb-6 uppercase tracking-wide font-mono">Create your organization</div>

        <label className="block text-[11.5px] font-semibold text-navy2 mb-1.5 uppercase tracking-wide">
          Organization Name
        </label>
        <input
          type="text"
          required
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder="e.g. Kafubu Manufacturing Ltd"
          className="w-full px-3 py-2 border border-line rounded text-sm mb-4"
        />

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
          {loading ? 'Creating…' : 'Create Organization'}
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full text-xs text-navy2 mt-4 text-center"
        >
          Already have an account? Sign in
        </button>
      </form>
    </div>
  )
}
