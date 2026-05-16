import React from 'react';
import { Project, RateAnalysisItem } from '../../types/boq';

interface RateAnalysisComponentProps {
  project: Project;
  rateAnalysisData: RateAnalysisItem[];
}

export default function RateAnalysisComponent({ project, rateAnalysisData }: RateAnalysisComponentProps) {
  return (
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[#1E293B]">Rate Analysis</h3>
      </div>
      {rateAnalysisData.length > 0 ? (
        <div className="p-4 space-y-6">
          {rateAnalysisData.map((item: RateAnalysisItem, itemIndex: number) => {
            // Group resources by type
            const labourResources = item.resources.filter(r => r.resourceType === 'Labour');
            const materialResources = item.resources.filter(r => r.resourceType === 'Material');
            const equipmentResources = item.resources.filter(r => r.resourceType === 'Equipment');

            const labourSubtotal = labourResources.reduce((sum, r) => sum + r.amount, 0);
            const materialSubtotal = materialResources.reduce((sum, r) => sum + r.amount, 0);
            const equipmentSubtotal = equipmentResources.reduce((sum, r) => sum + r.amount, 0);
            const totalSubtotal = labourSubtotal + materialSubtotal + equipmentSubtotal;

            return (
              <div key={itemIndex} className="bg-white rounded-xl border border-black/5 overflow-hidden">
                {/* Header */}
                <div className="bg-[#1E293B] text-white px-4 py-3">
                  <div className="text-sm font-bold">
                    {item.refSs || ''} {item.sNo || ''} - {item.normDescription}
                  </div>
                  <div className="text-xs opacity-80">
                    Basis Qty: {item.basisQuantity} {item.unit}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#F5F5F0]/50 border-b border-black/5">
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Resource</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Type</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40">Unit</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-24">Quantity</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-28">Rate (Rs.)</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-right w-32">Amount (Rs.)</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-black/40 text-center w-32">Sub Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {/* Labour Section */}
                      {labourResources.length > 0 && (
                        <>
                          {labourResources.map((resource, idx) => (
                            <tr key={`labour-${idx}`} className="bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium">
                                  {resource.resourceName}
                                  {resource.isCustomizedRate && <span className="text-blue-600 ml-1">*</span>}
                                  {resource.isCustomizedQuantity && <span className="text-blue-600 ml-1">**</span>}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                                  {resource.resourceType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-black/60">{resource.unit}</td>
                              <td className="px-4 py-3 text-right text-sm font-mono">{resource.quantity.toFixed(3)}</td>
                              <td className="px-4 py-3 text-right text-sm font-mono">{resource.rate.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-sm font-bold">{resource.amount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-center text-sm font-bold bg-blue-100 text-blue-700">
                                {idx === 0 ? labourSubtotal.toFixed(2) : ''}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}

                      {/* Material Section */}
                      {materialResources.length > 0 && (
                        <>
                          {materialResources.map((resource, idx) => (
                            <tr key={`material-${idx}`} className="bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium">
                                  {resource.resourceName}
                                  {resource.isCustomizedRate && <span className="text-emerald-600 ml-1">*</span>}
                                  {resource.isCustomizedQuantity && <span className="text-emerald-600 ml-1">**</span>}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                  {resource.resourceType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-black/60">{resource.unit}</td>
                              <td className="px-4 py-3 text-right text-sm font-mono">{resource.quantity.toFixed(3)}</td>
                              <td className="px-4 py-3 text-right text-sm font-mono">{resource.rate.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-sm font-bold">{resource.amount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-center text-sm font-bold bg-emerald-100 text-emerald-700">
                                {idx === 0 ? materialSubtotal.toFixed(2) : ''}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}

                      {/* Equipment Section */}
                      {equipmentResources.length > 0 && (
                        <>
                          {equipmentResources.map((resource, idx) => (
                            <tr key={`equipment-${idx}`} className="bg-orange-50/30 hover:bg-orange-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium">
                                  {resource.resourceName}
                                  {resource.isCustomizedRate && <span className="text-orange-600 ml-1">*</span>}
                                  {resource.isCustomizedQuantity && <span className="text-orange-600 ml-1">**</span>}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-orange-100 text-orange-700">
                                  {resource.resourceType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-black/60">{resource.unit}</td>
                              <td className="px-4 py-3 text-right text-sm font-mono">{resource.quantity.toFixed(3)}</td>
                              <td className="px-4 py-3 text-right text-sm font-mono">{resource.rate.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right text-sm font-bold">{resource.amount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-center text-sm font-bold bg-orange-100 text-orange-700">
                                {idx === 0 ? equipmentSubtotal.toFixed(2) : ''}
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#F5F5F0] border-t border-black/10 font-bold">
                        <td colSpan={5} className="px-4 py-3 text-sm uppercase tracking-widest text-right">Total</td>
                        <td className="px-4 py-3 text-lg font-bold text-emerald-600 text-right">
                          {totalSubtotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="bg-[#F8FAFC] border-t border-black/5">
                        <td colSpan={5} className="px-4 py-3 text-sm font-bold text-right">
                          Unit Rate (Total ÷ {item.basisQuantity} {item.unit}):
                        </td>
                        <td className="px-4 py-3 text-lg font-bold text-blue-600 text-right">
                          {(totalSubtotal / item.basisQuantity).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      {project.mode === 'CONTRACTOR' && (
                        <>
                          <tr className="bg-amber-50 border-t border-black/5">
                            <td colSpan={5} className="px-4 py-3 text-sm font-bold text-right">
                              +15% Contractor Overhead:
                            </td>
                            <td className="px-4 py-3 text-lg font-bold text-amber-600 text-right">
                              {(totalSubtotal / item.basisQuantity * 0.15).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                          <tr className="bg-[#1E293B] text-white border-t border-black/5">
                            <td colSpan={5} className="px-4 py-3 text-sm font-bold text-right">
                              FINAL UNIT RATE:
                            </td>
                            <td className="px-4 py-3 text-lg font-bold text-right">
                              {(totalSubtotal / item.basisQuantity * 1.15).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </>
                      )}
                    </tfoot>
                  </table>
                </div>

                {/* Legend */}
                {(item.resources.some(r => r.isCustomizedRate) || item.resources.some(r => r.isCustomizedQuantity)) && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-black/5 text-xs text-gray-600">
                    {item.resources.some(r => r.isCustomizedRate) && <span className="mr-4">* Custom Rate Applied</span>}
                    {item.resources.some(r => r.isCustomizedQuantity) && <span>** Custom Quantity Applied</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-black/20">
          <p className="text-sm">No rate analysis data available. Add items to BOQ first.</p>
        </div>
      )}
    </div>
  );
}