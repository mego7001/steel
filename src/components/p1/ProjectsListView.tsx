/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Projects List View Component
 */

import React, { useState } from 'react';
import { ProjectMetadata, UserRole } from '../../types/p1';
import {
  FolderGit2,
  PlusCircle,
  Search,
  Archive,
  ArrowRight,
  Calendar,
  Building2,
  Clock,
  Layers,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface ProjectsListViewProps {
  projects: ProjectMetadata[];
  roles: UserRole[];
  onOpenProject: (projectId: string) => void;
  onNewProjectClick: () => void;
  onArchiveProject: (projectId: string) => void;
  onUnarchiveProject: (projectId: string) => void;
  isOwner: boolean;
}

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  projects,
  roles,
  onOpenProject,
  onNewProjectClick,
  onArchiveProject,
  onUnarchiveProject,
  isOwner,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchived, setFilterArchived] = useState(false);

  const filtered = projects.filter((p) => {
    if (filterArchived !== Boolean(p.isArchived)) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.title.toLowerCase().includes(term) ||
      p.mark.toLowerCase().includes(term) ||
      p.clientName.toLowerCase().includes(term)
    );
  });

  const canCreate = roles.includes('owner') || roles.includes('engineer');

  return (
    <div className="space-y-6">
      {/* Top Banner and Controls */}
      <div className="p-4 md:p-6 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base md:text-lg font-bold text-slate-100">
              سجل المشاريع ومساحات العمل المستقلة (Independent Project Workspaces)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            مساحة عمل موثقة لكل مشروع تحتفظ بمدخلاته ومصادره وإصداراته المستقلة مع عزل تام للبيانات.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onNewProjectClick}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>مشروع مستقل جديد</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Active vs Archived Pills */}
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
          <button
            onClick={() => setFilterArchived(false)}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              !filterArchived ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المشاريع النشطة ({projects.filter((p) => !p.isArchived).length})
          </button>
          <button
            onClick={() => setFilterArchived(true)}
            className={`px-3 py-1.5 rounded-md font-bold transition cursor-pointer ${
              filterArchived ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الأرشيف ({projects.filter((p) => p.isArchived).length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو الكود أو العميل..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 outline-none"
          />
        </div>
      </div>

      {/* Projects Grid / List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-3">
          <FolderGit2 className="w-10 h-10 mx-auto text-slate-600" />
          <p className="text-sm font-bold text-slate-300">لا توجد مشاريع مطابقة في هذا النطاق.</p>
          <p className="text-xs text-slate-500">
            {searchTerm ? 'جرب البحث بكلمات أخرى.' : 'يمكنك إنشاء مشروع جديد بالنقر على زر "+ مشروع مستقل جديد" أعلاه.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3 shadow-lg group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                    {project.mark}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {project.currency} • {project.displayUnits}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition leading-snug">
                  {project.title}
                </h3>

                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>العميل: {project.clientName || 'غير مسجل'}</span>
                  </div>
                  {project.location && (
                    <div className="text-[11px] text-slate-500 truncate mr-5">
                      الموقع: {project.location} ({project.country})
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>آخر تعديل: {new Date(project.updatedAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => onOpenProject(project.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>فتح مساحة العمل</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {isOwner && (
                  <div>
                    {project.isArchived ? (
                      <button
                        onClick={() => onUnarchiveProject(project.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-xs flex items-center gap-1"
                        title="استعادة من الأرشيف"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px]">استعادة</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onArchiveProject(project.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition cursor-pointer text-xs"
                        title="أرشفة المشروع"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
