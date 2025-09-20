import React from 'react';
import { useApp } from '../../context/AppContext';
import { LogOut, User, Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, currentPage, onNavigate }) => {
  const { currentUser, logout, smartAlerts, isDemoMode } = useApp();
  const unreadAlerts = smartAlerts.filter(alert => !alert.read).length;

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'transactions', name: 'Transacciones', icon: '💰' },
    { id: 'goals', name: 'Metas', icon: '🎯' },
    { id: 'statistics', name: 'Estadísticas', icon: '📈' },
    { id: 'recurring', name: 'Recurrentes', icon: '🔄' }
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ease-in-out 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:static`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💑</span>
            <h1 className="text-xl font-bold text-gray-900">FinanzasDúo</h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {isDemoMode && (
          <div className="p-2 text-center bg-blue-50 text-blue-800 text-sm font-medium border-b border-blue-200">
            Modo Demo
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                currentPage === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onNavigate('alerts')}
            className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors mb-2"
          >
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-gray-500" />
              <span className="ml-3 text-sm font-medium text-gray-700">Notificaciones</span>
            </div>
            {unreadAlerts > 0 && (
              <span className="h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                {unreadAlerts}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-3 mt-2">
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{currentUser?.name}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
            </div>
            <button onClick={logout} className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100" title="Cerrar sesión">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
