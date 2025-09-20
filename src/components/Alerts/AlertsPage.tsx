import React from 'react';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, CheckCircle, Info, Trash2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const AlertsPage: React.FC = () => {
  const { smartAlerts, markAlertAsRead, deleteAlert } = useApp();

  const sortedAlerts = [...smartAlerts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const AlertIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'warning': return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'success': return <CheckCircle className="h-6 w-6 text-green-500" />;
      default: return <Info className="h-6 w-6 text-blue-500" />;
    }
  };
  
  const getAlertColors = (type: string, read: boolean) => {
    if (read) return 'bg-gray-50 border-gray-200';
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔔 Centro de Alertas</h1>
        <p className="text-gray-600">Aquí encontrarás notificaciones importantes sobre tus finanzas.</p>
      </div>

      {sortedAlerts.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence>
            {sortedAlerts.map(alert => (
              <motion.div
                key={alert.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className={`p-4 rounded-lg border flex items-start justify-between ${getAlertColors(alert.type, alert.read)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0"><AlertIcon type={alert.type} /></div>
                  <div className="ml-4">
                    <h3 className={`text-sm font-semibold ${alert.read ? 'text-gray-600' : 'text-gray-900'}`}>{alert.title}</h3>
                    <p className={`text-sm mt-1 ${alert.read ? 'text-gray-500' : 'text-gray-700'}`}>{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!alert.read && (
                    <button onClick={() => markAlertAsRead(alert.id)} title="Marcar como leída" className="p-1 text-gray-400 hover:text-green-500">
                      <Check size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteAlert(alert.id)} title="Eliminar alerta" className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <Bell size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-4 text-xl font-semibold text-gray-900">Todo en orden</h3>
          <p className="mt-2 text-gray-500">No tienes nuevas alertas por ahora.</p>
        </div>
      )}
    </div>
  );
};
