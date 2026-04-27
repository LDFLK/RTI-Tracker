export interface Institution {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sender {
  id: string;
  name: string;
  email: string | null;
  contactNo: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receiver {
  id: string;
  institutionId: string;
  positionId: string;
  email: string | null;
  contactNo: string | null;
  address: string | null;
  institutionName?: string; // For UI display
  positionName?: string;    // For UI display
  createdAt: Date;
  updatedAt: Date;
}

export interface RTITemplateDB {
  id: string;
  title: string;
  description: string | null;
  file: string; // The Link/URL
  createdAt: Date;
  updatedAt: Date;
}

export interface RTIRequest {
  id: string;
  referenceId?: string;
  title: string;
  description: string | null;
  senderId: string;
  receiverId: string;
  rtiTemplateId: string;
  institutionName: string;
  positionName: string;
  senderName: string;
  senderEmail?: string;
  senderAddress?: string;
  senderContactNo?: string;
  receiverEmail?: string;
  receiverContactNo?: string;
  receiverAddress?: string;
  rtiTemplateTitle?: string;
  rtiTemplateFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RTIStatusHistory {
  id: string;
  rtiRequestId: string;
  statusId: string;
  direction: 'incoming' | 'outgoing';
  description: string | null;
  entryTime: Date;
  exitTime: Date | null;
  files: string[]; // Receipt/Attachment links
  createdAt: Date;
  updatedAt: Date;
}