// Fixed content for the Field Level Risk Assessment.

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

// "Do It Safely Or Not At All" responsibility statements, shown on the
// mandatory landing/acknowledge page before starting a new FLRA.
export const STOP_RESPONSIBILITY_STATEMENTS = [
  'I have the responsibility and I am expected to STOP unsafe work whenever I believe it to be unsafe.',
  'I am responsible for my own safety and my co-workers\u2019 safety.',
  'I am required to report any unsafe acts, unsafe conditions, absence of, or defects in equipment or protective devices that could endanger the safety of myself or my co-workers to my supervisor.',
  'I am required to wear and utilize protective devices, equipment, and additional personal protective equipment (PPE) in accordance with the task procedures.',
  'There are no negative repercussions for stopping unsafe work.',
]

export const STOP_BOXES = [
  { label: 'STOP! SPEAK UP', color: 'major' },
  { label: 'MAKE IT RIGHT', color: 'minor' },
  { label: 'SAVE A LIFE', color: 'conform' },
]

export const FLRA_INSTRUCTIONS = {
  intro:
    'The objective of the Field Level Risk Assessment (FLRA) is to identify hazards, assess risks and put controls in place prior to starting the job or task. The purpose of the FLRA is to provide information that can be used to make decisions about how to safely manage work activities. If you cannot effectively control the identified Fatal Risk, communicate this concern with your Supervisor.',
  why: ['Evaluate risks and fight complacency', 'Think about the task at hand, slow down, STOP, THINK, ACT', 'Create awareness of hazards and risks', 'Prevent injuries or incidents'],
  who: ['The person doing the task (Employee/Contractor/Management)', 'Jobs requiring up to two team members'],
  when: ['Non-routine: a task that occurs infrequently', 'Changing conditions', 'Change in tasks', 'Others conducting work in your area', 'Prior to beginning a new job'],
}

export const HIERARCHY_OF_CONTROLS = [
  { level: 'Elimination', desc: 'Physically remove the hazard', color: '#2E7D32' },
  { level: 'Substitution', desc: 'Replace the hazard', color: '#66BB6A' },
  { level: 'Engineering Controls', desc: 'Isolate people from the hazard', color: '#FBC02D' },
  { level: 'Administrative Controls', desc: 'Change the way people work', color: '#FB8C00' },
  { level: 'PPE', desc: 'Protect the worker with personal protective equipment', color: '#E53935' },
]

// Each fatal risk's critical controls, now with a stable key per control
// (used for the interactive In Place / Not in Place verification table and
// its database rows) plus the control text itself.
export const FATAL_RISK_CONTROLS = {
  'Stored Energy': [
    { key: 'se_deenergise', text: 'De-energise: identify sources of energy and ensure they are at zero-state.' },
    { key: 'se_lototo', text: 'LOTOTO: remember to always lock out - tag out - try out.' },
    { key: 'se_guards', text: 'Guards, Barriers and Barricades: ensure they are in position and effective.' },
    { key: 'se_lockout_device', text: 'Lock-out Device: use the appropriate lock-out device to isolate the energy source.' },
    { key: 'se_personal_lock', text: 'Personal Lock and Tag: have your OWN lock and tag, with unique key.' },
  ],
  'Falling From Heights': [
    { key: 'ffh_rescue_plan', text: 'Rescue Plan: ensure a rescue plan is in place before starting work above 1.8m.' },
    { key: 'ffh_fall_equipment', text: 'Fall Equipment: inspect and wear the correct fall restraint or arrest equipment when working above 1.8m.' },
    { key: 'ffh_tie_off', text: 'Tie Off: stay 100% tied off at all times on approved anchor points.' },
    { key: 'ffh_elevated_platforms', text: 'Elevated Platforms: only work on certified elevated platforms.' },
    { key: 'ffh_barriers', text: 'Barriers: ensure barriers are in place to prevent people or objects from falling over the edge; ensure exclusion zones are demarcated.' },
  ],
  'Lifting': [
    { key: 'lift_plan', text: 'Lift Plan: determine how the lift will be carried out with input from all persons involved.' },
    { key: 'lift_equipment_rigging', text: 'Equipment and Rigging: ensure all lifting equipment is inspected, certified and load is secured and controlled.' },
    { key: 'lift_calculate_confirm', text: 'Calculate and Confirm: analyse the weight of the load and all associated equipment parameters.' },
    { key: 'lift_drop_zone', text: 'Drop Zone: erect barricades and exclusion zones to restrict access to the area under a suspended load or within a drop zone.' },
    { key: 'lift_communication', text: 'Communication: positive communication from a single person to the operator.' },
  ],
  'Blasting & Explosives': [
    { key: 'be_communication', text: 'Communication: scheduled and effective blast notification to all site personnel.' },
    { key: 'be_blast_design', text: 'Blast Design: compliance with the approved drill and blast design.' },
    { key: 'be_transport', text: 'Transport Equipment: safely transport explosives using approved, certified, and maintained explosives-transport equipment.' },
    { key: 'be_exclusion_zones', text: 'Exclusion Zones: establish and restrict access of personnel and equipment to blast exclusion zones with barricades.' },
    { key: 'be_access_control', text: 'Access Control: lock out - tag out on stinger and blast tag boards, to ensure all individuals are accounted for.' },
    { key: 'be_explosive_handling', text: 'Explosive Handling: no unauthorised handling of explosives, accessories, and misfires.' },
  ],
  'Hazardous Substances & Chemicals': [
    { key: 'hs_ppe', text: 'PPE: wear correct hazardous-materials PPE in line with Safety Data Sheet (SDS).' },
    { key: 'hs_access', text: 'Access: restrict access to authorised personnel only.' },
    { key: 'hs_emergency_response', text: 'Emergency Response: containment and exposure measures must be on hand and working according to SDS guidance.' },
    { key: 'hs_detection_alarm', text: 'Detection and Alarm Systems: correct detection devices and alarms are in place and fully functional.' },
    { key: 'hs_handling_transfer', text: 'Handling & Transfer: protection protocols are in place when handling and transferring chemicals based on SDS.' },
  ],
  'Confined Space': [
    { key: 'cs_rescue_plan', text: 'Rescue Plan: formulate a rescue plan and ensure that a spotter is in place at all times.' },
    { key: 'cs_permit', text: 'Permit: ensure you have a signed and completed permit at access entry point.' },
    { key: 'cs_energy_isolation', text: 'Energy Isolation: all possible energy sources have been identified and controlled per lock out - tag out - try out (LOTOTO).' },
    { key: 'cs_access_control', text: 'Access Control: work area to be demarcated and access control to be managed by a spotter at all entry points.' },
    { key: 'cs_atmosphere', text: 'Atmosphere: test and confirm atmosphere is life-sustaining and continue monitoring.' },
  ],
  'Fall of Ground': [
    { key: 'fog_workplace_inspection', text: 'Workplace Inspection: inspected, properly scaled down, and made safe.' },
    { key: 'fog_geotechnical_inspection', text: 'Geotechnical Inspection: ensure that inspections are completed and workplaces are continuously monitored.' },
    { key: 'fog_ground_control_plan', text: 'Ground Control Management Plan: ensure that the plan is implemented and communicated.' },
    { key: 'fog_barricading', text: 'Barricading and Exclusion Zones: ensure exclusion zones have been identified and maintained.' },
    { key: 'fog_water_management', text: 'Water Management: establish a water management plan.' },
  ],
  'Mobile Equipment': [
    { key: 'me_pre_use_inspection', text: 'Pre-use Inspection: confirm functionality of braking, steering, and safety devices.' },
    { key: 'me_parking', text: 'Parking: follow safe, secure and stable parking practices in designated parking areas.' },
    { key: 'me_traffic_plan', text: 'Traffic Management Plan: adhere to road designs, rules, signage, and segregation of equipment and pedestrians.' },
    { key: 'me_berms_windrows', text: 'Berms and Windrows: ensure that berms and windrows are installed to standard and maintained.' },
    { key: 'me_communication', text: 'Communication: ensure positive communication is maintained at all times.' },
    { key: 'me_mobile_devices', text: 'Mobile Devices: do not use phones, smart watches or tablets when driving.' },
  ],
  'Rotating Equipment': [
    { key: 're_guards', text: 'Guards, Barriers and Barricades: ensure these are in place, effective, and maintained.' },
    { key: 're_safety_devices', text: 'Safety Devices: ensure safety devices and interlocks have been tested and are in working condition.' },
    { key: 're_energy_isolation', text: 'Energy Isolation: all possible energy sources have been identified and controlled per lock out - tag out - try out (LOTOTO).' },
  ],
  'Fire': [
    { key: 'fire_combustible_storage', text: 'Combustible Materials Storage: store combustible/flammable materials separately and safely.' },
    { key: 'fire_ventilation', text: 'Ventilation: ensure adequate ventilation in working areas, and that systems are functioning and maintained.' },
    { key: 'fire_detection_suppression', text: 'Fire Detection, Alarm, and Suppression: ensure fixed and mobile equipment has functional fire-detection and suppression systems.' },
    { key: 'fire_evacuation_plan', text: 'Evacuation Plan: be prepared and know your emergency plan, egress, refuge chamber, self-rescuer, and muster point.' },
    { key: 'fire_hot_work_permit', text: 'Hot Work Permit: obtain a permit and implement the associated controls before starting work.' },
  ],
}
