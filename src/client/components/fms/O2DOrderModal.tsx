import React, { useState, useEffect } from 'react';
import { X, Plus, Check, ShoppingBag, Truck, UserCheck, Clock, Tag } from 'lucide-react';

interface O2DOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (displayNumber: string) => void;
}

const PRODUCT_OPTIONS = [
  { id: 'top/t shirt', label: 'Top / T-Shirt' },
  { id: 'Half Bottom', label: 'Half Bottom' },
  { id: 'Full Bottom', label: 'Full Bottom' },
  { id: 'Capries', label: 'Capries' },
  { id: 'Skirts', label: 'Skirts' },
  { id: 'LongTop/Alines', label: 'Long Top / Alines' },
  { id: 'Sets', label: 'Sets' },
  { id: 'Boys', label: 'Boys' },
];

const ORDER_RECEIVE_OPTIONS = ['By Phone', 'By Social Media', 'by Self selection on Shop'];
const RATE_TYPES = ['Net Rate', 'Gross Rate', 'Mix'];

export const O2DOrderModal: React.FC<O2DOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const [customers, setCustomers] = useState<string[]>([]);
  const [transports, setTransports] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [orderReceive, setOrderReceive] = useState('By Phone');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['top/t shirt']);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [transport, setTransport] = useState('');
  const [agentName, setAgentName] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState('7');
  const [orderRate, setOrderRate] = useState('Net Rate');
  const [discountPercent, setDiscountPercent] = useState('');

  // Inline "Add New" states
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerInput, setNewCustomerInput] = useState('');
  const [isAddingTransport, setIsAddingTransport] = useState(false);
  const [newTransportInput, setNewTransportInput] = useState('');
  const [isAddingAgent, setIsAddingAgent] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  const fetchMasterData = async () => {
    try {
      const [custRes, transRes, agRes] = await Promise.all([
        fetch('/api/admin/master-lists?key=customers', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }),
        fetch('/api/admin/master-lists?key=transports', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }),
        fetch('/api/admin/master-lists?key=agents', {
          headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
        }),
      ]);

      if (custRes.ok) {
        const d = await custRes.json();
        setCustomers(d.items || []);
        if (d.items?.length > 0 && !customerName) setCustomerName(d.items[0]);
      }
      if (transRes.ok) {
        const d = await transRes.json();
        setTransports(d.items || []);
        if (d.items?.length > 0 && !transport) setTransport(d.items[0]);
      }
      if (agRes.ok) {
        const d = await agRes.json();
        setAgents(d.items || []);
      }
    } catch (e) {
      console.error('Failed to load master lists', e);
    }
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomerInput.trim()) return;
    try {
      const res = await fetch('/api/master-lists/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          list_key: 'customers',
          item_value: newCustomerInput.trim(),
        }),
      });
      if (res.ok) {
        setCustomers((prev) => [...prev, newCustomerInput.trim()]);
        setCustomerName(newCustomerInput.trim());
        setNewCustomerInput('');
        setIsAddingCustomer(false);
      }
    } catch (e) {
      console.error('Error adding customer', e);
    }
  };

  const handleAddNewTransport = async () => {
    if (!newTransportInput.trim()) return;
    try {
      const res = await fetch('/api/master-lists/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          list_key: 'transports',
          item_value: newTransportInput.trim().toUpperCase(),
        }),
      });
      if (res.ok) {
        setTransports((prev) => [...prev, newTransportInput.trim().toUpperCase()]);
        setTransport(newTransportInput.trim().toUpperCase());
        setNewTransportInput('');
        setIsAddingTransport(false);
      }
    } catch (e) {
      console.error('Error adding transport', e);
    }
  };

  const handleAddNewAgent = async () => {
    if (!newAgentName.trim()) return;
    try {
      const res = await fetch('/api/master-lists/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          list_key: 'agents',
          item_value: newAgentName.trim(),
          extra_json: JSON.stringify({ phone: newAgentPhone.trim() }),
        }),
      });
      if (res.ok) {
        setAgents((prev) => [...prev, newAgentName.trim()]);
        setAgentName(newAgentName.trim());
        setNewAgentName('');
        setNewAgentPhone('');
        setIsAddingAgent(false);
      }
    } catch (e) {
      console.error('Error adding agent', e);
    }
  };

  const toggleProduct = (prodId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(prodId) ? prev.filter((p) => p !== prodId) : [...prev, prodId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName) {
      setError('Please select or add a Customer Name');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a valid Quantity (Pcs)');
      return;
    }
    if (selectedProducts.length === 0) {
      setError('Please select at least one product category');
      return;
    }
    if (!transport) {
      setError('Please select or add a Transport');
      return;
    }

    setSubmitting(true);
    try {
      const formData = {
        customer_name: customerName,
        quantity: Number(quantity),
        order_receive: orderReceive,
        products_ordered: selectedProducts,
        special_requirements: specialRequirements.trim(),
        transport,
        agent_name: agentName || 'Direct',
        lead_time_days: Number(leadTimeDays) || 7,
        order_rate: orderRate,
        discount_percent: discountPercent ? Number(discountPercent) : 0,
        dispatches: [],
        total_dispatched: 0,
        dispatch_percent: 0,
      };

      const res = await fetch('/api/fms/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          fms_code: 'O2D',
          form_data: formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      onOrderCreated(data.display_number);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-brand flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-navy-900">Create New Order (O2D)</h2>
              <p className="text-xs text-slate-400 font-medium">Order-to-Delivery Process • Step 1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Customer Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-navy-900">Customer Name *</label>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(!isAddingCustomer)}
                className="text-[11px] font-extrabold text-pink-brand flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />
                {isAddingCustomer ? 'Cancel' : 'Add New Customer'}
              </button>
            </div>

            {isAddingCustomer ? (
              <div className="flex gap-2 mb-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Enter customer name..."
                  value={newCustomerInput}
                  onChange={(e) => setNewCustomerInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-pink-brand/40 rounded-xl outline-none focus:border-pink-brand"
                />
                <button
                  type="button"
                  onClick={handleAddNewCustomer}
                  className="px-3 py-2 bg-pink-brand text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                required
              >
                <option value="" disabled>
                  Select Customer...
                </option>
                {customers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Order Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-navy-900 block mb-1.5">Order Quantity (Pcs) *</label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-navy-900 block mb-1.5">Lead Time (Days) *</label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 7"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
              />
            </div>
          </div>

          {/* 3. Order Receive Medium */}
          <div>
            <label className="text-xs font-bold text-navy-900 block mb-1.5">Order Receive Medium *</label>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_RECEIVE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setOrderReceive(opt)}
                  className={`py-2 px-2 text-center rounded-xl text-[11px] font-bold border transition-all ${
                    orderReceive === opt
                      ? 'bg-pink-brand text-white border-pink-brand shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Products Ordered (Multi-Select Tags) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-navy-900">Products Ordered (Select All Applicable) *</label>
              <span className="text-[10px] text-pink-brand font-bold">{selectedProducts.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_OPTIONS.map((prod) => {
                const isSelected = selectedProducts.includes(prod.id);
                return (
                  <button
                    type="button"
                    key={prod.id}
                    onClick={() => toggleProduct(prod.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-navy-900 text-white border-navy-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-pink-brand" />}
                    <span>{prod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Special Requirement */}
          <div>
            <label className="text-xs font-bold text-navy-900 block mb-1.5">Special Requirement / Note</label>
            <input
              type="text"
              placeholder="e.g. Extra packing, Specific labels, Urgent delivery..."
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy-900 outline-none focus:border-pink-brand"
            />
          </div>

          {/* 6. Transport */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-navy-900">Transport *</label>
              <button
                type="button"
                onClick={() => setIsAddingTransport(!isAddingTransport)}
                className="text-[11px] font-extrabold text-pink-brand flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />
                {isAddingTransport ? 'Cancel' : 'Add New Transport'}
              </button>
            </div>

            {isAddingTransport ? (
              <div className="flex gap-2 mb-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Transport Name (e.g. VRL LOGISTICS)..."
                  value={newTransportInput}
                  onChange={(e) => setNewTransportInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-pink-brand/40 rounded-xl outline-none focus:border-pink-brand uppercase"
                />
                <button
                  type="button"
                  onClick={handleAddNewTransport}
                  className="px-3 py-2 bg-pink-brand text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
                required
              >
                <option value="" disabled>
                  Select Transport...
                </option>
                {transports.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 7. Agent Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-navy-900">Agent Name</label>
              <button
                type="button"
                onClick={() => setIsAddingAgent(!isAddingAgent)}
                className="text-[11px] font-extrabold text-pink-brand flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />
                {isAddingAgent ? 'Cancel' : 'Add New Agent'}
              </button>
            </div>

            {isAddingAgent ? (
              <div className="flex gap-2 mb-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="Agent Name..."
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-pink-brand/40 rounded-xl outline-none focus:border-pink-brand"
                />
                <button
                  type="button"
                  onClick={handleAddNewAgent}
                  className="px-3 py-2 bg-pink-brand text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
              >
                <option value="">Direct Buyer (No Agent)</option>
                {agents.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 8. Order Rate & Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-navy-900 block mb-1.5">Order Rate Type *</label>
              <select
                value={orderRate}
                onChange={(e) => setOrderRate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
              >
                {RATE_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-navy-900 block mb-1.5">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 5"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 outline-none focus:border-pink-brand"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Creating Order...' : 'Submit & Book Order (O2D)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
