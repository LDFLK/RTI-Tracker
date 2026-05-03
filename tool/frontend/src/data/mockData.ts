import { Template } from '../types/rti';
import { Institution, Position, Receiver, Sender, RTIStatus } from '../types/db';


export const mockTemplates: Template[] = [
  {
    id: 'new1',
    title: 'Standard Environmental Data Request',
    description: 'Used for requesting pollution and emission data.',
    file: 'environmental_data_request.md',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_position}}, {{receiver_institution}}\n**From:** {{sender_name}}\n\nI am writing to request information under the Right to Information Act regarding environmental data...',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'new2',
    title: 'Budget Allocation Inquiry',
    description: 'Used for requesting departmental budget details.',
    file: 'budget_allocation_inquiry.md',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_position}}, {{receiver_institution}}\n**From:** {{sender_name}}\n\nPlease provide the detailed budget allocation for the fiscal year...',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // Additional templates for demonstrating pagination (Page Size: 10)
  { id: 'new3', title: 'Public Works Project Details', description: 'Inquiry about ongoing construction', file: 'public_works.md', content: '# Project Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new4', title: 'Staff Recruitment Data', description: 'Request statistics on hiring', file: 'recruitment.md', content: '# Recruitment Stats\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new5', title: 'Healthcare Facility Audit', description: 'Audit reports for hospitals', file: 'healthcare_audit.md', content: '# Healthcare Audit\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new6', title: 'Urban Planning Records', description: 'City development masterplan', file: 'urban_planning.md', content: '# Urban Planning\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new7', title: 'Educational Grant Usage', description: 'How school funds were spent', file: 'educational_grants.md', content: '# Grant Usage\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new8', title: 'Transport Department Revenue', description: 'Monthly toll collection data', file: 'transport_revenue.md', content: '# Revenue Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new9', title: 'Voter Registration Logs', description: 'Anonymized registration counts', file: 'voter_registration.md', content: '# Voter Logs\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new10', title: 'Agriculture Subsidy List', description: 'Beneficiaries of seed grants', file: 'agriculture_subsidy.md', content: '# Subsidy List\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new11', title: 'Water Quality Reports', description: 'Daily turbidity and pH test result', file: 'water_quality.md', content: '# Water Quality\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new12', title: 'Solid Waste Management Log', description: 'Tracking garbage disposal sites', file: 'waste_management.md', content: '# Waste Log\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new13', title: 'Mining Lease Agreements', description: 'Active mining permissions list', file: 'mining_leases.md', content: '# Mining Leases\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new14', title: 'Telecom License Renewals', description: 'Inquiry on fiber optic rollout', file: 'telecom_renewals.md', content: '# Telecom Inquiry\n{{date}}', createdAt: new Date(), updatedAt: new Date() },
  { id: 'new15', title: 'Police Department Vacancies', description: 'Open positions in city police', file: 'police_vacancies.md', content: '# Vacancy Status\n{{date}}', createdAt: new Date(), updatedAt: new Date() }

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
    institution: mockInstitutions[0],
    position: mockPositions[0],
    email: 'pio.finance@gov.in',
    contactNo: '011-23095228',
    address: 'North Block, New Delhi',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-2',
    institution: mockInstitutions[1],
    position: mockPositions[1],
    email: 'aa.defense@gov.in',
    contactNo: '011-23012284',
    address: 'South Block, New Delhi',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-3',
    institution: mockInstitutions[2],
    position: mockPositions[2],
    email: 'nodal.revenue@nic.in',
    contactNo: '011-23092653',
    address: 'Revenue Department, Gate No. 4, New Delhi',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-4',
    institution: mockInstitutions[3],
    position: mockPositions[3],
    email: 'cfo.municipal@city.gov',
    contactNo: '022-26533333',
    address: 'Municipal Head Office, Mumbai',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'rec-5',
    institution: mockInstitutions[4],
    position: mockPositions[4],
    email: 'ee.electricity@state.in',
    contactNo: '044-28521111',
    address: 'Electricity Board HQ, Chennai',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  { id: 'rec-6', institution: mockInstitutions[0], position: mockPositions[1], email: 'fin6@gov.in', contactNo: '1006', address: 'Delhi', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-7', institution: mockInstitutions[1], position: mockPositions[0], email: 'def7@gov.in', contactNo: '1007', address: 'Delhi', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-8', institution: mockInstitutions[2], position: mockPositions[3], email: 'rev8@gov.in', contactNo: '1008', address: 'Delhi', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-9', institution: mockInstitutions[3], position: mockPositions[2], email: 'mun9@gov.in', contactNo: '1009', address: 'Mumbai', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-10', institution: mockInstitutions[4], position: mockPositions[1], email: 'ele10@gov.in', contactNo: '1010', address: 'Chennai', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-11', institution: mockInstitutions[0], position: mockPositions[2], email: 'fin11@gov.in', contactNo: '1011', address: 'Delhi', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-12', institution: mockInstitutions[1], position: mockPositions[3], email: 'def12@gov.in', contactNo: '1012', address: 'Delhi', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-13', institution: mockInstitutions[2], position: mockPositions[4], email: 'rev13@gov.in', contactNo: '1013', address: 'Delhi', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-14', institution: mockInstitutions[3], position: mockPositions[0], email: 'mun14@gov.in', contactNo: '1014', address: 'Mumbai', createdAt: new Date(), updatedAt: new Date() },
  { id: 'rec-15', institution: mockInstitutions[4], position: mockPositions[0], email: 'ele15@gov.in', contactNo: '1015', address: 'Chennai', createdAt: new Date(), updatedAt: new Date() },
];

export const mockSenders: Sender[] = [
  {
    id: 'ldf',
    name: 'Lanka Data Foundation',
    email: 'contact@lankadata.org',
    address: 'No. 123, Galle Road, Colombo 03, Sri Lanka',
    contactNo: '+94 11 234 5678',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const mockRTIRequests: any[] = [
  {
    id: 'rti-1',
    referenceId: 'RTI/2024/001',
    title: 'Pollution data for Kelani River',
    description: 'Requesting daily water quality test results for the last 6 months.',
    sender: mockSenders[0],
    receiver: mockReceivers[0],
    template: mockTemplates[0],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'rti-2',
    referenceId: 'RTI/2024/002',
    title: 'Defense Budget 2023',
    description: 'Detailed breakdown of equipment procurement budget.',
    sender: mockSenders[0],
    receiver: mockReceivers[1],
    template: mockTemplates[1],
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-20'),
  }
];

export const mockStatusHistories: any[] = [
  {
    id: 'h-1',
    rtiRequestId: 'rti-1',
    statusId: 'stat-1',
    direction: 'outgoing',
    description: 'Initial RTI Request created.',
    entryTime: new Date('2024-01-10T10:00:00'),
    exitTime: new Date('2024-01-15T14:30:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'h-2',
    rtiRequestId: 'rti-1',
    statusId: 'stat-2',
    direction: 'outgoing',
    description: 'RTI Request sent for internal sign-off.',
    entryTime: new Date('2024-01-15T14:30:00'),
    exitTime: new Date('2024-01-20T14:30:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'h-3',
    rtiRequestId: 'rti-1',
    statusId: 'stat-2',
    direction: 'incoming',
    description: 'Signed RTI Request received back from authority.',
    entryTime: new Date('2024-01-20T14:30:00'),
    exitTime: new Date('2024-01-25T14:30:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: 'h-4',
    rtiRequestId: 'rti-1',
    statusId: 'stat-3',
    direction: 'outgoing',
    description: 'Finalized RTI Request dispatched to the target institution.',
    entryTime: new Date('2024-01-25T14:30:00'),
    exitTime: new Date('2024-01-26T10:00:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-26'),
  },
  {
    id: 'h-5',
    rtiRequestId: 'rti-1',
    statusId: 'stat-4',
    direction: 'incoming',
    description: 'Receiver acknowledged receipt of the RTI request.',
    entryTime: new Date('2024-01-26T10:00:00'),
    exitTime: new Date('2024-01-28T11:00:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-01-26'),
    updatedAt: new Date('2024-01-28'),
  },
  {
    id: 'h-6',
    rtiRequestId: 'rti-1',
    statusId: 'stat-3',
    direction: 'incoming',
    description: 'Receiver requested additional clarification via email.',
    entryTime: new Date('2024-01-28T11:00:00'),
    exitTime: null,
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-01-28'),
  },
  {
    id: 'h-7',
    rtiRequestId: 'rti-2',
    statusId: 'stat-1',
    direction: 'outgoing',
    description: 'Initial RTI Request created.',
    entryTime: new Date('2024-02-05T09:00:00'),
    exitTime: new Date('2024-02-06T10:00:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-06'),
  },
  {
    id: 'h-10',
    rtiRequestId: 'rti-2',
    statusId: 'stat-2',
    direction: 'outgoing',
    description: 'RTI Request sent for internal sign-off.',
    entryTime: new Date('2024-02-06T10:00:00'),
    exitTime: new Date('2024-02-07T14:30:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-02-06'),
    updatedAt: new Date('2024-02-07'),
  },
  {
    id: 'h-11',
    rtiRequestId: 'rti-2',
    statusId: 'stat-2',
    direction: 'incoming',
    description: 'Signed RTI Request received back from authority.',
    entryTime: new Date('2024-02-07T14:30:00'),
    exitTime: new Date('2024-02-10T15:00:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-02-07'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'h-8',
    rtiRequestId: 'rti-2',
    statusId: 'stat-6',
    direction: 'incoming',
    description: 'Request rejected due to missing technical details.',
    entryTime: new Date('2024-02-10T15:00:00'),
    exitTime: new Date('2024-02-15T09:00:00'),
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-15'),
  },
  {
    id: 'h-9',
    rtiRequestId: 'rti-2',
    statusId: 'stat-8',
    direction: 'outgoing',
    description: 'Appeal filed against the rejection of budget details.',
    entryTime: new Date('2024-02-15T09:00:00'),
    exitTime: null,
    files: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  }
];


export const mockStatuses: RTIStatus[] = [
  { id: 'stat-1', name: 'CREATED', createdAt: new Date(), updatedAt: new Date() },
  { id: 'stat-2', name: 'APPROVAL', createdAt: new Date(), updatedAt: new Date() },
  { id: 'stat-3', name: 'DELIVERY', createdAt: new Date(), updatedAt: new Date() },
  { id: 'stat-4', name: 'ACKNOWLEDGE', createdAt: new Date(), updatedAt: new Date() },
  { id: 'stat-5', name: 'ACCEPTED', createdAt: new Date(), updatedAt: new Date() },
  { id: 'stat-6', name: 'REJECTION', createdAt: new Date(), updatedAt: new Date() },
  { id: 'stat-7', name: 'COMPLETED', createdAt: new Date(), updatedAt: new Date() },
  { id: 'stat-8', name: 'APPEAL', createdAt: new Date(), updatedAt: new Date() }
];