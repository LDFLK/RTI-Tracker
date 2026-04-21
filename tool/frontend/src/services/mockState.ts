import { mockReceivers, mockInstitutions, mockPositions } from '../data/mockData';
import { Institution, Position, Receiver } from '../types/db';

class MockDb {
  receivers: Receiver[] = [...mockReceivers];
  institutions: Institution[] = [...mockInstitutions];
  positions: Position[] = [...mockPositions];

  setReceivers(val: Receiver[]) { this.receivers = val; }
  setInstitutions(val: Institution[]) { this.institutions = val; }
  setPositions(val: Position[]) { this.positions = val; }
}

export const db = new MockDb();
