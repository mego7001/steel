import React, { useState, useMemo } from 'react';
import { SectionProfile, StructuralMember } from '../types/engineering';
import { STANDARD_PROFILES, getProfileById } from '../services/catalogService';
import {
  Search,
  X,
  Check,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Scale,
  Maximize2,
  Sliders,
} from 'lucide-react';

interface SectionLibrarySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  member: StructuralMember | null;
  onSelectSection: (memberId: string, sectionId: string) => void;
}

export const SectionLibrarySelector: React.FC<SectionLibrarySelectorProps> = ({
  isOpen,
  onClose,
  member,
  onSelectSection,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);

  // Current member section profile
  const currentProfile = useMemo(() => {
    return member ? getProfileById(member.sectionId) || null : null;
  }, [member]);

  // Selected candidate profile in the library
  const candidateProfile = useMemo(() => {
    const targetId = highlightedSectionId || (member ? member.sectionId : STANDARD_PROFILES[0].id);
    return getProfileById(targetId) || STANDARD_PROFILES[0];
  }, [highlightedSectionId, member]);

  // Filtered profiles list
  const filteredProfiles = useMemo(() => {
    return STANDARD_PROFILES.filter((p) => {
      // Family filter
      if (selectedFamily !== 'ALL') {
        if (selectedFamily === 'TUBE') {
          if (p.family !== 'SHS' && p.family !== 'RHS') return false;
        } else if (p.family !== selectedFamily) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesFamily = p.family.toLowerCase().includes(q);
        const matchesDim = `${p.h}x${p.b}`.includes(q);
        return matchesName || matchesFamily || matchesDim;
      }

      return true;
    });
  }, [selectedFamily, searchQuery]);

  if (!isOpen || !member) return null;

  const handleApply = () => {
    if (candidateProfile) {
      onSelectSection(member.id, candidateProfile.id);
      onClose();
    }
  };

  // Compare candidate with current
  const weightDiff = currentProfile ? candidateProfile.weightKgM - currentProfile.weightKgM : 0;
  const weightDiffPct = currentProfile && currentProfile.weightKgM > 0
    ? (weightDiff / currentProfile.weightKgM) * 100
    : 0;

  const ixDiffPct = currentProfile && currentProfile.Ix > 0
    ? ((candidateProfile.Ix - currentProfile.Ix) / currentProfile.Ix) * 100
    : 0;

  const zxDiffPct = currentProfile && currentProfile.Zx > 0
    ? ((candidateProfile.Zx - currentProfile.Zx) / currentProfile.Zx) * 100
    : 0;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Layers className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-100">
                مكتبة القطاعات القياسية (Standard Steel Sections Library)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              استبدال وتحديث قطاع العضو الإنشائي <span className="font-bold font-mono text-amber-400">{member.mark}</span> ({member.type}) مع مقارنة فورية للخواص الميكانيكية.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Ribbon */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم (مثال: HEB 200, IPE 300, UPN 160)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Family Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'ALL', label: 'الكل (All)' },
              { id: 'HEB', label: 'HEB (أعمدة ثقيلة)' },
              { id: 'IPE', label: 'IPE (كمرات)' },
              { id: 'UPN', label: 'UPN (قنوات)' },
              { id: 'HEA', label: 'HEA (أعمدة)' },
              { id: 'TUBE', label: 'SHS/RHS (مواسير)' },
              { id: 'L', label: 'L (زوايا)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFamily(f.id)}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap cursor-pointer ${
                  selectedFamily === f.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Content: Left List & Right Detail Comparison */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Left Column: Scrollable Profiles Table (7 cols) */}
          <div className="lg:col-span-7 border-b lg:border-b-0 lg:border-l border-slate-800 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-3">القطاع</th>
                  <th className="py-2.5 px-3">العائلة</th>
                  <th className="py-2.5 px-3">الارتفاع h</th>
                  <th className="py-2.5 px-3">العرض b</th>
                  <th className="py-2.5 px-3">الوزن كجم/م</th>
                  <th className="py-2.5 px-3">المعامل Zx</th>
                  <th className="py-2.5 px-3 text-center">اختيار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((p) => {
                    const isCandidate = candidateProfile.id === p.id;
                    const isCurrent = currentProfile?.id === p.id;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setHighlightedSectionId(p.id)}
                        className={`hover:bg-slate-800/60 transition cursor-pointer ${
                          isCandidate
                            ? 'bg-amber-950/30 border-r-4 border-r-amber-500 text-slate-100 font-bold'
                            : isCurrent
                            ? 'bg-slate-800/30'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 font-normal border border-sky-800/50">
                              الحالي
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{p.family}</td>
                        <td className="py-2.5 px-3">{p.h} mm</td>
                        <td className="py-2.5 px-3">{p.b} mm</td>
                        <td className="py-2.5 px-3 text-amber-300 font-bold">{p.weightKgM}</td>
                        <td className="py-2.5 px-3 text-slate-300">{p.Zx} cm³</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="radio"
                            name="selectedProfileRadio"
                            checked={isCandidate}
                            onChange={() => setHighlightedSectionId(p.id)}
                            className="accent-amber-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                      لم يتم العثور على قطاعات مطابقة لكلمة البحث "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right Column: Detailed Candidate View, 2D Cross-section & Comparison (5 cols) */}
          <div className="lg:col-span-5 p-4 bg-slate-950/60 overflow-y-auto space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Profile Card Header */}
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">القطاع المُرشح للاستبدال</span>
                  <h3 className="text-lg font-black text-amber-400 font-mono tracking-tight">
                    {candidateProfile.name}
                  </h3>
                  <span className="text-xs text-slate-300 font-sans">
                    {candidateProfile.family} Standard Steel Section
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xl font-bold text-slate-100">{candidateProfile.weightKgM}</span>
                  <span className="text-[11px] text-slate-400 block">كجم / متر</span>
                </div>
              </div>

              {/* 2D Cross-Section SVG Diagram */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center">
                <span className="text-[11px] font-bold text-slate-300 mb-2 self-start">
                  المقطع العرضي والأبعاد (Cross-Section Geometry):
                </span>
                <svg
                  viewBox="0 0 240 180"
                  className="w-full max-w-[220px] h-[150px] bg-slate-950 rounded border border-slate-800 cad-grid-dense"
                >
                  {candidateProfile.family === 'IPE' || candidateProfile.family === 'HEA' || candidateProfile.family === 'HEB' ? (
                    // I / H Section
                    <g>
                      {/* Top flange */}
                      <rect x="50" y="25" width="140" height="18" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                      {/* Web */}
                      <rect x="112" y="43" width="16" height="94" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                      {/* Bottom flange */}
                      <rect x="50" y="137" width="140" height="18" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                      {/* Height dimension line */}
                      <line x1="30" y1="25" x2="30" y2="155" stroke="#94a3b8" strokeWidth="1" />
                      <text x="5" y="95" fill="#f8fafc" fontSize="10" fontFamily="monospace">h={candidateProfile.h}</text>
                      {/* Width dimension line */}
                      <line x1="50" y1="168" x2="190" y2="168" stroke="#94a3b8" strokeWidth="1" />
                      <text x="100" y="178" fill="#f8fafc" fontSize="10" fontFamily="monospace">b={candidateProfile.b}</text>
                    </g>
                  ) : candidateProfile.family === 'UPN' ? (
                    // Channel Section
                    <g>
                      {/* Back Web */}
                      <rect x="60" y="25" width="20" height="130" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                      {/* Top flange */}
                      <rect x="80" y="25" width="100" height="18" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                      {/* Bottom flange */}
                      <rect x="80" y="137" width="100" height="18" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
                      {/* Height */}
                      <text x="15" y="95" fill="#f8fafc" fontSize="10" fontFamily="monospace">h={candidateProfile.h}</text>
                      <text x="105" y="170" fill="#f8fafc" fontSize="10" fontFamily="monospace">b={candidateProfile.b}</text>
                    </g>
                  ) : (
                    // Box / Tube Section
                    <g>
                      <rect x="55" y="25" width="130" height="130" fill="none" stroke="#38bdf8" strokeWidth="18" />
                      <text x="100" y="95" fill="#f8fafc" fontSize="11" fontFamily="monospace">{candidateProfile.name}</text>
                    </g>
                  )}
                </svg>
                <div className="flex justify-between w-full text-[11px] text-slate-400 font-mono mt-1 px-2">
                  <span>tw = {candidateProfile.tw} mm</span>
                  <span>tf = {candidateProfile.tf} mm</span>
                  <span>Ag = {candidateProfile.Ag} cm²</span>
                </div>
              </div>

              {/* Side-by-Side Delta Comparison with Current Section */}
              {currentProfile && (
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 border-b border-slate-800 pb-1.5">
                    <span>مقارنة التغيير مع القطاع الحالي:</span>
                    <span className="font-mono text-slate-400">{currentProfile.name}</span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    {/* Weight Delta */}
                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-400">فرق الوزن الخطي:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={weightDiff > 0 ? 'text-amber-400' : 'text-emerald-400 font-bold'}>
                          {weightDiff > 0 ? `+${weightDiff.toFixed(1)}` : weightDiff.toFixed(1)} kg/m
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({weightDiffPct > 0 ? `+${weightDiffPct.toFixed(0)}%` : `${weightDiffPct.toFixed(0)}%`})
                        </span>
                      </div>
                    </div>

                    {/* Inertia Delta */}
                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-400">عزم القصور الذاتي Ix:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200">{candidateProfile.Ix} cm⁴</span>
                        <span className={ixDiffPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          ({ixDiffPct >= 0 ? `+${ixDiffPct.toFixed(0)}%` : `${ixDiffPct.toFixed(0)}%`})
                        </span>
                      </div>
                    </div>

                    {/* Plastic Modulus Delta */}
                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-400">المعامل اللدن Zx (مقاومة العزم):</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200">{candidateProfile.Zx} cm³</span>
                        <span className={zxDiffPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                          ({zxDiffPct >= 0 ? `+${zxDiffPct.toFixed(0)}%` : `${zxDiffPct.toFixed(0)}%`})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleApply}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد وتحديث القطاع في المشروع</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
