export interface Template {
  id: string;
  title: string;
  description: string;
  file: string;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}