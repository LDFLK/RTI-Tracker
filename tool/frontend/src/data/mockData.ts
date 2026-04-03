import { Template } from '../types/rti';

export const mockTemplates: Template[] = [
  {
    id: 't1',
    name: 'Standard Environmental Data Request',
    description: 'Used for requesting pollution and emission data.',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nI am writing to request information under the Right to Information Act regarding environmental data...'
  },
  {
    id: 't2',
    name: 'Budget Allocation Inquiry',
    description: 'Used for requesting departmental budget details.',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nPlease provide the detailed budget allocation for the fiscal year...'
  }
];