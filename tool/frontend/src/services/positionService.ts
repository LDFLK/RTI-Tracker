import { Position } from '../types/db';
import { db } from './mockState';

const SLEEP_MS = 500;
const sleep = () => new Promise(resolve => setTimeout(resolve, SLEEP_MS));

export const positionService = {
  async listPositions(page: number, pageSize: number) {
    await sleep();

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: db.positions.slice(start, end),
      pagination: {
        page,
        pageSize,
        totalItems: db.positions.length,
        totalPages: Math.ceil(db.positions.length / pageSize)
      }
    };
  },

  async createPosition(payload: { name: string }) {
    await sleep();
    const newPos: Position = {
      id: `pos-${Date.now()}`,
      name: payload.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.setPositions([newPos, ...db.positions]);
    return newPos;
  },

  async updatePosition(id: string, payload: { name: string }) {
    await sleep();
    db.setPositions(db.positions.map(p => p.id === id ? { ...p, ...payload, updatedAt: new Date() } : p));
    return db.positions.find(p => p.id === id);
  },

  async removePosition(id: string) {
    await sleep();
    db.setPositions(db.positions.filter(p => p.id !== id));
  }
};
