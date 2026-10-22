import Dexie from 'dexie';
import { DEFAULT_USERS, DEFAULT_INVENTORY, SYNC_STATUS } from '../utils/constants';

const db = new Dexie('ShenderClubPrototypeDB');

db.version(1).stores({
  sessions: 'id, tableId, status, syncStatus, createdAt, playerPhone',
  players: 'id, phone, name, syncStatus',
  inventory: 'id, syncStatus',
  expenses: 'id, category, month, syncStatus',
  cues: 'id, status, syncStatus',
  users: 'id, pin, role'
});

db.version(2).stores({
  sessions: 'id, tableId, status, syncStatus, createdAt, playerPhone',
  players: 'id, phone, name, syncStatus',
  inventory: 'id, syncStatus',
  expenses: 'id, category, month, syncStatus',
  cues: 'id, status, syncStatus',
  users: 'id, pin, role, username'
});

db.version(3).stores({
  sessions: 'id, tableId, status, syncStatus, createdAt, playerPhone, locationId',
  players: 'id, phone, name, syncStatus, locationId',
  inventory: 'id, syncStatus, locationId',
  expenses: 'id, category, month, syncStatus, locationId',
  cues: 'id, status, syncStatus, locationId',
  users: 'id, pin, role, username, locationId',
  locations: 'id, name, createdAt'
});

db.version(4).stores({
  sessions: 'id, tableId, status, syncStatus, createdAt, playerPhone, locationId',
  players: 'id, phone, name, syncStatus, locationId',
  inventory: 'id, syncStatus, locationId',
  expenses: 'id, category, month, syncStatus, locationId',
  cues: 'id, status, syncStatus, locationId',
  users: 'id, pin, role, username, locationId',
  locations: 'id, name, createdAt',
  notifications: 'id, locationId, tableId, createdAt, read, syncStatus'
});

export async function initializeDB() {
  try {
    const userCount = await db.users.count();
    if (userCount === 0) {
      await db.users.bulkAdd(DEFAULT_USERS);
    }
    const currentUsers = await db.users.toArray();
    for (const user of currentUsers) {
      if (!user.username || !user.password) {
        const username = user.role === 'owner' ? 'owner' : (user.username || 'admin');
        await db.users.update(user.id, { username, password: user.pin || '' });
      }
    }

    if (!(await db.locations.count())) {
      await db.locations.put({ id: 'main', name: 'Main Lounge', createdAt: Date.now() });
    }
    for (const storeName of ['sessions', 'players', 'inventory', 'expenses', 'cues']) {
      const oldRecords = await db[storeName].toArray();
      for (const record of oldRecords) {
        if (!record.locationId) await db[storeName].update(record.id, { locationId: 'main' });
      }
    }
    for (const user of currentUsers) {
      if (!user.locationId) await db.users.update(user.id, { locationId: 'main' });
    }
    
    const inventoryCount = await db.inventory.count();
    if (inventoryCount === 0) {
      await db.inventory.bulkAdd(DEFAULT_INVENTORY.map(item => ({ ...item, syncStatus: SYNC_STATUS.SYNCED })));
    }
  } catch (error) {
    console.error("Error initializing DB:", error);
  }
}

export default db;
