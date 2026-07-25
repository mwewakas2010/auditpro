import { iso45001Clauses } from './iso45001Clauses'
import { iso9001Clauses } from './iso9001Clauses'
import { iso14001Clauses } from './iso14001Clauses'

export const STANDARDS = {
  'ISO 45001:2018': {
    key: 'ISO 45001:2018',
    label: 'ISO 45001:2018',
    system: 'OH&S Management System',
    reportTitle: 'OH&S Management System Audit Report',
    clauses: iso45001Clauses,
  },
  'ISO 9001:2015': {
    key: 'ISO 9001:2015',
    label: 'ISO 9001:2015',
    system: 'Quality Management System',
    reportTitle: 'Quality Management System Audit Report',
    clauses: iso9001Clauses,
  },
  'ISO 14001:2015': {
    key: 'ISO 14001:2015',
    label: 'ISO 14001:2015',
    system: 'Environmental Management System',
    reportTitle: 'Environmental Management System Audit Report',
    clauses: iso14001Clauses,
  },
}

export const STANDARD_LIST = Object.values(STANDARDS)

export function getClauses(standard) {
  return (STANDARDS[standard] || STANDARDS['ISO 45001:2018']).clauses
}

export function getStandardInfo(standard) {
  return STANDARDS[standard] || STANDARDS['ISO 45001:2018']
}
