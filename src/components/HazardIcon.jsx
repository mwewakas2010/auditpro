import { Truck, Building2, DoorClosed, Mountain, FlaskConical, Settings, Zap, Weight, Bomb, Flame, ShieldQuestion } from 'lucide-react'

// Keyed by (partial, case-insensitive) match against the template name, so
// this doesn't break if a template's exact wording changes slightly. Covers
// the 6 existing CCV templates plus 4 more prepared for whenever those get
// built (Stored Energy, Lifting, Blasting & Explosives, Fire).
const HAZARD_ICON_MAP = [
  { match: /mobile equipment/i, icon: Truck },
  { match: /fall from heights/i, icon: Building2 },
  { match: /confined space/i, icon: DoorClosed },
  { match: /fall of ground/i, icon: Mountain },
  { match: /hazardous substances|chemicals/i, icon: FlaskConical },
  { match: /rotating equipment/i, icon: Settings },
  { match: /stored energy/i, icon: Zap },
  { match: /lifting/i, icon: Weight },
  { match: /blasting|explosives/i, icon: Bomb },
  { match: /^fire\b|fire critical/i, icon: Flame },
]

export function getHazardIcon(templateName) {
  const found = HAZARD_ICON_MAP.find((entry) => entry.match.test(templateName || ''))
  return found ? found.icon : ShieldQuestion
}

export default function HazardIcon({ templateName, size = 18, className = '' }) {
  const Icon = getHazardIcon(templateName)
  return <Icon size={size} className={className} />
}
