import { Template } from '../types/rti';
import { Institution, Position, Receiver } from '../types/db';


export const mockTemplates: Template[] = [
  {
    id: 'new1',
    title: 'Standard Environmental Data Request',
    description: 'Used for requesting pollution and emission data.',
    file: '',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nI am writing to request information under the Right to Information Act regarding environmental data...',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'new2',
    title: 'Budget Allocation Inquiry',
    description: 'Used for requesting departmental budget details.',
    file: '',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nPlease provide the detailed budget allocation for the fiscal year...',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Additional templates for demonstrating pagination (Page Size: 10)
  { id: 'new3', title: 'Public Works Project Details', description: 'Inquiry about ongoing construction', file: '', content: '# Project Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new4', title: 'Staff Recruitment Data', description: 'Request statistics on hiring', file: '', content: '# Recruitment Stats\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new5', title: 'Healthcare Facility Audit', description: 'Audit reports for hospitals', file: '', content: '# Healthcare Audit\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new6', title: 'Urban Planning Records', description: 'City development masterplan', file: '', content: '# Urban Planning\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new7', title: 'Educational Grant Usage', description: 'How school funds were spent', file: '', content: '# Grant Usage\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new8', title: 'Transport Department Revenue', description: 'Monthly toll collection data', file: '', content: '# Revenue Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new9', title: 'Voter Registration Logs', description: 'Anonymized registration counts', file: '', content: '# Voter Logs\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new10', title: 'Agriculture Subsidy List', description: 'Beneficiaries of seed grants', file: '', content: '# Subsidy List\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new11', title: 'Water Quality Reports', description: 'Daily turbidity and pH test result', file: '', content: '# Water Quality\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new12', title: 'Solid Waste Management Log', description: 'Tracking garbage disposal sites', file: '', content: '# Waste Log\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new13', title: 'Mining Lease Agreements', description: 'Active mining permissions list', file: '', content: '# Mining Leases\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new14', title: 'Telecom License Renewals', description: 'Inquiry on fiber optic rollout', file: '', content: '# Telecom Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new15', title: 'Police Department Vacancies', description: 'Open positions in city police', file: '', content: '# Vacancy Status\n{{date}}', createdAt: new Date(), updatedAt: new Date() }
];

export const mockInstitutions: Institution[] = [
  { id: 'inst-1', name: 'Ministry of Finance', createdAt: new Date(), updatedAt: new Date() },
  { id: 'inst-2', name: 'Ministry of Defense', createdAt: new Date(), updatedAt: new Date() },
  { id: 'inst-3', name: 'Department of Revenue', createdAt: new Date(), updatedAt: new Date() },
  { id: 'inst-4', name: 'Municipal Corporation', createdAt: new Date(), updatedAt: new Date() },
  { id: 'inst-5', name: 'State Electricity Board', createdAt: new Date(), updatedAt: new Date() },
];

export const mockPositions: Position[] = [
  { id: 'pos-1', name: 'Public Information Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'pos-2', name: 'Appellate Authority', createdAt: new Date(), updatedAt: new Date() },
  { id: 'pos-3', name: 'Nodal Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'pos-4', name: 'Chief Financial Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'pos-5', name: 'Executive Engineer', createdAt: new Date(), updatedAt: new Date() },
];

export const mockReceivers: Receiver[] = [
  {
    id: 'rec-1',
    institutionId: 'inst-1',
    positionId: 'pos-1',
    email: 'pio.finance@gov.in',
    contactNo: '011-23095228',
    address: 'North Block, New Delhi',
    institutionName: 'Ministry of Finance',
    positionName: 'Public Information Officer',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-2',
    institutionId: 'inst-2',
    positionId: 'pos-2',
    email: 'aa.defense@gov.in',
    contactNo: '011-23012284',
    address: 'South Block, New Delhi',
    institutionName: 'Ministry of Defense',
    positionName: 'Appellate Authority',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-3',
    institutionId: 'inst-3',
    positionId: 'pos-3',
    email: 'nodal.revenue@nic.in',
    contactNo: '011-23092653',
    address: 'Revenue Department, Gate No. 4, New Delhi',
    institutionName: 'Department of Revenue',
    positionName: 'Nodal Officer',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-4',
    institutionId: 'inst-4',
    positionId: 'pos-4',
    email: 'cfo.municipal@city.gov',
    contactNo: '022-26533333',
    address: 'Municipal Head Office, Mumbai',
    institutionName: 'Municipal Corporation',
    positionName: 'Chief Financial Officer',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-5',
    institutionId: 'inst-5',
    positionId: 'pos-5',
    email: 'ee.electricity@state.in',
    contactNo: '044-28521111',
    address: 'Electricity Board HQ, Chennai',
    institutionName: 'State Electricity Board',
    positionName: 'Executive Engineer',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  { id: 'rec-6', institutionId: 'inst-1', positionId: 'pos-2', email: 'fin6@gov.in', contactNo: '1006', address: 'Delhi', institutionName: 'Ministry of Finance', positionName: 'Appellate Authority', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-7', institutionId: 'inst-2', positionId: 'pos-1', email: 'def7@gov.in', contactNo: '1007', address: 'Delhi', institutionName: 'Ministry of Defense', positionName: 'Public Information Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-8', institutionId: 'inst-3', positionId: 'pos-4', email: 'rev8@gov.in', contactNo: '1008', address: 'Delhi', institutionName: 'Department of Revenue', positionName: 'Chief Financial Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-9', institutionId: 'inst-4', positionId: 'pos-3', email: 'mun9@gov.in', contactNo: '1009', address: 'Mumbai', institutionName: 'Municipal Corporation', positionName: 'Nodal Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-10', institutionId: 'inst-5', positionId: 'pos-2', email: 'ele10@gov.in', contactNo: '1010', address: 'Chennai', institutionName: 'State Electricity Board', positionName: 'Appellate Authority', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-11', institutionId: 'inst-1', positionId: 'pos-3', email: 'fin11@gov.in', contactNo: '1011', address: 'Delhi', institutionName: 'Ministry of Finance', positionName: 'Nodal Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-12', institutionId: 'inst-2', positionId: 'pos-4', email: 'def12@gov.in', contactNo: '1012', address: 'Delhi', institutionName: 'Ministry of Defense', positionName: 'Chief Financial Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-13', institutionId: 'inst-3', positionId: 'pos-5', email: 'rev13@gov.in', contactNo: '1013', address: 'Delhi', institutionName: 'Department of Revenue', positionName: 'Executive Engineer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-14', institutionId: 'inst-4', positionId: 'pos-1', email: 'mun14@gov.in', contactNo: '1014', address: 'Mumbai', institutionName: 'Municipal Corporation', positionName: 'Public Information Officer', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-15', institutionId: 'inst-5', positionId: 'pos-1', email: 'ele15@gov.in', contactNo: '1015', address: 'Chennai', institutionName: 'State Electricity Board', positionName: 'Public Information Officer', createdAt: new Date(), updatedAt: new Date() },
];