import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login.jsx'
import AuditList from './components/AuditList.jsx'
import AuditEditor from './components/AuditEditor.jsx'
import Companies from './components/Companies.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = still checking
  const [view, setView] = useState({ name: 'list' }) // { name: 'list' } | { name: 'editor', auditId } | { name: 'companies' }

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

  if (view.name === 'editor') {
    return <AuditEditor auditId={view.auditId} onBack={() => setView({ name: 'list' })} />
  }

  if (view.name === 'companies') {
    return <Companies onBack={() => setView({ name: 'list' })} />
  }

  return (
    <AuditList
      onOpen={(auditId) => setView({ name: 'editor', auditId })}
      onNew={() => setView({ name: 'editor', auditId: null })}
      onManageCompanies={() => setView({ name: 'companies' })}
    />
  )
}
