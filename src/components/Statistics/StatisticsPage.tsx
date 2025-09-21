import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export const StatisticsPage: React.FC = () => {
  const { transactions, getDashboardStats } = useApp();
  
  const stats = getDashboardStats();
  const approvedTransactions = transactions.filter(t => t.status === 'approved');

  // Gráfico de distribución por categorías
  const categoryDistribution = useMemo(() => {
    const categoryData: { [key: string]: { expenses: number, income: number, savings: number } } = {};
    
    approvedTransactions.forEach(transaction => {
      if (!categoryData[transaction.category]) {
        categoryData[transaction.category] = { expenses: 0, income: 0, savings: 0 };
      }
      
      if (transaction.type === 'expense') {
        categoryData[transaction.category].expenses += Number(transaction.amount);
      } else if (transaction.type === 'income') {
        categoryData[transaction.category].income += Number(transaction.amount);
      } else if (transaction.type === 'saving') {
        categoryData[transaction.category].savings += Number(transaction.amount);
      }
    });

    return categoryData;
  }, [approvedTransactions]);

  // Gráfico de evolución temporal (últimos 6 meses)
  const temporalEvolution = useMemo(() => {
    const sixMonthsAgo = subMonths(new Date(), 5);
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(new Date())
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTransactions = approvedTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const savings = monthTransactions
        .filter(t => t.type === 'saving')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        month: format(month, 'MMM yyyy', { locale: es }),
        income,
        expenses,
        savings,
        balance: income - expenses - savings
      };
    });
  }, [approvedTransactions]);

  // Configuración del gráfico de categorías (Pie Chart)
  const categoryChartOption = {
    title: {
      text: 'Distribución por Categorías',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) => `${params.name}: €${params.value.toFixed(2)} (${params.percent}%)`,
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      type: 'scroll'
    },
    series: [
      {
        name: 'Gastos',
        type: 'pie',
        radius: ['20%', '70%'],
        center: ['50%', '45%'],
        data: Object.entries(categoryDistribution)
          .filter(([_, data]) => data.expenses > 0)
          .map(([category, data]) => ({
            value: data.expenses,
            name: category
          }))
          .sort((a, b) => b.value - a.value),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        itemStyle: {
          borderRadius: 8
        }
      }
    ]
  };

  // Configuración del gráfico temporal (Line Chart)
  const temporalChartOption = {
    title: {
      text: 'Evolución Temporal (Últimos 6 meses)',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: (params: Array<{ axisValue: string; marker: string; seriesName: string; value: number }>) => {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach((param) => {
          result += `${param.marker} ${param.seriesName}: €${param.value.toFixed(2)}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['Ingresos', 'Gastos', 'Ahorros', 'Balance'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: temporalEvolution.map(item => item.month)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '€{value}'
      }
    },
    series: [
      {
        name: 'Ingresos',
        type: 'line',
        smooth: true,
        data: temporalEvolution.map(item => item.income),
        itemStyle: { color: '#10b981' },
        areaStyle: { opacity: 0.3 }
      },
      {
        name: 'Gastos',
        type: 'line',
        smooth: true,
        data: temporalEvolution.map(item => item.expenses),
        itemStyle: { color: '#ef4444' },
        areaStyle: { opacity: 0.3 }
      },
      {
        name: 'Ahorros',
        type: 'line',
        smooth: true,
        data: temporalEvolution.map(item => item.savings),
        itemStyle: { color: '#3b82f6' },
        areaStyle: { opacity: 0.3 }
      },
      {
        name: 'Balance',
        type: 'line',
        smooth: true,
        data: temporalEvolution.map(item => item.balance),
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 3 }
      }
    ]
  };

  // Gráfico de barras comparativo
  const comparisonChartOption = {
    title: {
      text: 'Comparación Ingresos vs Gastos vs Ahorros',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: Array<{ axisValue: string; marker: string; seriesName: string; value: number }>) => {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach((param) => {
          result += `${param.marker} ${param.seriesName}: €${param.value.toFixed(2)}<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['Ingresos', 'Gastos', 'Ahorros'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: temporalEvolution.map(item => item.month)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '€{value}'
      }
    },
    series: [
      {
        name: 'Ingresos',
        type: 'bar',
        data: temporalEvolution.map(item => item.income),
        itemStyle: { color: '#10b981' }
      },
      {
        name: 'Gastos',
        type: 'bar',
        data: temporalEvolution.map(item => item.expenses),
        itemStyle: { color: '#ef4444' }
      },
      {
        name: 'Ahorros',
        type: 'bar',
        data: temporalEvolution.map(item => item.savings),
        itemStyle: { color: '#3b82f6' }
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📈 Estadísticas</h1>
        <p className="text-gray-600">Análisis detallado de tus finanzas</p>
      </motion.div>

      {/* Resumen rápido */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Ingresos Totales</h3>
          <p className="text-3xl font-bold">€{stats.totalIncome.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Gastos Totales</h3>
          <p className="text-3xl font-bold">€{stats.totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90">Ahorros Totales</h3>
          <p className="text-3xl font-bold">€{stats.totalSavings.toFixed(2)}</p>
        </div>
        <div className={`bg-gradient-to-r ${stats.balance >= 0 ? 'from-purple-500 to-purple-600' : 'from-orange-500 to-orange-600'} rounded-lg p-6 text-white`}>
          <h3 className="text-sm font-medium opacity-90">Balance Final</h3>
          <p className="text-3xl font-bold">€{stats.balance.toFixed(2)}</p>
        </div>
      </motion.div>

      {/* Gráficos */}
      <div className="space-y-8">
        {/* Evolución temporal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <ReactECharts
            option={temporalChartOption}
            style={{ height: '400px' }}
            opts={{ renderer: 'svg' }}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Distribución por categorías */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <ReactECharts
              option={categoryChartOption}
              style={{ height: '400px' }}
              opts={{ renderer: 'svg' }}
            />
          </motion.div>

          {/* Comparación por meses */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <ReactECharts
              option={comparisonChartOption}
              style={{ height: '400px' }}
              opts={{ renderer: 'svg' }}
            />
          </motion.div>
        </div>

        {/* Insights automáticos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Insights Financieros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Tasa de Ahorro</h4>
              <p className="text-2xl font-bold text-blue-700">
                {stats.totalIncome > 0 ? ((stats.totalSavings / stats.totalIncome) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-blue-600">De tus ingresos totales</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Categoría con más gastos</h4>
              <p className="text-lg font-bold text-green-700">
                {Object.entries(categoryDistribution)
                  .filter(([_, data]) => data.expenses > 0)
                  .sort(([_, a], [__, b]) => b.expenses - a.expenses)[0]?.[0] || 'N/A'}
              </p>
              <p className="text-sm text-green-600">
                €{Object.entries(categoryDistribution)
                  .filter(([_, data]) => data.expenses > 0)
                  .sort(([_, a], [__, b]) => b.expenses - a.expenses)[0]?.[1]?.expenses.toFixed(2) || '0.00'}
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">Promedio mensual</h4>
              <p className="text-lg font-bold text-purple-700">
                €{temporalEvolution.length > 0 ? 
                  (stats.totalExpenses / temporalEvolution.length).toFixed(2) : '0.00'}
              </p>
              <p className="text-sm text-purple-600">En gastos por mes</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
