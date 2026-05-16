import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, FileText, Calculator, BarChart3, Truck } from 'lucide-react';
import { Project, BOQItem } from '../../types/boq';
import { Norm } from '../../types';
import { useBOQCalculations } from '../../hooks/useBOQCalculations';
import { useProjectData } from '../../hooks/useProjectData';
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

  const {
    project: storedProject,
    globalRates,
    updateItemQuantity,
    updateMeasurementQuantity,
    removeItem,
    updateTabulationBillRate,
    updateTabulationBillQty,
    updateTabulationRemarks,
    updateTransportMaterial,
    updateTransportMaterialByIndex,
    addTransportMaterial,
    removeTransportMaterial
  } = useProjectData(initialProject.id);

  const project = storedProject || initialProject;
  const transportMaterials = project.transportMaterials || [];

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
    { id: 'materials', label: 'Materials & Transport', icon: Truck, count: transportMaterials.length }
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
                updateTransportMaterial={updateTransportMaterial}
                updateTransportMaterialByIndex={updateTransportMaterialByIndex}
                addTransportMaterial={addTransportMaterial}
                removeTransportMaterial={removeTransportMaterial}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}