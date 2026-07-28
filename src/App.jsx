import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getMyOrganization, createOrganizationForCurrentUser } from './lib/orgRepo'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import Shell from './components/Shell.jsx'
import SubscriberShell from './components/SubscriberShell.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [authScreen, setAuthScreen] = useState('login') // 'login' | 'signup'
  const [org, setOrg] = useState(undefined) // undefined = still checking, null = no org (consultant account)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setOrg(session === null ? null : undefined)
      return
    }
    ;(async () => {
      try {
        let myOrg = await getMyOrganization()
        // Handles the delayed-email-confirmation case: the user signed up,
        // confirmed later, and this is effectively their first real login —
        // create the organization now using the name they typed at signup.
        const pendingOrgName = session.user?.user_metadata?.pending_org_name
        if (!myOrg && pendingOrgName) {
          await createOrganizationForCurrentUser(pendingOrgName)
          await supabase.auth.updateUser({ data: { pending_org_name: null } })
          myOrg = await getMyOrganization()
        }
        setOrg(myOrg)
      } catch {
        setOrg(null)
      }
    })()
  }, [session])

  if (session === undefined || (session && org === undefined)) {
    return <div className="min-h-screen flex items-center justify-center text-inksoft text-sm">Loading…</div>
  }

  if (!session) {
    return authScreen === 'signup' ? (
      <Signup onSwitchToLogin={() => setAuthScreen('login')} />
    ) : (
      <Login onSwitchToSignup={() => setAuthScreen('signup')} />
    )
  }

  return org ? <SubscriberShell organization={org} /> : <Shell />
}
