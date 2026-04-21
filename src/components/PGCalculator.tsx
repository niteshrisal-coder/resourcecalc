import React, { useState } from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import { ad2bs, bs2ad } from 'hamro-nepali-patro';

interface PGCalculatorProps {
  onBack: () => void;
}

export default function PGCalculator({ onBack }: PGCalculatorProps) {
  const [costEstimate, setCostEstimate] = useState<number>(0);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [dateType, setDateType] = useState<'ad' | 'bs'>('ad');
  const [showResults, setShowResults] = useState(false);

  const isValidAD = (dateStr: string) => {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) return false;
    const parsed = Date.parse(dateStr);
    return !Number.isNaN(parsed);
  };

  const isValidBS = (dateStr: string) => {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if ([year, month, day].some(value => Number.isNaN(value))) return false;
    if (month < 1 || month > 12 || day < 1 || day > 32) return false;

    try {
      bs2ad(year, month, day);
      return true;
    } catch {
      return false;
    }
  };

  const handleDateTypeChange = (type: 'ad' | 'bs') => {
    if (!expectedDate) {
      setDateType(type);
      return;
    }

    const converted = formatDate(expectedDate, dateType);
    if (converted.ad && converted.bs) {
      setExpectedDate(type === 'ad' ? converted.ad : converted.bs);
    } else {
      setExpectedDate('');
    }
    setDateType(type);
  };

  const isExpectedDateValid = dateType === 'ad' ? isValidAD(expectedDate) : isValidBS(expectedDate);

  const calculatePG = () => {
    if (!costEstimate || !bidPrice || !expectedDate || !isExpectedDateValid) return;

    setShowResults(true);
  };

  const getPercentBelow = () => {
    if (!costEstimate || !bidPrice) return 0;
    return ((costEstimate - bidPrice) / costEstimate) * 100;
  };

  const getPG1 = () => {
    return bidPrice * 0.05;
  };

  const getPG2 = () => {
    const percentBelow = getPercentBelow();
    if (percentBelow >= 15) {
      return (0.85 * costEstimate - bidPrice) * 0.5;
    }
    return 0;
  };

  const addMonthsToDate = (adDateStr: string, months: number) => {
    if (!isValidAD(adDateStr)) return '';
    const date = new Date(adDateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const formatDate = (dateStr: string, type: 'ad' | 'bs') => {
    if (!dateStr) return { ad: '', bs: '' };
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return { ad: '', bs: '' };
    const [year, month, day] = parts;

    try {
      if (type === 'ad') {
        if (!isValidAD(dateStr)) return { ad: '', bs: '' };
        const bsDate = ad2bs(year, month, day);
        const bsDay = bsDate.date ?? bsDate.day;
        return {
          ad: dateStr,
          bs: `${bsDate.year}-${String(bsDate.month).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`
        };
      }

      if (!isValidBS(dateStr)) return { ad: '', bs: '' };
      const adDate = bs2ad(year, month, day);
      const adDay = adDate.date ?? adDate.day;
      return {
        ad: `${adDate.year}-${String(adDate.month).padStart(2, '0')}-${String(adDay).padStart(2, '0')}`,
        bs: dateStr
      };
    } catch {
      return { ad: '', bs: '' };
    }
  };

  const convertedExpectedDate = expectedDate ? formatDate(expectedDate, dateType) : { ad: '', bs: '' };

  const getPG1Validity = () => {
    const validAD = dateType === 'ad' ? expectedDate : formatDate(expectedDate, 'bs').ad;
    if (!validAD) return { ad: '', bs: '' };
    const validityDate = addMonthsToDate(validAD, 13);
    return validityDate ? formatDate(validityDate, 'ad') : { ad: '', bs: '' };
  };

  const getPG2Validity = () => {
    const validAD = dateType === 'ad' ? expectedDate : formatDate(expectedDate, 'bs').ad;
    if (!validAD) return { ad: '', bs: '' };
    const validityDate = addMonthsToDate(validAD, 1);
    return validityDate ? formatDate(validityDate, 'ad') : { ad: '', bs: '' };
  };

  const percentBelow = getPercentBelow();
  const pg1 = getPG1();
  const pg2 = getPG2();
  const totalPG = pg1 + pg2;
  const pg1Validity = getPG1Validity();
  const pg2Validity = getPG2Validity();

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = formatDate(today, 'ad') || { ad: today, bs: today };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#1E293B] px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="text-white hover:text-[#3B82F6] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#3B82F6]">PG Calculator</h1>
            <p className="text-xs text-white/50">Performance Guarantee Calculator</p>
          </div>
          <div className="w-5" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Notification */}
        <div className="rounded-xl bg-[#EFF6FF] border border-[#3B82F6]/20 p-3">
          <p className="text-xs text-[#1E293B] font-medium">
            Cost Estimate and Bid Price should be Without VAT but inclusive of PS
          </p>
        </div>

        {/* Cost Estimate */}
        <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E293B] mb-3 block">
            Cost Estimate (Rs.)
          </label>
          <input
            type="number"
            value={costEstimate || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCostEstimate(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-base font-semibold text-[#1E293B] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            placeholder="0.00"
          />
        </div>

        {/* Bid Price */}
        <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E293B] mb-3 block">
            Bid Price (Rs.)
          </label>
          <input
            type="number"
            value={bidPrice || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBidPrice(parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-base font-semibold text-[#1E293B] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            placeholder="0.00"
          />
        </div>

        {/* Expected Completion Date */}
        <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1E293B] mb-3 block">
            Expected Completion Date
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => handleDateTypeChange('ad')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  dateType === 'ad'
                    ? 'bg-[#1E293B] text-white'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
                }`}
              >
                AD
              </button>
              <button
                onClick={() => handleDateTypeChange('bs')}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  dateType === 'bs'
                    ? 'bg-[#1E293B] text-white'
                    : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
                }`}
              >
                BS
              </button>
            </div>
            <input
              type={dateType === 'ad' ? 'date' : 'text'}
              value={expectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpectedDate(e.target.value)}
              placeholder={dateType === 'ad' ? '' : '2079-01-01'}
              className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-base font-semibold text-[#1E293B] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            />
            {dateType === 'bs' && (
              <div className="text-xs text-[#64748B]">Enter BS date as YYYY-MM-DD, e.g. 2079-01-01</div>
            )}
            {expectedDate && convertedExpectedDate.ad && convertedExpectedDate.bs && (
              <div className="text-xs text-[#64748B]">
                {dateType === 'ad' ? 'BS: ' + convertedExpectedDate.bs : 'AD: ' + convertedExpectedDate.ad}
              </div>
            )}
            {!isExpectedDateValid && expectedDate && (
              <div className="text-xs text-red-500">Enter a valid {dateType.toUpperCase()} date.</div>
            )}
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={calculatePG}
          disabled={!costEstimate || !bidPrice || !expectedDate || !isExpectedDateValid}
          className="w-full px-4 py-3 bg-[#3B82F6] text-white rounded-xl text-sm font-semibold hover:bg-[#2563EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Calculate PG
        </button>

        {/* Results */}
        {showResults && (
          <div className="space-y-4">
            {/* Today's Date */}
            <div className="border border-emerald-200 bg-emerald-100 rounded-2xl p-4 shadow-sm">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-900 mb-3">
                Today's Date
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-emerald-700">AD:</span>
                  <span className="text-sm font-semibold text-slate-900">{todayFormatted.ad}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-emerald-700">BS:</span>
                  <span className="text-sm font-semibold text-slate-900">{todayFormatted.bs}</span>
                </div>
              </div>
            </div>

            {/* Calculation Results */}
            <div className="border border-sky-200 bg-sky-100 rounded-2xl p-4 shadow-sm">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-900 mb-3">
                PG Calculation Results
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-900">% Below:</span>
                  <span className="text-sm font-semibold text-slate-900">{percentBelow.toFixed(2)}%</span>
                </div>
                <div className="h-px bg-slate-900/70 my-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-900">PG1 (5%):</span>
                  <span className="text-sm font-semibold text-slate-900">Rs. {pg1.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-900">PG1 Validity:</span>
                  <div className="text-right">
                    <div className="text-xs text-slate-600">AD: {pg1Validity.ad}</div>
                    <div className="text-xs text-slate-600">BS: {pg1Validity.bs}</div>
                  </div>
                </div>
                <div className="h-px bg-slate-900/70 my-2" />

                {percentBelow >= 15 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-900">PG2:</span>
                      <span className="text-sm font-semibold text-slate-900">Rs. {pg2.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-900">PG2 Validity:</span>
                      <div className="text-right">
                        <div className="text-xs text-slate-600">AD: {pg2Validity.ad}</div>
                        <div className="text-xs text-slate-600">BS: {pg2Validity.bs}</div>
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t border-sky-200 pt-3 mt-3">
                  <div className="rounded-2xl bg-sky-900 p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-slate-100">Total PG:</span>
                      <span className="text-base font-bold text-white">Rs. {totalPG.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}