import { PLANS } from '../lib/orgRepo'

const REASON_COPY = {
  trial_expired: {
    title: 'Your 30-day free trial has ended',
    body: "Choose a plan below to keep creating and editing audits. Your existing data is safe and hasn't gone anywhere.",
  },
  payment_failed: {
    title: 'We couldn\u2019t process your last payment',
    body: 'Please update your payment details to keep your subscription active.',
  },
  canceled: {
    title: 'Your subscription has been canceled',
    body: 'Choose a plan below to reactivate your account.',
  },
}

export default function Billing({ organization, accessState }) {
  const reason = REASON_COPY[accessState.reason]

  return (
    <div className="p-4 md:p-9 max-w-3xl">
      {accessState.access === 'restricted' && reason && (
        <div className="bg-majorbg border border-major rounded-md p-4 mb-6">
          <div className="font-display font-semibold text-major mb-1">{reason.title}</div>
          <div className="text-sm text-major">{reason.body}</div>
        </div>
      )}

      {accessState.access === 'full' && accessState.trialDaysLeft !== undefined && (
        <div className="bg-minorbg border border-minor rounded-md p-4 mb-6 text-sm text-minor">
          You're on a free trial — {accessState.trialDaysLeft} day{accessState.trialDaysLeft === 1 ? '' : 's'} left.
        </div>
      )}

      {accessState.access === 'full' && accessState.graceDaysLeft !== undefined && (
        <div className="bg-minorbg border border-minor rounded-md p-4 mb-6 text-sm text-minor">
          Your last payment failed — please update payment details within {accessState.graceDaysLeft} day
          {accessState.graceDaysLeft === 1 ? '' : 's'} to avoid losing access.
        </div>
      )}

      <h1 className="font-display text-xl font-semibold text-navy mb-1">Billing & Plans</h1>
      <div className="text-[12.5px] text-inksoft mb-6">
        {organization.name} — current status: <strong>{organization.subscriptionStatus}</strong>
        {organization.planTier && <> on the <strong>{PLANS[organization.planTier]?.label}</strong> plan</>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => (
          <div key={key} className="bg-white border border-line rounded-md p-5">
            <div className="font-display text-lg font-semibold text-navy mb-1">{plan.label}</div>
            <div className="text-xs text-inksoft mb-3">
              {typeof plan.users === 'number' ? `${plan.users} user${plan.users === 1 ? '' : 's'}` : plan.users} •{' '}
              {plan.audits}
            </div>
            <div className="mb-1">
              <span className="font-display text-2xl font-bold text-navy">K{plan.priceMonthly}</span>
              <span className="text-xs text-inksoft"> /month</span>
            </div>
            <div className="text-xs text-inksoft mb-4">or K{plan.priceAnnual}/year</div>
            <button
              disabled
              title="Payment integration coming in the next build pass"
              className="w-full bg-navy text-white py-2 rounded text-sm font-medium opacity-40 cursor-not-allowed"
            >
              Subscribe (coming soon)
            </button>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-inksoft italic mt-6">
        Checkout isn't wired up yet — this screen shows real trial/subscription status, but actual payment
        processing (via Flutterwave) is the next build pass.
      </div>
    </div>
  )
}
