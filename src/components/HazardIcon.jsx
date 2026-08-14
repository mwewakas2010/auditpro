import { ShieldQuestion } from 'lucide-react'

// Real hazard icons, cleaned and cropped from Barrick's official Fatal
// Risk reference material - stored as static assets in /public/hazard-icons/.
//
// ICON_VERSION: bump this whenever any icon file in public/hazard-icons/
// is replaced. Images (unlike JS) keep the same filename forever, so
// browsers/CDNs can cache them indefinitely with no automatic signal that
// they've changed - this query string forces a fresh fetch after updates.
const ICON_VERSION = 4

const HAZARD_IMAGE_MAP = [
  { match: /mobile equipment/i, src: 'mobile-equipment.png' },
  { match: /fall from heights|falling from heights/i, src: 'falling-from-heights.png' },
  { match: /confined space/i, src: 'confined-space.png' },
  { match: /fall of ground/i, src: 'fall-of-ground.png' },
  { match: /hazardous substances|chemicals/i, src: 'hazardous-substances.png' },
  { match: /rotating equipment/i, src: 'rotating-equipment.png' },
  { match: /stored energy/i, src: 'stored-energy.png' },
  { match: /lifting/i, src: 'lifting.png' },
  { match: /blasting|explosives/i, src: 'blasting-explosives.png' },
  { match: /^fire\b|fire critical/i, src: 'fire.png' },
]

export default function HazardIcon({ templateName, size = 18, className = '' }) {
  const found = HAZARD_IMAGE_MAP.find((entry) => entry.match.test(templateName || ''))
  if (found) {
    return (
      <img
        src={`/hazard-icons/${found.src}?v=${ICON_VERSION}`}
        alt=""
        style={{ width: size, height: size }}
        className={`object-contain ${className}`}
      />
    )
  }
  return <ShieldQuestion size={size} className={className} />
}
