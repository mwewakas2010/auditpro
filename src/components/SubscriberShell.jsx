import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getAccessState } from '../lib/orgRepo'
import { AUDIT_TABS } from './AuditEditor.jsx'
import AuditList from './AuditList.jsx'
import AuditEditor from './AuditEditor.jsx'
import Billing from './Billing.jsx'
import {
  ClipboardList,
  FileText,
  ListChecks,
  Search,
  FileCheck2,
  ArrowLeft,
  LogOut,
  CreditCard,
} from 'lucide-react'

const APP_NAV = [
  { key: 'audits', label: 'My Audits', icon: ClipboardList },
  { key: 'billing', label: 'Billing & Plans', icon: CreditCard },
]

const AUDIT_TAB_MOBILE = {
  setup: { label: 'Setup', icon: FileText },
  checklist: { label: 'Checklist', icon: ListChecks },
  findings: { label: 'Findings', icon: Search },
  report: { label: 'Sign-off', icon: FileCheck2 },
}

export default function SubscriberShell({ organization }) {
  const [section, setSection] = useState('audits') // 'audits' | 'editor' | 'billing'
  const [auditId, setAuditId] = useState(null)
  const [auditTab, setAuditTab] = useState('setup')
  const [editorKey, setEditorKey] = useState(0)

  const accessState = getAccessState(organization)
  // If access is restricted (trial expired, payment failed past grace, or
  // canceled), the Billing screen is the ONLY thing shown, regardless of
  // which nav item was clicked - existing data is untouched, just not
  // editable until a plan is chosen.
  const effectiveSection = accessState.access === 'restricted' ? 'billing' : section

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
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden bg-navy text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        {effectiveSection === 'editor' ? (
          <>
            <button onClick={() => goToSection('audits')} className="flex items-center gap-1.5 text-sm">
              <ArrowLeft size={18} /> My Audits
            </button>
            <div className="text-xs font-mono text-[#9FB0C9]">{AUDIT_TAB_MOBILE[auditTab]?.label}</div>
          </>
        ) : (
          <>
            <div className="font-display font-bold text-lg">AuditPro</div>
            <button onClick={() => supabase.auth.signOut()} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
      {accessState.access === 'full' && (accessState.trialDaysLeft !== undefined || accessState.graceDaysLeft !== undefined) && (
        <div className="md:hidden bg-minorbg text-minor text-[11px] px-4 py-1.5 text-center flex-shrink-0">
          {accessState.trialDaysLeft !== undefined
            ? `Trial: ${accessState.trialDaysLeft} day(s) left`
            : `Payment failed — ${accessState.graceDaysLeft} day(s) to fix`}
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-[230px] flex-shrink-0 bg-navy text-slate-100 flex-col">
        <div className="px-[22px] pt-[26px] pb-[18px] border-b border-white/10">
          <div className="font-display font-bold text-2xl text-white">AuditPro</div>
          <div className="font-mono text-[10.5px] text-[#9FB0C9] mt-1 uppercase tracking-wide truncate">
            {organization.name}
          </div>
        </div>

        {accessState.access === 'full' && (accessState.trialDaysLeft !== undefined || accessState.graceDaysLeft !== undefined) && (
          <div className="px-[22px] py-2 bg-white/5 text-[11px] text-[#E8D08A] border-b border-white/10">
            {accessState.trialDaysLeft !== undefined
              ? `Trial: ${accessState.trialDaysLeft} day${accessState.trialDaysLeft === 1 ? '' : 's'} left`
              : `Payment failed — ${accessState.graceDaysLeft} day${accessState.graceDaysLeft === 1 ? '' : 's'} to fix`}
          </div>
        )}

        <div className="py-3.5">
          {APP_NAV.map((item) => (
            <div
              key={item.key}
              onClick={() => goToSection(item.key)}
              className={`px-[22px] py-[13px] text-sm cursor-pointer border-l-[3px] transition-colors flex items-center gap-2 ${
                effectiveSection === item.key
                  ? 'bg-white/10 border-gold text-white'
                  : 'border-transparent text-[#C7CEDA] hover:bg-white/5'
              }`}
            >
              <item.icon size={15} /> {item.label}
            </div>
          ))}
        </div>

        {effectiveSection === 'editor' && (
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

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
        {effectiveSection === 'audits' && <AuditList onOpen={openAudit} onNew={newAudit} />}
        {effectiveSection === 'billing' && <Billing organization={organization} accessState={accessState} />}
        {effectiveSection === 'editor' && (
          <AuditEditor
            key={editorKey}
            auditId={auditId}
            activeTab={auditTab}
            onExit={() => goToSection('audits')}
            onAuditSaved={setAuditId}
            mode="subscriber"
            organizationId={organization.id}
            reportBrandName={organization.name}
          />
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy border-t border-white/10 flex">
        {effectiveSection === 'editor'
          ? AUDIT_TABS.map((tab) => {
              const meta = AUDIT_TAB_MOBILE[tab.key]
              const Icon = meta.icon
              const active = auditTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setAuditTab(tab.key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                    active ? 'text-gold' : 'text-[#8493A8]'
                  }`}
                >
                  <Icon size={20} />
                  {meta.label}
                </button>
              )
            })
          : APP_NAV.map((item) => {
              const Icon = item.icon
              const active = effectiveSection === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => goToSection(item.key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                    active ? 'text-gold' : 'text-[#8493A8]'
                  }`}
                >
                  <Icon size={20} />
                  {item.label === 'Billing & Plans' ? 'Billing' : item.label}
                </button>
              )
            })}
      </div>
    </div>
  )
}
