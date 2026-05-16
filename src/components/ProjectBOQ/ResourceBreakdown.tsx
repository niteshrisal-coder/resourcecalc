import React, { ChangeEvent } from 'react';
import { Project, ResourceBreakdownItem, MatrixData, TabulationRow } from '../../types/boq';

interface ResourceBreakdownProps {
  project: Project;
  sharedMode: 'estimate' | 'measurement';
  breakdownSubView: 'summary' | 'detailed' | 'tabulation';
  setBreakdownSubView: (view: 'summary' | 'detailed' | 'tabulation') => void;
  resourceBreakdownEstimate: ResourceBreakdownItem[];
  resourceBreakdownMeasurement: ResourceBreakdownItem[];
  resourceMatrixData: MatrixData;
  resourceMatrixMeasurementData: MatrixData;
  tabulationData: TabulationRow[];
  updateTabulationBillRate: (resourceName: string, newRate: number) => void;
  updateTabulationBillQty: (resourceName: string, newQty: number) => void;
  updateTabulationRemarks: (resourceName: string, remarks: string) => void;
}

export default function ResourceBreakdown({
  project,
  sharedMode,
  breakdownSubView,
  setBreakdownSubView,
  resourceBreakdownEstimate,
  resourceBreakdownMeasurement,
  resourceMatrixData,
  resourceMatrixMeasurementData,
  tabulationData,
  updateTabulationBillRate,
  updateTabulationBillQty,
  updateTabulationRemarks
}: ResourceBreakdownProps) {
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Resource Breakdown</h3>
      </div>
      {project.items.length > 0 ? (
        <div className="p-4 space-y-4">
          <div className="flex bg-white rounded-xl p-1 border border-[#E2E8F0]">
            <button
              onClick={() => setBreakdownSubView('summary')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                breakdownSubView === 'summary'
                  ? 'bg-[#1E293B] text-white shadow-sm'
                  : 'text-[#333333]/60 hover:text-[#1E293B]'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setBreakdownSubView('detailed')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                breakdownSubView === 'detailed'
                  ? 'bg-[#1E293B] text-white shadow-sm'
                  : 'text-[#333333]/60 hover:text-[#1E293B]'
              }`}
            >
              Detailed
            </button>
            <button
              onClick={() => setBreakdownSubView('tabulation')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                breakdownSubView === 'tabulation'
                  ? 'bg-[#1E293B] text-white shadow-sm'
                  : 'text-[#333333]/60 hover:text-[#1E293B]'
              }`}
            >
              Tabulation
            </button>
          </div>

          {/* Summary: aggregated resource list - without Customized column */}
          {breakdownSubView === 'summary' && (() => {
            const data = (sharedMode === 'estimate' ? resourceBreakdownEstimate : resourceBreakdownMeasurement)
              .map((item: ResourceBreakdownItem) => ({
                ...item,
                totalAmount: item.quantity * (project.mode === 'USERS' && item.apply_vat ? item.rate * 1.13 : item.rate)
              }))
    .sort((a: ResourceBreakdownItem, b: ResourceBreakdownItem) => {
                const order = { Labour: 1, Material: 2, Equipment: 3 };
              return (order[a.type as keyof typeof order] || 99) - (order[b.type as keyof typeof order] || 99) || a.name.localeCompare(b.name);
            });
            return data.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-left border-collapse min-w-[700px] bg-white rounded-2xl overflow-hidden border border-black/5">
                  <thead>
                    <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Type</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Resource</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Unit</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-24">Qty</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-28">Rate</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {data.map((res: ResourceBreakdownItem, idx: number) => (
                      <tr key={idx} className="hover:bg-black/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${res.type === 'Labour' ? 'bg-blue-100 text-blue-700' : res.type === 'Material' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                            {res.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold">{res.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-black/60">{res.unit}</td>
                        <td className="px-4 py-3 text-right"><span className="text-sm font-bold">{res.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span></td>
                        <td className="px-4 py-3 text-right text-sm font-mono">{res.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">{res.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                       </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F5F5F0] border-t border-black/10">
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold uppercase tracking-widest text-right">Total</td>
                      <td className="px-4 py-3 text-lg font-bold text-emerald-600 text-right">
                        {data.reduce((acc: number, r: ResourceBreakdownItem) => acc + r.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td></td>
                     </tr>
                  </tfoot>
                 </table>
              </div>
            ) : (
              <div className="p-8 text-center text-black/20"><p className="text-sm">No resources to display.</p></div>
            );
          })()}

          {/* Detailed: resource × work-item matrix */}
          {breakdownSubView === 'detailed' && (() => {
            const matrix = sharedMode === 'estimate' ? resourceMatrixData : resourceMatrixMeasurementData;
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px] bg-white rounded-2xl overflow-hidden border border-black/5">
                  <thead>
                    <tr className="bg-[#1E293B] text-white">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">S.N.</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Work Item</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Unit</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Qty</th>
                      {matrix.columns.map((col: string) => (
                        <th key={col} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest min-w-[120px]">{col}</th>
                      ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {matrix.rows.map((row) => (
                      <tr key={row.sNo} className="hover:bg-black/5">
                        <td className="px-4 py-3 text-sm">{row.sNo}</td>
                        <td className="px-4 py-3 text-sm font-medium">{row.workItem}</td>
                        <td className="px-4 py-3 text-sm">{row.unit}</td>
                        <td className="px-4 py-3 text-sm font-bold">{row.quantity}</td>
                        {matrix.columns.map((col: string) => (
                          <td key={col} className="px-4 py-3 text-sm">{row.resources[col] !== undefined ? row.resources[col].toFixed(3) : '-'}</td>
                        ))}
                       </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                      <td colSpan={4} className="px-4 py-3 text-sm uppercase tracking-widest">Total</td>
                      {matrix.columns.map((col: string) => (
                        <td key={col} className="px-4 py-3 text-sm">{matrix.totals[col]?.toFixed(3) || '-'}</td>
                      ))}
                     </tr>
                  </tfoot>
                 </table>
              </div>
            );
          })()}

          {breakdownSubView === 'tabulation' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1400px] bg-white rounded-2xl overflow-hidden border border-black/5">
                <thead>
                  <tr className="bg-[#1E293B] text-white">
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>SN</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Materials & Labours</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Unit</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>As Per Measurement</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>As Per Bill</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center" colSpan={4}>Actual Cost</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest" rowSpan={2}>Remarks</th>
                   </tr>
                  <tr className="bg-[#1E293B] text-white">
                    <th className="px-3 py-1 text-[9px]">Quantity</th>
                    <th className="px-3 py-1 text-[9px]">Rate W/O VAT</th>
                    <th className="px-3 py-1 text-[9px]">Amount</th>
                    <th className="px-3 py-1 text-[9px]">VAT Amount</th>
                    <th className="px-3 py-1 text-[9px]">Quantity</th>
                    <th className="px-3 py-1 text-[9px]">Rate W/O VAT</th>
                    <th className="px-3 py-1 text-[9px]">Amount</th>
                    <th className="px-3 py-1 text-[9px]">VAT Amount</th>
                    <th className="px-3 py-1 text-[9px]">Quantity</th>
                    <th className="px-3 py-1 text-[9px]">Rate W/O VAT</th>
                    <th className="px-3 py-1 text-[9px]">Amount</th>
                    <th className="px-3 py-1 text-[9px]">VAT Amount</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {tabulationData.map((item: TabulationRow) => {
                    const [editingBillRate, setEditingBillRate] = React.useState<string | null>(null);
                    const [editBillRateForm, setEditBillRateForm] = React.useState({ qty: 0, rate: 0 });

                    return (
                      <tr key={item.sn} className="hover:bg-black/5">
                        <td className="px-3 py-2 text-sm">{item.sn}</td>
                        <td className="px-3 py-2 text-sm font-medium">{item.resourceName}</td>
                        <td className="px-3 py-2 text-sm">{item.unit}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.measurementQty.toFixed(3)}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.measurementRate.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.measurementAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.measurementVat.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">
                          <input
                            type="number"
                            value={item.billQty}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updateTabulationBillQty(item.resourceName, parseFloat(e.target.value) || 0)}
                            className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                            step="0.001"
                            min="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          {editingBillRate === item.resourceName ? (
                            <input
                              type="number"
                              value={editBillRateForm.rate}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setEditBillRateForm({ ...editBillRateForm, rate: parseFloat(e.target.value) || 0 })}
                              className="w-24 p-1 border border-black/10 rounded-lg text-sm text-right"
                              step="1"
                              min="0"
                              onBlur={() => {
                                updateTabulationBillRate(item.resourceName, editBillRateForm.rate);
                                setEditingBillRate(null);
                              }}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                  updateTabulationBillRate(item.resourceName, editBillRateForm.rate);
                                  setEditingBillRate(null);
                                }
                                if (e.key === 'Escape') setEditingBillRate(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setEditingBillRate(item.resourceName);
                                setEditBillRateForm({ qty: item.billQty, rate: item.billRate });
                              }}
                              className="hover:bg-black/5 px-2 py-1 rounded-lg transition-colors"
                            >
                              {item.billRate.toFixed(2)}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">{item.billAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.billVat.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.actualQty.toFixed(3)}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.actualRate.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right font-bold">{item.actualAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.actualVat.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm">
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updateTabulationRemarks(item.resourceName, e.target.value)}
                            className="w-32 p-1 border border-black/10 rounded-lg text-sm"
                            placeholder="Remark"
                          />
                        </td>
                       </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    const measurementAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementAmount, 0);
                    const measurementVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.measurementVat, 0);
                    const billAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billAmount, 0);
                    const billVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.billVat, 0);
                    const actualAmount = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualAmount, 0);
                    const actualVat = tabulationData.reduce((sum: number, i: TabulationRow) => sum + i.actualVat, 0);

                    return (
                      <tr className="bg-[#1E293B] text-white font-bold">
                        <td colSpan={3} className="px-3 py-2 text-sm uppercase tracking-widest text-right">Grand Total</td>
                        <td colSpan={2}></td>
                        <td className="px-3 py-2 text-sm text-right">{measurementAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{measurementVat.toFixed(2)}</td>
                        <td colSpan={2}></td>
                        <td className="px-3 py-2 text-sm text-right">{billAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{billVat.toFixed(2)}</td>
                        <td colSpan={2}></td>
                        <td className="px-3 py-2 text-sm text-right">{actualAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{actualVat.toFixed(2)}</td>
                        <td className="px-3 py-2 text-sm text-right">{(measurementAmount + measurementVat).toFixed(2)}</td>
                       </tr>
                    );
                  })()}
                </tfoot>
               </table>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-black/20">
          <p className="text-sm">No resources to display. Add items to BOQ first.</p>
        </div>
      )}
    </div>
  );
}