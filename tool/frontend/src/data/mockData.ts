import { Template } from '../types/rti';

export const mockTemplates: Template[] = [
  {
    id: 't1',
    title: 'Standard Environmental Data Request',
    description: 'Used for requesting pollution and emission data.',
    file: '',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nI am writing to request information under the Right to Information Act regarding environmental data...',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 't2',
    title: 'Budget Allocation Inquiry',
    description: 'Used for requesting departmental budget details.',
    file: '',
    content:
      '# Right to Information Request\n\n**Date:** {{date}}\n**To:** {{receiver_name}}, {{receiver_position}}\n**From:** {{sender_name}}\n\nPlease provide the detailed budget allocation for the fiscal year...',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];