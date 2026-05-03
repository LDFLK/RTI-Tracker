import { Sender, Receiver } from '../types/db';

export const RTI_VARIABLES = [
  { name: 'Date', code: '{{date}}', desc: 'Current Date', key: 'date' },
  { name: 'Sender Name', code: '{{sender_name}}', desc: 'Applicant Name', key: 's_name' },
  { name: 'Sender Email', code: '{{sender_email}}', desc: 'Applicant Email', key: 's_email' },
  { name: 'Sender Address', code: '{{sender_address}}', desc: 'Applicant Address', key: 's_address' },
  { name: 'Sender Contact No', code: '{{sender_contact_no}}', desc: 'Applicant Contact No', key: 's_contactNo' },
  { name: 'Receiver Institution', code: '{{receiver_institution}}', desc: 'Target Institution', key: 'r_inst' },
  { name: 'Receiver Position', code: '{{receiver_position}}', desc: 'Target Position', key: 'r_pos' },
  { name: 'Receiver Email', code: '{{receiver_email}}', desc: 'Receiver Email', key: 'r_email' },
  { name: 'Receiver Address', code: '{{receiver_address}}', desc: 'Receiver Address', key: 'r_address' },
  { name: 'Receiver Contact No', code: '{{receiver_contact_no}}', desc: 'Receiver Contact No', key: 'r_contactNo' },
];

/**
 * Normalizes a variable key by removing braces, spaces, underscores and converting to lowercase.
 */
const normalize = (key: string) => key.replace(/{{|}}|[\s_]/g, '').toLowerCase();

export const getVariableValues = (
  requestDate: string,
  sender: Sender | undefined,
  receiver: Receiver | undefined
): Record<string, string> => {

  const v: Record<string, string> = {
    date: requestDate || '',
    s_name: sender?.name || '',
    s_email: sender?.email || '',
    s_address: sender?.address || '',
    s_contactNo: sender?.contactNo || '',
    r_inst: receiver?.institution?.name || '',
    r_pos: receiver?.position?.name || '',
    r_email: receiver?.email || '',
    r_address: receiver?.address || '',
    r_contactNo: receiver?.contactNo || '',
  };

  const mapping: Record<string, string> = {};
  RTI_VARIABLES.forEach(varDef => {
    mapping[varDef.code] = v[varDef.key];
  });

  return mapping;
};

/**
 * Replaces variables in a string with their values.
 */
export const replaceVariables = (
  text: string,
  requestDate: string,
  sender: Sender | undefined,
  receiver: Receiver | undefined
) => {
  const values = getVariableValues(requestDate, sender, receiver);

  // Build a normalized lookup map for robustness
  const normalizedMap: Record<string, string> = {};
  Object.entries(values).forEach(([key, value]) => {
    normalizedMap[normalize(key)] = value;
  });

  return text.replace(/{{\s*([^}]+?)\s*}}/g, (match, key) => {
    // 1. Remove HTML tags and normalize
    const cleanKey = normalize(key.replace(/<[^>]*>/g, ''));

    // 2. Return value if found in our normalized map, otherwise keep original
    if (normalizedMap[cleanKey] !== undefined) {
      return normalizedMap[cleanKey];
    }

    return match;
  }).replace(/{{\s*[^}]+?\s*}}/g, '');
};