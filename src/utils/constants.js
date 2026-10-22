export const ITEM_IMAGES = {
  sting: '/items/sting.png',
  pepsi: '/items/pepsi.jpg',
  dew: '/items/dew.jpg',
  mirinda: '/items/mirinda.jpg',
  water: '/items/water.jpg',
  '7up': '/items/7up.jpg'
};

export const TABLES = [
  { id: 'snooker-1', name: 'Table 1', type: 'snooker', ratePerHour: 500, enabled: true },
  { id: 'snooker-2', name: 'Table 2', type: 'snooker', ratePerHour: 500, enabled: true },
  { id: 'snooker-3', name: 'Table 3', type: 'snooker', ratePerHour: 500, enabled: true },
  { id: 'snooker-4', name: 'Table 4', type: 'snooker', ratePerHour: 500, enabled: true },
  { id: 'snooker-5', name: 'Table 5', type: 'snooker', ratePerHour: 500, enabled: true },
  { id: 'snooker-6', name: 'Table 6', type: 'snooker', ratePerHour: 500, enabled: true },
  { id: 'pool-1', name: 'Table 7', type: 'pool', ratePerHour: 300, enabled: true },
  { id: 'table-tennis-1', name: 'Table Tennis', type: 'table-tennis', icon: '🏓', ratePerHour: 600, rateUnit: 'hour', enabled: true },
  { id: 'ps5-1', name: 'PS5', type: 'ps5', icon: '🎮', ratePerHour: 900, rateUnit: 'hour', controllerRatePerHour: 100, enabled: true }
];

export const DEFAULT_INVENTORY = [
  {id:'sting', name:'Sting', icon:'⚡', image: ITEM_IMAGES.sting, price:60, stock:24, category:'drinks'},
  {id:'pepsi', name:'Pepsi', icon:'🥤', image: ITEM_IMAGES.pepsi, price:50, stock:24, category:'drinks'},
  {id:'dew', name:'Mountain Dew', icon:'🍋', image: ITEM_IMAGES.dew, price:50, stock:24, category:'drinks'},
  {id:'mirinda', name:'Mirinda', icon:'🍊', image: ITEM_IMAGES.mirinda, price:50, stock:24, category:'drinks'},
  {id:'water', name:'Water Bottle', icon:'💧', image: ITEM_IMAGES.water, price:40, stock:48, category:'drinks'},
  {id:'7up', name:'7 Up', icon:'🍋', image: ITEM_IMAGES['7up'], price:50, stock:24, category:'drinks'},
  {id:'lays', name:'Lays (Small)', icon:'🍟', image: '', price:80, stock:20, category:'snacks'}
];

export const DEFAULT_USERS = [
  {id:'owner-1', name:'Owner', pin:'786786', role:'owner'},
  {id:'counter-1', name:'Counter Staff', pin:'1234', role:'counter'}
];

export const PAGES = {
  DASHBOARD: 'dashboard',
  TABLE_MANAGEMENT: 'table-management',
  CANTEEN: 'canteen',
  PLAYER_RECORDS: 'player-records',
  OWNER_PANEL: 'owner-panel',
  EXPENSES: 'expenses',
  CUE_MANAGEMENT: 'cue-management',
  OWNER_AUDIT: 'owner-audit',
  OWNER_SETTINGS: 'owner-settings'
};

export const SESSION_STATUS = { ACTIVE: 'active', COMPLETED: 'completed' };
export const SYNC_STATUS = { PENDING: 'pending', SYNCED: 'synced' };
export const USER_ROLES = { COUNTER: 'counter', OWNER: 'owner' };
