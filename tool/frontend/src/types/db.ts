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

export interface Receiver {
  id: string;
  institutionId: string;
  positionId: string;
  email: string | null;
  contactNo: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Virtual/Joined fields for UI
  institutionName?: string;
  positionName?: string;
}
