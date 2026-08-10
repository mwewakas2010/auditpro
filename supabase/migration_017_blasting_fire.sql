-- AuditPro — Migration 017: Blasting & Explosives and Fire CCV templates
-- (the final 2 of 10 poster hazards), plus new fields these two source
-- forms introduced: Task, Site, and an "unplanned work" checkbox.
--
-- Source numbering was sequential (1-55 / 1-71) across the whole document;
-- re-numbered here to per-category (1.1, 1.2, 2.1...) to match every other
-- CCV template, per instruction.

alter table ccv_instances add column if not exists task text;
alter table ccv_instances add column if not exists site text;
alter table ccv_instances add column if not exists is_unplanned boolean not null default false;

do $$
declare
  v_template_id uuid;
  v_cat_id uuid;
begin

  -- ================= BLASTING & EXPLOSIVES =================
  insert into checklist_templates (name, document_reference, revision_number, total_pages, date_of_issue, date_of_next_review)
  values ('Blasting & Explosives Critical Control Verification', 'ID-27027', '01', '7', '2026-08-08', null)
  returning id into v_template_id;

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '1.0', 'BLASTING EXCLUSION ZONES AND ACCESS CONTROL', 1) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '1.1', 'Is the blast site controlled against unauthorized entry?', 1),
    (v_cat_id, '1.2', 'Before firing a blast, are all access routes protected against unauthorized entry?', 2),
    (v_cat_id, '1.3', 'Was sufficient warning given to allow all persons to be evacuated from the blast site, prior to attaching a source of initiation?', 3),
    (v_cat_id, '1.4', 'Have all persons evacuated the blast site prior to attaching a source of initiation?', 4),
    (v_cat_id, '1.5', 'Was the area inspected for misfires by an authorized/competent person after the blast and prior to resuming work in the blast site?', 5),
    (v_cat_id, '1.6', 'Was sufficient time elapsed to dissipate gasses from blasting?', 6),
    (v_cat_id, '1.7', 'Did all the fly rock stay within the blast area?', 7),
    (v_cat_id, '1.8', 'Are personnel familiar with the emergency response plan and how to respond?', 8);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '2.0', 'EXECUTION OF CHARGING AND HANDLING PROTOCOL', 2) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '2.1', 'Is the blast site protected against unauthorized entry while explosive materials or initiating systems are on the blast site?', 1),
    (v_cat_id, '2.2', 'Has the tag board been checked and cleared of all personnel except those directly involved in the blast?', 2),
    (v_cat_id, '2.3', 'Is access to blast site restricted once loading begins?', 3),
    (v_cat_id, '2.4', 'Are unused explosive materials removed after loading operations are completed?', 4),
    (v_cat_id, '2.5', 'Have blast holes been checked for obstructions prior to loading?', 5),
    (v_cat_id, '2.6', 'Are explosives and blasting agents kept separated from detonators until loading begins?', 6),
    (v_cat_id, '2.7', 'Are primers made only at the time of use at the blast site?', 7),
    (v_cat_id, '2.8', 'When vehicles are moving on a loaded and charged shot is a spotter actively watching the vehicle to ensure initiating systems are clear of the path of travel to prevent vehicle/explosives interaction?', 8),
    (v_cat_id, '2.9', 'Have vehicles entering a loaded shot been inspected to ensure that snag/catch points that could catch initiating systems have been controlled? (e.g. underrun bar, wheel nuts, steps etc.)', 9),
    (v_cat_id, '2.10', 'Have the downlines been secured or covered to prevent looping or excess line that could become caught on equipment?', 10);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '3.0', 'INSPECTION OF EXPLOSIVES TRANSPORTATION VEHICLE', 3) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '3.1', 'Does the pre-start inspection of the vehicle containing the explosives match the actual condition of the vehicle?', 1),
    (v_cat_id, '3.2', 'Is the transportation vehicle equipped with fire extinguisher or fixed fire suppression equipment?', 2),
    (v_cat_id, '3.3', 'Are placards and lights displayed on the transport vehicle to indicate that it is carrying explosives?', 3),
    (v_cat_id, '3.4', 'Does the vehicle explosives storage compartment meet regulatory requirements? (Note: with proper separation for caps and explosives.)', 4);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '4.0', 'MANAGEMENT OF MISFIRES', 4) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '4.1', 'Is the required wait time observed before the work area is inspected for misfires after blasting?', 1),
    (v_cat_id, '4.2', 'Is the area inspected by an authorized/competent person post blast, and prior to resuming work at blast site?', 2),
    (v_cat_id, '4.3', 'Were post-blast communications provided that no misfires were detected?', 3),
    (v_cat_id, '4.4', 'Is the area free of indications of a misfire? (i.e. booster or explosive products)', 4),
    (v_cat_id, '4.5', 'If a misfire is suspected were site re-entry procedures followed?', 5),
    (v_cat_id, '4.6', 'If a misfire is suspected, are proper work area controls in place?', 6),
    (v_cat_id, '4.7', 'Does the misfire removal comply with the misfire management procedure?', 7),
    (v_cat_id, '4.8', 'Was the exclusion zone maintained until the misfire all clear signal is provided?', 8);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '5.0', 'SEGREGATION OF EXPLOSIVES DURING TRANSPORTATION', 5) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '5.1', 'Is the transportation vehicle attended or the cargo compartment locked?', 1),
    (v_cat_id, '5.2', 'Are detonators kept in original packaging or in closed containers?', 2),
    (v_cat_id, '5.3', 'Are detonators separated from explosives or blasting agents?', 3),
    (v_cat_id, '5.4', 'Is the passenger area free from explosive?', 4),
    (v_cat_id, '5.5', 'Is the explosive box constructed according to regulatory requirements? (Note: wood-lined boxes.)', 5);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '6.0', 'STORAGE EXCLUSION ZONES AND ACCESS CONTROL', 6) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '6.1', 'Have all ignition sources in the explosive storage area been removed?', 1),
    (v_cat_id, '6.2', 'Are explosives segregated, fenced, signed and labeled?', 2),
    (v_cat_id, '6.3', 'Is the exclusion zone free and clear of non-permissible structures and activity?', 3),
    (v_cat_id, '6.4', 'Is the explosives storage area inaccessible to unauthorized entry?', 4),
    (v_cat_id, '6.5', 'Are the explosive storage magazines electrically grounded?', 5),
    (v_cat_id, '6.6', 'Are all explosives secured by lock and key?', 6),
    (v_cat_id, '6.7', 'Is access to the keys restricted only to authorized personnel?', 7),
    (v_cat_id, '6.8', 'Are the inventory records accurate?', 8);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '7.0', 'FIRING SYSTEMS', 7) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '7.1', 'Do Charge-Up Personnel have up to date Firing Plans? (Check plans used against the latest revision issued; check firing is conducted in accordance with Firing Plan.)', 1),
    (v_cat_id, '7.2', 'Have main firing lines and independent firing lines been clearly delineated? (Mains and independent physically segregated; independent lines clear of joins/junctions/switches; lines delineated by colour and tags; independent firing points clearly signed.)', 2),
    (v_cat_id, '7.3', 'Does the Independent Firing Point meet the minimum specifications? (Clearly identified by signage; meets location/access specifications.)', 3),
    (v_cat_id, '7.4', 'Has an Independent Firing Point checklist been completed prior to the establishment of the IFP?', 4),
    (v_cat_id, '7.5', 'Is access to Firing Lines restricted to authorised persons? (Blast unit connection points to firing lines are locked and unable to be removed.)', 5);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '8.0', 'BREAKTHROUGH MANAGEMENT (DEVELOPMENT)', 8) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '8.1', 'Does the operator have the current Survey Memo/Work Plan?', 1),
    (v_cat_id, '8.2', 'Does the Survey Memo/Work Plan clearly show hold, stop points and stand-off distances?', 2),
    (v_cat_id, '8.3', 'Is the operator able to accurately confirm their position/chainage within the heading or drill hole?', 3),
    (v_cat_id, '8.4', 'Is the operator able to confirm current stand-off distances through checks/monitoring?', 4),
    (v_cat_id, '8.5', 'Has the operator checked the face for misfires, butts and other services?', 5),
    (v_cat_id, '8.6', 'Has the operator completed probing to check distance to breakthrough?', 6),
    (v_cat_id, '8.7', 'Have exclusion zones been established at safe locations to hazardous areas e.g. stop points, breakthroughs, rifling hazards?', 7);

  -- ================= FIRE =================
  insert into checklist_templates (name, document_reference, revision_number, total_pages, date_of_issue, date_of_next_review)
  values ('Fire Critical Control Verification', 'ID-2068148', '01', '9', '2026-08-08', null)
  returning id into v_template_id;

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '1.0', 'ARC FLASH PREVENTION', 1) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '1.1', 'Are arc flash ratings visible on all key components, such as switchgear, transformers, and panel boards?', 1),
    (v_cat_id, '1.2', 'Are arc flash warning labels present, clearly visible, and positioned at eye level on all applicable equipment?', 2),
    (v_cat_id, '1.3', 'Are arc flash barriers and protective enclosures installed and in good condition around equipment with arc flash risk?', 3),
    (v_cat_id, '1.4', 'Are insulated tools and heat-resistant cables in good condition and appropriate for the voltage level of the task?', 4),
    (v_cat_id, '1.5', 'Are personnel using appropriate arc-rated personal protective equipment, including face shields, gloves, and flame-resistant clothing?', 5);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '2.0', 'ELECTRICAL FIRE PREVENTION ON MOBILE EQUIPMENT', 2) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '2.1', 'Are all visible wires and insulation free from wear, fraying, or damage, especially in high-vibration areas?', 1),
    (v_cat_id, '2.2', 'Are battery terminals, switches, and relays inspected and found free of corrosion, with all connections tight?', 2),
    (v_cat_id, '2.3', 'Is the engine compartment and surrounding electrical equipment clear of dust, oil, and grease, without combustible debris?', 3),
    (v_cat_id, '2.4', 'Have high-demand components, such as lights or power units, been checked for any signs of overheating or hotspots?', 4);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '3.0', 'PROPER INSTALLATION OF POWER CONNECTION', 3) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '3.1', 'Are appliances inspected regularly to ensure they meet manufacturer-specified electrical requirements and are safe for operation?', 1),
    (v_cat_id, '3.2', 'Are high-power appliances connected to the correct circuits?', 2),
    (v_cat_id, '3.3', 'Are permanent outlets being used for appliances, and is the use of extension cords or power strips minimized?', 3),
    (v_cat_id, '3.4', 'Are outlets easily accessible and circuits free from signs of overloading during regular use?', 4),
    (v_cat_id, '3.5', 'Are appliances installed in safe locations (e.g. away from moisture or heat, no obstructions, adequate spacing)?', 5);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '4.0', 'FIRE HAZARD ASSESSMENT', 4) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '4.1', 'Where there is a risk of a potential fire hazard, has the team completed an assessment to ensure that fire hazards are identified, managed, and controlled?', 1),
    (v_cat_id, '4.2', 'Are fire protection measures in place as identified by the fire hazard assessment?', 2),
    (v_cat_id, '4.3', 'Are the control measures being implemented by personnel, appropriate for the nature and size of potential fire risks?', 3);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '5.0', 'STORAGE INTEGRITY OF FLAMMABLE AND COMBUSTIBLE LIQUIDS, SOLIDS AND GASES', 5) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '5.1', 'Do personnel have access to written procedures for the use, storage, and disposal of flammable and combustible liquids, solids, and gases?', 1),
    (v_cat_id, '5.2', 'Are Safety Data Sheets kept in a location near the work area where flammable and combustible liquids, solids, and gases are handled and stored?', 2),
    (v_cat_id, '5.3', 'Are flammable and combustible liquids, solids, and gases stored and segregated as per the safety data sheet? (e.g. fire-resistant cabinets, sealed containers, grounded/bonded metal drums, capped/secured gas cylinders, correct disposal.)', 3),
    (v_cat_id, '5.4', 'Are all containers and storage areas of flammable and combustible liquids, solids, and gases correctly and clearly labelled? (Unknown contents marked DO NOT USE.)', 4),
    (v_cat_id, '5.5', 'Are containers certified for the material it contains and is in good condition (e.g. not leaking and no signs of corrosion)?', 5),
    (v_cat_id, '5.6', 'Are storage areas clean, organized, and free of waste and ignition sources?', 6),
    (v_cat_id, '5.7', 'Are bunds clear, spill trays in place, and clear?', 7),
    (v_cat_id, '5.8', 'Are pipes or other distribution systems used for flammable and combustible liquids and gases clearly identified and labelled?', 8),
    (v_cat_id, '5.9', 'Are structural beams, supports and vessels free from structural damage, and excessive corrosion and rust?', 9),
    (v_cat_id, '5.10', 'Are all vessels, pipes, flanges, and fittings free from visible leaks? (Check all bolts on flanges are installed and secured as per design standards.)', 10),
    (v_cat_id, '5.11', 'Are hoses, pressure, piping, and distribution equipment in good condition and free from external structural damage or significant corrosion?', 11),
    (v_cat_id, '5.12', 'Are spill kits available and contain appropriate and adequate quantities of absorbent material for the estimated size of a spill that could occur in the area?', 12),
    (v_cat_id, '5.13', 'Are dedicated combustible waste storage areas clearly identified, maintained, and inspected for proper temperature controls and fire prevention measures?', 13);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '6.0', 'HOT WORK MANAGEMENT', 6) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '6.1', 'Does the hot work permit clearly define the fire protection/detection requirements?', 1),
    (v_cat_id, '6.2', 'Was the hot work area inspected by the Permit Approver and Permit Acceptor (typically the Job Supervisor) before issuing the hot work permit?', 2),
    (v_cat_id, '6.3', 'Is the Hot Work Permit approved by an authorized person, valid and current?', 3),
    (v_cat_id, '6.4', 'Does the hot work permit clearly describe the scope of work to be undertaken?', 4),
    (v_cat_id, '6.5', 'Does the hot work permit cover the correct location where the hot work is being performed?', 5),
    (v_cat_id, '6.6', 'Does the hot work permit identify hazardous ignition sources (e.g. naked flames, flammable and combustible materials/liquids) that need to be controlled?', 6),
    (v_cat_id, '6.7', 'Is the vicinity where the hot work is being performed free from combustibles, flammable and explosive materials, dusts or liquids?', 7),
    (v_cat_id, '6.8', 'Have all the instructions and/or special conditions listed on the hot work permit been fully implemented on the job (e.g. isolation, atmospheric monitoring, ventilation, fire watch)?', 8),
    (v_cat_id, '6.9', 'Has the team verified through testing that the atmosphere is free of flammable or combustible gases/vapors or high concentrations of gases/vapors that support combustion (e.g. oxygen, peroxides)?', 9),
    (v_cat_id, '6.10', 'When hot work is being performed on process equipment that normally contains flammable/combustible material or hazardous substances, has the team confirmed proper isolation and purging of the equipment has occurred?', 10),
    (v_cat_id, '6.11', 'Have all personnel involved with the task reviewed and signed on to the Hot Work Permit?', 11),
    (v_cat_id, '6.12', 'When hot work is going to be performed in any enclosed space e.g. sea container, transportable building, shed, etc., has a gas test for flammable and explosive substances been conducted and deemed safe?', 12);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '7.0', 'FIRE PROTECTION SYSTEM', 7) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '7.1', 'Are air pressure gauges and water pressure gauges properly located and kept in working order?', 1),
    (v_cat_id, '7.2', 'Are fire sprinklers regularly checked and in good condition? (E.g. not bent or broken, no evidence of leaks or corrosion.)', 2),
    (v_cat_id, '7.3', 'Are valves in good condition, accessible and operational?', 3),
    (v_cat_id, '7.4', 'Is identification displayed and legible on valves? (E.g. main drain, Open/Close valve, inspector test valve.)', 4),
    (v_cat_id, '7.5', 'Is external and internal piping in good condition? (E.g. no sign of leaks or corrosion build-up.)', 5),
    (v_cat_id, '7.6', 'Are fire pumps regularly inspected and tested?', 6),
    (v_cat_id, '7.7', 'Are fire hoses and accessories in good condition, not bypassed, and in the designated locations?', 7);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '8.0', 'FIRE DETECTION AND ALARM SYSTEMS', 8) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '8.1', 'Do sensors display the date they were last calibrated?', 1),
    (v_cat_id, '8.2', 'Is the testing and calibration date for fixed gas sensors within the last three months?', 2),
    (v_cat_id, '8.3', 'Are sensors and alarms in good physical condition?', 3),
    (v_cat_id, '8.4', 'Did the team perform a visual check of the sensors and alarms before commencing work?', 4),
    (v_cat_id, '8.5', 'Are personal/handheld gas monitors bump-tested before use?', 5),
    (v_cat_id, '8.6', 'Are personal/hand-held gas monitors calibrated as per manufacturers'' requirements?', 6),
    (v_cat_id, '8.7', 'Are personnel wearing monitors in their correct location to detect flammable or combustible materials?', 7);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '9.0', 'FIRE SUPPRESSION ON FIXED EQUIPMENT', 9) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '9.1', 'Is the fire suppression system for fixed equipment in good condition and operational?', 1),
    (v_cat_id, '9.2', 'Is the fixed equipment clear and free from combustible materials (e.g. rags, oil, grease)?', 2),
    (v_cat_id, '9.3', 'Are the pressure indicators for the system installed, operational, and achieving the required minimum operational pressure for the system?', 3),
    (v_cat_id, '9.4', 'Is the inspection on the fire suppression system up to date and tagged?', 4),
    (v_cat_id, '9.5', 'Are fire extinguishers properly mounted and accessible on fixed equipment not fitted with a fire suppression system?', 5),
    (v_cat_id, '9.6', 'Are fire extinguishers in good condition? (Cylinder free from corrosion/dents; hose free from cracks/leaks; locking pin intact; discharge line nozzles fitted with protective caps.)', 6),
    (v_cat_id, '9.7', 'Are fire hoses and accessories in good condition, not bypassed, and in the designated locations?', 7);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '10.0', 'FIRE SUPPRESSION SYSTEM FOR OFF-ROAD MOBILE EQUIPMENT', 10) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '10.1', 'Are mobile equipment operators completing fire suppression system inspections prior to the start of shifts, to ensure they are active, in good condition, and not bypassed?', 1),
    (v_cat_id, '10.2', 'Is the inspection on the fire suppression system up to date and tagged?', 2),
    (v_cat_id, '10.3', 'Are fire extinguishers properly mounted and accessible on mobile equipment not fitted with a fire suppression system?', 3),
    (v_cat_id, '10.4', 'Are fire extinguishers in good condition? (Cylinder free from corrosion/dents; hose free from cracks/leaks; locking pin intact; discharge line nozzles fitted with protective caps.)', 4);

  insert into checklist_template_categories (template_id, category_number, name, sort_order) values (v_template_id, '11.0', 'EMERGENCY EVACUATION', 11) returning id into v_cat_id;
  insert into checklist_template_items (category_id, item_number, requirement_text, sort_order) values
    (v_cat_id, '11.1', 'Do personnel know the closest emergency egress and evacuation routes?', 1),
    (v_cat_id, '11.2', 'Is the emergency egress and evacuation route clear of obstacles and other items that could impede its use?', 2),
    (v_cat_id, '11.3', 'Is the signage indicating the evacuation routes and emergency egress locations adequate and legible in the field?', 3),
    (v_cat_id, '11.4', 'Are emergency muster points/assembly areas clearly defined and visible in the field?', 4);

end $$;
