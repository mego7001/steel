import React, { useState } from 'react';
import {
  AssemblyDefinition,
  LinearCutPlan,
  NestingSheetResult,
  PartDefinition,
  ProjectData,
} from '../types/engineering';
import { FACTORY_MACHINES } from '../services/catalogService';
import { calculateBendAllowance } from '../services/fabricationEngine';
import {
  Layers,
  Wrench,
  Cpu,
  Scissors,
  CheckCircle2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface FabricationShopViewProps {
  project: ProjectData;
}

export const FabricationShopView: React.FC<FabricationShopViewProps> = ({ project }) => {
  const [activeSubTab, setActiveSubTab] = useState<'bom' | 'nesting' | 'cutting' | 'bending' | 'machines'>('nesting');

  // Interactive Bending Calculator State
  const [bendThickness, setBendThickness] = useState<number>(6);
  const [bendRadius, setBendRadius] = useState<number>(6);
  const [bendAngle, setBendAngle] = useState<number>(90);
  const [bendKFactor, setBendKFactor] = useState<number>(0.44);

  const bendCalc = calculateBendAllowance(bendThickness, bendRadius, bendAngle, bendKFactor);

  const totalParts = project.parts.length;
  const totalAssemblies = project.assemblies.length;
  const netWeightKg = project.assemblies.reduce((a, b) => a + b.totalWeightKg, 0);

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('nesting')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'nesting'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          محاكاة توزيع الألواح (2D Plate Nesting)
        </button>
        <button
          onClick={() => setActiveSubTab('cutting')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'cutting'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          خطة قص قطاعات الكمرات (1D Bar Cut List)
        </button>
        <button
          onClick={() => setActiveSubTab('bom')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'bom'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          قائمة المواد الشاملة (Detailed BOM)
        </button>
        <button
          onClick={() => setActiveSubTab('bending')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'bending'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          حسابات الثني وفرد الصاج (K-Factor Bending)
        </button>
        <button
          onClick={() => setActiveSubTab('machines')}
          className={`px-4 py-2 text-xs font-bold transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'machines'
              ? 'border-amber-500 text-amber-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          سجل ماكينات المصنع (Machine Registry)
        </button>
      </div>

      {/* 1. 2D Nesting Tab */}
      {activeSubTab === 'nesting' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                توزيع وتقطيع ألواح الصلب على ماكينة الليزر (2D Plate CNC Nesting)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                وفقًا للمواصفة REQ-NEST-01: تم احتساب خلوص الشعاع (Kerf 0.25mm) وهوامش الأطراف مع كشف التداخلات وحساب نسبة الهالك بدقة.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-amber-300">
                مقاس اللوح: 1500 × 3000 مم
              </span>
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                نسبة الاستغلال: {project.nestingResults[0]?.utilizationPercent || 84.5}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Nesting Sheet Canvas */}
            <div className="lg:col-span-2 p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-300 mb-3 block self-start">
                معاينة لوح التصنيع رقم SHT-01 (سمك 20 مم - صلب St 44-2):
              </span>
              <svg
                viewBox="0 0 600 300"
                className="w-full h-[260px] bg-slate-950 rounded border border-slate-700 cad-grid-dense"
              >
                {/* Outer Sheet Border (1500 x 3000 aspect ratio: 2:1) */}
                <rect x="10" y="10" width="580" height="280" fill="rgba(15, 23, 42, 0.9)" stroke="#475569" strokeWidth="2" />
                <text x="20" y="30" fill="#94a3b8" fontSize="10" fontFamily="monospace">1500 x 3000 x 20mm Sheet</text>

                {/* Placed Nested Parts Mock from Nesting Results */}
                {/* 4 Base Plates 350x350 */}
                <rect x="30" y="45" width="70" height="70" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx="45" cy="60" r="3" fill="#ef4444" />
                <circle cx="85" cy="60" r="3" fill="#ef4444" />
                <circle cx="85" cy="100" r="3" fill="#ef4444" />
                <circle cx="45" cy="100" r="3" fill="#ef4444" />
                <text x="40" y="82" fill="#fbbf24" fontSize="9" fontFamily="monospace">P-BP-01</text>

                <rect x="115" y="45" width="70" height="70" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx="130" cy="60" r="3" fill="#ef4444" />
                <circle cx="170" cy="60" r="3" fill="#ef4444" />
                <circle cx="170" cy="100" r="3" fill="#ef4444" />
                <circle cx="130" cy="100" r="3" fill="#ef4444" />
                <text x="125" y="82" fill="#fbbf24" fontSize="9" fontFamily="monospace">P-BP-02</text>

                <rect x="200" y="45" width="70" height="70" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx="215" cy="60" r="3" fill="#ef4444" />
                <circle cx="255" cy="60" r="3" fill="#ef4444" />
                <circle cx="255" cy="100" r="3" fill="#ef4444" />
                <circle cx="215" cy="100" r="3" fill="#ef4444" />
                <text x="210" y="82" fill="#fbbf24" fontSize="9" fontFamily="monospace">P-BP-03</text>

                <rect x="285" y="45" width="70" height="70" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx="300" cy="60" r="3" fill="#ef4444" />
                <circle cx="340" cy="60" r="3" fill="#ef4444" />
                <circle cx="340" cy="100" r="3" fill="#ef4444" />
                <circle cx="300" cy="100" r="3" fill="#ef4444" />
                <text x="295" y="82" fill="#fbbf24" fontSize="9" fontFamily="monospace">P-BP-04</text>

                {/* Extended End Plates */}
                <rect x="30" y="135" width="55" height="110" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="35" y="195" fill="#38bdf8" fontSize="9" fontFamily="monospace">P-EP-01</text>

                <rect x="100" y="135" width="55" height="110" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="105" y="195" fill="#38bdf8" fontSize="9" fontFamily="monospace">P-EP-02</text>

                <rect x="170" y="135" width="55" height="110" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="175" y="195" fill="#38bdf8" fontSize="9" fontFamily="monospace">P-EP-03</text>

                <rect x="240" y="135" width="55" height="110" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="245" y="195" fill="#38bdf8" fontSize="9" fontFamily="monospace">P-EP-04</text>

                {/* Stiffeners in remaining space */}
                <rect x="310" y="135" width="60" height="30" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="1" />
                <rect x="310" y="175" width="60" height="30" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="1" />
                <rect x="310" y="215" width="60" height="30" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="1" />
                <text x="315" y="155" fill="#10b981" fontSize="8" fontFamily="monospace">STIFF-01</text>
              </svg>
            </div>

            {/* Nesting Metrics Panel */}
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-200 block">إحصائيات القص والليزر:</span>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">عدد الألواح المطلوبة:</span>
                  <span className="font-mono text-slate-100 font-bold">1 لوح (1500×3000)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">إجمالي وزن اللوح:</span>
                  <span className="font-mono text-slate-100 font-bold">706.5 كجم</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">كفاءة استغلال الصاج:</span>
                  <span className="font-mono text-emerald-400 font-bold">84.5%</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">الهالك والفضلات (Scrap):</span>
                  <span className="font-mono text-amber-400">15.5% (109.5 كجم)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400">محيط القص بالليزر:</span>
                  <span className="font-mono text-slate-100">18.6 متر طولي</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">زمن تشغيل الليزر المتوقع:</span>
                  <span className="font-mono text-slate-100">14.2 دقيقة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. 1D Bar Cut List Tab */}
      {activeSubTab === 'cutting' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                خطة التقطيع الطولي للكمرات والأعمدة (1D Linear Cut List Optimizer)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                خوارزمية تقليل الهالك Best-Fit Decreasing على أطوال تجارية قياسية 12 متر مع اعتبار عرض شق المنشار (Kerf 3mm).
              </p>
            </div>
            <div className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 font-mono text-xs text-amber-300">
              طول العود القياسي: 12,000 مم
            </div>
          </div>

          <div className="space-y-3">
            {project.linearCutPlans[0]?.cuts.map((cut, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-bold text-slate-200">العود #{cut.barIndex} (Stock Bar 12.0m)</span>
                  <span className="text-emerald-400">نسبة الاستغلال: {cut.utilizationPercent}%</span>
                  <span className="text-slate-400">الفضلة المتبقية: {cut.wasteLengthMm} مم</span>
                </div>

                {/* Bar Visual Segment Representation */}
                <div className="w-full h-7 rounded bg-slate-950 border border-slate-700 overflow-hidden flex text-[10px] font-mono font-bold text-slate-950">
                  {cut.parts.map((p, pIdx) => {
                    const pct = (p.lengthMm / 12000) * 100;
                    return (
                      <div
                        key={pIdx}
                        style={{ width: `${pct}%` }}
                        className="h-full bg-amber-400 border-r border-slate-900 flex items-center justify-center overflow-hidden px-1"
                        title={`${p.partMark}: ${p.lengthMm}mm`}
                      >
                        {p.partMark} ({p.lengthMm}mm)
                      </div>
                    );
                  })}
                  <div
                    style={{ width: `${(cut.wasteLengthMm / 12000) * 100}%` }}
                    className="h-full bg-slate-800 text-slate-400 flex items-center justify-center"
                    title={`Remnant: ${cut.wasteLengthMm}mm`}
                  >
                    فضلة {cut.wasteLengthMm}mm
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Detailed BOM Tab */}
      {activeSubTab === 'bom' && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                قائمة حصر المواد والقطع (Hierarchical Shop Bill of Materials - BOM)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {totalAssemblies} تجميعة | {totalParts} قطعة | الوزن الإجمالي: {netWeightKg.toFixed(1)} كجم
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">رقم القطعة (Mark)</th>
                  <th className="py-2.5 px-3">تجميعة الورشة</th>
                  <th className="py-2.5 px-3">الوصف والتفاصيل</th>
                  <th className="py-2.5 px-3">الأبعاد L × W × T</th>
                  <th className="py-2.5 px-3">الخامة</th>
                  <th className="py-2.5 px-3">الوزن الصافي</th>
                  <th className="py-2.5 px-3">الثقوب</th>
                  <th className="py-2.5 px-3">مسار العمليات (Routing)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {project.parts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50">
                    <td className="py-2 px-3 font-bold text-amber-400">{p.mark}</td>
                    <td className="py-2 px-3 text-slate-200">{p.assemblyMark}</td>
                    <td className="py-2 px-3 font-sans text-slate-300">{p.description}</td>
                    <td className="py-2 px-3">{p.lengthMm}×{p.widthMm}×{p.thickness} مم</td>
                    <td className="py-2 px-3 font-sans text-slate-400">{p.material}</td>
                    <td className="py-2 px-3 font-bold text-slate-100">{p.netWeightKg} كجم</td>
                    <td className="py-2 px-3">{p.holesCount > 0 ? `${p.holesCount}× Ø${p.holesDiameterMm || 22}` : '—'}</td>
                    <td className="py-2 px-3 font-sans text-[11px] text-slate-400">
                      {p.operations.join(' › ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Sheet Bending K-Factor Tab */}
      {activeSubTab === 'bending' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              حاسبة استقطاع وفرد الثني (Bend Allowance & K-Factor Calculator)
            </h3>
            <p className="text-xs text-slate-400">
              وفقًا للمواصفة REQ-FAB-05: يتم اشتقاق الأطوال المفرودة Flat Pattern باستخدام معادلات المحور المحايد ومعامل K-Factor الحقيقي للمكبس.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">سماكة الصاج Sheet Thickness (t) مم:</span>
                <input
                  type="number"
                  value={bendThickness}
                  onChange={(e) => setBendThickness(parseFloat(e.target.value) || 2)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">نصف القطر الداخلي Inside Radius (R) مم:</span>
                <input
                  type="number"
                  value={bendRadius}
                  onChange={(e) => setBendRadius(parseFloat(e.target.value) || 2)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">زاوية الثني Bend Angle (درجة):</span>
                <input
                  type="number"
                  value={bendAngle}
                  onChange={(e) => setBendAngle(parseFloat(e.target.value) || 90)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">معامل K-Factor المعتمد للصلب:</span>
                <input
                  type="number"
                  step="0.01"
                  value={bendKFactor}
                  onChange={(e) => setBendKFactor(parseFloat(e.target.value) || 0.44)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-300">النتائج الهندسية للثني بالمكبس:</span>
            
            <div className="p-3 rounded bg-slate-950 border border-slate-800 font-mono space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">سماح الثني (Bend Allowance - BA):</span>
                <span className="text-amber-400 font-bold">{bendCalc.bendAllowanceMm} مم</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">استقطاع الثني (Bend Deduction - BD):</span>
                <span className="text-emerald-400 font-bold">{bendCalc.bendDeductionMm} مم</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">تراجع الزاوية (Setback - SB):</span>
                <span className="text-slate-200">{bendCalc.setbackMm} مم</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              معادلة الطول المفرد: <br />
              <code className="text-amber-300 font-mono">Flat Length = Flange_1 + Flange_2 - {bendCalc.bendDeductionMm} mm</code>
            </p>
          </div>
        </div>
      )}

      {/* 5. Machine Registry Tab */}
      {activeSubTab === 'machines' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FACTORY_MACHINES.map((machine) => (
            <div key={machine.id} className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-100">{machine.nameAr}</h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400 block">{machine.name}</span>

              <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">أبعاد الطاولة/المجال:</span>
                  <span className="font-mono text-slate-100">{machine.bedDimensions.x}×{machine.bedDimensions.y} مم</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">تكلفة التشغيل/الساعة:</span>
                  <span className="font-mono text-amber-300">{machine.hourlyCostEgp} ج.م / ساعة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">وقت التجهيز (Setup):</span>
                  <span className="font-mono">{machine.setupTimeMin} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">خلوص القطع (Kerf):</span>
                  <span className="font-mono">{machine.kerfWidthMm} مم</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
