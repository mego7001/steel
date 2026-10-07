import React, { useState } from 'react';
import {
  MemberCheckResult,
  ProjectData,
  StructuralMember,
} from '../types/engineering';
import { getProfileById, STANDARD_PROFILES } from '../services/catalogService';
import { MemberDiagramsView } from './MemberDiagramsView';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Filter,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react';

interface AnalysisDesignViewProps {
  project: ProjectData;
  onUpdateMemberSection: (memberId: string, newSectionId: string) => void;
  onOpenSectionLibrary?: (memberId: string) => void;
  selectedMemberId: string | null;
  onSelectMember: (memberId: string | null) => void;
}

export const AnalysisDesignView: React.FC<AnalysisDesignViewProps> = ({
  project,
  onUpdateMemberSection,
  onOpenSectionLibrary,
  selectedMemberId,
  onSelectMember,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showDiagrams, setShowDiagrams] = useState<boolean>(true);

  const membersWithChecks = project.members.map((member) => {
    const check = project.memberChecks.find((c) => c.memberId === member.id);
    const section = getProfileById(member.sectionId);
    return { member, check, section };
  });

  const filtered = membersWithChecks.filter(({ member, check }) => {
    if (filterType !== 'all' && member.type !== filterType) return false;
    if (filterStatus !== 'all' && check?.status !== filterStatus) return false;
    return true;
  });

  const failingCount = project.memberChecks.filter((c) => c.status === 'fail').length;
  const passingCount = project.memberChecks.filter((c) => c.status === 'pass').length;
  const maxRatio = Math.max(...project.memberChecks.map((c) => c.interactionRatio || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">إجمالي الأعضاء المفحوصة</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{project.members.length}</span>
            <span className="text-xs text-slate-500">عضو إنشائي</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">الأعضاء الآمنة (Pass)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{passingCount}</span>
            <span className="text-xs text-emerald-500/80">نسبة {((passingCount / Math.max(1, project.members.length)) * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">الأعضاء الحرجة أو الفاشلة (Fail)</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${failingCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {failingCount}
            </span>
            <span className="text-xs text-slate-500">{failingCount > 0 ? 'تحتاج ترقية للقطاع' : 'لا يوجد إجهادات زائدة'}</span>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">أقصى نسبة تفاعل (Max Unity Check)</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${maxRatio > 1.0 ? 'text-rose-400' : maxRatio >= 0.7 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {maxRatio.toFixed(3)}
            </span>
            <span className="text-xs text-slate-400 font-mono">الحد الأقصى &le; 1.000</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-300 font-medium">تصفية حسب نوع العضو:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
          >
            <option value="all">جميع الأنواع</option>
            <option value="column">أعمدة (Columns)</option>
            <option value="rafter">روافتر (Rafters)</option>
            <option value="purlin">مدادات (Purlins)</option>
            <option value="bracing">تربيط (Bracing)</option>
          </select>

          <span className="text-slate-500 mr-2">|</span>
          <span className="text-slate-300 font-medium">الحالة:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200"
          >
            <option value="all">الكل</option>
            <option value="pass">ناجح (Pass)</option>
            <option value="fail">فاشل (Fail)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiagrams(!showDiagrams)}
            className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              showDiagrams
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{showDiagrams ? 'إخفاء مخططات القص والعزم' : 'عرض مخططات القص والعزم (SFD/BMD)'}</span>
          </button>
        </div>
      </div>

      {/* Graphical SFD & BMD Diagrams View */}
      {showDiagrams && (
        <MemberDiagramsView
          project={project}
          selectedMemberId={selectedMemberId}
          onSelectMember={(id) => onSelectMember(id)}
          onOpenSectionLibrary={onOpenSectionLibrary}
        />
      )}

      {/* Detailed Member Design Results Table */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">العضو</th>
                <th className="py-2.5 px-3">النوع</th>
                <th className="py-2.5 px-3">القطاع المعتمد</th>
                <th className="py-2.5 px-3">القوة المحورية Pu</th>
                <th className="py-2.5 px-3">عزم الانحناء Mu</th>
                <th className="py-2.5 px-3">المقاومة الاسميّة</th>
                <th className="py-2.5 px-3">سهم الترخيم Δ</th>
                <th className="py-2.5 px-3">معامل التفاعل (Unity)</th>
                <th className="py-2.5 px-3">الحالة الكودية</th>
                <th className="py-2.5 px-3">تغيير القطاع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
              {filtered.map(({ member, check, section }) => {
                const isSelected = selectedMemberId === member.id;
                const ratio = check?.interactionRatio || 0;
                const isPass = check?.status === 'pass';

                return (
                  <tr
                    key={member.id}
                    onClick={() => onSelectMember(member.id)}
                    className={`hover:bg-slate-800/60 cursor-pointer transition ${
                      isSelected ? 'bg-amber-950/20 border-r-2 border-r-amber-500' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{member.mark}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({member.id})</span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">{member.type}</td>
                    <td className="py-2.5 px-3 text-amber-300 font-medium">
                      {section?.name || member.sectionId}
                    </td>
                    <td className="py-2.5 px-3">
                      {check ? `${check.axialForceKn.toFixed(1)} kN` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {check ? `${check.bendingMomentKnM.toFixed(1)} kN·m` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {check ? `ϕPn=${check.axialCapacityKn.toFixed(0)} | ϕMn=${check.momentCapacityKnM.toFixed(0)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {check ? (
                        <span className={check.deflectionRatio > 1.0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {(check.deflectionRatio * 12).toFixed(1)} mm ({check.deflectionRatio.toFixed(2)})
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${ratio > 1.0 ? 'bg-rose-500' : ratio >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, ratio * 100)}%` }}
                          />
                        </div>
                        <span
                          className={`font-bold ${
                            ratio > 1.0 ? 'text-rose-400' : ratio >= 0.7 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {ratio.toFixed(3)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Pass</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-rose-950/80 text-rose-300 border border-rose-800/40">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>Fail</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenSectionLibrary && onOpenSectionLibrary(member.id)}
                          className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-sans font-bold flex items-center gap-1 transition cursor-pointer"
                          title="فتح مكتبة القطاعات القياسية HEB, IPE, UPN"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>المكتبة</span>
                        </button>
                        <select
                          value={member.sectionId}
                          onChange={(e) => onUpdateMemberSection(member.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:border-amber-500 focus:outline-none"
                        >
                          {STANDARD_PROFILES.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
