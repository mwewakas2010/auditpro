// Fixed content for the Job Safety Analysis (JSA) module.

export const PERMIT_TYPES = [
  'Permit to Work',
  'Excavation/Penetration Permit',
  'Hot Work Permit',
  'HV Electrical Isolation Permit',
  'HV Vicinity Permit',
  'Radiation Work Permit',
  'Working at Height Permit',
  'Chemical Pump and Pipe Permit',
  'Confined Space Permit',
  'Other',
]

export const SUPPORTING_DOCUMENTS = ['Lift Plan', 'Safety Data Sheet (SDS)', 'Emergency Action Plan']

// Same 10 fatal risks used across CCVs and FLRA, for consistency.
export const JSA_FATAL_RISKS = [
  'Stored Energy',
  'Falling From Heights',
  'Lifting',
  'Blasting & Explosives',
  'Hazardous Substances & Chemicals',
  'Confined Space',
  'Mobile Equipment',
  'Fall of Ground',
  'Rotating Equipment',
  'Fire',
]

export const POTENTIAL_HAZARDS = [
  'Hazard to Flora/Fauna', 'Electrical', 'Mechanical', 'Chemical', 'Dust or Fume',
  'Soil Erosion', 'Stored Energy', 'Live Equipment', 'Manual handling workgroups',
  'Radiation', 'Spills to Water', 'Falling Equipment/Parts', 'Noise', 'Ignition sources',
  'Spills to Ground', 'Fire', 'Explosives', 'Light/Dark', 'Rock Falls', 'Concealed Services',
  'Weather: Rain', 'Weather: Thunder', 'Weather: Lightning', 'Weather: Extreme temperatures', 'Other',
]

export const CONTROL_HIERARCHY = [
  { key: 'elimination', label: 'Elimination' },
  { key: 'substitution', label: 'Substitution' },
  { key: 'engineering', label: 'Engineering' },
  { key: 'administrative', label: 'Administrative' },
  { key: 'ppe', label: 'PPE' },
]

// Reference guidance (Appendix A) - check questions + recommended controls
// per generic hazard category, shown as an internal reference hint, never
// in the exported report.
export const HAZARD_CONTROL_REFERENCE = [
  { hazard: 'Gas, Dust, Fumes', questions: ['Are there any air pollutants now?', 'Will there be any air pollutants generated?', 'Are there any fire alarms nearby that may be set off?'], controls: ['Isolate, wash down or wear PPE', 'Provide ventilation away from workers and restrict access', 'Disconnect and arrange additional warning devices'] },
  { hazard: 'Noise', questions: ['Will you need to shout to be heard?'], controls: ['Move work away or provide PPE'] },
  { hazard: 'Spills', questions: ['Can something be spilt or overflow?', 'If so, can harm happen to people, area or plant?'], controls: ['Control flows or re-route flows', 'Erect bunds or barricade the area'] },
  { hazard: 'Environmental', questions: ['If something is spilt or was released, would the area be affected?'], controls: ['Consult with the Environmental Adviser to provide a plan'] },
  { hazard: 'Electrical', questions: ['Is there live equipment in the area?'], controls: ['Isolate or barricade hazard'] },
  { hazard: 'Mechanical', questions: ['Are there any crush points or moving parts?'], controls: ['Isolate or barricade hazard', 'Move work away from hazard'] },
  { hazard: 'Chemical', questions: ['Are there any hazardous chemicals in the area?', 'Will you be handling any chemicals?'], controls: ['Isolate or minimize exposure times', 'Attach MSDS and wear PPE'] },
  { hazard: 'Temperature', questions: ['Is the work area hot or cold?', 'Can you contact very hot or cold surfaces?'], controls: ['Reduce working times and wear PPE', 'Provide barriers or distances from sources'] },
  { hazard: 'Pressure', questions: ['Are there any high pressures present?'], controls: ['Isolate, protect or barricade pressure sources from work area'] },
  { hazard: 'Manual handling', questions: ['Will the work involve lifting, carrying, pushing, pulling?', 'Will the work be in an awkward position?'], controls: ['Reduce heavy loads, use lifting teams or mechanical means', 'Reduce working times and share duties'] },
  { hazard: 'Ignition sources', questions: ['Will the work involve cutting, welding or sparks?'], controls: ['Restrict access and place protective guards', 'Determine if a "permit to work" is needed'] },
  { hazard: 'Light', questions: ['Is the work area dark?'], controls: ['Move job or install lighting to the area'] },
  { hazard: 'Explosives', questions: ['Will the work involve the use of explosives?', 'Could there be any explosives in the area?'], controls: ['Ensure the person is competent in the handling of explosives', 'Check the area prior to carrying out the work'] },
]

// Standard 5x5 risk matrix - Likelihood x Consequence
export const LIKELIHOOD_LEVELS = [
  { value: 1, label: 'Rare' },
  { value: 2, label: 'Unlikely' },
  { value: 3, label: 'Possible' },
  { value: 4, label: 'Likely' },
  { value: 5, label: 'Almost Certain' },
]

export const CONSEQUENCE_LEVELS = [
  { value: 1, label: 'Insignificant' },
  { value: 2, label: 'Minor' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Major' },
  { value: 5, label: 'Catastrophic' },
]

export function riskBand(score) {
  if (score >= 15) return { label: 'HIGH - STOP', color: 'major', action: 'Stop activity, do not proceed. Requires notification of a Health and Safety Manager/Designate to consider any possible immediate action to reduce risk to a lower level. If not possible to further reduce the risk, the work should remain prohibited.' }
  if (score >= 9) return { label: 'MEDIUM - WARNING URGENT ACTION', color: 'minor', action: 'Take immediate action and maintain all existing controls. Substantial efforts should be made to reduce the risk and should be implemented urgently. Requires notification of a respective Departmental Manager/Designate. Might be necessary to restrict the work activity until interim controls are in place.' }
  return { label: 'LOW - MONITOR', color: 'conform', action: 'Continue but consider any possible, reasonably practicable, additional controls and monitor regularly. Ensure existing controls are maintained and reviewed.' }
}
