import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AUDIT_TABS } from './AuditEditor.jsx'
import Dashboard from './Dashboard.jsx'
import AuditList from './AuditList.jsx'
import Companies from './Companies.jsx'
import AuditEditor from './AuditEditor.jsx'
import CCVList from './CCVList.jsx'
import CCVEditor from './CCVEditor.jsx'
import FLRAList from './FLRAList.jsx'
import FLRAEditor from './FLRAEditor.jsx'
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  ListChecks,
  Search,
  FileCheck2,
  ArrowLeft,
  LogOut,
} from 'lucide-react'

const APP_NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'audits', label: 'My Audits', icon: ClipboardList },
  { key: 'ccvs', label: 'Critical Controls', icon: ShieldCheck },
  { key: 'flras', label: 'FLRAs', icon: ClipboardCheck },
  { key: 'companies', label: 'Manage Companies', icon: Building2 },
]

const AUDIT_TAB_MOBILE = {
  setup: { label: 'Setup', icon: FileText },
  checklist: { label: 'Checklist', icon: ListChecks },
  findings: { label: 'Findings', icon: Search },
  report: { label: 'Sign-off', icon: FileCheck2 },
}

export default function Shell() {
  const [section, setSection] = useState('dashboard') // 'dashboard' | 'audits' | 'companies' | 'editor' | 'ccvs' | 'ccv-editor' | 'flras' | 'flra-editor'
  const [auditId, setAuditId] = useState(null)
  const [auditTab, setAuditTab] = useState('setup')
  const [editorKey, setEditorKey] = useState(0)

  const [ccvId, setCcvId] = useState(null)
  const [ccvTemplateId, setCcvTemplateId] = useState(null)
  const [ccvEditorKey, setCcvEditorKey] = useState(0)

  const [flraId, setFlraId] = useState(null)
  const [flraEditorKey, setFlraEditorKey] = useState(0)

  const goToSection = (key) => {
    setSection(key)
    setAuditId(null)
    setCcvId(null)
    setFlraId(null)
  }

  const openAudit = (id) => {
    setAuditId(id)
    setAuditTab('setup')
    setEditorKey((k) => k + 1)
    setSection('editor')
  }
  const newAudit = () => openAudit(null)

  const openCCV = (id) => {
    setCcvId(id)
    setCcvTemplateId(null)
    setCcvEditorKey((k) => k + 1)
    setSection('ccv-editor')
  }
  const newCCV = (templateId) => {
    setCcvId(null)
    setCcvTemplateId(templateId)
    setCcvEditorKey((k) => k + 1)
    setSection('ccv-editor')
  }

  const openFLRA = (id) => {
    setFlraId(id)
    setFlraEditorKey((k) => k + 1)
    setSection('flra-editor')
  }
  const newFLRA = () => openFLRA(null)

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* ===== Mobile top bar ===== */}
      <div className="md:hidden bg-navy text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        {section === 'editor' ? (
          <>
            <button onClick={() => goToSection('audits')} className="flex items-center gap-1.5 text-sm">
              <ArrowLeft size={18} /> My Audits
            </button>
            <div className="text-xs font-mono text-[#9FB0C9]">{AUDIT_TAB_MOBILE[auditTab]?.label}</div>
          </>
        ) : section === 'ccv-editor' ? (
          <>
            <button onClick={() => goToSection('ccvs')} className="flex items-center gap-1.5 text-sm">
              <ArrowLeft size={18} /> Critical Controls
            </button>
            <div className="text-xs font-mono text-[#9FB0C9]">CCV</div>
          </>
        ) : section === 'flra-editor' ? (
          <>
            <button onClick={() => goToSection('flras')} className="flex items-center gap-1.5 text-sm">
              <ArrowLeft size={18} /> FLRAs
            </button>
            <div className="text-xs font-mono text-[#9FB0C9]">FLRA</div>
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

      {/* ===== Desktop sidebar ===== */}
      <div className="hidden md:flex w-[230px] flex-shrink-0 bg-navy text-slate-100 flex-col">
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
              className={`px-[22px] py-[13px] text-sm cursor-pointer border-l-[3px] flex items-center gap-2 transition-colors ${
                section === item.key ||
                (item.key === 'ccvs' && section === 'ccv-editor') ||
                (item.key === 'flras' && section === 'flra-editor')
                  ? 'bg-white/10 border-gold text-white'
                  : 'border-transparent text-[#C7CEDA] hover:bg-white/5'
              }`}
            >
              <item.icon size={15} /> {item.label}
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

      {/* ===== Main content ===== */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
        {section === 'dashboard' && <Dashboard />}
        {section === 'audits' && <AuditList onOpen={openAudit} onNew={newAudit} />}
        {section === 'ccvs' && <CCVList onOpen={openCCV} onNew={newCCV} />}
        {section === 'flras' && <FLRAList onOpen={openFLRA} onNew={newFLRA} />}
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
        {section === 'ccv-editor' && (
          <CCVEditor key={ccvEditorKey} ccvId={ccvId} templateId={ccvTemplateId} onExit={() => goToSection('ccvs')} />
        )}
        {section === 'flra-editor' && (
          <FLRAEditor key={flraEditorKey} flraId={flraId} organizationId={null} onExit={() => goToSection('flras')} />
        )}
      </div>

      {/* ===== Mobile bottom tab bar ===== */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy border-t border-white/10 flex">
        {section === 'editor'
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
              const active =
                section === item.key ||
                (item.key === 'ccvs' && section === 'ccv-editor') ||
                (item.key === 'flras' && section === 'flra-editor')
              return (
                <button
                  key={item.key}
                  onClick={() => goToSection(item.key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${
                    active ? 'text-gold' : 'text-[#8493A8]'
                  }`}
                >
                  <Icon size={20} />
                  {item.key === 'companies' ? 'Companies' : item.key === 'ccvs' ? 'CCVs' : item.key === 'flras' ? 'FLRAs' : item.label}
                </button>
              )
            })}
      </div>
    </div>
  )
}
