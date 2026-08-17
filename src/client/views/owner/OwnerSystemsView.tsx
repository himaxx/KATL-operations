import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Layers, Trash2, ChevronRight, Archive, CheckCircle2, History, AlertCircle } from 'lucide-react';

export const OwnerSystemsView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [flows, setFlows] = useState<any[]>([]);
  const [deletedFlows, setDeletedFlows] = useState<any[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [showDeletedRepo, setShowDeletedRepo] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFlows = async () => {
    setLoading(true);
    try {
      const [fRes, dRes] = await Promise.all([
        fetch('/api/fms/flows', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } }),
        user?.role === 'OWNER'
          ? fetch('/api/fms/deleted-repository', { headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` } })
          : Promise.resolve({ json: () => ({ deleted_flows: [] }) } as any),
      ]);

      const [fData, dData] = await Promise.all([fRes.json(), dRes.json()]);
      setFlows(fData.flows || []);
      setDeletedFlows(dData.deleted_flows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleInspectFlow = async (flowId: string) => {
    try {
      const res = await fetch(`/api/fms/flows/${flowId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      const data = await res.json();
      setSelectedFlow(data.flow);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!window.confirm('Are you sure you want to delete this flow record? It will be copied to the deleted repository.')) {
      return;
    }

    try {
      await fetch(`/api/fms/flows/${flowId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('katl_token')}` },
      });
      setSelectedFlow(null);
      fetchFlows();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto px-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-navy-900">{t.navSystems}</h2>
          <p className="text-xs font-medium text-slate-500">Live FMS flows & step histories</p>
        </div>

        {user?.role === 'OWNER' && (
          <button
            onClick={() => setShowDeletedRepo(!showDeletedRepo)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <Archive className="w-3.5 h-3.5 text-hotpink" />
            <span>{showDeletedRepo ? 'Active Flows' : 'Deleted Repo'}</span>
          </button>
        )}
      </div>

      {/* Show Deleted Repository (Owner Only) */}
      {showDeletedRepo ? (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
            <strong>Deleted Records Repository:</strong> Contains historical deleted flows for audit and compliance.
          </div>

          {deletedFlows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No deleted records found.</p>
          ) : (
            deletedFlows.map((d) => (
              <div key={d.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-navy-900">{d.display_number}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(d.deleted_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-slate-500">Deleted by: {d.deleted_by_name || 'Owner'}</p>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Active Flows List */
        <div className="space-y-2.5">
          {flows.map((flow) => (
            <div
              key={flow.id}
              onClick={() => handleInspectFlow(flow.id)}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 cursor-pointer transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded bg-navy-900 text-white">
                  {flow.display_number}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    flow.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {flow.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Started by: {flow.started_by_name || 'Staff'}</span>
                <span className="flex items-center gap-1 text-hotpink font-bold">
                  <span>Step {flow.current_step}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step History Drawer / Modal */}
      {selectedFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-navy-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-hotpink uppercase">Flow Details</span>
                <h3 className="text-base font-bold">{selectedFlow.display_number}</h3>
              </div>
              <button
                onClick={() => setSelectedFlow(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase text-slate-400">Step History On Demand</h4>
                <div className="space-y-2">
                  {selectedFlow.steps?.map((step: any) => (
                    <div key={step.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-navy-900">
                        <span>Step {step.step_no}</span>
                        <span className={step.status === 'DONE' ? 'text-emerald-600' : 'text-amber-600'}>
                          {step.status}
                        </span>
                      </div>
                      <p className="text-slate-600">Assignee: {step.assignee_name}</p>
                      {step.form_data && Object.keys(step.form_data).length > 0 && (
                        <div className="pt-1 text-[11px] text-slate-500 font-mono">
                          {JSON.stringify(step.form_data, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Owner Delete Escape Hatch */}
              {user?.role === 'OWNER' && (
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleDeleteFlow(selectedFlow.id)}
                    className="w-full min-h-[44px] rounded-xl bg-lightpink-500 hover:bg-lightpink-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Record (Move to Deleted Repository)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
