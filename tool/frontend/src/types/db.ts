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
  institution: Institution;
  position: Position;
  email: string | null;
  contactNo: string | null;
  address: string | null;
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
  sender: Sender;
  receiver: Receiver;
  template: RTITemplateDB;
  createdAt: Date;
  updatedAt: Date;
}
export interface RTIStatus {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface RTIStatusHistory {
  id: string;
  rtiRequestId: string;
  status: RTIStatus;
  direction: 'incoming' | 'outgoing';
  description: string | null;
  entryTime: Date;
  exitTime: Date | null;
  files: string[]; // Receipt/Attachment links
  createdAt: Date;
  updatedAt: Date;
}