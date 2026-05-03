import { mockReceivers, mockInstitutions, mockPositions, mockSenders, mockTemplates, mockRTIRequests, mockStatusHistories, mockStatuses } from '../data/mockData';
import { Institution, Position, Receiver, RTIRequest, RTITemplateDB, RTIStatusHistory, Sender, RTIStatus } from '../types/db';

const TEMPLATE_BASE_URL = 'https://storage.rti.api/templates/';

class MockDb {
  receivers: Receiver[] = [...mockReceivers];
  institutions: Institution[] = [...mockInstitutions];
  positions: Position[] = [...mockPositions];
  senders: Sender[] = [...mockSenders];
  rtiRequests: RTIRequest[] = [...mockRTIRequests];
  statusHistories: RTIStatusHistory[] = mockStatusHistories.map(h => {
    const { statusId, ...rest } = h;
    return {
      ...rest,
      status: mockStatuses.find(s => s.id === statusId)!
    } as RTIStatusHistory;
  });
  statuses: RTIStatus[] = [...mockStatuses];

  templates: RTITemplateDB[] = mockTemplates.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    file: t.file,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  }));

  // Mock "File Storage" for markdown content
  templateFiles: Record<string, string> = mockTemplates.reduce((acc, t) => {
    if (t.content) {
      const fullLink = t.file.startsWith('http') ? t.file : `${TEMPLATE_BASE_URL}${t.file}`;
      acc[fullLink] = t.content;
    }
    return acc;
  }, {} as Record<string, string>);

  setReceivers(data: Receiver[]) { this.receivers = data; }
  setInstitutions(data: Institution[]) { this.institutions = data; }
  setPositions(data: Position[]) { this.positions = data; }
  setSenders(data: Sender[]) { this.senders = data; }
  setTemplates(data: RTITemplateDB[]) { this.templates = data; }
  setTemplateFile(link: string, content: string) { this.templateFiles[link] = content; }
  addRTIRequest(req: RTIRequest) { this.rtiRequests = [req, ...this.rtiRequests]; }
  addStatusHistory(history: RTIStatusHistory) { this.statusHistories = [history, ...this.statusHistories]; }
  setStatuses(data: RTIStatus[]) { this.statuses = data; }
}

export const db = new MockDb();
