import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AUDIT_TABS } from './AuditEditor.jsx'
import Dashboard from './Dashboard.jsx'
import AuditList from './AuditList.jsx'
import Companies from './Companies.jsx'
import AuditEditor from './AuditEditor.jsx'

const APP_NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'audits', label: 'My Audits' },
  { key: 'companies', label: 'Manage Companies' },
]

export default function Shell() {
  const [section, setSection] = useState('dashboard') // 'dashboard' | 'audits' | 'companies' | 'editor'
  const [auditId, setAuditId] = useState(null)
  const [auditTab, setAuditTab] = useState('setup')
  // Bumped whenever we open a (new or different) audit, so AuditEditor gets
  // a fresh mount (fresh internal state) rather than reusing stale state.
  const [editorKey, setEditorKey] = useState(0)

  const goToSection = (key) => {
    setSection(key)
    setAuditId(null)
  }

  const openAudit = (id) => {
    setAuditId(id)
    setAuditTab('setup')
    setEditorKey((k) => k + 1)
    setSection('editor')
  }

  const newAudit = () => openAudit(null)

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-[230px] flex-shrink-0 bg-navy text-slate-100 flex flex-col">
        <div className="px-[22px] pt-[26px] pb-[18px] border-b border-white/10">
          <div className="font-display font-bold text-2xl text-white">AuditPro</div>
          <div className="font-mono text-[10.5px] text-[#9FB0C9] mt-1 uppercase tracking-wide">
            SentinelPro Consultants
          </div>
        </div>

        <div className="py-3.5">
          {APP_NAV.map((item) => (
            <div
              key={item.key}
              onClick={() => goToSection(item.key)}
              className={`px-[22px] py-[13px] text-sm cursor-pointer border-l-[3px] transition-colors ${
                section === item.key
                  ? 'bg-white/10 border-gold text-white'
                  : 'border-transparent text-[#C7CEDA] hover:bg-white/5'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {section === 'editor' && (
          <>
            <div className="px-[22px] pt-3 pb-1.5 text-[10px] uppercase tracking-wide text-[#7E8CA3] border-t border-white/10">
              Current Audit
            </div>
            <div className="pb-3.5">
              {AUDIT_TABS.map((tab) => (
                <div
                  key={tab.key}
                  onClick={() => setAuditTab(tab.key)}
                  className={`px-[22px] py-[13px] text-sm cursor-pointer border-l-[3px] flex items-center gap-2.5 transition-colors ${
                    auditTab === tab.key
                      ? 'bg-white/10 border-gold text-white'
                      : 'border-transparent text-[#C7CEDA] hover:bg-white/5'
                  }`}
                >
                  <span className="font-mono text-[11px] text-[#7E8CA3]">{tab.num}</span> {tab.label}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex-1" />

        <div className="px-[22px] py-4 border-t border-white/10">
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-[12px] text-[#C7CEDA] hover:text-white mb-2 block"
          >
            Sign out
          </button>
          <div className="text-[11.5px] text-[#8493A8]">AuditPro</div>
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto">
        {section === 'dashboard' && <Dashboard />}
        {section === 'audits' && <AuditList onOpen={openAudit} onNew={newAudit} />}
        {section === 'companies' && <Companies />}
        {section === 'editor' && (
          <AuditEditor
            key={editorKey}
            auditId={auditId}
            activeTab={auditTab}
            onExit={() => goToSection('audits')}
            onAuditSaved={setAuditId}
          />
        )}
      </div>
    </div>
  )
}
