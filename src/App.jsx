import React, { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { PAGES } from './utils/constants';

import Login from './components/Login';
import Sidebar from './components/Sidebar';
import OwnerSidebar from './components/OwnerSidebar';
import SyncBadge from './components/SyncBadge';
import Dashboard from './components/Dashboard/Dashboard';
import TableManagement from './components/Pages/TableManagement';
import CanteenPage from './components/Pages/CanteenPage';
import PlayerRecords from './components/Pages/PlayerRecords';
import OwnerPanel from './components/Pages/OwnerPanel';
import ExpensesPage from './components/Pages/ExpensesPage';
import CueManagement from './components/Pages/CueManagement';
import OwnerDashboard from './components/Pages/OwnerDashboard';
import OwnerAuditLog from './components/Pages/OwnerAuditLog';
import OwnerSystemSettings from './components/Pages/OwnerSystemSettings';

export default function App() {
  const { isAuthenticated, loading, isOwner, user } = useAuth();
  const { currentPage, setCurrentPage } = useApp();

  useEffect(() => {
    if (isAuthenticated) setCurrentPage(PAGES.DASHBOARD);
  }, [user?.id, isAuthenticated, setCurrentPage]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', backgroundColor: '#0f172a' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.DASHBOARD:
        return isOwner ? <OwnerDashboard onNavigate={setCurrentPage} /> : <Dashboard />;
      case PAGES.TABLE_MANAGEMENT:
        return <TableManagement />;
      case PAGES.CANTEEN:
        return <CanteenPage />;
      case PAGES.PLAYER_RECORDS:
        return <PlayerRecords />;
      case PAGES.OWNER_PANEL:
        return <OwnerPanel />;
      case PAGES.EXPENSES:
        return <ExpensesPage />;
      case PAGES.CUE_MANAGEMENT:
        return <CueManagement />;
      case PAGES.OWNER_AUDIT:
        return isOwner ? <OwnerAuditLog /> : <Dashboard />;
      case PAGES.OWNER_SETTINGS:
        return isOwner ? <OwnerSystemSettings /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      {isOwner ? <OwnerSidebar /> : <Sidebar />}
      <main className={`main-content ${!isOwner && currentPage === PAGES.DASHBOARD ? 'prototype-dashboard-mode' : 'prototype-page-mode'}`} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <SyncBadge />
        {renderPage()}
      </main>
    </div>
  );
}
