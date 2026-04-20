import { Institution } from '../types/db';
import { db } from './mockState';

const SLEEP_MS = 500;
const sleep = () => new Promise(resolve => setTimeout(resolve, SLEEP_MS));

export const institutionService = {
  async listInstitutions(page: number, pageSize: number) {
    await sleep();

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: db.institutions.slice(start, end),
      pagination: {
        page,
        pageSize,
        totalItems: db.institutions.length,
        totalPages: Math.ceil(db.institutions.length / pageSize)
      }
    };
  },

  async createInstitution(payload: { name: string }) {
    await sleep();
    const newInst: Institution = {
      id: `inst-${Date.now()}`,
      name: payload.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.setInstitutions([newInst, ...db.institutions]);
    return newInst;
  },

  async updateInstitution(id: string, payload: { name: string }) {
    await sleep();
    db.setInstitutions(db.institutions.map(i => i.id === id ? { ...i, ...payload, updatedAt: new Date() } : i));
    return db.institutions.find(i => i.id === id);
  },

  async removeInstitution(id: string) {
    await sleep();
    db.setInstitutions(db.institutions.filter(i => i.id !== id));
  }
};
