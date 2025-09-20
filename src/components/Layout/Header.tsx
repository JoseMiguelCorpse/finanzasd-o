import React from 'react';
import { useApp } from '../../context/AppContext';
import { LogOut, User, Bell } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center space-x-2"
            >
              <span className="text-2xl">💑</span>
              <h1 className="text-xl font-bold text-gray-900">FinanzasDúo</h1>
              {isDemoMode && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  Demo
                </span>
              )}
            </motion.div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              onClick={() => onNavigate('alerts')}
              className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors"
            >
              <Bell className="h-6 w-6" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </button>

            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {currentUser?.name}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-500 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden">
          <div className="flex space-x-1 pb-3 overflow-x-auto">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
