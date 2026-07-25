// Vercel serverless function. Runs server-side only — the OpenRouter API key
// never reaches the browser. Deployed automatically as /api/ai-assist.
// Uses OpenRouter's free-model auto-router so this keeps working even as
// specific free models rotate in/out (which happens without notice).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing OPENROUTER_API_KEY. Add it in Vercel project settings.' })
  }

  const { clauseCode, clauseTitle, requirementText, status, draftText } = req.body || {}

  if (!draftText || !draftText.trim()) {
    return res.status(400).json({ error: 'No draft text provided to improve.' })
  }

  const systemPrompt = `You are an ISO audit writing assistant. You help auditors rewrite checklist evidence/finding notes so they are clear, objective, and unambiguous, using standard ISO 19011 audit language.

Rules:
- Never invent facts, evidence, sources, or details that are not present in the auditor's draft. Only rephrase what is already there.
- State only what was observed; avoid vague hedging words like "seems", "appears", "generally", unless the auditor's own draft was itself uncertain.
- Keep the tone consistent with the stated classification.
- You may reference the clause naturally but do not restate the full requirement text back to the auditor.
- Return ONLY the rewritten note text — no preamble, no quotation marks, no markdown formatting, no explanation of changes.`

  const userPrompt = `Clause ${clauseCode || ''} — ${clauseTitle || ''}
Requirement: ${requirementText || ''}
Classification: ${status || 'not set'}
Auditor's draft note: "${draftText}"

Rewrite this note to be clear, objective, and unambiguous audit language.`

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
        // openrouter/free auto-selects from currently-available free models,
        // so this doesn't break when a specific free model gets retired.
        // To pin a specific model instead, replace with e.g.
        // 'meta-llama/llama-3.3-70b-instruct:free' — check openrouter.ai/models
        // for current availability before pinning.
        model: 'openrouter/free',
        max_tokens: 300,
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

    const text = (data.choices?.[0]?.message?.content || '').trim()

    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
