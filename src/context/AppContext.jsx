import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import db from '../db/localDB';
import { syncToCloud } from '../db/syncEngine';
import { syncToPostgres } from '../db/postgresSync';
import { 
  TABLES, 
  PAGES, 
  SESSION_STATUS, 
  SYNC_STATUS,
  DEFAULT_INVENTORY,
  ITEM_IMAGES
} from '../utils/constants';
import { 
  generateId, 
  getElapsedSeconds, 
  getMonthKey 
} from '../utils/helpers';

const AppContext = createContext(null);

function persistTables(list) {
  localStorage.setItem('shender_tables', JSON.stringify(list));
  return list;
}

export function normalizeTable(table, now = Date.now()) {
  return {
    enabled: true,
    lastStatusAt: now,
    totalActiveMs: 0,
    totalIdleMs: 0,
    createdAt: now,
    ...table,
    enabled: table.enabled !== false,
    lastStatusAt: table.lastStatusAt || now,
    totalActiveMs: table.totalActiveMs || 0,
    totalIdleMs: table.totalIdleMs || 0,
    createdAt: table.createdAt || now
  };
}

function commitTablePeriod(table, now, isActiveSession) {
  const extra = Math.max(0, now - (table.lastStatusAt || now));
  const next = { ...table, lastStatusAt: now };
  if (!table.enabled) return next;
  if (isActiveSession) next.totalActiveMs = (table.totalActiveMs || 0) + extra;
  else next.totalIdleMs = (table.totalIdleMs || 0) + extra;
  return next;
}

const ACTIVITY_TABLE_IDS = new Set(['table-tennis-1', 'ps5-1']);

function getTablesForLocation(locationId) {
  const key = `shender_tables_${locationId}`;
  const saved = localStorage.getItem(key) || (locationId === 'main' ? localStorage.getItem('shender_tables') : null);
  const now = Date.now();
  let tables = (saved ? JSON.parse(saved) : TABLES).map(table => normalizeTable(table, now));
  if (locationId === 'main') {
    const migrationKey = `shender_activity_tables_added_v1_${locationId}`;
    if (localStorage.getItem(migrationKey) !== '1') {
      const existingIds = new Set(tables.map(table => table.id));
      tables = [...tables, ...TABLES.filter(table => ACTIVITY_TABLE_IDS.has(table.id) && !existingIds.has(table.id)).map(table => normalizeTable(table, now))];
      localStorage.setItem(migrationKey, '1');
    }
  } else {
    // These default activity cards belong to Main Lounge only. Remove any that
    // an earlier migration mistakenly copied into another lounge's table list.
    tables = tables.filter(table => !ACTIVITY_TABLE_IDS.has(table.id));
  }
  localStorage.setItem(key, JSON.stringify(tables));
  return tables;
}

function createRateSegment(table, startTime, controllerCount = 1) {
  return {
    tableId: table?.id,
    startTime,
    ratePerHour: Number(table?.ratePerHour) || 0,
    rateUnit: table?.rateUnit || 'minute',
    controllerRatePerHour: Number(table?.controllerRatePerHour) || 0,
    controllerCount: table?.type === 'ps5' ? Math.max(1, Number(controllerCount) || 1) : 0
  };
}

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [ownerLocationId, setOwnerLocationId] = useState(() => localStorage.getItem('ownerLocationId') || 'main');
  const locationId = user?.role === 'owner' ? ownerLocationId : (user?.locationId || 'main');
  const [tablesList, setTablesList] = useState(() => getTablesForLocation(locationId));
  
  const [activeSessions, setActiveSessions] = useState({});
  const [players, setPlayers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cues, setCues] = useState([]);
  const [rateChangeNotifications, setRateChangeNotifications] = useState([]);
  const [syncStatus, setSyncStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [currentPage, setCurrentPage] = useState(PAGES.DASHBOARD);
  const [selectedTableId, setSelectedTableId] = useState(null);

  const saveTables = (updatedOrFn) => {
    setTablesList(prev => {
      const updated = typeof updatedOrFn === 'function' ? updatedOrFn(prev) : updatedOrFn;
      localStorage.setItem(`shender_tables_${locationId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const selectOwnerLocation = (nextLocationId) => {
    if (user?.role !== 'owner') return;
    setOwnerLocationId(nextLocationId);
    localStorage.setItem('ownerLocationId', nextLocationId);
    setTablesList(getTablesForLocation(nextLocationId));
  };

  const refreshRateChangeNotifications = async () => {
    try {
      const records = await db.notifications.where('locationId').equals(locationId).toArray();
      setRateChangeNotifications(records.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load rate change notifications', error);
    }
  };

  useEffect(() => {
    refreshRateChangeNotifications();
    const timer = setInterval(refreshRateChangeNotifications, 3000);
    return () => clearInterval(timer);
  }, [locationId]);

  useEffect(() => {
    if (user?.role === 'owner') {
      const selectedLocationId = localStorage.getItem('ownerLocationId') || 'main';
      setOwnerLocationId(selectedLocationId);
      setTablesList(getTablesForLocation(selectedLocationId));
      return;
    }
    setTablesList(getTablesForLocation(locationId));
  }, [locationId, user?.role, user?.id]);

  const addTable = (table) => {
    const now = Date.now();
    saveTables([...tablesList, normalizeTable({ ...table, id: `table-${now}` }, now)]);
  };

  const editTable = (tableId, updates) => {
    const existing = tablesList.find(table => table.id === tableId);
    const nextRate = Number(updates.ratePerHour ?? existing?.ratePerHour);
    const nextRateUnit = updates.rateUnit ?? existing?.rateUnit ?? 'minute';
    const oldRate = Number(existing?.ratePerHour) || 0;
    const oldRateUnit = existing?.rateUnit || 'minute';
    const rateChanged = existing && (nextRate !== oldRate || nextRateUnit !== oldRateUnit);
    saveTables(tablesList.map(t => t.id === tableId ? { ...t, ...updates } : t));
    if (rateChanged && user && user.role !== 'owner') {
      const notification = {
        id: generateId(),
        type: 'staff_table_rate_changed',
        locationId,
        tableId,
        tableName: updates.name?.trim() || existing.name,
        oldRate,
        newRate: nextRate,
        oldRateUnit,
        newRateUnit: nextRateUnit,
        staffId: user.id,
        staffName: user.name || user.username || 'Staff',
        createdAt: Date.now(),
        read: false,
        syncStatus: SYNC_STATUS.PENDING
      };
      db.notifications.put(notification).then(() => {
        setRateChangeNotifications(previous => [notification, ...previous].filter(item => item.locationId === locationId));
        countPending();
      }).catch(error => console.error('Failed to save rate change notification', error));
    }
  };

  const updateTableRate = (tableId, newRate) => editTable(tableId, { ratePerHour: Number(newRate) });

  const deleteTable = (tableId) => {
    saveTables(tablesList.filter(t => t.id !== tableId));
  };

  const patchTableTimes = (tableId, mutator) => {
    saveTables(prev => prev.map(t => t.id === tableId ? mutator(t) : t));
  };

  const toggleTableEnabled = (tableId) => {
    const now = Date.now();
    const session = activeSessions[tableId];
    saveTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const committed = commitTablePeriod(t, now, !!session && t.enabled);
      return { ...committed, enabled: !t.enabled, lastStatusAt: now };
    }));
  };

  const countPending = async () => {
    let count = 0;
    const stores = ['sessions', 'players', 'inventory', 'expenses', 'cues', 'notifications'];
    for (const store of stores) {
      count += (await db[store].where('syncStatus').equals(SYNC_STATUS.PENDING).toArray()).filter(record => (record.locationId || 'main') === locationId).length;
    }
    setPendingChanges(count);
  };

  const loadAllData = async () => {
    try {
      const allSessions = (await db.sessions.toArray()).filter(record => (record.locationId || 'main') === locationId);
      const active = {};
      const completed = [];
      allSessions.forEach(session => {
        if (session.status === SESSION_STATUS.ACTIVE) {
          active[session.tableId] = session;
        } else {
          completed.push(session);
        }
      });
      setActiveSessions(active);
      setCompletedSessions(completed);

      const allPlayers = (await db.players.toArray()).filter(record => (record.locationId || 'main') === locationId);
      setPlayers(allPlayers);

      let allInventory = (await db.inventory.toArray()).filter(record => (record.locationId || 'main') === locationId);
      let inventoryChanged = false;
      allInventory = allInventory.map(item => {
        if (!item.image && ITEM_IMAGES[item.id]) {
          inventoryChanged = true;
          return { ...item, image: ITEM_IMAGES[item.id] };
        }
        return item;
      });
      for (const seed of DEFAULT_INVENTORY) {
        if (!allInventory.find(i => i.id === seed.id)) {
          const extra = { ...seed, id: locationId === 'main' ? seed.id : `${locationId}-${seed.id}`, locationId, syncStatus: SYNC_STATUS.PENDING };
          allInventory.push(extra);
          inventoryChanged = true;
        }
      }
      if (inventoryChanged) {
        await db.inventory.bulkPut(allInventory);
      }
      setInventory(allInventory);

      const allExpenses = (await db.expenses.toArray()).filter(record => (record.locationId || 'main') === locationId);
      setExpenses(allExpenses);

      const allCues = (await db.cues.toArray()).filter(record => (record.locationId || 'main') === locationId);
      setCues(allCues);

      await countPending();
    } catch (error) {
      console.error("Failed to load data", error);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [locationId]);

  useEffect(() => {
    const handleOnline = () => setSyncStatus('online');
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      await syncToPostgres(db);
      if (navigator.onLine) {
        setSyncStatus('syncing');
        await syncToCloud(db);
        await countPending();
        setSyncStatus('online');
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [locationId]);

  const startSession = async (tableId, playerName, playerPhone, options = {}) => {
    const table = tablesList.find(t => t.id === tableId);
    if (table && table.enabled === false) return;

    const startedAt = Date.now();
    patchTableTimes(tableId, (t) => commitTablePeriod(t, startedAt, false));

    const session = {
      id: generateId(),
      tableId,
      playerName,
      playerPhone,
      staffId: user?.id || null,
      staffName: user?.name || user?.username || 'Unknown staff',
      staffUsername: user?.username || '',
      locationId,
      staffShiftStart: user?.shiftStart || '',
      staffShiftEnd: user?.shiftEnd || '',
      startTime: startedAt,
      rateSegments: [createRateSegment(table, startedAt, options.controllerCount)],
      endTime: null,
      items: [],
      totalAmount: 0,
      tableCost: 0,
      itemsCost: 0,
      paidAmount: 0,
      creditAmount: 0,
      status: SESSION_STATUS.ACTIVE,
      syncStatus: SYNC_STATUS.PENDING,
      createdAt: Date.now()
    };
    
    await db.sessions.put(session);
    setActiveSessions(prev => ({ ...prev, [tableId]: session }));
    
    let player = players.find(p => p.phone === playerPhone);
    if (!player) {
      player = {
        id: generateId(),
        locationId,
        name: playerName,
        phone: playerPhone,
        totalHoursPlayed: 0,
        totalAmountPaid: 0,
        pendingDues: 0,
        createdAt: Date.now(),
        syncStatus: SYNC_STATUS.PENDING
      };
      await db.players.put(player);
      setPlayers(prev => [...prev, player]);
    }
    await countPending();
  };

  const createPlayer = async (name, phone) => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName || !cleanPhone || players.some(p => p.phone === cleanPhone)) return false;
    const player = { id: generateId(), locationId, name: cleanName, phone: cleanPhone, totalHoursPlayed: 0, totalAmountPaid: 0, pendingDues: 0, createdAt: Date.now(), syncStatus: SYNC_STATUS.PENDING };
    await db.players.put(player);
    setPlayers(prev => [...prev, player]);
    await countPending();
    return true;
  };

  const updatePlayer = async (playerId, name, phone) => {
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();
    if (!cleanName || !cleanPhone) return false;
    if (players.some(player => player.id !== playerId && player.phone === cleanPhone)) return false;
    const currentPlayer = players.find(player => player.id === playerId);
    if (!currentPlayer) return false;
    const updatedPlayer = { ...currentPlayer, name: cleanName, phone: cleanPhone, syncStatus: SYNC_STATUS.PENDING };
    await db.players.put(updatedPlayer);
    setPlayers(prev => prev.map(player => player.id === playerId ? updatedPlayer : player));
    await countPending();
    return true;
  };

  const checkoutQuickSale = async (items) => {
    if (!items?.length) return false;
    const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const now = Date.now();
    const sale = { id: generateId(), locationId, tableId: 'canteen', playerName: 'Walk-in Customer', playerPhone: '', staffId: user?.id || null, staffName: user?.name || user?.username || 'Unknown staff', staffUsername: user?.username || '', checkedOutById: user?.id || null, checkedOutByName: user?.name || user?.username || 'Unknown staff', startTime: now, endTime: now, items: items.map(item => ({ ...item })), totalAmount: total, tableCost: 0, itemsCost: total, paidAmount: total, creditAmount: 0, paymentMethod: 'cash', discount: 0, status: SESSION_STATUS.COMPLETED, syncStatus: SYNC_STATUS.PENDING, createdAt: now };
    const nextInventory = [...inventory];
    for (const line of items) {
      const index = nextInventory.findIndex(item => item.id === line.itemId);
      if (index < 0 || nextInventory[index].stock < line.quantity) return false;
      nextInventory[index] = { ...nextInventory[index], stock: nextInventory[index].stock - line.quantity, syncStatus: SYNC_STATUS.PENDING };
    }
    await db.sessions.put(sale);
    await db.inventory.bulkPut(nextInventory.filter(item => items.some(line => line.itemId === item.id)));
    setInventory(nextInventory);
    setCompletedSessions(prev => [...prev, sale]);
    await countPending();
    return true;
  };

  const getSessionBill = (tableId) => {
    const session = activeSessions[tableId];
    if (!session) return null;

    const table = tablesList.find(t => t.id === tableId) || TABLES.find(t => t.id === tableId);
    const duration = getElapsedSeconds(session.startTime);
    const rateSegments = Array.isArray(session.rateSegments) && session.rateSegments.length
      ? session.rateSegments
      : [createRateSegment(table, session.startTime)];
    const billingNow = Date.now();
    const rawCosts = rateSegments.reduce((costs, segment, index) => {
      const segmentEnd = segment.endTime || rateSegments[index + 1]?.startTime || billingNow;
      const segmentSeconds = Math.max(0, Math.min(billingNow, segmentEnd) - segment.startTime) / 1000;
      const rateUnitSeconds = segment.rateUnit === 'hour' ? 3600 : 60;
      costs.base += (segmentSeconds / rateUnitSeconds) * (Number(segment.ratePerHour) || 0);
      costs.controllers += (segmentSeconds / 3600) * (Number(segment.controllerRatePerHour) || 0) * (Number(segment.controllerCount) || 0);
      return costs;
    }, { base: 0, controllers: 0 });
    const lastSegment = rateSegments[rateSegments.length - 1];
    const rate = Number(lastSegment.ratePerHour) || 0;
    const controllerCost = Math.max(Math.round(rawCosts.controllers), 0);
    const tableCost = Math.max(Math.round(rawCosts.base + rawCosts.controllers), 0);
    const baseTableCost = tableCost - controllerCost;
    const itemsCost = (session.items || []).reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalAmount = tableCost + itemsCost;
    
    return {
      tableCost,
      baseTableCost,
      controllerCost,
      controllerCount: Number(lastSegment.controllerCount) || 0,
      controllerRatePerHour: Number(lastSegment.controllerRatePerHour) || 0,
      rateUnit: lastSegment.rateUnit || 'minute',
      itemsCost,
      totalAmount,
      duration,
      items: session.items || [],
      playerName: session.playerName,
      playerPhone: session.playerPhone,
      tableId,
      tableName: table?.name || 'Table',
      tableType: table?.type || 'snooker',
      ratePerHour: rate,
      startTime: session.startTime
    };
  };

  const completeCheckout = async (tableId, paidAmount, creditAmount, extras = {}) => {
    const session = activeSessions[tableId];
    if (!session) return;
    
    const bill = getSessionBill(tableId);
    const now = Date.now();
    patchTableTimes(tableId, (t) => commitTablePeriod(t, now, true));
    
    const updatedSession = {
      ...session,
      locationId,
      endTime: Date.now(),
      status: SESSION_STATUS.COMPLETED,
      totalAmount: bill.totalAmount,
      tableCost: bill.tableCost,
      itemsCost: bill.itemsCost,
      paidAmount,
      creditAmount,
      paymentMethod: extras.paymentMethod || 'cash',
      checkedOutById: user?.id || null,
      checkedOutByName: user?.name || user?.username || 'Unknown staff',
      discount: extras.discount || 0,
      amountGiven: extras.amountGiven ?? paidAmount,
      addToHistory: extras.addToHistory !== false,
      syncStatus: SYNC_STATUS.PENDING
    };
    
    await db.sessions.put(updatedSession);
    
    const playerIndex = players.findIndex(p => p.phone === session.playerPhone);
    if (playerIndex >= 0) {
      const player = { ...players[playerIndex] };
      player.totalHoursPlayed += bill.duration / 3600;
      player.totalAmountPaid += paidAmount;
      player.pendingDues += creditAmount;
      player.syncStatus = SYNC_STATUS.PENDING;
      await db.players.put(player);
      const newPlayers = [...players];
      newPlayers[playerIndex] = player;
      setPlayers(newPlayers);
    }

    for (const item of session.items) {
      const invItemIndex = inventory.findIndex(inv => inv.id === item.itemId);
      if (invItemIndex >= 0) {
        const invItem = { ...inventory[invItemIndex] };
        invItem.stock = Math.max(0, invItem.stock - item.quantity);
        invItem.syncStatus = SYNC_STATUS.PENDING;
        await db.inventory.put(invItem);
        const newInventory = [...inventory];
        newInventory[invItemIndex] = invItem;
        setInventory(newInventory);
      }
    }

    const newActiveSessions = { ...activeSessions };
    delete newActiveSessions[tableId];
    setActiveSessions(newActiveSessions);
    setCompletedSessions(prev => [...prev, updatedSession]);
    await countPending();
  };

  const switchTable = async (fromId, toId, controllerCount = 1) => {
    const session = activeSessions[fromId];
    const targetTable = tablesList.find(table => table.id === toId);
    if (!session || !targetTable || targetTable.enabled === false || activeSessions[toId]) return;
    
    const switchedAt = Date.now();
    const segments = Array.isArray(session.rateSegments) && session.rateSegments.length
      ? session.rateSegments
      : [createRateSegment(tablesList.find(table => table.id === fromId), session.startTime)];
    const updatedSegments = [...segments];
    updatedSegments[updatedSegments.length - 1] = { ...updatedSegments[updatedSegments.length - 1], endTime: switchedAt };
    updatedSegments.push(createRateSegment(targetTable, switchedAt, controllerCount));
    const updatedSession = { ...session, tableId: toId, rateSegments: updatedSegments, syncStatus: SYNC_STATUS.PENDING };
    await db.sessions.put(updatedSession);
    
    const newActiveSessions = { ...activeSessions, [toId]: updatedSession };
    delete newActiveSessions[fromId];
    setActiveSessions(newActiveSessions);
    
    if (selectedTableId === fromId) {
      setSelectedTableId(toId);
    }
    await countPending();
  };

  const addItemToSession = async (tableId, item, qty) => {
    const session = activeSessions[tableId];
    if (!session) return;
    
    const newItems = [...session.items];
    const existingIndex = newItems.findIndex(i => i.itemId === item.id);
    
    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += qty;
    } else {
      newItems.push({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: qty,
        image: item.image || '',
        icon: item.icon || 'ðŸ¥¤'
      });
    }
    
    const updatedSession = { ...session, items: newItems, syncStatus: SYNC_STATUS.PENDING };
    await db.sessions.put(updatedSession);
    setActiveSessions(prev => ({ ...prev, [tableId]: updatedSession }));
    await countPending();
  };

  const removeItemFromSession = async (tableId, itemId) => {
    const session = activeSessions[tableId];
    if (!session) return;
    
    let newItems = [...session.items];
    const itemIndex = newItems.findIndex(i => i.itemId === itemId);
    
    if (itemIndex >= 0) {
      newItems[itemIndex].quantity -= 1;
      if (newItems[itemIndex].quantity <= 0) {
        newItems = newItems.filter(i => i.itemId !== itemId);
      }
      const updatedSession = { ...session, items: newItems, syncStatus: SYNC_STATUS.PENDING };
      await db.sessions.put(updatedSession);
      setActiveSessions(prev => ({ ...prev, [tableId]: updatedSession }));
      await countPending();
    }
  };

  const searchPlayers = (query) => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return players.filter(p => 
      p.name.toLowerCase().includes(q) || p.phone.includes(query)
    ).slice(0, 10);
  };

  const updateStock = async (itemId, change) => {
    const itemIndex = inventory.findIndex(i => i.id === itemId);
    if (itemIndex >= 0) {
      const item = { ...inventory[itemIndex] };
      item.stock = Math.max(0, item.stock + change);
      item.syncStatus = SYNC_STATUS.PENDING;
      await db.inventory.put(item);
      const newInventory = [...inventory];
      newInventory[itemIndex] = item;
      setInventory(newInventory);
      await countPending();
    }
  };

  const addInventoryItem = async (newItem) => {
    const item = { 
      ...newItem, 
      id: newItem.id || generateId(), 
      locationId,
      syncStatus: SYNC_STATUS.PENDING 
    };
    await db.inventory.put(item);
    setInventory(prev => [...prev, item]);
    await countPending();
  };

  const updateInventoryItem = async (itemId, updates) => {
    const itemIndex = inventory.findIndex(i => i.id === itemId);
    if (itemIndex < 0) return;
    const item = { ...inventory[itemIndex], ...updates, syncStatus: SYNC_STATUS.PENDING };
    await db.inventory.put(item);
    const next = [...inventory];
    next[itemIndex] = item;
    setInventory(next);
    await countPending();
  };

  const adjustPlayerCredit = async (playerId, amount) => {
    const index = players.findIndex(p => p.id === playerId);
    if (index < 0) return;
    const player = { ...players[index], pendingDues: Math.max(0, Number(amount) || 0), syncStatus: SYNC_STATUS.PENDING };
    await db.players.put(player);
    const next = [...players];
    next[index] = player;
    setPlayers(next);
    await countPending();
  };

  const addExpense = async (expenseData) => {
    const date = expenseData.date || Date.now();
    const expense = {
      id: generateId(),
      locationId,
      ...expenseData,
      date,
      month: getMonthKey(date),
      syncStatus: SYNC_STATUS.PENDING
    };
    await db.expenses.put(expense);
    setExpenses(prev => [...prev, expense]);
    await countPending();
  };

  const addCue = async (cueData) => {
    const cue = {
      id: generateId(),
      locationId,
      ...cueData,
      syncStatus: SYNC_STATUS.PENDING
    };
    await db.cues.put(cue);
    setCues(prev => [...prev, cue]);
    await countPending();
  };

  const updateCue = async (cueId, updates) => {
    const cueIndex = cues.findIndex(c => c.id === cueId);
    if (cueIndex >= 0) {
      const cue = { ...cues[cueIndex], ...updates, syncStatus: SYNC_STATUS.PENDING };
      await db.cues.put(cue);
      const newCues = [...cues];
      newCues[cueIndex] = cue;
      setCues(newCues);
      await countPending();
    }
  };

  const markRateChangeNotificationRead = async (notificationId) => {
    const notification = rateChangeNotifications.find(item => item.id === notificationId);
    if (!notification || notification.read) return;
    const updated = { ...notification, read: true, syncStatus: SYNC_STATUS.PENDING };
    await db.notifications.put(updated);
    setRateChangeNotifications(previous => previous.map(item => item.id === notificationId ? updated : item));
    await countPending();
  };

  const value = {
    tables: tablesList,
    updateTableRate,
    addTable,
    editTable,
    deleteTable,
    toggleTableEnabled,
    activeSessions,
    startSession,
    createPlayer,
    updatePlayer,
    checkoutQuickSale,
    stopSession: getSessionBill,
    completeCheckout,
    switchTable,
    addItemToSession,
    removeItemFromSession,
    players,
    adjustPlayerCredit,
    searchPlayers,
    inventory,
    updateStock,
    addInventoryItem,
    updateInventoryItem,
    completedSessions,
    expenses,
    addExpense,
    cues,
    addCue,
    updateCue,
    rateChangeNotifications,
    markRateChangeNotificationRead,
    getSessionBill,
    syncStatus,
    pendingChanges,
    currentPage,
    setCurrentPage,
    selectedTableId,
    setSelectedTableId,
    locationId,
    selectOwnerLocation
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

