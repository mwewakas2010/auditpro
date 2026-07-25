// Vercel serverless function. Runs server-side only — the OpenRouter API key
// never reaches the browser. Deployed automatically as /api/ai-review.
// Reviews the whole audit (not just one clause) for issues before sign-off.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing OPENROUTER_API_KEY. Add it in Vercel project settings.' })
  }

  const { standard, auditType, conclusion, discontinued, discontinuationComment, findings } = req.body || {}

  if (!Array.isArray(findings) || findings.length === 0) {
    return res.status(400).json({ error: 'No checklist entries to review yet.' })
  }

  const findingsList = findings
    .map(
      (f) =>
        `- Clause ${f.clauseCode} (${f.title}) — Classification: ${f.status}${
          f.followUp ? ' [flagged for field follow-up]' : ''
        }\n  Evidence available: ${f.evidenceAvailable === true ? 'Yes' : f.evidenceAvailable === false ? 'No' : 'Not stated'}\n  Note: "${f.evidenceText || '(empty)'}"`
    )
    .join('\n\n')

  const systemPrompt = `You are an ISO audit quality reviewer, checking a completed audit checklist for issues before the lead auditor signs off and issues the report. You are reviewing INTERNAL AUDITOR NOTES, not writing content for the report yourself.

Check specifically for:
1. Nonconformities (Major NC, Minor NC, or Nonconforming) that have no evidence note, or say evidence is "Not available" with no explanation of why.
2. Vague, subjective, or ambiguous language in notes (e.g. "seems fine", "generally okay", "appears adequate") that doesn't state an objective observation.
3. Contradictions — e.g. the audit conclusion claims the system is suitable/adequate/effective while a Major nonconformity exists, or vice versa.
4. Nonconformities not flagged for field follow-up that probably should be.
5. Any missing or thin evidence for OFI (opportunity for improvement) entries.

Respond ONLY with valid JSON, no markdown code fences, no preamble, in exactly this shape:
{"issues": [{"severity": "high"|"medium"|"low", "clause": "6.1.2 or null", "message": "short specific description of the issue"}]}

If you find nothing wrong, respond with {"issues": []}. Do not invent issues that aren't actually present in the notes given.`

  const userPrompt = `Standard: ${standard}
Audit type: ${auditType}
Draft conclusion: ${conclusion}
${discontinued ? `Audit was discontinued. Reason: ${discontinuationComment || '(none recorded)'}` : ''}

Checklist entries with a finding (nonconformities and OFIs only):

${findingsList}

Review these for the issues listed in your instructions and respond with the JSON.`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://auditpro.vercel.app',
        'X-Title': 'AuditPro',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'OpenRouter API request failed.' })
    }

    let raw = (data.choices?.[0]?.message?.content || '').trim()
    // Free models sometimes wrap JSON in markdown fences despite instructions — strip if present.
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // If the model didn't return valid JSON, surface the raw text so it's not just lost.
      return res.status(200).json({ issues: [], rawFallback: raw })
    }

    return res.status(200).json({ issues: Array.isArray(parsed.issues) ? parsed.issues : [] })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
