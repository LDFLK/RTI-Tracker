import { Receiver } from '../types/db';
import { db } from './mockState';

const SLEEP_MS = 500;
const sleep = () => new Promise(resolve => setTimeout(resolve, SLEEP_MS));

export const receiversService = {
  async listReceivers(page: number, pageSize: number, search?: string) {
    await sleep();

    let filtered = [...db.receivers];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.institution?.name?.toLowerCase().includes(q) ||
        r.position?.name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q) ||
        r.contactNo?.toLowerCase().includes(q)
      );
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: filtered.slice(start, end),
      pagination: {
        page,
        pageSize,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize)
      }
    };
  },

  async createReceiver(payload: { institutionId?: string, positionId?: string, email?: string | null, contactNo?: string | null, address?: string | null }) {
    await sleep();

    const inst = db.institutions.find(i => i.id === payload.institutionId);
    const pos = db.positions.find(p => p.id === payload.positionId);

    const newReceiver: Receiver = {
      id: 'rec-' + crypto.randomUUID(),
      institution: inst!,
      position: pos!,
      email: payload.email || null,
      contactNo: payload.contactNo || null,
      address: payload.address || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.setReceivers([newReceiver, ...db.receivers]);
    return newReceiver;
  },

  async updateReceiver(id: string, payload: { institutionId?: string, positionId?: string, email?: string | null, contactNo?: string | null, address?: string | null }) {
    await sleep();

    const inst = db.institutions.find(i => i.id === payload.institutionId);
    const pos = db.positions.find(p => p.id === payload.positionId);

    db.setReceivers(db.receivers.map(r =>
      r.id === id ? {
        ...r,
        email: payload.email !== undefined ? payload.email : r.email,
        contactNo: payload.contactNo !== undefined ? payload.contactNo : r.contactNo,
        address: payload.address !== undefined ? payload.address : r.address,
        institution: inst || r.institution,
        position: pos || r.position,
        updatedAt: new Date()
      } : r
    ));
    return db.receivers.find(r => r.id === id);
  },

  async removeReceiver(id: string) {
    await sleep();
    db.setReceivers(db.receivers.filter(r => r.id !== id));
  }
};
