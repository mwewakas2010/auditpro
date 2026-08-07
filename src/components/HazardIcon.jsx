import { Flame } from 'lucide-react'

// Real hazard icons, cropped from Barrick's official Fatal Risk reference
// material - stored as static assets in /public/hazard-icons/. Fire isn't
// available as a real image yet (not in the reference material provided),
// so it falls back to a library icon until that one's supplied.
const HAZARD_IMAGE_MAP = [
  { match: /mobile equipment/i, src: '/hazard-icons/mobile-equipment.png' },
  { match: /fall from heights|falling from heights/i, src: '/hazard-icons/falling-from-heights.png' },
  { match: /confined space/i, src: '/hazard-icons/confined-space.png' },
  { match: /fall of ground/i, src: '/hazard-icons/fall-of-ground.png' },
  { match: /hazardous substances|chemicals/i, src: '/hazard-icons/hazardous-substances.png' },
  { match: /rotating equipment/i, src: '/hazard-icons/rotating-equipment.png' },
  { match: /stored energy/i, src: '/hazard-icons/stored-energy.png' },
  { match: /lifting/i, src: '/hazard-icons/lifting.png' },
  { match: /blasting|explosives/i, src: '/hazard-icons/blasting-explosives.png' },
]

export default function HazardIcon({ templateName, size = 18, className = '' }) {
  const found = HAZARD_IMAGE_MAP.find((entry) => entry.match.test(templateName || ''))
  if (found) {
    return (
      <img
        src={found.src}
        alt=""
        style={{ width: size, height: size }}
        className={`object-contain ${className}`}
      />
    )
  }
  // Fire (no real image yet) and anything unmatched
  return <Flame size={size} className={className} />
}
