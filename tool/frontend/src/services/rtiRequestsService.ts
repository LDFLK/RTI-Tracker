import { db } from './mockState';
import { RTIRequest, RTIStatusHistory } from '../types/db';
import { toFormData } from '../utils/formUtils';

const SLEEP_MS = 500;
const sleep = () => new Promise(resolve => setTimeout(resolve, SLEEP_MS));

const TEMPLATE_BASE_URL = 'https://storage.rti.api/templates/';
const REQUEST_FILES_BASE_URL = 'https://storage.rti.api/requests/';

export const rtiRequestsService = {
  async list(page: number, pageSize: number, search?: string) {
    await sleep();
    let allRequests = db.rtiRequests.map(r => {
      const receiver = db.receivers.find(rec => rec.id === r.receiverId);
      return {
        ...r,
        referenceId: r.referenceId || r.id.split('-')[1]?.toUpperCase(),
        institutionName: r.institutionName || receiver?.institutionName || 'Unknown',
        positionName: r.positionName || receiver?.positionName || 'Unknown',
      } as RTIRequest;
    });

    if (search) {
      const q = search.toLowerCase();
      allRequests = allRequests.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.institutionName.toLowerCase().includes(q) ||
        r.positionName.toLowerCase().includes(q)
      );
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = allRequests.slice(start, end);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems: allRequests.length,
        totalPages: Math.ceil(allRequests.length / pageSize)
      }
    };
  },

  async details(id: string): Promise<RTIRequest> {
    await sleep();
    const r = db.rtiRequests.find(req => req.id === id);
    if (!r) throw new Error('RTI Request not found');

    // Handle template file link if necessary
    let templateFile = r.rtiTemplateFile || '-';
    if (templateFile !== '-' && !templateFile.startsWith('http') && templateFile !== '') {
      templateFile = `${TEMPLATE_BASE_URL}${templateFile}`;
    }

    return {
      ...r,
      referenceId: r.referenceId || r.id.split('-')[1]?.toUpperCase(),
      rtiTemplateFile: templateFile
    };
  },

  async getHistory(id: string): Promise<RTIStatusHistory[]> {
    await sleep();
    return db.statusHistories.filter(h => h.rtiRequestId === id);
  },

  async create(payload: Partial<RTIRequest> & { content?: string, file?: File }) {
    // Standardize FormData for the actual API call
    const formData = toFormData(
      {
        title: payload.title,
        description: payload.description,
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        rtiTemplateId: payload.rtiTemplateId,
        content: payload.content
      },
      payload.file
    );

    console.log('[POST] Creating RTI Request with FormData:', formData);

    await sleep();

    const sender = db.senders.find(s => s.id === payload.senderId);
    const receiver = db.receivers.find(r => r.id === payload.receiverId);
    const template = db.templates.find(t => t.id === payload.rtiTemplateId);

    const fileLink = payload.file ? `${REQUEST_FILES_BASE_URL}${payload.file.name}` : null;

    const newRequest: RTIRequest = {
      id: 'rti-' + crypto.randomUUID(),
      referenceId: `RTI-${Math.floor(1000 + Math.random() * 9000)}`,
      title: payload.title!,
      description: payload.description || null,
      senderId: payload.senderId!,
      receiverId: payload.receiverId!,
      rtiTemplateId: payload.rtiTemplateId!,
      institutionName: receiver?.institutionName || 'Unknown',
      positionName: receiver?.positionName || 'Unknown',
      senderName: sender?.name || 'Unknown',
      senderEmail: sender?.email || '',
      senderAddress: sender?.address || '',
      senderContactNo: sender?.contactNo || '',
      receiverEmail: receiver?.email || '',
      receiverContactNo: receiver?.contactNo || '',
      receiverAddress: receiver?.address || '',
      rtiTemplateTitle: template?.title || '-',
      rtiTemplateFile: template?.file || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.addRTIRequest(newRequest);

    // Initial history entry
    const history: RTIStatusHistory = {
      id: crypto.randomUUID(),
      rtiRequestId: newRequest.id,
      statusId: 'CREATED',
      direction: 'outgoing',
      description: 'Initial RTI Request created.',
      entryTime: new Date(),
      exitTime: null,
      files: fileLink ? [fileLink] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.addStatusHistory(history);

    if (payload.content) {
      db.setTemplateFile(newRequest.id, payload.content);
    }

    return newRequest;
  },

  async remove(id: string) {
    await sleep();
    db.rtiRequests = db.rtiRequests.filter(r => r.id !== id);
    db.statusHistories = db.statusHistories.filter(h => h.rtiRequestId !== id);
  },

  async addHistory(payload: Partial<RTIStatusHistory> & { fileUploads?: File[] }) {
    await sleep();
    const newEntry: RTIStatusHistory = {
      id: crypto.randomUUID(),
      rtiRequestId: payload.rtiRequestId!,
      statusId: payload.statusId!,
      direction: payload.direction!,
      description: payload.description || '',
      entryTime: new Date(),
      exitTime: null,
      files: payload.fileUploads ? payload.fileUploads.map(f => `https://storage.rti.api/requests/${f.name}`) : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.addStatusHistory(newEntry);

    // Update parent request timestamp
    const request = db.rtiRequests.find(r => r.id === payload.rtiRequestId);
    if (request) {
      request.updatedAt = new Date();
    }

    return newEntry;
  },

  async updateHistory(id: string, payload: Partial<RTIStatusHistory> & { fileUploads?: File[] }) {
    await sleep();
    const index = db.statusHistories.findIndex(h => h.id === id);
    if (index === -1) throw new Error('Entry not found');

    const entry = db.statusHistories[index];
    const uploadedFiles = payload.fileUploads ? payload.fileUploads.map(f => `https://storage.rti.api/requests/${f.name}`) : [];

    db.statusHistories[index] = {
      ...entry,
      ...payload,
      files: [...(payload.files || entry.files), ...uploadedFiles],
      updatedAt: new Date(),
    };

    // Update parent request timestamp
    const request = db.rtiRequests.find(r => r.id === entry.rtiRequestId);
    if (request) {
      request.updatedAt = new Date();
    }

    return db.statusHistories[index];
  },

  async deleteHistory(id: string) {
    await sleep();
    const history = db.statusHistories.find(h => h.id === id);
    if (history) {
      const requestId = history.rtiRequestId;
      db.statusHistories = db.statusHistories.filter(h => h.id !== id);

      // Update parent request timestamp
      const request = db.rtiRequests.find(r => r.id === requestId);
      if (request) {
        request.updatedAt = new Date();
      }
    }
  }
};
