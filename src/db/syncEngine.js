import { firestore } from '../config/firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { SYNC_STATUS } from '../utils/constants';

export async function syncToCloud(db) {
  if (!firestore) return { synced: 0, failed: 0 };
  
  let synced = 0;
  let failed = 0;

  try {
    const stores = ['sessions', 'players', 'inventory', 'expenses', 'cues', 'notifications'];
    
    for (const storeName of stores) {
      const records = await db[storeName].where('syncStatus').equals(SYNC_STATUS.PENDING).toArray();
      
      for (const record of records) {
        try {
          const { syncStatus, ...dataToSync } = record;
          await setDoc(doc(firestore, storeName, record.id), dataToSync);
          
          await db[storeName].update(record.id, { syncStatus: SYNC_STATUS.SYNCED });
          synced++;
        } catch (err) {
          console.error(`Failed to sync ${storeName} record ${record.id}:`, err);
          failed++;
        }
      }
    }
  } catch (error) {
    console.error("Sync to cloud error:", error);
  }
  
  return { synced, failed };
}

export async function syncFromCloud(db) {
  if (!firestore) return;
  
  try {
    const stores = ['sessions', 'players', 'inventory', 'expenses', 'cues'];
    
    for (const storeName of stores) {
      const querySnapshot = await getDocs(collection(firestore, storeName));
      const records = [];
      querySnapshot.forEach((docSnap) => {
        records.push({ ...docSnap.data(), id: docSnap.id, syncStatus: SYNC_STATUS.SYNCED });
      });
      
      if (records.length > 0) {
         await db[storeName].bulkPut(records);
      }
    }
  } catch (error) {
    console.error("Sync from cloud error:", error);
  }
}
