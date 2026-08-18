import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { X, Upload, Plus, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface FabricRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FabricRequirementModal: React.FC<FabricRequirementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { language } = useLanguage();
  const [fabrics, setFabrics] = useState<Array<{ id: string; value: string; extra: any }>>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fabricName, setFabricName] = useState('');
  const [fabricQuantity, setFabricQuantity] = useState('');
  const [unit, setUnit] = useState('Meter');
  const [colorOrPrint, setColorOrPrint] = useState<'Color' | 'Print'>('Color');
  const [purpose, setPurpose] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // New fabric inline add modal
  const [showAddFabric, setShowAddFabric] = useState(false);
  const [newFabricEn, setNewFabricEn] = useState('');
  const [newFabricHi, setNewFabricHi] = useState('');
  const [addingFabric, setAddingFabric] = useState(false);

  const fetchMasterLists = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/master-lists', {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      if (data.detailed_lists?.fabrics) {
        setFabrics(data.detailed_lists.fabrics);
      } else if (data.master_lists?.fabrics) {
        setFabrics(data.master_lists.fabrics.map((f: string) => ({ id: f, value: f, extra: {} })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMasterLists();
      setError(null);
      setFabricName('');
      setFabricQuantity('');
      setUnit('Meter');
      setColorOrPrint('Color');
      setPurpose('');
      setImageUrl(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNewFabric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFabricEn.trim()) return;

    setAddingFabric(true);
    try {
      const res = await fetch('/api/master-lists/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          list_key: 'fabrics',
          item_value: newFabricEn.trim(),
          extra: { hindi: newFabricHi.trim() || newFabricEn.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add fabric');

      await fetchMasterLists();
      setFabricName(newFabricEn.trim());
      setNewFabricEn('');
      setNewFabricHi('');
      setShowAddFabric(false);
    } catch (err: any) {
      alert(err.message || 'Error adding fabric');
    } finally {
      setAddingFabric(false);
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
            },
            body: JSON.stringify({
              base64Data,
              fileName: file.name,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          setImageUrl(data.url);
        } catch (err: any) {
          setError('Failed to upload image: ' + err.message);
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingImage(false);
      setError('File read error: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fabricName) {
      setError('Please select or add a Fabric Name');
      return;
    }
    if (!fabricQuantity || Number(fabricQuantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (!purpose.trim()) {
      setError('Please enter the Purpose');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = {
        fabric_name: fabricName,
        fabric_quantity: Number(fabricQuantity),
        unit,
        color_or_print: colorOrPrint,
        purpose: purpose.trim(),
        image_url: imageUrl || undefined,
      };

      const res = await fetch('/api/fms/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('katl_token')}`,
        },
        body: JSON.stringify({
          fms_code: 'PUR',
          form_data: formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit requirements');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1A1F36]/60 backdrop-blur-sm animate-slide-up p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E8ECF0] flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 text-white">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider text-pink-brand">
              Step 1 • Santosh Rajput
            </span>
            <h2 className="text-base font-extrabold text-white">
              Fabric Requirements (कपड़े की मांग)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FFF5F8] border border-[#F9BFDF] text-[#9F0E5A] text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-pink-brand shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="fabric-form" onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Fabric Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-extrabold text-navy-900">
                  Fabric Name (कपड़े का नाम) <span className="text-pink-brand">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddFabric(true)}
                  className="text-xs font-bold text-pink-brand hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add New
                </button>
              </div>

              {loading ? (
                <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
              ) : (
                <select
                  required
                  value={fabricName}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setShowAddFabric(true);
                    } else {
                      setFabricName(e.target.value);
                    }
                  }}
                  className="w-full min-h-[48px] px-3.5 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                >
                  <option value="">-- Select Fabric from list --</option>
                  {fabrics.map((f) => {
                    const hiText = f.extra?.hindi ? ` (${f.extra.hindi})` : '';
                    return (
                      <option key={f.id || f.value} value={f.value}>
                        {f.value}{hiText}
                      </option>
                    );
                  })}
                  <option value="__ADD_NEW__">+ Add New Fabric / नया कपड़ा जोड़ें...</option>
                </select>
              )}
            </div>

            {/* 2. Fabric Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-navy-900">
                  Quantity (मात्रा) <span className="text-pink-brand">*</span>
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={fabricQuantity}
                  onChange={(e) => setFabricQuantity(e.target.value)}
                  className="w-full min-h-[48px] px-4 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-navy-900">
                  Unit (इकाई) <span className="text-pink-brand">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                >
                  <option value="Meter">Meter (मीटर)</option>
                  <option value="Kg">Kg (किग्रा)</option>
                  <option value="Yards">Yards (यार्ड)</option>
                </select>
              </div>
            </div>

            {/* 3. Color or Print? */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-navy-900">
                Color or Print ? (रंग या प्रिंट?) <span className="text-pink-brand">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setColorOrPrint('Color')}
                  className={`min-h-[48px] rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                    colorOrPrint === 'Color'
                      ? 'bg-pink-brand text-white border-pink-brand shadow-sm'
                      : 'bg-[#F9FAFB] border-[#E8ECF0] text-navy-900 hover:bg-slate-100'
                  }`}
                >
                  {colorOrPrint === 'Color' && <Check className="w-4 h-4" />}
                  Plain / Solid Color
                </button>
                <button
                  type="button"
                  onClick={() => setColorOrPrint('Print')}
                  className={`min-h-[48px] rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                    colorOrPrint === 'Print'
                      ? 'bg-pink-brand text-white border-pink-brand shadow-sm'
                      : 'bg-[#F9FAFB] border-[#E8ECF0] text-navy-900 hover:bg-slate-100'
                  }`}
                >
                  {colorOrPrint === 'Print' && <Check className="w-4 h-4" />}
                  Print (प्रिंट)
                </button>
              </div>
            </div>

            {/* 4. Purpose */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-navy-900">
                Purpose (उद्देश्य / प्रयोजन) <span className="text-pink-brand">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. New Kurti collection production, sample batch, or urgent re-order..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-3.5 bg-[#F9FAFB] border border-[#E8ECF0] rounded-xl text-sm font-medium text-navy-900 focus:bg-white focus:border-pink-brand outline-none resize-none"
              />
            </div>

            {/* 5. Image (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-navy-900">
                Fabric Image / Sample Photo (फोटो / चित्र यदि हो)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 min-h-[48px] border-2 border-dashed border-[#CBD5E1] hover:border-pink-brand rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-[#F8FAFC] transition text-xs font-bold text-slate-600">
                  <Upload className="w-4 h-4 text-pink-brand" />
                  <span>{uploadingImage ? 'Uploading image...' : imageUrl ? 'Change photo' : 'Upload photo / Camera'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </label>

                {imageUrl && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <img src={imageUrl} alt="Fabric preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E8ECF0] flex items-center gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] rounded-xl bg-[#F4F6F9] text-sm font-bold text-[#6B7280] hover:bg-[#EBEDF2] transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="fabric-form"
            disabled={submitting || uploadingImage}
            className="flex-1 min-h-[48px] rounded-xl bg-pink-brand hover:bg-[#C4177A] text-white font-extrabold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md"
          >
            {submitting ? 'Submitting PO...' : 'Submit Requirement →'}
          </button>
        </div>
      </div>

      {/* Inline Modal: Add New Fabric */}
      {showAddFabric && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-extrabold text-sm text-navy-900">Add New Fabric Name</h3>
              <button
                type="button"
                onClick={() => setShowAddFabric(false)}
                className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleAddNewFabric} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Fabric Name (English) *</label>
                <input
                  required
                  autoFocus
                  placeholder="e.g. Silk Satin Blend"
                  value={newFabricEn}
                  onChange={(e) => setNewFabricEn(e.target.value)}
                  className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Fabric Name (Hindi - Optional)</label>
                <input
                  placeholder="e.g. सिल्क सैटिन"
                  value={newFabricHi}
                  onChange={(e) => setNewFabricHi(e.target.value)}
                  className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-navy-900 focus:bg-white focus:border-pink-brand outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFabric(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingFabric || !newFabricEn.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-navy-900 text-white text-xs font-extrabold"
                >
                  {addingFabric ? 'Saving...' : 'Save Fabric'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
