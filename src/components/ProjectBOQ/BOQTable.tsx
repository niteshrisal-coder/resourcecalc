import React, { useState, ChangeEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Project, BOQItem } from '../../types/boq';
import { Norm } from '../../types';

interface BOQTableProps {
  project: Project;
  norms: Norm[];
  sharedMode: 'estimate' | 'measurement';
  isAdding: boolean;
  calculateItemRate: (normId: number) => number;
  calculateTotalBOQ: () => number;
  calculateMeasurementTotal: () => number;
  updateItemQuantity: (itemId: string, newQuantity: number) => void;
  updateMeasurementQuantity: (itemId: string, newQuantity: number) => void;
  removeItem: (itemId: string) => void;
}

export default function BOQTable({
  project,
  norms,
  sharedMode,
  isAdding,
  calculateItemRate,
  calculateTotalBOQ,
  calculateMeasurementTotal,
  updateItemQuantity,
  updateMeasurementQuantity,
  removeItem
}: BOQTableProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 0 });
  const [editingMeasurementId, setEditingMeasurementId] = useState<string | null>(null);
  const [editMeasurementForm, setEditMeasurementForm] = useState({ quantity: 0 });

  const totalAmount = sharedMode === 'estimate' ? calculateTotalBOQ() : calculateMeasurementTotal();

  if (sharedMode === 'estimate' && isAdding) {
    return null; // This is handled in the main component
  }

  if (sharedMode === 'estimate') {
    return (
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
        <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">
            BOQ Items — As per Estimate ({project.items.length})
          </h3>
        </div>
        {project.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">S.N.</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Work Item (Description)</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Unit</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-center w-24">Qty (Est.)</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-28">Rate (Rs.)</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-32">Amount (Rs.)</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Ref to SS</th>
                  <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {project.items.map((item: BOQItem, idx: number) => {
                  const norm = norms.find((n: Norm) => n.id === item.normId);
                  const rate = calculateItemRate(item.normId);
                  const total = rate * item.estimate_quantity;
                  const isEditing = editingItemId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-black/5 transition-colors group">
                      <td className="px-3 py-3 text-[11px] text-[#333333]/50">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="text-xs font-bold whitespace-normal break-words leading-5">
                          {`${norm?.ref_ss || ''} ${norm?.sNo || ''} - ${norm?.description || 'Unknown'}`.trim()}
                        </p>
                        <span className="text-[8px] font-bold uppercase tracking-tighter text-black/30">{norm?.type}</span>
                      </td>
                      <td className="px-3 py-3 text-xs">{norm?.unit || '-'}</td>
                      <td className="px-3 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.quantity}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm({ quantity: parseFloat(e.target.value) || 0 })}
                            className="w-20 p-1 border border-black/10 rounded-lg text-sm text-center"
                            step="0.01"
                            min="0"
                            onBlur={() => {
                              updateItemQuantity(item.id, editForm.quantity);
                              setEditingItemId(null);
                            }}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                updateItemQuantity(item.id, editForm.quantity);
                                setEditingItemId(null);
                              }
                              if (e.key === 'Escape') setEditingItemId(null);
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditForm({ quantity: item.estimate_quantity });
                            }}
                            className="text-sm font-bold hover:bg-black/5 px-2 py-1 rounded-lg transition-colors"
                          >
                            {item.estimate_quantity}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-mono"> {(isNaN(rate) || !isFinite(rate) ? '0.00' : rate.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                      <td className="px-3 py-3 text-right text-sm font-bold"> {(isNaN(total) || !isFinite(total) ? '0.00' : total.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                      <td className="px-3 py-3 text-xs text-black/50 font-mono">{norm?.ref_ss || '-'}</td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => removeItem(item.id)} className="text-red-400 p-1 rounded-full hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                  <td colSpan={5} className="px-3 py-3 text-xs uppercase tracking-widest text-right">Total</td>
                  <td className="px-3 py-3 text-sm font-bold text-right">
                     {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-black/20">
            <p className="text-sm">No items in BOQ. Click Add Item above to select a norm.</p>
          </div>
        )}
      </div>
    );
  }

  // Measurement mode
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">
          BOQ Items — As per Measurement ({project.items.length})
        </h3>
        <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Click qty to edit</span>
      </div>
      {project.items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">S.N.</th>
                <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Work Item (Description)</th>
                <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Unit</th>
                <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-center w-28">Qty (Meas.)</th>
                <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-28">Rate (Rs.)</th>
                <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40 text-right w-32">Amount (Rs.)</th>
                <th className="px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-black/40">Ref to SS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {project.items.map((item: BOQItem, idx: number) => {
                const norm = norms.find((n: Norm) => n.id === item.normId);
                const rate = calculateItemRate(item.normId);
                const measTotal = rate * item.measurement_quantity;
                const isEditingMeas = editingMeasurementId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-black/5 transition-colors">
                    <td className="px-3 py-3 text-[11px] text-[#333333]/50">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-bold whitespace-normal break-words leading-5">
                        {`${norm?.ref_ss || ''} ${norm?.sNo || ''} - ${norm?.description || 'Unknown'}`.trim()}
                      </p>
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-black/30">{norm?.type}</span>
                    </td>
                    <td className="px-3 py-3 text-xs">{norm?.unit || '-'}</td>
                    <td className="px-3 py-3 text-center">
                      {isEditingMeas ? (
                        <input
                          type="number"
                          value={editMeasurementForm.quantity}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setEditMeasurementForm({ quantity: parseFloat(e.target.value) || 0 })}
                          className="w-24 p-1 border border-amber-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-200"
                          step="0.01"
                          min="0"
                          onBlur={() => {
                            updateMeasurementQuantity(item.id, editMeasurementForm.quantity);
                            setEditingMeasurementId(null);
                          }}
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              updateMeasurementQuantity(item.id, editMeasurementForm.quantity);
                              setEditingMeasurementId(null);
                            }
                            if (e.key === 'Escape') setEditingMeasurementId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingMeasurementId(item.id);
                            setEditMeasurementForm({ quantity: item.measurement_quantity });
                          }}
                          className="text-sm font-bold hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors text-amber-700 border border-amber-200"
                        >
                          {item.measurement_quantity}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-mono"> {(isNaN(rate) || !isFinite(rate) ? '0.00' : rate.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold"> {(isNaN(measTotal) || !isFinite(measTotal) ? '0.00' : measTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }))}</td>
                    <td className="px-3 py-3 text-xs text-black/50 font-mono">{norm?.ref_ss || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                <td colSpan={5} className="px-3 py-3 text-xs uppercase tracking-widest text-right">Total (Measurement)</td>
                <td className="px-3 py-3 text-sm font-bold text-right">
                   {calculateMeasurementTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-black/20">
          <p className="text-sm">No items in BOQ. Add items first.</p>
        </div>
      )}
    </div>
  );
}