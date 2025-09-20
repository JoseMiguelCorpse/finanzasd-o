import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TransactionsPage } from './components/Transactions/TransactionsPage';
import { StatisticsPage } from './components/Statistics/StatisticsPage';
import { GoalsPage } from './components/Goals/GoalsPage';
import { RecurringPage } from './components/Recurring/RecurringPage';
import { AlertsPage } from './components/Alerts/AlertsPage';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando FinanzasDúo...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        {authMode === 'login' ? (
          <Login
            key="login"
            onSwitchToRegister={() => setAuthMode('register')}
          />
        ) : (
          <Register
            key="register"
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}
      </AnimatePresence>
    );
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <TransactionsPage />;
      case 'goals':
        return <GoalsPage />;
      case 'statistics':
        return <StatisticsPage />;
      case 'recurring':
        return <RecurringPage />;
      case 'alerts':
        return <AlertsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setSidebarOpen}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex justify-between items-center bg-white p-4 border-b shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💑</span>
            <h1 className="text-lg font-bold text-gray-800">FinanzasDúo</h1>
          </div>
          <div className="w-6"></div> {/* Spacer to balance the title */}
        </header>

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
