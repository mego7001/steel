import React from 'react';
import {
  ProjectData,
  ProjectLifecyclePhase,
  UserRole,
} from '../types/engineering';
import {
  ShieldCheck,
  HardHat,
  Cpu,
  FileCheck,
  Layers,
  Sparkles,
  Download,
  AlertTriangle,
  Compass,
} from 'lucide-react';

interface HeaderProps {
  project: ProjectData;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNewOrderClick: () => void;
  onReleaseClick: () => void;
  onExportManifestClick: () => void;
}

const ROLES: { id: UserRole; nameAr: string; icon: any }[] = [
  { id: 'client', nameAr: 'العميل', icon: Compass },
  { id: 'design_engineer', nameAr: 'مهندس التصميم', icon: Cpu },
  { id: 'detailing_engineer', nameAr: 'مهندس التفاصيل', icon: Layers },
  { id: 'lead_reviewer', nameAr: 'المراجع المعتمد', icon: ShieldCheck },
  { id: 'shop_manager', nameAr: 'مدير الورشة', icon: HardHat },
  { id: 'qa_inspector', nameAr: 'مفتش الجودة QA', icon: FileCheck },
];

const PHASES: { id: ProjectLifecyclePhase; label: string }[] = [
  { id: 'INQUIRY', label: '1. الطلب' },
  { id: 'DESIGN_BASIS', label: '2. أساس التصميم' },
  { id: 'ANALYSIS', label: '3. التحليل' },
  { id: 'CONNECTIONS', label: '4. الوصلات' },
  { id: 'DETAILING_DRAWINGS', label: '5. الرسومات' },
  { id: 'REVIEW_APPROVAL', label: '6. المراجعة' },
  { id: 'FABRICATION_RELEASE', label: '7. الإطلاق' },
  { id: 'SHOP_FLOOR_QA', label: '8. الإنتاج' },
];

export const Header: React.FC<HeaderProps> = ({
  project,
  activeRole,
  onRoleChange,
  onNewOrderClick,
  onReleaseClick,
  onExportManifestClick,
}) => {
  const isReleased = Boolean(project.releaseId);

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Top Bar: Brand, Project details, Role & Actions */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-xl tracking-tighter shadow-md shadow-amber-500/10">
            MW
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-100 text-lg tracking-tight">MWEC</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono border border-slate-700">v1.0</span>
              <span className="text-slate-400 text-xs hidden sm:inline">| استشاري الأعمال والهياكل المعدنية</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-200 font-medium">{project.titleAr}</span>
              <span>•</span>
              <span className="font-mono text-slate-300">[{project.projectNumber}]</span>
              <span>•</span>
              <span className="font-mono text-amber-300">Rev.{project.revision}</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isReleased ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>معتمد ومُطلق للتصنيع:</span>
              <span className="font-mono text-[11px] text-emerald-200">{project.releaseId}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>نسخة عمل قيد التحرير (غير مُطلقة للورشة)</span>
            </div>
          )}
        </div>

        {/* Role Selector & Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role selector dropdown */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
            <span className="text-slate-400 ml-1.5">الدور:</span>
            <select
              value={activeRole}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                  {r.nameAr}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onNewOrderClick}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>طلب عميل جديد</span>
          </button>

          {activeRole === 'lead_reviewer' && !isReleased && (
            <button
              onClick={onReleaseClick}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>إطلاق للتصنيع Release</span>
            </button>
          )}

          <button
            onClick={onExportManifestClick}
            className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>حزمة الإطلاق Manifest</span>
          </button>
        </div>
      </div>

      {/* Lifecycle Flow Ribbon */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 px-4 py-1 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-[11px] text-slate-400">
          <span className="text-slate-500 font-semibold whitespace-nowrap">دورة حياة المشروع:</span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {PHASES.map((p, idx) => {
              const currentPhaseIdx = PHASES.findIndex((item) => item.id === project.phase);
              const isPast = idx < currentPhaseIdx;
              const isCurrent = idx === currentPhaseIdx;

              return (
                <div key={p.id} className="flex items-center gap-1 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] transition ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : isPast
                        ? 'bg-slate-800 text-emerald-400 font-medium'
                        : 'text-slate-500'
                    }`}
                  >
                    {p.label}
                  </span>
                  {idx < PHASES.length - 1 && <span className="text-slate-700">›</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
