import React, { useState, useEffect } from 'react';
import { X, Plus, Check, ShoppingBag, UserCheck, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface O2COrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (displayNumber: string) => void;
}

const ORDER_RECEIVE_OPTIONS = ['In Person', 'Phone', 'WhatsApp'];

export const O2COrderModal: React.FC<O2COrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [orderReceivedThrough, setOrderReceivedThrough] = useState('Phone');
  const [enteredByName, setEnteredByName] = useState('');

  // Inline "Add New Customer"
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerInput, setNewCustomerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      if (user?.name) {
        setEnteredByName(user.name);
      }
    }
  }, [isOpen, user]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/master-lists?key=customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      if (res.ok) {
        const d = await res.json();
        setCustomers(d.items || []);
        if (d.items?.length > 0 && !customerName) setCustomerName(d.items[0]);
      }
    } catch (e) {
      console.error('Failed to load customers', e);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const party = isAddingCustomer ? newCustomerInput.trim() : customerName.trim();
    if (!party) {
      setError('Please select or enter customer name');
      return;
    }

    if (!enteredByName.trim()) {
      setError('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fms_code: 'O2C',
        form_data: {
          customer_name: party,
          order_received_through: orderReceivedThrough,
          entered_by_name: enteredByName.trim(),
        },
      };

      const res = await fetch('/api/fms/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create O2C order');
      }

      onOrderCreated(data.display_number);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-pink-brand/10 text-pink-brand text-[10px] font-black uppercase tracking-wider">
              Step 1 • Order Receipt
            </span>
            <h2 className="text-base font-extrabold text-navy-900 mt-1">Book New O2C Order</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy-900">
                Party / Customer Name <span className="text-red-500">*</span>
              </label>
              {!isAddingCustomer ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(true)}
                  className="text-[11px] font-bold text-pink-brand hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Add New
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className="text-[11px] font-bold text-slate-500 hover:underline"
                >
                  Choose Existing
                </button>
              )}
            </div>

            {isAddingCustomer ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter new customer name..."
                  value={newCustomerInput}
                  onChange={(e) => setNewCustomerInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy-900 outline-none focus:border-pink-brand"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewCustomer}
                  className="px-3 py-2 bg-pink-brand text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy-900 outline-none focus:border-pink-brand"
              >
                {customers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Order Received Through */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-navy-900">
              Order Received Through <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_RECEIVE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setOrderReceivedThrough(opt)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition ${
                    orderReceivedThrough === opt
                      ? 'bg-navy-900 text-white border-navy-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Entered By Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-navy-900">
              Your Name (Order Receiver) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Lalita Yadav / KR / Himanshu"
              value={enteredByName}
              onChange={(e) => setEnteredByName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy-900 outline-none focus:border-pink-brand"
              required
            />
            <p className="text-[10px] text-slate-400">
              Pre-filled with your login name, editable if booking on behalf of someone else.
            </p>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-xs shadow-md active:scale-98 transition disabled:opacity-50"
            >
              {submitting ? 'Creating O2C Flow...' : 'Start O2C Order (Advance to Step 2) →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
