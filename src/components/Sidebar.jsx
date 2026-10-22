import React from 'react';
import { useApp } from '../context/AppContext';
import { PAGES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useApp();
  const { logout } = useAuth();
  const navItems = [
    { id: PAGES.DASHBOARD, label: 'Dashboard' },
    { id: PAGES.CANTEEN, label: 'Shop' },
    { id: PAGES.TABLE_MANAGEMENT, label: 'Table Management' },
    { id: PAGES.EXPENSES, label: 'Reports' },
    { id: PAGES.PLAYER_RECORDS, label: 'Player Credits' },
    { id: PAGES.OWNER_PANEL, label: 'Club Settings' }
  ];

  return <aside className="prototype-sidebar">
    <div className="prototype-sidebar__brand"><span>786</span><b>786-SHENDER-1</b></div>
    <nav className="prototype-sidebar__nav" aria-label="Main navigation">
      {navItems.map(item => <button key={item.id} type="button" onClick={() => setCurrentPage(item.id)} className={`prototype-sidebar__item ${currentPage === item.id ? 'is-active' : ''}`}>{item.label}</button>)}
    </nav>
    <button type="button" onClick={logout} className="prototype-sidebar__logout">Logout</button>
  </aside>;
}
