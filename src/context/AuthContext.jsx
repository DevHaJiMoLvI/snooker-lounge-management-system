import React, { createContext, useContext, useState, useEffect } from 'react';
import db from '../db/localDB';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved user", e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password, requestedRole = 'counter', requestedLocationId = 'main') => {
    try {
      const cleanUsername = String(username || '').trim().toLowerCase();
      const cleanPassword = String(password || '').trim();
      const users = await db.users.toArray();
      const foundUser = users.find(candidate => {
        const isOwner = candidate.role === 'owner';
        const roleMatches = requestedRole === 'owner' ? isOwner : !isOwner;
        const locationMatches = requestedRole === 'owner' || (candidate.locationId || 'main') === requestedLocationId;
        const storedUsername = String(candidate.username || '').trim().toLowerCase();
        const savedName = String(candidate.name || '').trim().toLowerCase();
        const legacyStaff = candidate.role === 'counter' &&
          savedName === 'counter staff' &&
          ['admin', 'staff', 'counter', 'counter staff'].includes(cleanUsername);
        const nameLogin = savedName === cleanUsername || savedName.split(/\s+/)[0] === cleanUsername;
        const usernameMatches = storedUsername === cleanUsername || nameLogin || legacyStaff;
        const passwordMatches = String(candidate.password || '') === cleanPassword || String(candidate.pin || '') === cleanPassword;
        return roleMatches && locationMatches && usernameMatches && passwordMatches;
      });
      if (foundUser) {
        if (!foundUser.username || !foundUser.password) {
          foundUser.username = foundUser.role === 'owner' ? 'owner' : (foundUser.username || 'admin');
          foundUser.password = foundUser.password || foundUser.pin || cleanPassword;
          await db.users.put(foundUser);
        }
        setUser(foundUser);
        localStorage.setItem('currentUser', JSON.stringify(foundUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error", error);
      return false;
    }
  };

  const createAdminUser = async ({ name, username, password, locationId, shiftStart, shiftEnd }) => {
    if (user?.role !== 'owner') return { ok: false, error: 'Only the owner can create admin users.' };
    const cleanUsername = username.trim().toLowerCase();
    if (!name.trim() || !cleanUsername || !password) return { ok: false, error: 'Complete all fields.' };
    const exists = (await db.users.toArray()).some(candidate => String(candidate.username || '').toLowerCase() === cleanUsername);
    if (exists) return { ok: false, error: 'That username is already in use.' };
    const cleanPassword = String(password).trim();
    if (!locationId || !(await db.locations.get(locationId))) return { ok: false, error: 'Choose a valid lounge location.' };
    const newUser = { id: crypto.randomUUID(), name: name.trim(), username: cleanUsername, password: cleanPassword, pin: cleanPassword, role: 'admin', locationId, shiftStart: shiftStart || '', shiftEnd: shiftEnd || '' };
    await db.users.put(newUser);
    return { ok: true };
  };

  const createLocation = async (name) => {
    if (user?.role !== 'owner') return { ok: false, error: 'Only the owner can add lounge locations.' };
    const cleanName = String(name || '').trim();
    if (!cleanName) return { ok: false, error: 'Enter a lounge name.' };
    const exists = (await db.locations.toArray()).some(location => location.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) return { ok: false, error: 'That lounge already exists.' };
    const location = { id: crypto.randomUUID(), name: cleanName, createdAt: Date.now() };
    await db.locations.put(location);
    return { ok: true, location };
  };

  const deleteStaffUser = async (id) => {
    if (user?.role !== 'owner') return { ok: false, error: 'Only the owner can delete staff accounts.' };
    const target = await db.users.get(id);
    if (!target) return { ok: false, error: 'That account could not be found.' };
    if (target.role === 'owner') return { ok: false, error: 'The owner account cannot be deleted here.' };
    await db.users.delete(id);
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    user,
    login,
    createAdminUser,
    createLocation,
    deleteStaffUser,
    logout,
    isAuthenticated: !!user,
    isOwner: user?.role === 'owner',
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
