// Fixed content for the Field Level Risk Assessment - unlike CCVs, there's
// only one FLRA "template" (matching the real Barrick form), so this is
// simple static data rather than a database-driven template system.

export const SAFETY_CHECK_ITEMS = [
  { key: 'fit_for_duty', text: 'I am fit for duty, trained, and competent for the job/task I am performing.' },
  { key: 'work_area_inspection', text: 'I have completed my work area inspection.' },
  { key: 'notified_others', text: 'I have contacted and notified other persons that may be affected by me doing my task or job.' },
  { key: 'mobile_equipment_checklist', text: 'I have completed my mobile equipment pre-use checklist and the equipment is safe to operate.' },
  { key: 'correct_ppe', text: 'I have the correct PPE for the job/task.' },
  { key: 'tools_available', text: 'I have all the correct tools and equipment available to perform the task safely.' },
  { key: 'tools_inspected', text: 'I have inspected my tools and equipment to ensure they are safe.' },
  { key: 'permits', text: 'I have all relevant permits required for the job/task — Working at Heights, Hot Work, Confined Space.' },
  { key: 'emergency_plan', text: 'I know and understand my emergency plan.' },
  { key: 'critical_controls', text: 'I have ensured that all the critical controls are in place for the job.' },
  { key: 'will_work_safely', text: 'I can and will work SAFELY.' },
]

// Reference guidance shown when a Fatal Risk is selected - same collapsible
// "internal reference, not shown in report" pattern used for ISO clauses.
// Sourced from the Barrick "Guide for the Fatal Risks" reference material.
export const FATAL_RISK_CONTROLS = {
  'Stored Energy': [
    'De-energise: identify sources of energy and ensure they are at zero-state.',
    'LOTOTO: remember to always lock out - tag out - try out.',
    'Guards, Barriers and Barricades: ensure they are in position and effective.',
    'Lock-out Device: use the appropriate lock-out device to isolate the energy source.',
    'Personal Lock and tag: have your OWN lock and tag, with unique key.',
  ],
  'Falling From Heights': [
    'Rescue Plan: ensure a rescue plan is in place before starting work above 1.8m.',
    'Fall Equipment: inspect and wear the correct fall restraint or arrest equipment when working above 1.8m.',
    'Tie Off: stay 100% tied off at all times on approved anchor points.',
    'Elevated Platforms: only work on certified elevated platforms.',
    'Barriers: ensure barriers are in place to prevent people or objects from falling over edge; ensure exclusion zones are demarcated.',
  ],
  'Lifting': [
    'Lift Plan: determine how the lift will be carried out with input from all persons involved.',
    'Equipment and Rigging: ensure all lifting equipment is inspected, certified and load is secured and controlled.',
    'Calculate and Confirm: analyse the weight of the load and all associated equipment parameters.',
    'Drop Zone: erect barricades and exclusion zones to restrict access to the area under a suspended load or within a drop zone.',
    'Communication: positive communication from a single person to the operator.',
  ],
  'Blasting & Explosives': [
    'Communication: scheduled and effective blast notification to all site personnel.',
    'Blast Design: compliance with the approved drill and blast design.',
    'Transport Equipment: safety transport explosives using approved, certified, and maintained explosives-transport equipment.',
    'Exclusion Zones: establish and restrict access of personnel and equipment to blast exclusion zones with barricades.',
    'Access Control: lock out - tag out on stinger and blast tag boards, to ensure all individuals are accounted for.',
    'Explosive Handling: no unauthorised handling of explosives, accessories, and misfires.',
  ],
  'Hazardous Substances & Chemicals': [
    'PPE: wear correct hazardous-materials PPE in line with Safety Data Sheet (SDS).',
    'Access: restrict access to authorised personnel only.',
    'Emergency Response: containment and exposure measures must be on hand and working according to SDS guidance.',
    'Detection and Alarm Systems: correct detection devices and alarms are in place and fully functional.',
    'Handling & Transfer: protection protocols are in place when handling and transferring chemicals based on SDS.',
  ],
  'Confined Space': [
    'Rescue Plan: formulate a rescue plan and ensure that a spotter is in place at all times.',
    'Permit: ensure you have a signed and completed permit at access entry point.',
    'Energy Isolation: all possible energy sources have been identified and controlled per lock out - tag out - try out (LOTOTO).',
    'Access Control: work area to be demarcated and access control to be managed by a spotter at all entry points.',
    'Atmosphere: test and confirm atmosphere is life-sustaining and continue monitoring.',
  ],
  'Fall of Ground': [
    'Workplace Inspection: inspected, properly scaled down, and made safe.',
    'Geotechnical Inspection: ensure that inspections are completed and workplaces are continuously monitored.',
    'Ground Control Management Plan: ensure that the plan is implemented and communicated.',
    'Barricading and Exclusion zones: ensure exclusion zones have been identified and maintained.',
    'Water Management: establish a water management plan.',
  ],
  'Mobile Equipment': [
    'Pre-use Inspection: confirm functionality of braking, steering, and safety devices.',
    'Parking: follow safe, secure and stable parking practices in designated parking areas.',
    'Traffic Management Plan: adhere to road designs, rules, signage, and segregation of equipment and pedestrians.',
    'Berms and Windrows: ensure that berms and windrows are installed to standard and maintained.',
    'Communication: ensure positive communication is maintained at all times.',
    'Mobile Devices: do not use phones, smart watches or tablets when driving.',
  ],
  'Rotating Equipment': [
    'Guards, Barriers and Barricades: ensure these are in place, effective, and maintained.',
    'Safety Devices: ensure safety devices and interlocks have been tested and are in working condition.',
    'Energy Isolation: all possible energy sources have been identified and controlled per lock out - tag out - try out (LOTOTO).',
  ],
  'Fire': [
    'Fire suppression and detection systems are in place and fully functional.',
    'Hot work permits are completed and controls (fire watch, spark containment) are in place.',
    'Fire extinguishers are inspected, accessible, and within service date.',
  ],
}
