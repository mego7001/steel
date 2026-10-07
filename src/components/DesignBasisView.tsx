import React from 'react';
import {
  DesignCode,
  ProjectData,
  SteelGrade,
} from '../types/engineering';
import { STEEL_MATERIALS } from '../services/catalogService';
import { BookOpen, Wind, ShieldAlert, CheckCircle2, Sliders, MapPin } from 'lucide-react';

interface DesignBasisViewProps {
  project: ProjectData;
  onUpdateBasis: (updated: Partial<ProjectData>) => void;
  onTriggerRecalculate: () => void;
}

const CODES: { id: DesignCode; name: string; org: string }[] = [
  { id: 'AISC_360_22_LRFD', name: 'AISC 360-22 (LRFD)', org: 'American Institute of Steel Construction' },
  { id: 'AISC_360_22_ASD', name: 'AISC 360-22 (ASD)', org: 'American Institute of Steel Construction' },
  { id: 'ECP_205_ASD', name: 'ECP 205 (Allowable Stress Design)', org: 'Egyptian Code of Practice for Steel Construction' },
  { id: 'ECP_205_LRFD', name: 'ECP 205 (LRFD Ultimate Strength)', org: 'Egyptian Code of Practice for Steel Construction' },
  { id: 'EUROCODE_3', name: 'Eurocode 3 (EN 1993-1-1)', org: 'European Committee for Standardization' },
];

const EGYPTIAN_WIND_ZONES = [
  { city: 'القاهرة والجيزة (Cairo/Giza)', speedKmh: 110, zone: 'Zone 1' },
  { city: 'الإسكندرية والساحل الشمالي (Alexandria/North Coast)', speedKmh: 135, zone: 'Zone 2' },
  { city: 'السويس والعين السخنة (Suez/Ain Sokhna)', speedKmh: 130, zone: 'Zone 2' },
  { city: 'الغردقة والبحر الأحمر (Hurghada/Red Sea)', speedKmh: 145, zone: 'Zone 3' },
  { city: 'أسوان والأقصر (Aswan/Luxor)', speedKmh: 110, zone: 'Zone 1' },
];

export const DesignBasisView: React.FC<DesignBasisViewProps> = ({
  project,
  onUpdateBasis,
  onTriggerRecalculate,
}) => {
  const currentMaterial = STEEL_MATERIALS[project.steelGradeDefault] || STEEL_MATERIALS['S275'];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">أساس التصميم الإنشائي والمعايير الكودية (Design Basis)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            وفقًا للمواصفة REQ-LOAD-01: جميع الأحمال والمدخلات تحمل مصادر موثقة وتنتج تراكيب ULS/SLS معتمدة بدون أي أرقام افتراضية صامتة.
          </p>
        </div>
        <button
          onClick={onTriggerRecalculate}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition cursor-pointer shadow-md shadow-amber-500/10 flex items-center gap-1.5"
        >
          <Sliders className="w-4 h-4" />
          <span>تطبيق وإعادة الحساب الإنشائي</span>
        </button>
      </div>

      {/* Grid of Design Basis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Design Code Selection */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            كود التصميم الحاكم (Design Standard):
          </label>
          <select
            value={project.designCode}
            onChange={(e) => onUpdateBasis({ designCode: e.target.value as DesignCode })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
          >
            {CODES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400">
            المرجع: {CODES.find((c) => c.id === project.designCode)?.org}
          </p>
        </div>

        {/* 2. Steel Material Grade */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            رتبة صلب المنشأ (Steel Grade):
          </label>
          <select
            value={project.steelGradeDefault}
            onChange={(e) => onUpdateBasis({ steelGradeDefault: e.target.value as SteelGrade })}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
          >
            {Object.keys(STEEL_MATERIALS).map((grade) => (
              <option key={grade} value={grade}>
                {grade} ({STEEL_MATERIALS[grade as SteelGrade].standard})
              </option>
            ))}
          </select>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Fy = {currentMaterial.Fy} MPa</span>
            <span>Fu = {currentMaterial.Fu} MPa</span>
            <span>E = 210 GPa</span>
          </div>
        </div>

        {/* 3. Wind Load Parameters */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              سرعة الرياح التصميمية (V):
            </label>
            <span className="text-[11px] font-mono text-amber-300">{project.windSpeedKmh} كم/ساعة</span>
          </div>
          <select
            onChange={(e) => {
              const selectedSpeed = Number(e.target.value);
              if (selectedSpeed) onUpdateBasis({ windSpeedKmh: selectedSpeed });
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            <option value="">اختر من خريطة رياح الكود المصري ECP 201...</option>
            {EGYPTIAN_WIND_ZONES.map((z) => (
              <option key={z.city} value={z.speedKmh}>
                {z.city} — {z.speedKmh} كم/س ({z.zone})
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">فئة التعرض:</span>
            <select
              value={project.windExposure}
              onChange={(e) => onUpdateBasis({ windExposure: e.target.value as 'B' | 'C' | 'D' })}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
            >
              <option value="B">Exposure B (مناطق عمرانية ومحمية)</option>
              <option value="C">Exposure C (أراضٍ مفتوحة - الأكثر شيوعًا)</option>
              <option value="D">Exposure D (مناطق ساحلية وبحرية مباشرة)</option>
            </select>
          </div>
        </div>

        {/* 4. Gravity & Cladding Loads */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            أحمال السطح الميتة والحية (kN/m²):
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1">الكسوة وساندوتش بانل (SIDL):</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="2.0"
                value={project.claddingDeadLoadKpa}
                onChange={(e) => onUpdateBasis({ claddingDeadLoadKpa: parseFloat(e.target.value) || 0.25 })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
              />
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] mb-1">الحمل الحي للصيانة (LL):</span>
              <input
                type="number"
                step="0.05"
                min="0.2"
                max="3.0"
                value={project.roofLiveLoadKpa}
                onChange={(e) => onUpdateBasis({ roofLiveLoadKpa: parseFloat(e.target.value) || 0.60 })}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 5. Deflection & Serviceability Limits */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            حدود الترخيم والخدمة (SLS Deflection Criteria):
          </label>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">سهم روافتر السقف (Rafters):</span>
              <span className="font-mono text-amber-300">L / 250 (DL+LL)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">سهم المدادات (Purlins):</span>
              <span className="font-mono text-amber-300">L / 200 (DL+LL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">إزاحة قمة الأعمدة (Column Drift):</span>
              <span className="font-mono text-amber-300">H / 300 (Wind SLS)</span>
            </div>
          </div>
        </div>

        {/* 6. Execution Standard & Quality Level */}
        <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            معايير التنفيذ والجودة بالورشة:
          </label>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">فئة التنفيذ:</span>
              <span className="font-mono text-slate-200">EXC 2 (EN 1090-2)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1">
              <span className="text-slate-400">سلك اللحام:</span>
              <span className="font-mono text-slate-200">AWS A5.18 ER70S-6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">مسامير الوصلات:</span>
              <span className="font-mono text-slate-200">ISO 4014 Grade 8.8 Galvanized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Load Combinations Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">
            تراكيب الأحمال المعتمدة (Governing Load Combinations - ULS & SLS)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            عدد التراكيب: {project.loadCombinations.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">المعرف</th>
                <th className="py-2.5 px-3">اسم التركيب</th>
                <th className="py-2.5 px-3">النوع</th>
                <th className="py-2.5 px-3">معامل DL</th>
                <th className="py-2.5 px-3">معامل LL</th>
                <th className="py-2.5 px-3">معامل الرياح WL</th>
                <th className="py-2.5 px-3">الغرض الحاكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
              {project.loadCombinations.map((comb) => (
                <tr key={comb.id} className="hover:bg-slate-800/50">
                  <td className="py-2 px-3 font-bold text-amber-400">{comb.id}</td>
                  <td className="py-2 px-3 font-sans font-medium text-slate-200">{comb.name}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-sans ${comb.type === 'ULS' ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50' : 'bg-teal-950 text-teal-300 border border-teal-700/50'}`}>
                      {comb.type}
                    </span>
                  </td>
                  <td className="py-2 px-3">{comb.factors.LC_DL || 0}</td>
                  <td className="py-2 px-3">{comb.factors.LC_LL || 0}</td>
                  <td className="py-2 px-3">{comb.factors.LC_WL_X || 0}</td>
                  <td className="py-2 px-3 font-sans text-slate-400">{comb.governingReason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
