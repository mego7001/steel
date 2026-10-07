/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Session & Identity Header Component
 */

import React, { useState } from 'react';
import { Organization, SystemCapabilityInfo, User, UserRole } from '../../types/p1';
import {
  ShieldCheck,
  Building2,
  User as UserIcon,
  HelpCircle,
  LogOut,
  Sparkles,
  Layers,
  ArrowLeftRight,
  HardHat,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface SessionHeaderProps {
  currentUser: User | null;
  currentOrg: Organization | null;
  roles: UserRole[];
  allTestUsers: User[];
  allOrganizations: Organization[];
  capabilities: SystemCapabilityInfo[];
  onSwitchSession: (userId: string, orgId: string) => void;
  onOpenProjectsList: () => void;
  activeProjectMark?: string | null;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  currentUser,
  currentOrg,
  roles,
  allTestUsers,
  allOrganizations,
  capabilities,
  onSwitchSession,
  onOpenProjectsList,
  activeProjectMark,
}) => {
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);
  const [isCapabilitiesOpen, setIsCapabilitiesOpen] = useState(false);

  const getRoleLabelAr = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'مالك المؤسسة (Owner)';
      case 'admin':
        return 'مدير النظام (Admin)';
      case 'engineer':
        return 'مهندس تصميم (Engineer)';
      case 'reviewer':
        return 'مراجع فني (Reviewer)';
      case 'viewer':
        return 'مطلع فقط (Viewer)';
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      case 'admin':
        return 'bg-purple-950 text-purple-300 border-purple-700';
      case 'engineer':
        return 'bg-sky-950 text-sky-300 border-sky-700';
      case 'reviewer':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'viewer':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 select-none shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Stage Badge */}
        <div className="flex items-center gap-3">
          <div
            onClick={onOpenProjectsList}
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-400">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm md:text-base tracking-tight text-slate-100">
                  MWEC
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500 text-slate-950">
                  المرحلة P1
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                تأسيس نظام مشاريع موثوق وتصحيح حالات النتائج
              </p>
            </div>
          </div>

          {activeProjectMark && (
            <div className="hidden md:flex items-center gap-1.5 mr-2 pr-2 border-r border-slate-800 text-xs">
              <span className="text-slate-400">المشروع النشط:</span>
              <span className="font-mono text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {activeProjectMark}
              </span>
            </div>
          )}
        </div>

        {/* User, Org & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Organization Badge */}
          {currentOrg && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="max-w-[140px] md:max-w-none truncate">{currentOrg.name}</span>
            </div>
          )}

          {/* Current User & Roles */}
          {currentUser && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-200">
              <UserIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold max-w-[120px] md:max-w-none truncate">{currentUser.displayName}</span>
              {roles.map((r) => (
                <span
                  key={r}
                  className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${getRoleColor(r)}`}
                >
                  {getRoleLabelAr(r)}
                </span>
              ))}
            </div>
          )}

          {/* Switch User Button (Testing / Multi-Tenant validation) */}
          <button
            onClick={() => setIsSwitchUserOpen(true)}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="تبديل حساب المستخدم والمؤسسة لاختبار الصلاحيات"
          >
            <ArrowLeftRight className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">تبديل الحساب</span>
          </button>

          {/* Version Capabilities Button */}
          <button
            onClick={() => setIsCapabilitiesOpen(true)}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">قدرات P1</span>
          </button>
        </div>
      </div>

      {/* MODAL: Switch Test User / Multi-Tenant Verification */}
      {isSwitchUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  تبديل الحساب والمؤسسة (فحص الأمان وتعدد المستأجرين)
                </h3>
              </div>
              <button
                onClick={() => setIsSwitchUserOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              اختر أحد الحسابات المعتمدة لفحص صلاحيات الدور (Owner / Engineer / Reviewer / Admin) أو لاختبار عزل المؤسسات التام بين Factory-A و Factory-B:
            </p>

            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {allTestUsers.map((u) => {
                const orgId = u.id === 'usr_eng_omar' ? 'org_factory_b' : 'org_factory_a';
                const isSelected = currentUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      onSwitchSession(u.id, orgId);
                      setIsSwitchUserOpen(false);
                    }}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 text-slate-100 ring-1 ring-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-200">{u.displayName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                      <div className="text-[10px] text-amber-400 font-sans mt-0.5">
                        المؤسسة: {orgId === 'org_factory_a' ? 'مصنع السويس (Factory-A)' : 'شركة الدلتا (Factory-B)'}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        الحساب النشط حالياً
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: P1 Capabilities Matrix (Section 3 & P1-GRD-06) */}
      {isCapabilitiesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl animate-in fade-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  مصفوفة قدرات وحالات النظام في المرحلة الأولى (P1 Scope)
                </h3>
              </div>
              <button
                onClick={() => setIsCapabilitiesOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              وفقاً للبند 3 من المواصفة التنفيذية للمرحلة P1، يوضح الجدول التالي بشفافية مطلقة ما تم إنجازه واعتماده، وما تم عزله وحظره لعدم صلاحيته للاعتماد الهندسي أو التصنيعي:
            </p>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 text-xs">
              {capabilities.map((cap) => (
                <div
                  key={cap.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{cap.nameAr}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${
                        cap.status === 'validated'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : cap.status === 'experimental'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-rose-950 text-rose-300 border-rose-800'
                      }`}
                    >
                      {cap.status === 'validated'
                        ? 'مفعل ومحقق بالكامل ✓'
                        : cap.status === 'experimental'
                        ? 'تجريبي غير معتمد'
                        : 'معطل ومؤجل ✗'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-normal">{cap.descriptionAr}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    المعرف: {cap.id} • المرحلة المخططة: {cap.plannedPhase}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 text-left">
              <button
                onClick={() => setIsCapabilitiesOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
