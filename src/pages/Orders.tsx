import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import { useAuth } from '../context/AuthContext';
import { Customer, Product, OrderItem } from '../types';
import { Calendar, Plus, ShoppingCart, Check, Clock, Trash2, AlertCircle, Loader2 } from 'lucide-react';

const Orders: React.FC = () => {
  const { orders, customers, products, addOrder, updateOrder, deleteOrder, dataLoading } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    show: boolean;
    orderId: string;
    customerName: string;
    totalAmount: number;
  }>({ show: false, orderId: '', customerName: '', totalAmount: 0 });

  const dailyOrders = orders.filter(order => order.date === selectedDate);

  const handleAddOrderItem = () => {
    if (products.length > 0) {
      const firstProduct = products[0];
      setOrderItems(prev => [...prev, {
        product_id: firstProduct.id,
        product_name: firstProduct.name,
        quantity: 1,
        unit: firstProduct.unit,
        price: firstProduct.price,
        total: firstProduct.price
      }]);
    }
  };

  const handleRemoveOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateOrderItem = (index: number, field: 'product_id' | 'quantity', value: any) => {
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      let updatedItem = { ...item };

      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (!product) return item;
        
        updatedItem = {
          ...item,
          product_id: product.id,
          product_name: product.name,
          unit: product.unit,
          price: product.price,
          quantity: 1,
        };
      } else if (field === 'quantity') {
        updatedItem.quantity = parseFloat(value) || 0;
      }
      updatedItem.total = updatedItem.quantity * updatedItem.price;
      return updatedItem;
    }));
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomer || orderItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const total_amount = orderItems.reduce((sum, item) => sum + item.total, 0);
      const newOrder = {
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        date: selectedDate,
        total_amount,
        amount_paid: 0,
        status: 'pending' as 'pending' | 'delivered',
      };
      await addOrder(newOrder, orderItems);
      setShowOrderForm(false);
      setSelectedCustomer(null);
      setOrderItems([]);
    } catch (error) {
      console.error("Failed to create order", error);
      alert("Failed to create order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleOrderStatus = async (orderId: string, currentStatus: 'pending' | 'delivered') => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (currentStatus === 'pending') {
      setConfirmationDialog({
        show: true,
        orderId: order.id,
        customerName: order.customer_name,
        totalAmount: order.total_amount
      });
    } else {
      try {
        await updateOrder(orderId, { status: 'pending' });
      } catch (error) {
        console.error("Failed to update order status", error);
        alert("Failed to update order status.");
      }
    }
  };

  const handleConfirmDelivery = async () => {
    setIsSubmitting(true);
    try {
      await updateOrder(confirmationDialog.orderId, { status: 'delivered' });
      handleCancelConfirmation();
    } catch (error) {
      console.error("Failed to confirm delivery", error);
      alert("Failed to confirm delivery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirmation = () => {
    setConfirmationDialog({ show: false, orderId: '', customerName: '', totalAmount: 0 });
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteOrder(orderId);
      } catch (error) {
        console.error("Failed to delete order", error);
        alert("Failed to delete order.");
      }
    }
  };

  return (
    <Layout title="Daily Orders">
      <div className="px-4">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Daily Orders</h2>
            <motion.button
              onClick={() => setShowOrderForm(true)}
              className="bg-dairy-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg"
              whileTap={{ scale: 0.95 }}
              disabled={customers.length === 0 || products.length === 0}
            >
              <Plus size={20} />
              <span>Add Order</span>
            </motion.button>
          </div>

          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="text-dairy-600" size={20} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-500 focus:border-transparent"
            />
          </div>
        </div>

        <AnimatePresence>
          {confirmationDialog.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              >
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Delivery</h3>
                  <p className="text-gray-600 mb-4">Mark order for <strong>{confirmationDialog.customerName}</strong> as delivered?</p>
                  <div className="bg-gray-50 rounded-lg p-3 mb-6">
                    <p className="text-sm text-gray-600">Order Amount</p>
                    <p className="text-xl font-bold text-green-600">₹{confirmationDialog.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex space-x-3">
                    <motion.button onClick={handleCancelConfirmation} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg font-medium" whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                    <motion.button onClick={handleConfirmDelivery} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium flex justify-center items-center" whileTap={{ scale: 0.98 }}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm'}</motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {dataLoading ? (
          <div className="text-center p-8"><Loader2 className="mx-auto animate-spin text-dairy-600" size={32} /></div>
        ) : customers.length === 0 || products.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <ShoppingCart className="mx-auto mb-4 text-gray-300" size={48} />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Setup Required</h3>
            <p className="text-gray-600">{customers.length === 0 ? 'Please add customers' : 'Please add products'} before creating orders.</p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {showOrderForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Order</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
                      <select value={selectedCustomer?.id || ''} onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dairy-500 focus:border-transparent">
                        <option value="">Choose customer...</option>
                        {customers.map(customer => (<option key={customer.id} value={customer.id}>{customer.name}</option>))}
                      </select>
                    </div>

                    {selectedCustomer && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">Order Items</label>
                          <motion.button onClick={handleAddOrderItem} className="text-dairy-600 text-sm font-medium" whileTap={{ scale: 0.95 }}>+ Add Item</motion.button>
                        </div>
                        <div className="space-y-3">
                          {orderItems.map((item, index) => (
                              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-12 gap-3 items-center">
                                    <div className="col-span-5">
                                        <select value={item.product_id} onChange={(e) => handleUpdateOrderItem(index, 'product_id', e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg">
                                            {products.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                        </select>
                                    </div>
                                    
                                    <div className="col-span-3">
                                        <input type="number" value={item.quantity} onChange={(e) => handleUpdateOrderItem(index, 'quantity', e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg" placeholder="Pieces" />
                                    </div>
                            
                                    <div className="col-span-3 text-right">
                                        <span className="text-sm font-semibold text-gray-800">₹{item.total.toFixed(2)}</span>
                                    </div>
                            
                                    <div className="col-span-1 text-right">
                                        <motion.button onClick={() => handleRemoveOrderItem(index)} className="p-1 text-red-500 hover:text-red-700" whileTap={{ scale: 0.95 }}><Trash2 size={16} /></motion.button>
                                    </div>
                                </div>
                            </div>
                          ))}
                        </div>
                        {orderItems.length > 0 && (<div className="text-right pt-2 mt-2 border-t"><span className="text-lg font-bold text-gray-800">Total: ₹{orderItems.reduce((sum, item) => sum + item.total, 0).toFixed(2)}</span></div>)}
                      </div>
                    )}
                    <div className="flex space-x-3 mt-4">
                      <motion.button onClick={handleSubmitOrder} disabled={!selectedCustomer || orderItems.length === 0 || isSubmitting} className="flex-1 bg-dairy-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 flex justify-center items-center" whileTap={{ scale: 0.98 }}>{isSubmitting ? <Loader2 className="animate-spin"/> : 'Create Order'}</motion.button>
                      <motion.button onClick={() => { setShowOrderForm(false); setSelectedCustomer(null); setOrderItems([]); }} className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-medium" whileTap={{ scale: 0.98 }}>Cancel</motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {dailyOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
                  <ShoppingCart className="mx-auto mb-4 text-gray-300" size={48} />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Orders for This Date</h3>
                  <p className="text-gray-600">Start adding orders for this date</p>
                </motion.div>
              ) : (
                dailyOrders.map((order, index) => (
                  <motion.div key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${order.status === 'delivered' ? 'bg-green-50 border-green-200' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{order.customer_name}</h3>
                        <p className="text-sm text-gray-600">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>{order.status === 'delivered' ? 'Delivered' : 'Pending'}</span>
                        <motion.button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-600 bg-red-100 rounded-lg" whileTap={{ scale: 0.95 }}><Trash2 size={16} /></motion.button>
                      </div>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items.map((item, itemIndex) => (<div key={itemIndex} className="flex justify-between text-sm">
                        <span>
                          {item.product_name}
                          <span className="text-gray-500 text-xs ml-2">x {item.quantity}</span>
                        </span>
                        <span>₹{item.total.toFixed(2)}</span>
                      </div>))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-lg font-bold text-gray-800">Total: ₹{order.total_amount.toFixed(2)}</span>
                      <motion.button onClick={() => handleToggleOrderStatus(order.id, order.status)} className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${order.status === 'delivered' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`} whileTap={{ scale: 0.95 }}>
                        {order.status === 'delivered' ? (<><Clock size={16} /><span>Mark Pending</span></>) : (<><Check size={16} /><span>Mark Delivered</span></>)}
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Orders;
