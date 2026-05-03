import { db } from './mockState';
import { RTIStatus } from '../types/db';

const SLEEP_MS = 500;
const sleep = () => new Promise(resolve => setTimeout(resolve, SLEEP_MS));

export const statusService = {
  async list(page: number, pageSize: number, search?: string) {
    await sleep();
    let filtered = [...db.statuses];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize)
      }
    };
  },

  async getAll(): Promise<RTIStatus[]> {
    await sleep();
    return [...db.statuses];
  },

  async create(payload: Partial<RTIStatus>) {
    await sleep();

    const name = payload.name;
    if (!name) throw new Error('Status name is required');
    const exists = db.statuses.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) throw new Error('Status name already exists');

    const id = payload.id || crypto.randomUUID();
    const newStatus: RTIStatus = {
      id,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.setStatuses([newStatus, ...db.statuses]);
    return newStatus;
  },

  async update(id: string, payload: Partial<RTIStatus>) {
    await sleep();
    const index = db.statuses.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Status not found');

    const name = payload.name;
    if (name) {
      const exists = db.statuses.some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== id);
      if (exists) throw new Error('Status name already exists');
    }

    const updatedStatus = {
      ...db.statuses[index],
      ...payload,
      updatedAt: new Date(),
    };

    const newStatuses = [...db.statuses];
    newStatuses[index] = updatedStatus;
    db.setStatuses(newStatuses);

    return updatedStatus;
  },

  async remove(id: string) {
    await sleep();
    db.statuses = db.statuses.filter(s => s.id !== id);
  }
};
