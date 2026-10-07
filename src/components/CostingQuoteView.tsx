import React, { useState } from 'react';
import { CostBreakdown, ProjectData, UserRole } from '../types/engineering';
import { calculateProjectCosting, CostingParameters } from '../services/costingEngine';
import {
  DollarSign,
  FileSpreadsheet,
  Lock,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface CostingQuoteViewProps {
  project: ProjectData;
  activeRole: UserRole;
  onUpdateCosting: (updated: CostBreakdown) => void;
}

export const CostingQuoteView: React.FC<CostingQuoteViewProps> = ({
  project,
  activeRole,
  onUpdateCosting,
}) => {
  const [currency, setCurrency] = useState<'EGP' | 'USD' | 'SAR'>(project.costing.currency);
  const [steelRate, setSteelRate] = useState<number>(project.costing.steelRatePerTon);
  const [overhead, setOverhead] = useState<number>(project.costing.overheadMarginPercent);
  const [profit, setProfit] = useState<number>(project.costing.profitMarginPercent);
  const [includeErection, setIncludeErection] = useState<boolean>(true);

  // Recalculate live
  const handleRecalc = () => {
    const exchange = currency === 'EGP' ? 1 : currency === 'USD' ? 50 : 13.3;
    const newCost = calculateProjectCosting(project.assemblies, project.parts, {
      currency,
      steelRatePerTon: steelRate,
      exchangeRateToEgp: exchange,
      overheadPercent: overhead,
      profitMarginPercent: profit,
      vatTaxPercent: 14,
      includeErection,
      transportDistanceKm: 60,
    });
    onUpdateCosting(newCost);
  };

  const isClient = activeRole === 'client';
  const c = project.costing;

  return (
    <div className="space-y-6">
      {/* Parameters Header */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <span>محرك التكلفة والتسعير التجاري (Costing & Client Quotation)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            وفقًا للمواصفة REQ-COST-01 & REQ-QUOTE-01: فصل تام بين تكلفة المصنع الداخلية وسعر بيع عرض العميل.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currency}
            onChange={(e) => {
              const cur = e.target.value as 'EGP' | 'USD' | 'SAR';
              setCurrency(cur);
              const rate = cur === 'EGP' ? 48000 : cur === 'USD' ? 980 : 3650;
              setSteelRate(rate);
            }}
            className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 font-bold"
          >
            <option value="EGP">EGP (الجنيه المصري)</option>
            <option value="USD">USD (الدولار الأمريكي)</option>
            <option value="SAR">SAR (الريال السعودي)</option>
          </select>

          <button
            onClick={handleRecalc}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
          >
            إعادة احتساب الأسعار
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Internal Factory Cost Breakdown (Hidden for Client Role) */}
        {!isClient ? (
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-100">
                  تفاصيل تكلفة المصنع الداخلية (Factory Internal Cost - سرّي)
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">خاص بإدارة المصنع</span>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">الصلب الخام ({c.rawSteelTons} طن @ {c.steelRatePerTon} {c.currency}):</span>
                <span>{c.rawSteelCost.toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">فاقد الهالك الصافي (Scrap Allowance 7%):</span>
                <span>{c.scrapLossCost.toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">مسامير وأنكورات الوصلات (Fasteners):</span>
                <span>{c.fastenersCost.toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">سلك وغاز اللحام (Welding Consumables):</span>
                <span>{c.weldingConsumablesCost.toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">قص الليزر والمنشار (Cutting Operations):</span>
                <span>{(c.laserCuttingCost + c.sawCuttingCost).toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">مصنعية التجميع واللحام (Fitting & Welding Labor):</span>
                <span>{c.fittingWeldingCost.toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">سف ع الرمال Sa 2.5 ودهان الإيبوكسي:</span>
                <span>{(c.primerPaintCost + c.blastingPaintingCost).toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="font-sans text-slate-400">النقل لموقع المشروع والتركيب بالأوناش:</span>
                <span>{(c.transportCost + c.craneErectionCost).toLocaleString()} {c.currency}</span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-slate-700 text-sm font-bold text-amber-300">
                <span className="font-sans">إجمالي تكلفة المصنع المباشرة:</span>
                <span>{c.internalFactoryCost.toLocaleString()} {c.currency}</span>
              </div>
            </div>

            {/* Adjustable Margins for Engineering & PM */}
            <div className="p-3 rounded bg-slate-950 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">نسبة المصاريف الإدارية (Overhead %):</span>
                <input
                  type="number"
                  value={overhead}
                  onChange={(e) => setOverhead(parseFloat(e.target.value) || 10)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-1">هامش الربح المستهدف (Profit Margin %):</span>
                <input
                  type="number"
                  value={profit}
                  onChange={(e) => setProfit(parseFloat(e.target.value) || 15)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center text-slate-400">
            <Lock className="w-8 h-8 text-amber-500 mb-2" />
            <h4 className="text-sm font-bold text-slate-200">بيانات التكلفة الداخلية للمصنع محمية</h4>
            <p className="text-xs max-w-sm mt-1">
              حسابات تكاليف المصنع والتشغيل مقتصرة على الإدارة الهندسية والحسابات، وعرض الأسعار الرسمي للعميل معروض بالجانب الأيسر.
            </p>
          </div>
        )}

        {/* 2. Client Commercial Quotation (عرض السعر الرسمي للعميل) */}
        <div className="p-5 rounded-lg bg-slate-900 border-2 border-amber-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] text-amber-400 font-mono block">QUOTATION № Q-2026-089</span>
              <h3 className="text-base font-bold text-slate-100">
                عرض السعر المعتمد للعميل (Official Client Quote)
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 font-mono text-xs border border-emerald-800">
              ساري لمدة 15 يوم
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">اسم العميل والمشروع:</span>
              <span className="font-bold text-slate-100">{project.clientName} | {project.title}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">إجمالي وزن الهيكل المعدني:</span>
              <span className="font-mono text-slate-100">{c.rawSteelTons} طن متري</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">سعر الطن الشامل للتصنيع والدهان:</span>
              <span className="font-mono text-amber-300 font-bold">{c.unitPricePerTon.toLocaleString()} {c.currency} / طن</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">الإجمالي قبل ضريبة القيمة المضافة:</span>
              <span className="font-mono text-slate-100 font-bold">{c.totalSellingPrice.toLocaleString()} {c.currency}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">ضريبة القيمة المضافة ({c.vatTaxPercent}% VAT):</span>
              <span className="font-mono text-slate-300">{(c.grandTotalWithVat - c.totalSellingPrice).toLocaleString()} {c.currency}</span>
            </div>

            <div className="flex justify-between py-3 border-t-2 border-amber-500/50 text-lg font-black text-amber-400">
              <span>الإجمالي النهائي شامل الضريبة:</span>
              <span className="font-mono">{c.grandTotalWithVat.toLocaleString()} {c.currency}</span>
            </div>
          </div>

          {/* Commercial Terms & Exclusions */}
          <div className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
            <span className="font-bold text-slate-200 block">شروط التوريد والدفع:</span>
            <p>• الدفع: 50% دفعة مقدمة عند التعاقد، 40% قبل التوريد، 10% بعد إنهاء التركيب والتسليم.</p>
            <p>• مشمول: التصنيع، الدهان Sa 2.5 + Epoxy، المسامير، النقل لموقع العميل، التركيب.</p>
            <p>• غير مشمول: القواعد والخرسانات المدنية، أعمال العزل والكهرباء، تصاريح الحفر والموقع.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
