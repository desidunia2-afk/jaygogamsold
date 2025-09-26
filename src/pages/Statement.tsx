import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { DailyOrder } from '../types';
import { IndianRupee, ShoppingCart, CheckCircle, Clock, FileText, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface StatementResult {
  orders: DailyOrder[];
  totalAmount: number;
  totalPaid: number;
  pendingAmount: number;
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
}

const Statement: React.FC = () => {
  const { orders, customers, dataLoading } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [generatedStatement, setGeneratedStatement] = useState<StatementResult | null>(null);

  const handleGenerateStatement = () => {
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      orderDate.setUTCHours(0, 0, 0, 0);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(0, 0, 0, 0);

      const isDateInRange = orderDate >= start && orderDate <= end;
      const isCustomerMatch = selectedCustomerId === 'all' || order.customer_id === selectedCustomerId;
      
      return isDateInRange && isCustomerMatch;
    });

    const totalAmount = filteredOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const totalPaid = filteredOrders.reduce((sum, order) => sum + (order.amount_paid || 0), 0);
    const pendingAmount = totalAmount - totalPaid;
    const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered').length;
    const pendingOrders = filteredOrders.length - deliveredOrders;

    setGeneratedStatement({
      orders: filteredOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      totalAmount,
      totalPaid,
      pendingAmount,
      totalOrders: filteredOrders.length,
      deliveredOrders,
      pendingOrders,
    });
  };

  const selectedCustomerName = useMemo(() => {
    if (selectedCustomerId === 'all') return 'All Customers';
    return customers.find(c => c.id === selectedCustomerId)?.name || '';
  }, [selectedCustomerId, customers]);

  const handleDownloadPDF = () => {
    if (!generatedStatement) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Jay Goga Milk - Statement', 14, 22);
    doc.setFontSize(11);
    doc.text(`Customer: ${selectedCustomerName}`, 14, 30);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 36);

    const tableColumn = ["Date", "Customer", "Total", "Paid", "Balance", "Status"];
    const tableRows: (string | number)[][] = [];

    generatedStatement.orders.forEach(order => {
      const orderData = [
        new Date(order.date).toLocaleDateString('en-IN', { timeZone: 'UTC' }),
        order.customer_name,
        `₹${order.total_amount.toFixed(2)}`,
        `₹${(order.amount_paid || 0).toFixed(2)}`,
        `₹${(order.total_amount - (order.amount_paid || 0)).toFixed(2)}`,
        order.status,
      ];
      tableRows.push(orderData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text('Summary', 14, finalY + 15);
    doc.setFontSize(10);
    doc.text(`Total Order Value: ₹${generatedStatement.totalAmount.toFixed(2)}`, 14, finalY + 22);
    doc.text(`Total Paid: ₹${generatedStatement.totalPaid.toFixed(2)}`, 14, finalY + 28);
    doc.text(`Pending Amount: ₹${generatedStatement.pendingAmount.toFixed(2)}`, 14, finalY + 34);

    doc.save(`Statement_${selectedCustomerName}_${startDate}_to_${endDate}.pdf`);
  };

  const handleDownloadExcel = () => {
    if (!generatedStatement) return;
    
    const ws_data = [
      ["Jay Goga Milk - Statement"],
      [`Customer: ${selectedCustomerName}`],
      [`Period: ${startDate} to ${endDate}`],
      [],
      ["Summary"],
      ["Total Order Value", `₹${generatedStatement.totalAmount.toFixed(2)}`],
      ["Total Paid", `₹${generatedStatement.totalPaid.toFixed(2)}`],
      ["Pending Amount", `₹${generatedStatement.pendingAmount.toFixed(2)}`],
      [],
      ["Date", "Customer", "Items", "Total", "Paid", "Balance", "Status"],
    ];

    generatedStatement.orders.forEach(order => {
      const items = order.items.map(i => `${i.product_name} x ${i.quantity}`).join(', ');
      ws_data.push([
        new Date(order.date).toLocaleDateString('en-IN', { timeZone: 'UTC' }),
        order.customer_name,
        items,
        order.total_amount,
        order.amount_paid || 0,
        order.total_amount - (order.amount_paid || 0),
        order.status,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{wch:12}, {wch:20}, {wch:40}, {wch:10}, {wch:10}, {wch:10}, {wch:10}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    XLSX.writeFile(wb, `Statement_${selectedCustomerName.replace(' ', '_')}_${startDate}_to_${endDate}.xlsx`);
  };

  const stats = useMemo(() => {
    if (!generatedStatement) return [];
    return [
      { icon: IndianRupee, label: 'Total Order Value', value: `₹${generatedStatement.totalAmount.toFixed(2)}`, color: 'bg-blue-100 text-blue-600' },
      { icon: CheckCircle, label: 'Total Paid', value: `₹${generatedStatement.totalPaid.toFixed(2)}`, color: 'bg-green-100 text-green-600' },
      { icon: Clock, label: 'Pending Amount', value: `₹${generatedStatement.pendingAmount.toFixed(2)}`, color: 'bg-orange-100 text-orange-600' },
      { icon: ShoppingCart, label: 'Total Orders', value: generatedStatement.totalOrders, color: 'bg-purple-100 text-purple-600' },
    ];
  }, [generatedStatement]);

  return (
    <Layout title="Statement">
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">Generate Statement</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-500"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-500">
                <option value="all">All Customers</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <motion.button
              onClick={handleGenerateStatement}
              disabled={dataLoading}
              className="w-full bg-dairy-600 text-white py-3 rounded-lg font-medium flex justify-center items-center"
              whileTap={{ scale: 0.98 }}
            >
              {dataLoading ? <Loader2 className="animate-spin" /> : 'Generate Statement'}
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {generatedStatement && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="grid grid-cols-2 gap-4 mb-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
                  >
                    <div className={`p-2 rounded-lg inline-block ${stat.color} mb-2`}>
                      <stat.icon size={20} />
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-gray-800">{stat.value}</p>
                    <p className="text-xs text-gray-600">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Order Details</h3>
                <div className="flex space-x-2">
                  <motion.button onClick={handleDownloadPDF} className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm font-medium" whileTap={{scale: 0.95}}>
                    <FileDown size={16}/>
                    <span>PDF</span>
                  </motion.button>
                  <motion.button onClick={handleDownloadExcel} className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium" whileTap={{scale: 0.95}}>
                    <FileSpreadsheet size={16}/>
                    <span>Excel</span>
                  </motion.button>
                </div>
              </div>
              
              {generatedStatement.orders.length > 0 ? (
                <div className="space-y-3">
                  {generatedStatement.orders.map(order => {
                    const amountPaid = order.amount_paid || 0;
                    const balance = order.total_amount - amountPaid;
                    return (
                      <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">{order.customer_name}</p>
                            <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString('en-IN', { timeZone: 'UTC' })}</p>
                          </div>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-medium">₹{order.total_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Paid:</span>
                            <span className="font-medium text-green-600">₹{amountPaid.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Balance:</span>
                            <span className={`font-bold ${balance <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              ₹{balance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
                  <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-600">No orders found for the selected criteria.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default Statement;
