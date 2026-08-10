import { useState } from 'react'
import { createInvite, buildInviteUrl } from '../lib/orgInviteRepo'

export default function InviteTeamMember({ organizationId }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const invite = await createInvite(organizationId)
      setLink(buildInviteUrl(invite.token))
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const copy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[12px] text-[#C7CEDA] hover:text-white mb-2 block">
        + Invite team member
      </button>
    )
  }

  return (
    <div className="bg-white/5 rounded p-3 mb-2 text-[11px]">
      <div className="text-[#C7CEDA] mb-2">Invite a team member</div>
      {!link ? (
        <button onClick={generate} disabled={loading} className="w-full bg-gold text-navy py-1.5 rounded text-[11px] font-medium disabled:opacity-50">
          {loading ? 'Generating…' : 'Generate invite link'}
        </button>
      ) : (
        <>
          <div className="bg-black/20 rounded px-2 py-1.5 text-[10px] text-white break-all mb-2">{link}</div>
          <button onClick={copy} className="w-full bg-gold text-navy py-1.5 rounded text-[11px] font-medium">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <div className="text-[10px] text-[#8493A8] mt-1.5">Expires in 7 days, works once. Send it via WhatsApp/SMS.</div>
        </>
      )}
      {error && <div className="text-major text-[10px] mt-1.5">{error}</div>}
      <button onClick={() => { setOpen(false); setLink('') }} className="text-[10px] text-[#8493A8] mt-2 block">
        Close
      </button>
    </div>
  )
}
