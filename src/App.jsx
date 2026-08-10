import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getMyOrganization, createOrganizationForCurrentUser } from './lib/orgRepo'
import { getInviteOrgName, redeemInvite } from './lib/orgInviteRepo'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import JoinOrganization from './components/JoinOrganization.jsx'
import Shell from './components/Shell.jsx'
import SubscriberShell from './components/SubscriberShell.jsx'

function getInviteTokenFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('invite')
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [authScreen, setAuthScreen] = useState('login') // 'login' | 'signup'
  const [org, setOrg] = useState(undefined)
  const [inviteToken] = useState(getInviteTokenFromUrl)
  const [inviteOrgName, setInviteOrgName] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!inviteToken) {
      setInviteOrgName(null)
      return
    }
    getInviteOrgName(inviteToken).then(setInviteOrgName).catch(() => setInviteOrgName(null))
  }, [inviteToken])

  useEffect(() => {
    if (!session) {
      setOrg(session === null ? null : undefined)
      return
    }
    ;(async () => {
      try {
        let myOrg = await getMyOrganization()

        // Signed in, no org yet, and arrived via a valid invite link -
        // join that organization instead of falling through to consultant mode.
        if (!myOrg && inviteToken && inviteOrgName) {
          try {
            await redeemInvite(inviteToken)
            myOrg = await getMyOrganization()
            window.history.replaceState({}, '', window.location.pathname)
          } catch {
            // invite was invalid/expired/used by the time we got here - fall through normally
          }
        }

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
  }, [session, inviteToken, inviteOrgName])

  if (session === undefined || (session && org === undefined) || (inviteToken && inviteOrgName === undefined)) {
    return <div className="min-h-screen flex items-center justify-center text-inksoft text-sm">Loading…</div>
  }

  if (!session) {
    if (inviteToken) {
      return (
        <JoinOrganization
          token={inviteToken}
          orgName={inviteOrgName}
          onJoined={() => window.location.reload()}
          onSwitchToLogin={() => {
            window.history.replaceState({}, '', window.location.pathname)
            window.location.reload()
          }}
        />
      )
    }
    return authScreen === 'signup' ? (
      <Signup onSwitchToLogin={() => setAuthScreen('login')} />
    ) : (
      <Login onSwitchToSignup={() => setAuthScreen('signup')} />
    )
  }

  return org ? <SubscriberShell organization={org} /> : <Shell />
}
