import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, FileText, Calculator, BarChart3, Truck, Plus, Search, X } from 'lucide-react';
import { Project, BOQItem, TransportMaterial } from '../../types/boq';
import { Norm } from '../../types';
import { useBOQCalculations } from '../../hooks/useBOQCalculations';
import { useProjectData } from '../../hooks/useProjectData';
import { getMaterialUnitWeight } from '../../utils/storage';
import { exportToExcel } from '../../utils/excelExport';
import BOQTable from './BOQTable';
import ResourceBreakdown from './ResourceBreakdown';
import RateAnalysisComponent from './RateAnalysisComponent';
import MaterialTransport from './MaterialTransport';

interface ProjectBOQProps {
  project: Project;
  norms: Norm[];
  onBack: () => void;
}

export default function ProjectBOQ({ project: initialProject, norms, onBack }: ProjectBOQProps) {
  const [activeTab, setActiveTab] = useState<'boq' | 'breakdown' | 'analysis' | 'materials'>('boq');
  const [sharedMode, setSharedMode] = useState<'estimate' | 'measurement'>('estimate');
  const [breakdownSubView, setBreakdownSubView] = useState<'summary' | 'detailed' | 'tabulation'>('summary');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    project: storedProject,
    globalRates,
    updateProject,
    updateItemQuantity,
    updateMeasurementQuantity,
    removeItem,
    updateTabulationBillRate,
    updateTabulationBillQty,
    updateTabulationRemarks,
    updateTransportMaterial,
    updateTransportMaterialByIndex,
    updateCustomRate,
    updateTransportMode,
    updateTransportDistances,
    updateTransportCoefficients,
    addItem
  } = useProjectData(initialProject.id);
  

  const project = storedProject || initialProject;
  const addedItemIds = React.useMemo(() => new Set((project.items || []).map((item) => item.normId)), [project.items]);

  const derivedTransportMaterials = React.useMemo<TransportMaterial[]>(() => {
    if (!project || !norms.length) return [];

    const materialNames = new Set<string>();
    const derived: TransportMaterial[] = [];

    project.items?.forEach((item: BOQItem) => {
      const norm = norms.find((n: Norm) => n.id === item.normId);
      if (!norm || !Array.isArray(norm.resources)) return;

      norm.resources.forEach((res) => {
        if (
          res &&
          typeof res === 'object' &&
          res.resource_type === 'Material' &&
          !res.is_percentage &&
          typeof res.name === 'string' &&
          res.name.trim()
        ) {
          const name = res.name.trim();
          if (!materialNames.has(name)) {
            materialNames.add(name);
            derived.push({
              material_name: name,
              unit_weight: getMaterialUnitWeight(name) || 0,
              load_category: 'Easy',
              original_cost: 0,
              vat: 0,
              metalled_cost_per_unit: 0,
              gravelled_cost_per_unit: 0,
              porter_cost_per_unit: 0,
              total_cost_per_unit: 0
            });
          }
        }
      });
    });

    return derived;
  }, [project, norms]);

  const syncedTransportMaterials = React.useMemo<TransportMaterial[]>(() => {
    const existingMaterials = (project.transportMaterials || []) as TransportMaterial[];
    const existingByName = new Map(existingMaterials.map((material) => [material.material_name.trim().toLowerCase(), material]));

    return derivedTransportMaterials.map((derived: TransportMaterial) => {
      const key = derived.material_name.trim().toLowerCase();
      const existing = existingByName.get(key);
      return existing
        ? { ...derived, ...existing, material_name: derived.material_name }
        : derived;
    });
  }, [project.transportMaterials, derivedTransportMaterials]);

  const transportMaterials = syncedTransportMaterials;

  const {
    calculateItemRate,
    calculateTotalBOQ,
    calculateMeasurementTotal,
    resourceBreakdownEstimate,
    resourceBreakdownMeasurement,
    resourceMatrixData,
    resourceMatrixMeasurementData,
    tabulationData,
    rateAnalysisData
  } = useBOQCalculations(project, norms, globalRates, sharedMode);

  React.useEffect(() => {
    if (!storedProject) return;
    if (!derivedTransportMaterials.length) return;

    const currentMaterials = storedProject.transportMaterials || [];
    if (JSON.stringify(currentMaterials) !== JSON.stringify(syncedTransportMaterials)) {
      updateProject({
        ...storedProject,
        transportMaterials: syncedTransportMaterials
      });
    }
  }, [storedProject, derivedTransportMaterials, syncedTransportMaterials, updateProject]);

  const handleExport = () => {
    exportToExcel(
      project,
      activeTab,
      breakdownSubView,
      sharedMode,
      norms,
      resourceBreakdownEstimate,
      resourceBreakdownMeasurement,
      resourceMatrixData,
      resourceMatrixMeasurementData,
      tabulationData,
      rateAnalysisData,
      transportMaterials,
      calculateItemRate,
      calculateTotalBOQ,
      calculateMeasurementTotal
    );
  };

  const tabs = [
    { id: 'boq', label: 'BOQ Items', icon: FileText, count: project.items.length },
    { id: 'breakdown', label: 'Resource Breakdown', icon: BarChart3, count: resourceBreakdownEstimate.length },
    { id: 'analysis', label: 'Rate Analysis', icon: Calculator, count: rateAnalysisData.length },
    { id: 'materials', label: 'Resource & Transport', icon: Truck, count: transportMaterials.length }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-black/5 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-[#1E293B]">{project.name}</h1>
                <p className="text-sm text-black/60">{project.location || 'No location specified'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-semibold hover:bg-[#2563EB] transition-colors"
              >
                <Plus size={16} />
                <span>Add Item</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1E293B] text-white rounded-lg text-sm font-semibold hover:bg-[#2D3748] transition-colors"
              >
                <Download size={16} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mt-4 flex items-center justify-center">
            <div className="bg-white rounded-xl p-1 border border-[#E2E8F0] shadow-sm">
              <button
                onClick={() => setSharedMode('estimate')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  sharedMode === 'estimate'
                    ? 'bg-[#1E293B] text-white shadow-sm'
                    : 'text-[#333333]/60 hover:text-[#1E293B]'
                }`}
              >
                Estimate Mode
              </button>
              <button
                onClick={() => setSharedMode('measurement')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  sharedMode === 'measurement'
                    ? 'bg-[#1E293B] text-white shadow-sm'
                    : 'text-[#333333]/60 hover:text-[#1E293B]'
                }`}
              >
                Measurement Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all relative ${
                    activeTab === tab.id
                      ? 'bg-[#1E293B] text-white shadow-sm'
                      : 'text-[#333333]/60 hover:text-[#1E293B] hover:bg-black/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#1E293B]/10 text-[#1E293B]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {activeTab === 'boq' && (
              <BOQTable
                project={project}
                norms={norms}
                sharedMode={sharedMode}
                isAdding={isAdding}
                calculateItemRate={calculateItemRate}
                calculateTotalBOQ={calculateTotalBOQ}
                calculateMeasurementTotal={calculateMeasurementTotal}
                updateItemQuantity={updateItemQuantity}
                updateMeasurementQuantity={updateMeasurementQuantity}
                removeItem={removeItem}
              />
            )}

            {activeTab === 'breakdown' && (
              <ResourceBreakdown
                project={project}
                sharedMode={sharedMode}
                breakdownSubView={breakdownSubView}
                setBreakdownSubView={setBreakdownSubView}
                resourceBreakdownEstimate={resourceBreakdownEstimate}
                resourceBreakdownMeasurement={resourceBreakdownMeasurement}
                resourceMatrixData={resourceMatrixData}
                resourceMatrixMeasurementData={resourceMatrixMeasurementData}
                tabulationData={tabulationData}
                updateTabulationBillRate={updateTabulationBillRate}
                updateTabulationBillQty={updateTabulationBillQty}
                updateTabulationRemarks={updateTabulationRemarks}
              />
            )}

            {activeTab === 'analysis' && (
              <RateAnalysisComponent
                project={project}
                rateAnalysisData={rateAnalysisData}
              />
            )}

            {activeTab === 'materials' && (
              <MaterialTransport
                  project={project}
                  transportMaterials={transportMaterials}
                  globalRates={globalRates}
                  updateTransportMaterial={updateTransportMaterial}
                  updateTransportMaterialByIndex={updateTransportMaterialByIndex}
                  updateCustomRate={updateCustomRate}
                  onUpdateTransportMode={updateTransportMode}
                  onUpdateTransportDistances={updateTransportDistances}
                  onUpdateTransportCoefficients={updateTransportCoefficients}
                />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-black/10">
              <div className="flex items-center justify-between px-6 py-5 border-b border-black/10">
                <div>
                  <h2 className="text-lg font-bold text-[#1E293B]">Add BOQ Items</h2>
                  <p className="text-sm text-slate-500">Tap any norm to add it immediately to this project BOQ, or select multiple items and press Add Selected.</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                  }}
                  className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    placeholder="Search norms..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>

                <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
                  {norms
                    .filter((norm) =>
                      searchQuery.trim().length === 0 ||
                      [norm.description, norm.type, norm.ref_ss, norm.sNo, norm.unit]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 50)
                    .map((norm) => {
                      const isAdded = addedItemIds.has(norm.id);
                      return (
                        <button
                          key={norm.id}
                          type="button"
                          onClick={() => {
                            if (!isAdded) {
                              addItem(norm);
                            }
                          }}
                          className={`w-full text-left rounded-2xl border p-4 flex flex-col gap-2 transition-all ${
                            isAdded
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 bg-white hover:border-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">
                                {norm.type}
                              </p>
                              <p className="text-sm font-semibold text-slate-900 whitespace-normal break-words leading-6">
                                {`${norm.ref_ss || ''} ${norm.sNo || ''} - ${norm.description}`.trim()}
                              </p>
                            </div>
                            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-700 bg-slate-100 rounded-full px-2 py-1">
                              {norm.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${isAdded ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                              ✓
                            </span>
                            <span>{isAdded ? 'Already added' : 'Tap to add'}</span>
                          </div>
                        </button>
                      );
                    })}
                  {norms.filter((norm) =>
                      searchQuery.trim().length === 0 ||
                      [norm.description, norm.type, norm.ref_ss, norm.sNo, norm.unit]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-500">
                      No norms match your search.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 items-center justify-end px-6 py-4 border-t border-black/10 bg-slate-50">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}