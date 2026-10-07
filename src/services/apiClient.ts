/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Client API Service
 * Handles HTTP requests to /api/v1 with authentication headers and conflict handling
 */

import {
  AuditEvent,
  CanonicalHashes,
  Organization,
  ProjectAttachment,
  ProjectIssue,
  ProjectMetadata,
  ProjectRevision,
  ProjectWorkspace,
  ReviewComment,
  SystemCapabilityInfo,
  User,
  UserRole,
  WorkspaceDraftData,
} from '../types/p1';

export class RevisionConflictError extends Error {
  code: string;
  expectedVersion: number;
  currentVersion: number;
  updatedBy: string;
  updatedAt: string;

  constructor(details: any) {
    super('تم تعديل المشروع من جلسة أخرى. يرجى مراجعة التغييرات قبل الحفظ لمنع فقد البيانات.');
    this.name = 'RevisionConflictError';
    this.code = 'REVISION_CONFLICT';
    this.expectedVersion = details?.expected_version;
    this.currentVersion = details?.current_version;
    this.updatedBy = details?.updated_by;
    this.updatedAt = details?.updated_at;
  }
}

export class CapabilityBlockedError extends Error {
  code: string;
  plannedPhase: string;

  constructor(message: string, plannedPhase: string) {
    super(message);
    this.name = 'CapabilityBlockedError';
    this.code = 'CAPABILITY_NOT_AVAILABLE';
    this.plannedPhase = plannedPhase;
  }
}

class ApiClient {
  private activeUserId: string = 'usr_eng_ahmed';
  private activeOrgId: string = 'org_factory_a';

  setSession(userId: string, orgId: string) {
    this.activeUserId = userId;
    this.activeOrgId = orgId;
    localStorage.setItem('mwec_user_id', userId);
    localStorage.setItem('mwec_org_id', orgId);
  }

  loadStoredSession() {
    const u = localStorage.getItem('mwec_user_id');
    const o = localStorage.getItem('mwec_org_id');
    if (u) this.activeUserId = u;
    if (o) this.activeOrgId = o;
  }

  getAuthHeaders(): Record<string, string> {
    return {
      'x-user-id': this.activeUserId,
      'x-org-id': this.activeOrgId,
      'Content-Type': 'application/json',
    };
  }

  async getSession(): Promise<{
    currentUser: User | null;
    currentOrg: Organization | null;
    roles: UserRole[];
    allTestUsers: User[];
    allOrganizations: Organization[];
  }> {
    const res = await fetch('/api/v1/me', { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('فشل جلب بيانات الجلسة الحالية.');
    return res.json();
  }

  async getCapabilities(): Promise<{ phase: string; version: string; capabilities: SystemCapabilityInfo[] }> {
    const res = await fetch('/api/v1/capabilities', { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('فشل جلب مصفوفة قدرات النظام.');
    return res.json();
  }

  async listProjects(filterArchived = false, search = ''): Promise<{ projects: ProjectMetadata[]; total: number }> {
    const query = new URLSearchParams({
      archived: filterArchived ? 'true' : 'false',
      search,
    });
    const res = await fetch(`/api/v1/projects?${query.toString()}`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('فشل جلب قائمة المشاريع.');
    return res.json();
  }

  async createProject(
    payload: {
      title: string;
      projectType: any;
      clientName: string;
      location?: string;
      country?: string;
      dueDate?: string;
      currency?: string;
      displayUnits?: string;
      notes?: string;
      scopeDescription?: string;
    },
    idempotencyKey?: string
  ): Promise<{ metadata: ProjectMetadata; workspace: ProjectWorkspace }> {
    const headers = this.getAuthHeaders();
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await fetch('/api/v1/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'فشل إنشاء المشروع.');
    }
    return data;
  }

  async getProject(projectId: string): Promise<{ project: ProjectMetadata; userRoles: UserRole[] }> {
    const res = await fetch(`/api/v1/projects/${projectId}`, { headers: this.getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'فشل فتح بيانات المشروع أو لا تملك صلاحية الوصول إليه.');
    }
    return data;
  }

  async getWorkspace(
    projectId: string
  ): Promise<{ workspace: ProjectWorkspace; metadata: ProjectMetadata; issues: ProjectIssue[] }> {
    const res = await fetch(`/api/v1/projects/${projectId}/workspace`, { headers: this.getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل جلب مسودة المشروع.');
    return data;
  }

  async updateWorkspace(
    projectId: string,
    draftData: Partial<WorkspaceDraftData>,
    expectedVersion: number
  ): Promise<{ workspace: ProjectWorkspace; metadata: ProjectMetadata; issues: ProjectIssue[] }> {
    const res = await fetch(`/api/v1/projects/${projectId}/workspace`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ draftData, expectedVersion }),
    });

    const data = await res.json();
    if (res.status === 409 && data.error?.code === 'REVISION_CONFLICT') {
      throw new RevisionConflictError(data.error?.details);
    }
    if (!res.ok) {
      throw new Error(data.error?.message || 'فشل حفظ المسودة.');
    }
    return data;
  }

  async validateWorkspace(
    projectId: string
  ): Promise<{ issues: ProjectIssue[]; hashes: CanonicalHashes; completenessStatus: string }> {
    const res = await fetch(`/api/v1/projects/${projectId}/validate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل التحقق من المسودة.');
    return data;
  }

  async getRevisions(projectId: string): Promise<{ revisions: ProjectRevision[] }> {
    const res = await fetch(`/api/v1/projects/${projectId}/revisions`, { headers: this.getAuthHeaders() });
    if (!res.ok) throw new Error('فشل جلب تاريخ النسخ.');
    return res.json();
  }

  async createRevision(
    projectId: string,
    reason: string,
    expectedVersion: number
  ): Promise<{ revision: ProjectRevision }> {
    const res = await fetch(`/api/v1/projects/${projectId}/revisions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason, expectedVersion }),
    });
    const data = await res.json();
    if (res.status === 409 && data.error?.code === 'REVISION_CONFLICT') {
      throw new RevisionConflictError(data.error?.details);
    }
    if (!res.ok) throw new Error(data.error?.message || 'فشل إنشاء النسخة الثابتة.');
    return data;
  }

  async restoreRevision(
    projectId: string,
    revisionId: string,
    expectedVersion: number
  ): Promise<{ workspace: ProjectWorkspace; metadata: ProjectMetadata }> {
    const res = await fetch(`/api/v1/projects/${projectId}/restore`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ revisionId, expectedVersion }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل استعادة النسخة.');
    return data;
  }

  async archiveProject(projectId: string): Promise<{ metadata: ProjectMetadata }> {
    const res = await fetch(`/api/v1/projects/${projectId}/archive`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل أرشفة المشروع.');
    return data;
  }

  async unarchiveProject(projectId: string): Promise<{ metadata: ProjectMetadata }> {
    const res = await fetch(`/api/v1/projects/${projectId}/unarchive`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل إلغاء أرشفة المشروع.');
    return data;
  }

  async getReviewComments(projectId: string): Promise<{ comments: ReviewComment[] }> {
    const res = await fetch(`/api/v1/projects/${projectId}/review-comments`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async addReviewComment(
    projectId: string,
    revisionId: string | null,
    text: string
  ): Promise<{ comment: ReviewComment }> {
    const res = await fetch(`/api/v1/projects/${projectId}/review-comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ revisionId, text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل إضافة التعليق.');
    return data;
  }

  async getAttachments(projectId: string): Promise<{ attachments: ProjectAttachment[] }> {
    const res = await fetch(`/api/v1/projects/${projectId}/attachments`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  async uploadAttachment(
    projectId: string,
    fileMeta: { originalName: string; sizeBytes: number; contentType: string }
  ): Promise<{ attachment: ProjectAttachment }> {
    const res = await fetch(`/api/v1/projects/${projectId}/attachments/upload-intent`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(fileMeta),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'فشل رفع المرفق.');
    return data;
  }

  async getAuditEvents(projectId: string): Promise<{ auditEvents: AuditEvent[] }> {
    const res = await fetch(`/api/v1/projects/${projectId}/audit`, { headers: this.getAuthHeaders() });
    return res.json();
  }

  // Demonstration test for P1-GRD-01: calling release endpoint must be blocked with 409!
  async tryTriggerRelease(projectId: string): Promise<any> {
    const res = await fetch(`/api/v1/projects/${projectId}/release`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (res.status === 409 && data.error?.code === 'CAPABILITY_NOT_AVAILABLE') {
      throw new CapabilityBlockedError(data.error.message, data.error.planned_phase);
    }
    return data;
  }
}

export const apiClient = new ApiClient();
apiClient.loadStoredSession();
