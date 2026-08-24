import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AUDIT_TABS } from './AuditEditor.jsx'
import Dashboard from './Dashboard.jsx'
import AuditList from './AuditList.jsx'
import Companies from './Companies.jsx'
import AuditEditor from './AuditEditor.jsx'
import CCVList from './CCVList.jsx'
import CCVEditor from './CCVEditor.jsx'
import FLRAList from './FLRAList.jsx'
import FLRALanding from './FLRALanding.jsx'
import FLRAEditor from './FLRAEditor.jsx'
import JSAList from './JSAList.jsx'
import JSAEditor from './JSAEditor.jsx'
import PlatformDashboard from './PlatformDashboard.jsx'
import OrganizationDashboard from './OrganizationDashboard.jsx'
import MyDataDashboard from './MyDataDashboard.jsx'
import { isPlatformAdmin } from '../lib/platformAdminRepo'
import { getMyOrganization } from '../lib/orgRepo'
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  FileSpreadsheet,
  ShieldAlert,
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
  { key: 'jsas', label: 'JSAs', icon: FileSpreadsheet },
]

const AUDIT_TAB_MOBILE = {
  setup: { label: 'Setup', icon: FileText },
  checklist: { label: 'Checklist', icon: ListChecks },
  findings: { label: 'Findings', icon: Search },
  report: { label: 'Sign-off', icon: FileCheck2 },
}

export default function Shell() {
  const [section, setSection] = useState('dashboard')
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedOrgForDashboard, setSelectedOrgForDashboard] = useState(null)
  const [roleCheckDone, setRoleCheckDone] = useState(false)
  const [myOrgId, setMyOrgId] = useState(null)

  const openOrgDashboard = (organizationId, organizationName) => {
    setSelectedOrgForDashboard({ id: organizationId, name: organizationName })
    setSection('organization-dashboard')
  }
  const openMyData = () => setSection('my-data-dashboard')

  const [auditId, setAuditId] = useState(null)
  const [auditTab, setAuditTab] = useState('setup')
  const [editorKey, setEditorKey] = useState(0)

  // Role-based landing: Platform Admin sees the gauge-grid Dashboard.
  // A regular subscriber-org member skips the grid entirely and lands
  // directly on their own Organization Dashboard - there's only ever one
  // org to pick for them anyway.
  //
  // NOTE: getMyOrganization() isn't visible in this environment right now
  // (a sandbox reset lost access to orgRepo.js), so this assumes the same
  // shape established earlier this session - an object with a nested
  // `organization` containing `id`/`name`. If your actual orgRepo.js
  // returns something differently shaped, this redirect will silently no-op
  // (regular members will just see the Dashboard as before) rather than crash.
  useEffect(() => {
    isPlatformAdmin().then((admin) => {
      setIsAdmin(admin)
      if (admin) {
        setRoleCheckDone(true)
        return
      }
      getMyOrganization()
        .then((result) => {
          const org = result?.organization || result
          if (org?.id) {
            setMyOrgId(org.id)
            setSelectedOrgForDashboard({ id: org.id, name: org.name })
            setSection('organization-dashboard')
          }
        })
        .catch(() => {})
        .finally(() => setRoleCheckDone(true))
    }).catch(() => setRoleCheckDone(true))
  }, [])

  const navItems = isAdmin ? [...APP_NAV, { key: 'platform', label: 'Platform Admin', icon: ShieldAlert }] : APP_NAV

  const [ccvId, setCcvId] = useState(null)
  const [ccvTemplateId, setCcvTemplateId] = useState(null)
  const [ccvEditorKey, setCcvEditorKey] = useState(0)

  const [flraId, setFlraId] = useState(null)
  const [flraEditorKey, setFlraEditorKey] = useState(0)
  const [pendingFlraCompanyId, setPendingFlraCompanyId] = useState(null)
  const [pendingFlraAcknowledgedAt, setPendingFlraAcknowledgedAt] = useState(null)

  const [jsaId, setJsaId] = useState(null)
  const [jsaEditorKey, setJsaEditorKey] = useState(0)

  const goToSection = (key) => {
    setSection(key)
    setAuditId(null)
    setCcvId(null)
    setFlraId(null)
    setJsaId(null)
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
  const newFLRA = () => setSection('flra-landing')

  const openJSA = (id) => {
    setJsaId(id)
    setJsaEditorKey((k) => k + 1)
    setSection('jsa-editor')
  }
  const newJSA = () => openJSA(null)

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
        ) : section === 'flra-editor' || section === 'flra-landing' ? (
          <>
            <button onClick={() => goToSection('flras')} className="flex items-center gap-1.5 text-sm">
              <ArrowLeft size={18} /> FLRAs
            </button>
            <div className="text-xs font-mono text-[#9FB0C9]">FLRA</div>
          </>
        ) : section === 'jsa-editor' ? (
          <>
            <button onClick={() => goToSection('jsas')} className="flex items-center gap-1.5 text-sm">
              <ArrowLeft size={18} /> JSAs
            </button>
            <div className="text-xs font-mono text-[#9FB0C9]">JSA</div>
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
          {navItems.map((item) => (
            <div
              key={item.key}
              onClick={() => goToSection(item.key)}
              className={`px-[22px] py-[13px] text-sm cursor-pointer border-l-[3px] flex items-center gap-2 transition-colors ${
                section === item.key ||
                (item.key === 'ccvs' && section === 'ccv-editor') ||
                (item.key === 'flras' && (section === 'flra-editor' || section === 'flra-landing')) ||
                (item.key === 'jsas' && section === 'jsa-editor')
                  ? 'bg-white/10 border-gold text-white'
                  : 'border-transparent text-[#C7CEDA] hover:bg-white/5'
              }`}
            >
              <item.icon size={15} /> {item.label}
            </div>
          ))}
          {isAdmin && (
            <div
              onClick={openMyData}
              className={`px-[22px] py-[9px] mt-1.5 pt-2.5 border-t border-white/10 text-[11.5px] cursor-pointer flex items-center gap-2 transition-colors ${
                section === 'my-data-dashboard' ? 'text-white' : 'text-[#7E8CA3] hover:text-[#C7CEDA]'
              }`}
            >
              <LayoutDashboard size={13} /> My Data
            </div>
          )}
          <div
            onClick={() => goToSection('companies')}
            className={`px-[22px] py-[9px] text-[11.5px] cursor-pointer flex items-center gap-2 transition-colors ${
              section === 'companies' ? 'text-white' : 'text-[#7E8CA3] hover:text-[#C7CEDA]'
            } ${!isAdmin ? 'mt-1.5 pt-2.5 border-t border-white/10' : ''}`}
          >
            <Building2 size={13} /> Manage Companies
          </div>
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
        {section === 'dashboard' && roleCheckDone && <Dashboard onOpenOrgDashboard={openOrgDashboard} />}
        {section === 'organization-dashboard' && selectedOrgForDashboard && (
          <OrganizationDashboard
            organizationId={selectedOrgForDashboard.id}
            organizationName={selectedOrgForDashboard.name}
            onBack={() => (isAdmin ? setSection('dashboard') : null)}
          />
        )}
        {section === 'my-data-dashboard' && (
          <MyDataDashboard onBack={() => setSection('dashboard')} />
        )}
        {section === 'audits' && <AuditList onOpen={openAudit} onNew={newAudit} />}
        {section === 'ccvs' && <CCVList onOpen={openCCV} onNew={newCCV} />}
        {section === 'flras' && <FLRAList onOpen={openFLRA} onNew={newFLRA} />}
        {section === 'jsas' && <JSAList onOpen={openJSA} onNew={newJSA} />}
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
          <CCVEditor key={ccvEditorKey} ccvId={ccvId} templateId={ccvTemplateId} organizationId={myOrgId} onExit={() => goToSection('ccvs')} />
        )}
        {section === 'flra-landing' && (
          <FLRALanding
            onAcknowledge={({ companyId }) => {
              setPendingFlraCompanyId(companyId)
              setPendingFlraAcknowledgedAt(new Date().toISOString())
              setFlraId(null)
              setFlraEditorKey((k) => k + 1)
              setSection('flra-editor')
            }}
            onCancel={() => goToSection('flras')}
          />
        )}
        {section === 'flra-editor' && (
          <FLRAEditor
            key={flraEditorKey}
            flraId={flraId}
            organizationId={myOrgId}
            initialCompanyId={pendingFlraCompanyId}
            initialAcknowledgedAt={pendingFlraAcknowledgedAt}
            onExit={() => goToSection('flras')}
          />
        )}
        {section === 'jsa-editor' && (
          <JSAEditor key={jsaEditorKey} jsaId={jsaId} organizationId={myOrgId} onExit={() => goToSection('jsas')} />
        )}
        {section === 'platform' && isAdmin && <PlatformDashboard />}
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
          : navItems.map((item) => {
              const Icon = item.icon
              const active =
                section === item.key ||
                (item.key === 'ccvs' && section === 'ccv-editor') ||
                (item.key === 'flras' && (section === 'flra-editor' || section === 'flra-landing')) ||
                (item.key === 'jsas' && section === 'jsa-editor')
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
