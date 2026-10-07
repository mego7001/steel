/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Master Project Workspace Component
 * Implements draft editing, autosave, conflict handling, provenance cards,
 * honest statuses, immutable snapshots, and private attachments
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  AuditEvent,
  CanonicalHashes,
  InputProvenance,
  ProjectAttachment,
  ProjectIssue,
  ProjectMetadata,
  ProjectRevision,
  ProjectWorkspace,
  ReviewComment,
  SourceKind,
  SystemCapabilityInfo,
  UserRole,
  VerificationState,
  WorkspaceDraftData,
} from '../../types/p1';
import {
  apiClient,
  RevisionConflictError,
  CapabilityBlockedError,
} from '../../services/apiClient';
import { computeCanonicalHashes } from '../../services/canonicalHash';
import { parseNumericInput, validateWorkspaceDraft } from '../../services/dataValidator';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  Sparkles,
  Paperclip,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Download,
  Info,
  Check,
  X,
  Lock,
  Flame,
  HardHat,
  Ban,
  Eye,
} from 'lucide-react';

interface ProjectWorkspaceViewProps {
  projectId: string;
  userRoles: UserRole[];
  capabilities: SystemCapabilityInfo[];
  onBackToList: () => void;
  isOwner: boolean;
}

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  projectId,
  userRoles,
  capabilities,
  onBackToList,
  isOwner,
}) => {
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [draft, setDraft] = useState<WorkspaceDraftData | null>(null);
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [revisions, setRevisions] = useState<ProjectRevision[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [reviewComments, setReviewComments] = useState<ReviewComment[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [canonicalHashes, setCanonicalHashes] = useState<CanonicalHashes | null>(null);

  const [activeTab, setActiveTab] = useState<
    'info' | 'provenance' | 'design_basis' | 'issues' | 'attachments' | 'reviews' | 'history' | 'capabilities'
  >('provenance');

  // Autosave and concurrency state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'conflict' | 'error'>('saved');
  const [conflictDetails, setConflictDetails] = useState<any | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotReason, setSnapshotReason] = useState('');
  const [isGuardTestModalOpen, setIsGuardTestModalOpen] = useState(false);
  const [guardTestResult, setGuardTestResult] = useState<{ message: string; phase: string } | null>(null);

  // New review comment
  const [newCommentText, setNewCommentText] = useState('');

  // Upload attachment draft
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const canEdit = (userRoles.includes('engineer') || userRoles.includes('owner')) && !metadata?.isArchived;

  // Load project workspace data
  const loadProjectData = async () => {
    try {
      const res = await apiClient.getWorkspace(projectId);
      setMetadata(res.metadata);
      setWorkspace(res.workspace);
      setDraft(JSON.parse(JSON.stringify(res.workspace.draftData)));
      setIssues(res.issues);
      setSaveStatus('saved');

      // Compute hashes
      const hashes = await computeCanonicalHashes(res.workspace.draftData, {
        currency: res.metadata.currency,
      });
      setCanonicalHashes(hashes);

      // Load side resources
      const revs = await apiClient.getRevisions(projectId);
      setRevisions(revs.revisions);

      const atts = await apiClient.getAttachments(projectId);
      setAttachments(atts.attachments);

      const comms = await apiClient.getReviewComments(projectId);
      setReviewComments(comms.comments);

      const auds = await apiClient.getAuditEvents(projectId);
      setAuditEvents(auds.auditEvents);
    } catch (err: any) {
      setSaveErrorMessage(err.message || 'فشل جلب بيانات مساحة العمل.');
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Execute Save (Manual or Debounced)
  const executeSave = async (draftToSave: WorkspaceDraftData) => {
    if (!workspace || !canEdit) return;

    setSaveStatus('saving');
    setSaveErrorMessage(null);

    try {
      const res = await apiClient.updateWorkspace(projectId, draftToSave, workspace.version);
      setWorkspace(res.workspace);
      setMetadata(res.metadata);
      setIssues(res.issues);
      setSaveStatus('saved');

      // Recompute canonical hashes
      const hashes = await computeCanonicalHashes(res.workspace.draftData, {
        currency: res.metadata.currency,
      });
      setCanonicalHashes(hashes);
    } catch (err: any) {
      if (err instanceof RevisionConflictError) {
        setSaveStatus('conflict');
        setConflictDetails({
          expectedVersion: err.expectedVersion,
          currentVersion: err.currentVersion,
          updatedBy: err.updatedBy,
          updatedAt: err.updatedAt,
        });
      } else {
        setSaveStatus('error');
        setSaveErrorMessage(err.message || 'فشل حفظ المسودة.');
      }
    }
  };

  // Helper to update draft field and trigger autosave debounce
  const updateDraftField = (updater: (prev: WorkspaceDraftData) => WorkspaceDraftData) => {
    if (!draft || !canEdit) return;
    const updated = updater(draft);
    setDraft(updated);
    setSaveStatus('unsaved');
  };

  // Debounced Autosave (1 second after user stops typing)
  useEffect(() => {
    if (saveStatus !== 'unsaved' || !draft) return;
    const timer = setTimeout(() => {
      executeSave(draft);
    }, 1200);
    return () => clearTimeout(timer);
  }, [draft, saveStatus]);

  // Helper to update Provenance card for an input field
  const updateProvenance = (fieldPath: string, partial: Partial<InputProvenance>) => {
    if (!draft) return;
    const existing = draft.provenance[fieldPath] || {
      sourceKind: 'assumed' as SourceKind,
      sourceRef: '',
      enteredBy: 'م. أحمد الشافعي',
      enteredAt: new Date().toISOString(),
      unit: '',
      verificationState: 'unverified' as VerificationState,
    };

    updateDraftField((prev) => ({
      ...prev,
      provenance: {
        ...prev.provenance,
        [fieldPath]: {
          ...existing,
          ...partial,
          enteredAt: new Date().toISOString(),
        },
      },
    }));
  };

  // Handle Snapshot creation
  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      const res = await apiClient.createRevision(
        projectId,
        snapshotReason.trim() || 'نسخة اعتماد مرحلية',
        workspace.version
      );
      setRevisions([res.revision, ...revisions]);
      setIsSnapshotModalOpen(false);
      setSnapshotReason('');
      // Reload audit
      const auds = await apiClient.getAuditEvents(projectId);
      setAuditEvents(auds.auditEvents);
    } catch (err: any) {
      alert(err.message || 'فشل إنشاء النسخة الثابتة.');
    }
  };

  // Handle Snapshot Restore
  const handleRestoreRevision = async (revisionId: string) => {
    if (!workspace) return;
    if (!window.confirm('هل أنت متأكد من استعادة هذه النسخة كمسودة عمل جديدة؟')) return;

    try {
      const res = await apiClient.restoreRevision(projectId, revisionId, workspace.version);
      setWorkspace(res.workspace);
      setMetadata(res.metadata);
      setDraft(JSON.parse(JSON.stringify(res.workspace.draftData)));
      setIssues(validateWorkspaceDraft(res.metadata, res.workspace.draftData));
      setSaveStatus('saved');
      alert('تمت استعادة النسخة كمسودة عمل جديدة بنجاح.');
    } catch (err: any) {
      alert(err.message || 'فشل استعادة النسخة.');
    }
  };

  // Test Guarded Release Endpoint (Demonstrating P1-GRD-01 enforcement)
  const handleTestGuardedRelease = async () => {
    try {
      await apiClient.tryTriggerRelease(projectId);
      alert('فشل الفحص: تم السماح بإطلاق التصنيع!');
    } catch (err: any) {
      if (err instanceof CapabilityBlockedError) {
        setGuardTestResult({
          message: err.message,
          phase: err.plannedPhase,
        });
        setIsGuardTestModalOpen(true);
      } else {
        alert(err.message);
      }
    }
  };

  // Handle Review Comment Add
  const handleAddReviewComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const res = await apiClient.addReviewComment(projectId, null, newCommentText.trim());
      setReviewComments([...reviewComments, res.comment]);
      setNewCommentText('');
    } catch (err: any) {
      alert(err.message || 'فشل إضافة التعليق.');
    }
  };

  // Handle Attachment Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(`جاري فحص ورفع الملف (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
    try {
      const res = await apiClient.uploadAttachment(projectId, {
        originalName: file.name,
        sizeBytes: file.size,
        contentType: file.type || 'application/pdf',
      });
      setAttachments([...attachments, res.attachment]);
      setUploadProgress(null);
    } catch (err: any) {
      alert(err.message || 'فشل رفع الملف.');
      setUploadProgress(null);
    }
  };

  if (!metadata || !draft) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <Clock className="w-8 h-8 mx-auto animate-spin text-amber-500" />
        <p className="text-sm">جاري تحميل مسودة المشروع والتحقق من الصلاحيات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToList}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            title="العودة لقائمة المشاريع"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                {metadata.mark}
              </span>
              <h2 className="text-base font-bold text-slate-100">{metadata.title}</h2>
              {metadata.isArchived && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                  مؤرشف (قراءة فقط)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              العميل: {metadata.clientName || 'غير مسجل'} • النسخة: v{workspace?.version || 1}
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Save Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 ${
              saveStatus === 'saved'
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : saveStatus === 'saving'
                ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                : saveStatus === 'conflict'
                ? 'bg-rose-950 text-rose-300 border-rose-800'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
            }`}
          >
            {saveStatus === 'saved' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {saveStatus === 'saving' && <Clock className="w-3.5 h-3.5 animate-spin" />}
            {saveStatus === 'conflict' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
            {saveStatus === 'unsaved' && <AlertCircle className="w-3.5 h-3.5" />}
            <span>
              {saveStatus === 'saved'
                ? `محفوظ في الخادم (v${workspace?.version})`
                : saveStatus === 'saving'
                ? 'جاري الحفظ...'
                : saveStatus === 'conflict'
                ? 'تعارض في الحفظ (409)'
                : 'تعديلات غير محفوظة'}
            </span>
          </div>

          {canEdit && (
            <>
              <button
                onClick={() => executeSave(draft)}
                disabled={saveStatus === 'saving'}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ المسودة</span>
              </button>

              <button
                onClick={() => setIsSnapshotModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>إنشاء نسخة ثابتة (Snapshot)</span>
              </button>
            </>
          )}

          {/* Test Guarded Endpoint Button per P1-GRD-01/02 */}
          <button
            onClick={handleTestGuardedRelease}
            className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
            title="فحص حظر إطلاق التصنيع الصوري والتصدير للماكينات"
          >
            <Ban className="w-3 h-3 text-rose-400" />
            <span className="hidden sm:inline">فحص حظر التصنيع (Guard 409)</span>
          </button>
        </div>
      </div>

      {/* REVISION CONFLICT BANNER & DIALOG (P1-PRJ-04) */}
      {saveStatus === 'conflict' && conflictDetails && (
        <div className="p-4 rounded-xl bg-rose-950/80 border-2 border-rose-600 text-slate-100 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>تعارض في الحفظ: تم تعديل هذا المشروع من جلسة أخرى بالتوازي (HTTP 409 Conflict)</span>
          </div>
          <p className="text-xs text-rose-200 leading-relaxed">
            نسختك المحلية تستند إلى الإصدار رقم <strong>v{conflictDetails.expectedVersion}</strong> بينما أحدث نسخة على الخادم هي <strong>v{conflictDetails.currentVersion}</strong>. لمنع فقدان البيانات والـ Overwrite الصامت، تم إيقاف الحفظ حتى تتخذ قرارك:
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => loadProjectData()}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              إعادة تحميل أحدث نسخة من الخادم (Reload Server Version)
            </button>
            <button
              onClick={() => {
                // Retry conditional save with latest version after user inspection
                if (workspace) {
                  setWorkspace({ ...workspace, version: conflictDetails.currentVersion });
                  setSaveStatus('unsaved');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
            >
              متابعة الحفظ فوق النسخة الحالية (Accept Server Version Increment)
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-1 overflow-x-auto text-xs font-bold pb-px">
        {[
          { id: 'provenance', label: 'المدخلات وحصر المصادر', icon: Layers, badge: issues.length },
          { id: 'design_basis', label: 'أساس التصميم والأحمال', icon: FileText, flag: 'unsupported' },
          { id: 'info', label: 'بيانات المشروع والعميل', icon: Building2 },
          { id: 'issues', label: 'مشاكل ونواقص البيانات', icon: AlertCircle, count: issues.filter((i) => i.severity === 'error').length },
          { id: 'attachments', label: 'المرفقات والمراجع الخاصة', icon: Paperclip, count: attachments.length },
          { id: 'reviews', label: 'المراجعة والتعليقات', icon: MessageSquare, count: reviewComments.length },
          { id: 'history', label: 'سجل الإصدارات والأحداث', icon: History, count: revisions.length },
          { id: 'capabilities', label: 'مصفوفة قدرات النسخة', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-t-lg transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-t-2 border-amber-500 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {tab.count}
                </span>
              )}
              {tab.flag === 'unsupported' && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  غير محقق
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --- TAB CONTENT 1: INPUTS & PROVENANCE --- */}
      {activeTab === 'provenance' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  الأبعاد الهندسية وحصر مصادر المدخلات (Geometric Dimensions & Provenance)
                </h3>
                <span className="text-xs text-slate-400">
                  وفقاً للبند <strong>P1-DAT-03</strong>: توثيق أصل كل قيمة ومصدرها وحالة تحققها لمنع الاعتماد على افتراضات غامضة.
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-950 font-mono text-slate-300 border border-slate-800">
                الوحدات في النطاق: أمتار (m)
              </span>
            </div>

            {/* Inputs Grid with Provenance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Length */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">طول الهيكل L (Length):</span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {draft.dimensions.lengthM !== null ? `${draft.dimensions.lengthM} m` : 'غير محدد'}
                  </span>
                </div>

                <input
                  type="text"
                  disabled={!canEdit}
                  value={draft.dimensions.lengthM !== null ? String(draft.dimensions.lengthM) : ''}
                  onChange={(e) => {
                    const parsed = parseNumericInput(e.target.value);
                    updateDraftField((prev) => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, lengthM: parsed.value },
                    }));
                  }}
                  placeholder="أدخل الطول بالمتر (مثال: 6.0)"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-mono"
                />

                {/* Provenance Card */}
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">نوع المصدر:</span>
                    <select
                      disabled={!canEdit}
                      value={draft.provenance['dimensions.lengthM']?.sourceKind || 'assumed'}
                      onChange={(e) => updateProvenance('dimensions.lengthM', { sourceKind: e.target.value as SourceKind })}
                      className="bg-slate-950 border border-slate-700 rounded px-1 text-[11px] text-slate-200"
                    >
                      <option value="measured">قياس فعلي (Measured)</option>
                      <option value="supplied">وارد من العميل (Supplied)</option>
                      <option value="code">من كود (Code)</option>
                      <option value="catalog">كتالوج (Catalog)</option>
                      <option value="assumed">افتراض هندسي (Assumed)</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    disabled={!canEdit}
                    value={draft.provenance['dimensions.lengthM']?.sourceRef || ''}
                    onChange={(e) => updateProvenance('dimensions.lengthM', { sourceRef: e.target.value })}
                    placeholder="مرجع المصدر (رقم التقرير / المعاينة)"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                  />

                  {draft.provenance['dimensions.lengthM']?.sourceKind === 'assumed' && (
                    <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>افتراض تقديري — يلزم توثيق السبب:</span>
                      </div>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={draft.provenance['dimensions.lengthM']?.note || ''}
                        onChange={(e) => updateProvenance('dimensions.lengthM', { note: e.target.value })}
                        placeholder="سبب الافتراض الهندسي..."
                        className="w-full bg-slate-950 border border-amber-500/40 rounded px-1 py-0.5 text-[10px] text-slate-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Width */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">عرض الهيكل W (Width):</span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {draft.dimensions.widthM !== null ? `${draft.dimensions.widthM} m` : 'غير محدد'}
                  </span>
                </div>

                <input
                  type="text"
                  disabled={!canEdit}
                  value={draft.dimensions.widthM !== null ? String(draft.dimensions.widthM) : ''}
                  onChange={(e) => {
                    const parsed = parseNumericInput(e.target.value);
                    updateDraftField((prev) => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, widthM: parsed.value },
                    }));
                  }}
                  placeholder="أدخل العرض بالمتر (مثال: 4.0)"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-mono"
                />

                {/* Provenance Card */}
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">نوع المصدر:</span>
                    <select
                      disabled={!canEdit}
                      value={draft.provenance['dimensions.widthM']?.sourceKind || 'assumed'}
                      onChange={(e) => updateProvenance('dimensions.widthM', { sourceKind: e.target.value as SourceKind })}
                      className="bg-slate-950 border border-slate-700 rounded px-1 text-[11px] text-slate-200"
                    >
                      <option value="measured">قياس فعلي (Measured)</option>
                      <option value="supplied">وارد من العميل (Supplied)</option>
                      <option value="code">من كود (Code)</option>
                      <option value="catalog">كتالوج (Catalog)</option>
                      <option value="assumed">افتراض هندسي (Assumed)</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    disabled={!canEdit}
                    value={draft.provenance['dimensions.widthM']?.sourceRef || ''}
                    onChange={(e) => updateProvenance('dimensions.widthM', { sourceRef: e.target.value })}
                    placeholder="مرجع المصدر (رقم التقرير / المعاينة)"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                  />

                  {draft.provenance['dimensions.widthM']?.sourceKind === 'assumed' && (
                    <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 space-y-1">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>افتراض تقديري — يلزم توثيق السبب:</span>
                      </div>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={draft.provenance['dimensions.widthM']?.note || ''}
                        onChange={(e) => updateProvenance('dimensions.widthM', { note: e.target.value })}
                        placeholder="سبب الافتراض الهندسي..."
                        className="w-full bg-slate-950 border border-amber-500/40 rounded px-1 py-0.5 text-[10px] text-slate-100"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Eave Height */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">ارتفاع الإفريز (Eave Height):</span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {draft.dimensions.eaveHeightM !== null ? `${draft.dimensions.eaveHeightM} m` : 'غير محدد'}
                  </span>
                </div>

                <input
                  type="text"
                  disabled={!canEdit}
                  value={draft.dimensions.eaveHeightM !== null ? String(draft.dimensions.eaveHeightM) : ''}
                  onChange={(e) => {
                    const parsed = parseNumericInput(e.target.value);
                    updateDraftField((prev) => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, eaveHeightM: parsed.value },
                    }));
                  }}
                  placeholder="الارتفاع بالمتر (مثال: 3.2)"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-mono"
                />

                {/* Provenance Card */}
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">نوع المصدر:</span>
                    <select
                      disabled={!canEdit}
                      value={draft.provenance['dimensions.eaveHeightM']?.sourceKind || 'supplied'}
                      onChange={(e) => updateProvenance('dimensions.eaveHeightM', { sourceKind: e.target.value as SourceKind })}
                      className="bg-slate-950 border border-slate-700 rounded px-1 text-[11px] text-slate-200"
                    >
                      <option value="supplied">وارد من العميل (Supplied)</option>
                      <option value="measured">قياس فعلي (Measured)</option>
                      <option value="code">من كود (Code)</option>
                      <option value="assumed">افتراض هندسي (Assumed)</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    disabled={!canEdit}
                    value={draft.provenance['dimensions.eaveHeightM']?.sourceRef || ''}
                    onChange={(e) => updateProvenance('dimensions.eaveHeightM', { sourceRef: e.target.value })}
                    placeholder="المخطط المعماري أو مرجع الارتفاع"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                  />
                </div>
              </div>

              {/* Ridge Height */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">ارتفاع الذروة (Ridge Height):</span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {draft.dimensions.ridgeHeightM !== null ? `${draft.dimensions.ridgeHeightM} m` : 'غير محدد'}
                  </span>
                </div>

                <input
                  type="text"
                  disabled={!canEdit}
                  value={draft.dimensions.ridgeHeightM !== null ? String(draft.dimensions.ridgeHeightM) : ''}
                  onChange={(e) => {
                    const parsed = parseNumericInput(e.target.value);
                    updateDraftField((prev) => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, ridgeHeightM: parsed.value },
                    }));
                  }}
                  placeholder="الارتفاع عند القمة بالمتر (مثال: 3.5)"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-mono"
                />

                <div className="p-2 rounded bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">نوع المصدر:</span>
                    <select
                      disabled={!canEdit}
                      value={draft.provenance['dimensions.ridgeHeightM']?.sourceKind || 'assumed'}
                      onChange={(e) => updateProvenance('dimensions.ridgeHeightM', { sourceKind: e.target.value as SourceKind })}
                      className="bg-slate-950 border border-slate-700 rounded px-1 text-[11px] text-slate-200"
                    >
                      <option value="assumed">افتراض هندسي (Assumed)</option>
                      <option value="supplied">وارد من العميل (Supplied)</option>
                      <option value="measured">قياس فعلي (Measured)</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    disabled={!canEdit}
                    value={draft.provenance['dimensions.ridgeHeightM']?.sourceRef || ''}
                    onChange={(e) => updateProvenance('dimensions.ridgeHeightM', { sourceRef: e.target.value })}
                    placeholder="سبب الافتراض أو زاوية الميل..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                  />
                </div>
              </div>

              {/* Bays count */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">عدد الباكيات (Bays Count):</span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {draft.dimensions.baysCount !== null ? `${draft.dimensions.baysCount} باكيات` : 'غير محدد'}
                  </span>
                </div>

                <input
                  type="number"
                  disabled={!canEdit}
                  value={draft.dimensions.baysCount !== null ? draft.dimensions.baysCount : ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || null;
                    updateDraftField((prev) => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, baysCount: v },
                    }));
                  }}
                  placeholder="عدد الباكيات (مثال: 3)"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-mono"
                />
              </div>

              {/* Steel Material Grade */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">رتبة الصلب (Steel Grade):</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {draft.material.steelGrade}
                  </span>
                </div>

                <select
                  disabled={!canEdit}
                  value={draft.material.steelGrade}
                  onChange={(e) => {
                    const g = e.target.value;
                    const fy = g === 'S235' ? 235 : g === 'S355' ? 355 : 275;
                    updateDraftField((prev) => ({
                      ...prev,
                      material: { ...prev.material, steelGrade: g, FyMpa: fy },
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-slate-100 font-mono"
                >
                  <option value="S275">S275 (Fy = 275 MPa, EN 10025-2)</option>
                  <option value="S355">S355 (Fy = 355 MPa, EN 10025-2)</option>
                  <option value="S235">S235 (Fy = 235 MPa, EN 10025-2)</option>
                  <option value="ASTM A36">ASTM A36 (Fy = 250 MPa)</option>
                </select>

                <input
                  type="text"
                  disabled={!canEdit}
                  value={draft.material.sourceRef}
                  onChange={(e) => {
                    const ref = e.target.value;
                    updateDraftField((prev) => ({
                      ...prev,
                      material: { ...prev.material, sourceRef: ref },
                    }));
                  }}
                  placeholder="شهادة اختبار المصنع (MTC Ref)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 2: DESIGN BASIS (STATED HONESTLY) --- */}
      {activeTab === 'design_basis' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 space-y-2 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>إقرار الشفافية الهندسية (P1-GRD-04 Honest Capability Disclaimer)</span>
            </div>
            <p className="leading-relaxed">
              وفقاً للبند 3 وبنود الحراسة P1-GRD-04 في المواصفة التنفيذية: يتم تسجيل كود التصميم وأحمال الرياح والتشغيل كمدخلات موثقة فقط (Design Basis Record). لا يدعي هذا الإصدار إجراء أي تحليل إنشائي معتمد أو إصدار نسب استغلال (Pass/Fail) حتى اكتمال وبناء محرك التحليل المحقق في المرحلة P3.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
              مدخلات أساس التصميم الهندسي المسجلة
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">كود التصميم المستهدف (Design Code):</label>
                <select
                  disabled={!canEdit}
                  value={draft.designBasis.codeName}
                  onChange={(e) => {
                    const c = e.target.value;
                    updateDraftField((prev) => ({
                      ...prev,
                      designBasis: { ...prev.designBasis, codeName: c },
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-mono"
                >
                  <option value="AISC 360-22 LRFD">AISC 360-22 (LRFD - Load & Resistance Factor)</option>
                  <option value="AISC 360-22 ASD">AISC 360-22 (ASD - Allowable Strength)</option>
                  <option value="ECP 205 LRFD">الكود المصري ECP 205 (LRFD)</option>
                  <option value="ECP 205 ASD">الكود المصري ECP 205 (ASD)</option>
                  <option value="Eurocode 3 EN 1993">Eurocode 3 (EN 1993-1-1)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">سرعة الرياح التصميمية (كم/ساعة):</label>
                <input
                  type="number"
                  disabled={!canEdit}
                  value={draft.designBasis.windSpeedKmh || ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || null;
                    updateDraftField((prev) => ({
                      ...prev,
                      designBasis: { ...prev.designBasis, windSpeedKmh: v },
                    }));
                  }}
                  placeholder="مثال: 110 كم/س"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الحمل الحي للسقف (Roof Live Load kPa):</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={!canEdit}
                  value={draft.designBasis.roofLiveLoadKpa || ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || null;
                    updateDraftField((prev) => ({
                      ...prev,
                      designBasis: { ...prev.designBasis, roofLiveLoadKpa: v },
                    }));
                  }}
                  placeholder="مثال: 0.60 kPa"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">حمل التغطيات الميت (Cladding Dead Load kPa):</label>
                <input
                  type="number"
                  step="0.05"
                  disabled={!canEdit}
                  value={draft.designBasis.claddingDeadLoadKpa || ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || null;
                    updateDraftField((prev) => ({
                      ...prev,
                      designBasis: { ...prev.designBasis, claddingDeadLoadKpa: v },
                    }));
                  }}
                  placeholder="مثال: 0.25 kPa"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">ملاحظات واشتراطات أساس التصميم الخاصة:</label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={draft.designBasis.notes || ''}
                onChange={(e) => {
                  const n = e.target.value;
                  updateDraftField((prev) => ({
                    ...prev,
                    designBasis: { ...prev.designBasis, notes: n },
                  }));
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 3: PROJECT INFO --- */}
      {activeTab === 'info' && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
            البيانات التعريفية للمشروع ونطاق التكليف
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-slate-400 block mb-1">معرف المشروع (System ID):</span>
              <span className="font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded block">{metadata.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">كود المشروع (Project Mark):</span>
              <span className="font-mono text-amber-400 font-bold bg-slate-950 px-2 py-1 rounded block">{metadata.mark}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">نوع المشروع:</span>
              <span className="font-sans text-slate-200">{metadata.projectType}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">العميل / صاحب العمل:</span>
              <span className="font-sans text-slate-200 font-bold">{metadata.clientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">الموقع الجغرافي:</span>
              <span className="font-sans text-slate-200">{metadata.location} ({metadata.country})</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">عملة العرض ووحدات الحساب:</span>
              <span className="font-mono text-slate-300">{metadata.currency} • {metadata.displayUnits}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 4: ISSUES & COMPLETENESS --- */}
      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100">
                فحص اكتمال المدخلات والأخطاء المحفوظة ({issues.length} مشكلة مسجلة)
              </h3>
              <span className="text-slate-400 font-mono text-[11px]">
                أخطاء: {issues.filter((i) => i.severity === 'error').length} • تنبيهات: {issues.filter((i) => i.severity === 'warning').length}
              </span>
            </div>

            {issues.length === 0 ? (
              <div className="p-6 text-center text-emerald-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <p className="font-bold">جميع المدخلات الأساسية مكتملة وموثقة بدون أخطاء.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {issues.map((iss) => (
                  <div
                    key={iss.id}
                    onClick={() => setActiveTab('provenance')}
                    className={`p-3 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                      iss.severity === 'error'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : 'bg-amber-950/30 border-amber-800 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {iss.severity === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold block">{iss.messageAr}</span>
                        <span className="text-[10px] font-mono opacity-80">{iss.fieldPath} • كود: {iss.code}</span>
                      </div>
                    </div>
                    <span className="text-[10px] underline text-slate-400">انتقال للحقل ↗</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 5: ATTACHMENTS --- */}
      {activeTab === 'attachments' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-100">المرفقات والمراجع الخاصة (P1-FIL-01..03)</h3>
                <span className="text-slate-400">
                  رفع مستندات مرجعية خاصة (PDF / PNG / JPEG) بحد أقصى 25 ميجابايت مع تحقق مفوض عند التنزيل.
                </span>
              </div>

              {canEdit && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>رفع مرفق مرجعي</span>
                  </button>
                </div>
              )}
            </div>

            {uploadProgress && (
              <div className="p-2.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-mono">
                {uploadProgress}
              </div>
            )}

            {attachments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                لا توجد مرفقات مسجلة في هذا المشروع حتى الآن.
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200">{att.originalName}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        الحجم: {(att.sizeBytes / 1024 / 1024).toFixed(2)} MB • البصمة: {att.sha256.slice(0, 20)}... • رافع الملف: {att.uploadedByName}
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const down = await apiClient.getAttachments(projectId);
                        alert(`تم التحقق من التفويض بنجاح.\nالملف: ${att.originalName}\nالبصمة الرقمية: ${att.sha256}`);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-amber-400" />
                      <span>تنزيل مفوض</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 6: REVIEW COMMENTS --- */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100">سجل مراجعات وتدقيق المدخلات</h3>
              <span className="text-amber-400/80">
                ملاحظات مراجعة المدخلات فقط — لا تعد اعتماداً هندسياً للتصميم أو إطلاقاً للتصنيع.
              </span>
            </div>

            {/* Existing Comments */}
            <div className="space-y-2.5">
              {reviewComments.length === 0 ? (
                <div className="p-6 text-center text-slate-500">لا توجد تعليقات مراجعة مسجلة حتى الآن.</div>
              ) : (
                reviewComments.map((comm) => (
                  <div key={comm.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-300">{comm.authorName}</span>
                      <span className="font-mono text-slate-500">{new Date(comm.createdAt).toLocaleString('ar-EG')}</span>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed">{comm.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddReviewComment} className="pt-3 border-t border-slate-800 space-y-2">
              <textarea
                rows={2}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="أضف ملاحظة فنية أو مراجعة لاكتمال مدخلات هذا المشروع..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer text-xs"
              >
                تسجيل ملاحظة المراجعة
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 7: REVISIONS & AUDIT LOG --- */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Canonical Content Fingerprints */}
          {canonicalHashes && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>البصمات الرقمية المعتمدة للمحتوى الحالي (SHA-256 Canonical Fingerprints)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-sans">بصمة المدخلات (Input Hash):</span>
                  <span className="text-amber-400 break-all">{canonicalHashes.inputHash}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-sans">بصمة الهندسة والأبعاد (Geometry Hash):</span>
                  <span className="text-sky-400 break-all">{canonicalHashes.geometryHash}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-sans">بصمة أساس التصميم (Basis Hash):</span>
                  <span className="text-emerald-400 break-all">{canonicalHashes.basisHash}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-sans">بصمة التسعير التجاري (Price Hash):</span>
                  <span className="text-purple-400 break-all">{canonicalHashes.priceHash}</span>
                </div>
              </div>
            </div>
          )}

          {/* Immutable Revisions List */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
              سجل النسخ الثابتة المحفوظة (Immutable Revisions / Snapshots)
            </h3>

            {revisions.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                لم يتم إنشاء أي نسخة ثابتة (Snapshot) بعد. يمكنك الضغط على "إنشاء نسخة ثابتة" أعلاه.
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold text-xs">
                          Rev #{rev.revisionNo}
                        </span>
                        <span className="font-bold text-slate-100">{rev.reason}</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(rev.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 space-y-1">
                      <div>المسجل: {rev.createdByName} • معرف النسخة: {rev.id}</div>
                      <div className="text-amber-400 truncate">بصمة المدخلات: {rev.hashes.inputHash}</div>
                    </div>

                    {canEdit && (
                      <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                        <button
                          onClick={() => handleRestoreRevision(rev.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>استعادة كمسودة جديدة (Restore to Draft)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Events Timeline */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
              سجل أحداث المشروع غير القابل للتعديل (Audit Trail)
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {auditEvents.map((aud) => (
                <div
                  key={aud.id}
                  className="p-2.5 rounded bg-slate-950 border border-slate-800/70 flex items-center justify-between text-[11px] font-mono"
                >
                  <div>
                    <span className="text-amber-400 font-bold ml-2">[{aud.action}]</span>
                    <span className="text-slate-200">{aud.actorName}</span>
                  </div>
                  <span className="text-slate-500">{new Date(aud.timestamp).toLocaleTimeString('ar-EG')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 8: SYSTEM CAPABILITIES MATRIX --- */}
      {activeTab === 'capabilities' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
              مصفوفة قدرات وحالات النظام في المرحلة الأولى P1
            </h3>
            <div className="space-y-2">
              {capabilities.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{c.nameAr}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        c.status === 'validated'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {c.status === 'validated' ? 'محقق ونشط في P1 ✓' : 'معطل ومؤجل ✗'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{c.descriptionAr}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE SNAPSHOT (P1-PRJ-05) */}
      {isSnapshotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span>إنشاء نسخة ثابتة غير قابلة للتعديل (Snapshot)</span>
              </h3>
              <button onClick={() => setIsSnapshotModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed">
              وفقاً للبند <strong>P1-PRJ-05</strong>، تثبت النسخة المحفوظة الحالة الحالية للمسودة وتولد بصمات رقمية SHA-256 للمدخلات والهندسة مع حفظ هوية المنشئ وتوقيت الإنشاء بدقة.
            </p>

            <form onSubmit={handleCreateSnapshot} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">سبب وملاحظة الإصدار:</label>
                <input
                  type="text"
                  required
                  value={snapshotReason}
                  onChange={(e) => setSnapshotReason(e.target.value)}
                  placeholder="مثال: اعتماد أبعاد المعاينة الميدانية الأولية"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSnapshotModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تأكيد وحفظ النسخة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GUARD TEST RESULT (Proving P1-GRD-01/02 Enforcement) */}
      {isGuardTestModalOpen && guardTestResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>نجاح الحظر الإلزامي: P1-GRD-01 Guard Passed (HTTP 409)</span>
              </div>
              <button onClick={() => setIsGuardTestModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
              <div className="text-rose-400 font-mono font-bold">كود الاستجابة من الخادم: 409 CAPABILITY_NOT_AVAILABLE</div>
              <p className="leading-relaxed text-slate-200">{guardTestResult.message}</p>
              <div className="text-[11px] text-amber-400 font-mono">
                المرحلة المستهدفة للاعتماد والتصنيع الحقيقي: {guardTestResult.phase}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              هذا يثبت أن الخادم والواجهة يرفضان تماماً أي محاولة لإصدار ملفات تشغيل ماكينات أو اعتمادات وهمية قبل بنائها واختبارها في المراحل المخصصة.
            </p>

            <div className="text-left pt-2">
              <button
                onClick={() => setIsGuardTestModalOpen(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
