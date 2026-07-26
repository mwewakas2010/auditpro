import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login.jsx'
import Shell from './components/Shell.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-inksoft text-sm">Loading…</div>
  }
  if (!session) {
    return <Login />
  }

  return <Shell />
}
