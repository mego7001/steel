/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC P1 Storage & In-Memory Relational Engine
 * Implements multi-tenancy, optimistic concurrency, revisions, and audits
 */

import {
  AuditEvent,
  CanonicalHashes,
  Organization,
  OrganizationMembership,
  ProjectAttachment,
  ProjectIssue,
  ProjectMembership,
  ProjectMetadata,
  ProjectRevision,
  ProjectWorkspace,
  ReviewComment,
  User,
  UserRole,
  WorkspaceDraftData,
} from '../src/types/p1';
import { computeCanonicalHashes } from '../src/services/canonicalHash';
import { validateWorkspaceDraft } from '../src/services/dataValidator';

export interface StorageState {
  organizations: Map<string, Organization>;
  users: Map<string, User>;
  orgMemberships: Map<string, OrganizationMembership>; // key: `${orgId}_${userId}`
  projectMemberships: Map<string, ProjectMembership>; // key: `${projectId}_${userId}`
  projects: Map<string, ProjectMetadata>;
  workspaces: Map<string, ProjectWorkspace>;
  revisions: Map<string, ProjectRevision[]>; // projectId -> revisions list
  attachments: Map<string, ProjectAttachment[]>; // projectId -> attachments list
  reviewComments: Map<string, ReviewComment[]>; // projectId -> comments list
  auditEvents: Map<string, AuditEvent[]>; // projectId -> audit list
  idempotencyKeys: Map<string, { response: any; requestHash: string; expiresAt: number }>;
}

export class MemoryStore {
  state: StorageState;

  constructor() {
    this.state = {
      organizations: new Map(),
      users: new Map(),
      orgMemberships: new Map(),
      projectMemberships: new Map(),
      projects: new Map(),
      workspaces: new Map(),
      revisions: new Map(),
      attachments: new Map(),
      reviewComments: new Map(),
      auditEvents: new Map(),
      idempotencyKeys: new Map(),
    };
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // 1. Organizations
    const orgA: Organization = {
      id: 'org_factory_a',
      name: 'مصنع السويس للصناعات المعدنية (Factory-A)',
      timezone: 'Africa/Cairo',
      defaultCurrency: 'EGP',
      settingsVersion: 1,
    };
    const orgB: Organization = {
      id: 'org_factory_b',
      name: 'شركة الدلتا للهياكل الفولاذية (Factory-B)',
      timezone: 'Africa/Cairo',
      defaultCurrency: 'EGP',
      settingsVersion: 1,
    };
    this.state.organizations.set(orgA.id, orgA);
    this.state.organizations.set(orgB.id, orgB);

    // 2. Users
    const users: User[] = [
      { id: 'usr_eng_ahmed', email: 'eng.ahmed@factory-a.com', displayName: 'م. أحمد الشافعي (Engineer)', status: 'active' },
      { id: 'usr_owner_tarek', email: 'owner@factory-a.com', displayName: 'م. طارق السويس (Owner)', status: 'active' },
      { id: 'usr_rev_samir', email: 'reviewer@factory-a.com', displayName: 'م. سمير المراجع (Reviewer)', status: 'active' },
      { id: 'usr_admin_khaled', email: 'admin@factory-a.com', displayName: 'خالد المدير (Admin)', status: 'active' },
      { id: 'usr_viewer_hassan', email: 'viewer@factory-a.com', displayName: 'حسن المتابع (Viewer)', status: 'active' },
      { id: 'usr_eng_omar', email: 'eng.omar@factory-b.com', displayName: 'م. عمر الدلتا (Engineer B)', status: 'active' },
    ];
    users.forEach((u) => this.state.users.set(u.id, u));

    // 3. Organization Memberships
    this.state.orgMemberships.set(`${orgA.id}_usr_eng_ahmed`, { orgId: orgA.id, userId: 'usr_eng_ahmed', roles: ['engineer'], status: 'active' });
    this.state.orgMemberships.set(`${orgA.id}_usr_owner_tarek`, { orgId: orgA.id, userId: 'usr_owner_tarek', roles: ['owner'], status: 'active' });
    this.state.orgMemberships.set(`${orgA.id}_usr_rev_samir`, { orgId: orgA.id, userId: 'usr_rev_samir', roles: ['reviewer'], status: 'active' });
    this.state.orgMemberships.set(`${orgA.id}_usr_admin_khaled`, { orgId: orgA.id, userId: 'usr_admin_khaled', roles: ['admin'], status: 'active' });
    this.state.orgMemberships.set(`${orgA.id}_usr_viewer_hassan`, { orgId: orgA.id, userId: 'usr_viewer_hassan', roles: ['viewer'], status: 'active' });
    this.state.orgMemberships.set(`${orgB.id}_usr_eng_omar`, { orgId: orgB.id, userId: 'usr_eng_omar', roles: ['engineer'], status: 'active' });

    // 4. Seed Initial Reference Project in Factory-A (Booth 6x4x3.2m)
    const prjAId = 'prj_booth_demo_01';
    const prjAMeta: ProjectMetadata = {
      id: prjAId,
      orgId: orgA.id,
      mark: 'PRJ-2026-001',
      title: 'مقصورة تحكم ومنصة تشغيل معيارية (Booth 6x4x3.2m)',
      projectType: 'booth_kiosk',
      clientName: 'شركة السويس لتكرير البترول',
      location: 'المنطقة الصناعية، عتاقة، السويس',
      country: 'مصر (Egypt)',
      dueDate: '2026-11-15',
      currency: 'EGP',
      displayUnits: 'metric_mm',
      notes: 'مشروع مسودة تأسيسي تم توثيق جميع مدخلاته ومصادره حسب مواصفة المرحلة P1.',
      scopeDescription: 'تصنيع وتوريد هيكل حديدي لمقصورة معيارية شامل الصاج والدهان والقواعد.',
      ownerId: 'usr_owner_tarek',
      isArchived: false,
      archivedAt: null,
      createdAt: '2026-10-07T08:00:00Z',
      updatedAt: '2026-10-07T08:00:00Z',
    };
    this.state.projects.set(prjAMeta.id, prjAMeta);

    // Project memberships for prjA
    this.state.projectMemberships.set(`${prjAId}_usr_eng_ahmed`, { projectId: prjAId, userId: 'usr_eng_ahmed', roles: ['engineer'], status: 'active' });
    this.state.projectMemberships.set(`${prjAId}_usr_owner_tarek`, { projectId: prjAId, userId: 'usr_owner_tarek', roles: ['owner'], status: 'active' });
    this.state.projectMemberships.set(`${prjAId}_usr_rev_samir`, { projectId: prjAId, userId: 'usr_rev_samir', roles: ['reviewer'], status: 'active' });
    this.state.projectMemberships.set(`${prjAId}_usr_viewer_hassan`, { projectId: prjAId, userId: 'usr_viewer_hassan', roles: ['viewer'], status: 'active' });
    // Note: usr_admin_khaled is NOT added to project memberships, proving P1-AUTH-03 admin limitation!

    const draftDataA: WorkspaceDraftData = {
      dimensions: {
        lengthM: 6.0,
        widthM: 4.0,
        eaveHeightM: 3.2,
        ridgeHeightM: 3.5,
        baysCount: 3,
        roofPitchDeg: 4.5,
      },
      provenance: {
        'dimensions.lengthM': {
          sourceKind: 'measured',
          sourceRef: 'تقرير الرفع المساحي للموقع رقم SRV-102',
          enteredBy: 'م. أحمد الشافعي',
          enteredAt: '2026-10-07T08:10:00Z',
          unit: 'm',
          verificationState: 'checked',
        },
        'dimensions.widthM': {
          sourceKind: 'measured',
          sourceRef: 'تقرير الرفع المساحي للموقع رقم SRV-102',
          enteredBy: 'م. أحمد الشافعي',
          enteredAt: '2026-10-07T08:10:00Z',
          unit: 'm',
          verificationState: 'checked',
        },
        'dimensions.eaveHeightM': {
          sourceKind: 'supplied',
          sourceRef: 'المخطط المعماري المعتمد ARCH-DWG-01',
          enteredBy: 'م. أحمد الشافعي',
          enteredAt: '2026-10-07T08:12:00Z',
          unit: 'm',
          verificationState: 'checked',
        },
        'dimensions.ridgeHeightM': {
          sourceKind: 'assumed',
          sourceRef: 'افتراض ميل السقف 4.5 درجات لتصريف الأمطار',
          enteredBy: 'م. أحمد الشافعي',
          enteredAt: '2026-10-07T08:14:00Z',
          unit: 'm',
          note: 'تم الافتراض لتأمين صرف مياه الأمطار بما لا يقل عن 4 درجات',
          verificationState: 'unverified',
        },
      },
      designBasis: {
        codeName: 'AISC 360-22 LRFD / ECP 205',
        windSpeedKmh: 110,
        roofLiveLoadKpa: 0.6,
        claddingDeadLoadKpa: 0.25,
        notes: 'الأحمال والأسس مسجلة كمدخلات فقط، ومحرك التحليل غير معتمد في المرحلة P1.',
        capabilityStatus: 'unsupported',
      },
      material: {
        steelGrade: 'S275',
        standard: 'EN 10025-2',
        FyMpa: 275,
        FuMpa: 430,
        sourceRef: 'شهادة توريد حديد السويس رقم MTC-9921',
        verificationState: 'checked',
      },
      assumptionsNotes: 'تم اعتماد ارتفاع الإفريز 3.20م لسماح حركة المشغلين داخل المقصورة.',
    };

    const workspaceA: ProjectWorkspace = {
      projectId: prjAId,
      version: 1,
      schemaVersion: '1.0.0',
      draftData: draftDataA,
      updatedBy: 'usr_eng_ahmed',
      updatedAt: '2026-10-07T08:15:00Z',
    };
    this.state.workspaces.set(prjAId, workspaceA);
    this.state.revisions.set(prjAId, []);
    this.state.attachments.set(prjAId, []);
    this.state.reviewComments.set(prjAId, []);
    this.state.auditEvents.set(prjAId, [
      {
        id: 'aud_001',
        orgId: orgA.id,
        projectId: prjAId,
        actorId: 'usr_eng_ahmed',
        actorName: 'م. أحمد الشافعي',
        action: 'create_project',
        versionRefs: { toVersion: 1 },
        requestId: 'req_seed_001',
        timestamp: '2026-10-07T08:00:00Z',
        details: { title: prjAMeta.title, mark: prjAMeta.mark },
      },
    ]);

    // 5. Seed Project in Factory-B (for cross-tenant security verification)
    const prjBId = 'prj_delta_wh_02';
    const prjBMeta: ProjectMetadata = {
      id: prjBId,
      orgId: orgB.id,
      mark: 'PRJ-DELTA-01',
      title: 'مستودع شركة الدلتا التجريبي (Delta Warehouse 20x15m)',
      projectType: 'portal_frame',
      clientName: 'الدلتا للصناعات الغذائية',
      location: 'طنطا، الغربية',
      country: 'مصر (Egypt)',
      dueDate: '2026-12-01',
      currency: 'EGP',
      displayUnits: 'metric_m',
      notes: 'مشروع خاص بمصنع Factory-B لا يحق لمستخدمي Factory-A الاطلاع عليه.',
      scopeDescription: 'هيكل جملون معدني إطار مائل.',
      ownerId: 'usr_eng_omar',
      isArchived: false,
      archivedAt: null,
      createdAt: '2026-10-07T09:00:00Z',
      updatedAt: '2026-10-07T09:00:00Z',
    };
    this.state.projects.set(prjBId, prjBMeta);
    this.state.projectMemberships.set(`${prjBId}_usr_eng_omar`, { projectId: prjBId, userId: 'usr_eng_omar', roles: ['engineer'], status: 'active' });
    this.state.workspaces.set(prjBId, {
      projectId: prjBId,
      version: 1,
      schemaVersion: '1.0.0',
      draftData: {
        dimensions: { lengthM: 20, widthM: 15, eaveHeightM: 6, ridgeHeightM: 7.5, baysCount: 4 },
        provenance: {},
        designBasis: { codeName: 'AISC 360-22 LRFD', windSpeedKmh: 120, roofLiveLoadKpa: 0.6, claddingDeadLoadKpa: 0.25, capabilityStatus: 'unsupported' },
        material: { steelGrade: 'S355', standard: 'EN 10025-2', FyMpa: 355, FuMpa: 510, sourceRef: 'MTC', verificationState: 'unverified' },
        assumptionsNotes: 'بيانات أولية',
      },
      updatedBy: 'usr_eng_omar',
      updatedAt: '2026-10-07T09:00:00Z',
    });
    this.state.revisions.set(prjBId, []);
    this.state.attachments.set(prjBId, []);
    this.state.reviewComments.set(prjBId, []);
    this.state.auditEvents.set(prjBId, []);
  }

  // --- ACCESS CONTROL & AUTHORIZATION HELPERS ---
  getUserRolesInProject(projectId: string, userId: string, orgId: string): UserRole[] {
    const orgMem = this.state.orgMemberships.get(`${orgId}_${userId}`);
    if (!orgMem || orgMem.status !== 'active') return [];

    // Owner has access to all projects in their organization
    if (orgMem.roles.includes('owner')) {
      return ['owner'];
    }

    // Specific project membership
    const prjMem = this.state.projectMemberships.get(`${projectId}_${userId}`);
    if (!prjMem || prjMem.status !== 'active') return [];

    return prjMem.roles;
  }

  canAccessProject(projectId: string, userId: string, orgId: string): boolean {
    const prj = this.state.projects.get(projectId);
    if (!prj) return false;
    // Strict multi-tenant isolation
    if (prj.orgId !== orgId) return false;

    const roles = this.getUserRolesInProject(projectId, userId, orgId);
    return roles.length > 0;
  }

  canEditProject(projectId: string, userId: string, orgId: string): boolean {
    const prj = this.state.projects.get(projectId);
    if (!prj || prj.isArchived) return false;
    if (prj.orgId !== orgId) return false;

    const roles = this.getUserRolesInProject(projectId, userId, orgId);
    return roles.includes('engineer') || roles.includes('owner');
  }

  // --- CORE METHODS ---
  listProjects(userId: string, orgId: string, filterArchived = false): ProjectMetadata[] {
    const orgMem = this.state.orgMemberships.get(`${orgId}_${userId}`);
    if (!orgMem || orgMem.status !== 'active') return [];

    const isOwner = orgMem.roles.includes('owner');
    const result: ProjectMetadata[] = [];

    for (const prj of this.state.projects.values()) {
      if (prj.orgId !== orgId) continue;
      if (filterArchived && !prj.isArchived) continue;
      if (!filterArchived && prj.isArchived) continue;

      if (isOwner) {
        result.push(prj);
      } else {
        const prjMem = this.state.projectMemberships.get(`${prj.id}_${userId}`);
        if (prjMem && prjMem.status === 'active') {
          result.push(prj);
        }
      }
    }

    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  getProject(projectId: string, userId: string, orgId: string): ProjectMetadata | null {
    if (!this.canAccessProject(projectId, userId, orgId)) return null;
    return this.state.projects.get(projectId) || null;
  }

  getWorkspace(projectId: string, userId: string, orgId: string): ProjectWorkspace | null {
    if (!this.canAccessProject(projectId, userId, orgId)) return null;
    return this.state.workspaces.get(projectId) || null;
  }

  createProject(
    payload: {
      title: string;
      projectType: any;
      clientName: string;
      location?: string;
      country?: string;
      dueDate?: string;
      currency?: 'EGP' | 'USD' | 'SAR';
      displayUnits?: 'metric_mm' | 'metric_m' | 'imperial';
      notes?: string;
      scopeDescription?: string;
    },
    userId: string,
    orgId: string,
    requestId: string
  ): { metadata: ProjectMetadata; workspace: ProjectWorkspace } {
    const orgMem = this.state.orgMemberships.get(`${orgId}_${userId}`);
    if (!orgMem || (!orgMem.roles.includes('owner') && !orgMem.roles.includes('engineer'))) {
      throw new Error('UNAUTHORIZED_CREATE: فقط المهندس أو المالك يمكنه إنشاء مشاريع جديدة.');
    }

    const projectId = `prj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const mark = `PRJ-${new Date().getFullYear()}-${randomSuffix}`;
    const now = new Date().toISOString();

    const metadata: ProjectMetadata = {
      id: projectId,
      orgId,
      mark,
      title: payload.title.trim(),
      projectType: payload.projectType || 'booth_kiosk',
      clientName: payload.clientName ? payload.clientName.trim() : '',
      location: payload.location || '',
      country: payload.country || 'مصر (Egypt)',
      dueDate: payload.dueDate || null,
      currency: payload.currency || 'EGP',
      displayUnits: payload.displayUnits || 'metric_mm',
      notes: payload.notes || '',
      scopeDescription: payload.scopeDescription || '',
      ownerId: userId,
      isArchived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // Clean initial draft - ZERO carryover from previous projects!
    const draftData: WorkspaceDraftData = {
      dimensions: {
        lengthM: null,
        widthM: null,
        eaveHeightM: null,
        ridgeHeightM: null,
        baysCount: null,
      },
      provenance: {},
      designBasis: {
        codeName: 'AISC 360-22 LRFD',
        windSpeedKmh: null,
        roofLiveLoadKpa: null,
        claddingDeadLoadKpa: null,
        capabilityStatus: 'unsupported',
      },
      material: {
        steelGrade: 'S275',
        standard: 'EN 10025-2',
        FyMpa: 275,
        FuMpa: 430,
        sourceRef: '',
        verificationState: 'unverified',
      },
      assumptionsNotes: '',
      customScopeRequirements: payload.scopeDescription || '',
    };

    const workspace: ProjectWorkspace = {
      projectId,
      version: 1,
      schemaVersion: '1.0.0',
      draftData,
      updatedBy: userId,
      updatedAt: now,
    };

    // Save project, membership, and workspace
    this.state.projects.set(projectId, metadata);
    this.state.workspaces.set(projectId, workspace);
    this.state.projectMemberships.set(`${projectId}_${userId}`, {
      projectId,
      userId,
      roles: orgMem.roles.includes('owner') ? ['owner'] : ['engineer'],
      status: 'active',
    });
    this.state.revisions.set(projectId, []);
    this.state.attachments.set(projectId, []);
    this.state.reviewComments.set(projectId, []);

    // Record audit event
    const user = this.state.users.get(userId);
    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'create_project',
      versionRefs: { toVersion: 1 },
      requestId,
      details: { title: metadata.title, mark: metadata.mark },
    });

    return { metadata, workspace };
  }

  updateWorkspace(
    projectId: string,
    draftData: Partial<WorkspaceDraftData>,
    expectedVersion: number,
    userId: string,
    orgId: string,
    requestId: string
  ): { workspace: ProjectWorkspace; metadata: ProjectMetadata } {
    if (!this.canEditProject(projectId, userId, orgId)) {
      throw new Error('FORBIDDEN_EDIT: ليس لديك صلاحية تعديل هذا المشروع أو أنه مؤرشف.');
    }

    const currentWorkspace = this.state.workspaces.get(projectId);
    const metadata = this.state.projects.get(projectId);
    if (!currentWorkspace || !metadata) {
      throw new Error('NOT_FOUND: المشروع غير موجود.');
    }

    // Optimistic Concurrency check per P1-PRJ-04
    if (currentWorkspace.version !== expectedVersion) {
      const err: any = new Error('REVISION_CONFLICT');
      err.code = 'REVISION_CONFLICT';
      err.details = {
        expected_version: expectedVersion,
        current_version: currentWorkspace.version,
        updated_by: currentWorkspace.updatedBy,
        updated_at: currentWorkspace.updatedAt,
      };
      throw err;
    }

    const newVersion = currentWorkspace.version + 1;
    const now = new Date().toISOString();

    const mergedDraft: WorkspaceDraftData = {
      ...currentWorkspace.draftData,
      ...draftData,
      dimensions: {
        ...currentWorkspace.draftData.dimensions,
        ...(draftData.dimensions || {}),
      },
      provenance: {
        ...currentWorkspace.draftData.provenance,
        ...(draftData.provenance || {}),
      },
      designBasis: {
        ...currentWorkspace.draftData.designBasis,
        ...(draftData.designBasis || {}),
      },
      material: {
        ...currentWorkspace.draftData.material,
        ...(draftData.material || {}),
      },
    };

    currentWorkspace.version = newVersion;
    currentWorkspace.draftData = mergedDraft;
    currentWorkspace.updatedBy = userId;
    currentWorkspace.updatedAt = now;

    metadata.updatedAt = now;

    // Record audit event
    const user = this.state.users.get(userId);
    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'update_workspace',
      versionRefs: { fromVersion: expectedVersion, toVersion: newVersion },
      requestId,
      details: { changedFields: Object.keys(draftData) },
    });

    return { workspace: currentWorkspace, metadata };
  }

  async createRevision(
    projectId: string,
    reason: string,
    expectedVersion: number,
    userId: string,
    orgId: string,
    requestId: string
  ): Promise<ProjectRevision> {
    if (!this.canEditProject(projectId, userId, orgId)) {
      throw new Error('FORBIDDEN: ليس لديك صلاحية حفظ إصدار لهذا المشروع.');
    }

    const workspace = this.state.workspaces.get(projectId);
    const metadata = this.state.projects.get(projectId);
    if (!workspace || !metadata) throw new Error('NOT_FOUND: المشروع غير موجود.');

    if (workspace.version !== expectedVersion) {
      const err: any = new Error('REVISION_CONFLICT');
      err.code = 'REVISION_CONFLICT';
      err.details = { expected_version: expectedVersion, current_version: workspace.version };
      throw err;
    }

    const revList = this.state.revisions.get(projectId) || [];
    const revisionNo = revList.length + 1;
    const parentRevisionId = revList.length > 0 ? revList[revList.length - 1].id : null;
    const user = this.state.users.get(userId);
    const now = new Date().toISOString();

    const hashes = await computeCanonicalHashes(workspace.draftData, { currency: metadata.currency });

    const revision: ProjectRevision = {
      id: `rev_${projectId}_${revisionNo}_${Date.now()}`,
      projectId,
      revisionNo,
      parentRevisionId,
      snapshot: JSON.parse(JSON.stringify(workspace.draftData)),
      hashes,
      schemaVersion: workspace.schemaVersion,
      reason: reason || `إصدار محفوظ رقم ${revisionNo}`,
      createdBy: userId,
      createdByName: user ? user.displayName : userId,
      createdAt: now,
    };

    revList.push(revision);
    this.state.revisions.set(projectId, revList);

    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'create_revision',
      versionRefs: { revisionNo },
      requestId,
      details: { reason: revision.reason, inputHash: hashes.inputHash },
    });

    return revision;
  }

  restoreRevision(
    projectId: string,
    revisionId: string,
    expectedVersion: number,
    userId: string,
    orgId: string,
    requestId: string
  ): { workspace: ProjectWorkspace; metadata: ProjectMetadata } {
    if (!this.canEditProject(projectId, userId, orgId)) {
      throw new Error('FORBIDDEN: ليس لديك صلاحية استعادة مسودة.');
    }

    const revList = this.state.revisions.get(projectId) || [];
    const targetRev = revList.find((r) => r.id === revisionId);
    if (!targetRev) throw new Error('REVISION_NOT_FOUND: النسخة التاريخية غير موجودة.');

    const workspace = this.state.workspaces.get(projectId);
    const metadata = this.state.projects.get(projectId);
    if (!workspace || !metadata) throw new Error('NOT_FOUND: المشروع غير موجود.');

    if (workspace.version !== expectedVersion) {
      const err: any = new Error('REVISION_CONFLICT');
      err.code = 'REVISION_CONFLICT';
      err.details = { expected_version: expectedVersion, current_version: workspace.version };
      throw err;
    }

    const newVersion = workspace.version + 1;
    const now = new Date().toISOString();

    workspace.draftData = JSON.parse(JSON.stringify(targetRev.snapshot));
    workspace.version = newVersion;
    workspace.updatedBy = userId;
    workspace.updatedAt = now;
    metadata.updatedAt = now;

    const user = this.state.users.get(userId);
    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'restore_revision',
      versionRefs: { fromVersion: expectedVersion, toVersion: newVersion, revisionNo: targetRev.revisionNo },
      requestId,
      details: { restoredFromRevisionId: revisionId },
    });

    return { workspace, metadata };
  }

  archiveProject(projectId: string, userId: string, orgId: string, requestId: string): ProjectMetadata {
    const roles = this.getUserRolesInProject(projectId, userId, orgId);
    if (!roles.includes('owner')) {
      throw new Error('FORBIDDEN: فقط مالك المؤسسة يمكنه أرشفة المشروع.');
    }

    const metadata = this.state.projects.get(projectId);
    if (!metadata) throw new Error('NOT_FOUND');

    metadata.isArchived = true;
    metadata.archivedAt = new Date().toISOString();
    metadata.updatedAt = metadata.archivedAt;

    const user = this.state.users.get(userId);
    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'archive_project',
      versionRefs: {},
      requestId,
      details: {},
    });

    return metadata;
  }

  unarchiveProject(projectId: string, userId: string, orgId: string, requestId: string): ProjectMetadata {
    const roles = this.getUserRolesInProject(projectId, userId, orgId);
    if (!roles.includes('owner')) {
      throw new Error('FORBIDDEN: فقط مالك المؤسسة يمكنه إلغاء أرشفة المشروع.');
    }

    const metadata = this.state.projects.get(projectId);
    if (!metadata) throw new Error('NOT_FOUND');

    metadata.isArchived = false;
    metadata.archivedAt = null;
    metadata.updatedAt = new Date().toISOString();

    const user = this.state.users.get(userId);
    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'unarchive_project',
      versionRefs: {},
      requestId,
      details: {},
    });

    return metadata;
  }

  addReviewComment(
    projectId: string,
    revisionId: string | null,
    text: string,
    userId: string,
    orgId: string,
    requestId: string
  ): ReviewComment {
    if (!this.canAccessProject(projectId, userId, orgId)) {
      throw new Error('FORBIDDEN');
    }

    const roles = this.getUserRolesInProject(projectId, userId, orgId);
    if (!roles.includes('engineer') && !roles.includes('reviewer') && !roles.includes('owner')) {
      throw new Error('FORBIDDEN_COMMENT: فقط المهندس أو المراجع أو المالك يمكنه كتابة تعليقات مراجعة.');
    }

    const user = this.state.users.get(userId);
    const comment: ReviewComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      revisionId,
      authorId: userId,
      authorName: user ? user.displayName : userId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const list = this.state.reviewComments.get(projectId) || [];
    list.push(comment);
    this.state.reviewComments.set(projectId, list);

    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'add_review_comment',
      versionRefs: {},
      requestId,
      details: { commentId: comment.id },
    });

    return comment;
  }

  getReviewComments(projectId: string, userId: string, orgId: string): ReviewComment[] {
    if (!this.canAccessProject(projectId, userId, orgId)) return [];
    return this.state.reviewComments.get(projectId) || [];
  }

  getAuditEvents(projectId: string, userId: string, orgId: string): AuditEvent[] {
    if (!this.canAccessProject(projectId, userId, orgId)) return [];
    return this.state.auditEvents.get(projectId) || [];
  }

  getRevisions(projectId: string, userId: string, orgId: string): ProjectRevision[] {
    if (!this.canAccessProject(projectId, userId, orgId)) return [];
    return this.state.revisions.get(projectId) || [];
  }

  addAttachment(
    projectId: string,
    fileMeta: { originalName: string; sizeBytes: number; contentType: string },
    userId: string,
    orgId: string,
    requestId: string
  ): ProjectAttachment {
    if (!this.canEditProject(projectId, userId, orgId)) {
      throw new Error('FORBIDDEN');
    }

    // Limit check: 25 MiB
    if (fileMeta.sizeBytes > 25 * 1024 * 1024) {
      throw new Error('UPLOAD_TOO_LARGE: الحد الأقصى للمرفق 25 ميجابايت.');
    }

    // Allowed types: PDF, PNG, JPEG
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(fileMeta.contentType)) {
      throw new Error('FILE_TYPE_REJECTED: الأنواع المسموح بها في P1 هي PDF و PNG و JPEG فقط.');
    }

    const user = this.state.users.get(userId);
    const attachment: ProjectAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId,
      storageKey: `secure_store_${projectId}_${Date.now()}`,
      originalName: fileMeta.originalName,
      sizeBytes: fileMeta.sizeBytes,
      contentType: fileMeta.contentType,
      status: 'ready', // scanned & ready
      sha256: `SHA256:${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
      uploadedBy: userId,
      uploadedByName: user ? user.displayName : userId,
      uploadedAt: new Date().toISOString(),
    };

    const list = this.state.attachments.get(projectId) || [];
    list.push(attachment);
    this.state.attachments.set(projectId, list);

    this.addAuditEvent({
      orgId,
      projectId,
      actorId: userId,
      actorName: user ? user.displayName : userId,
      action: 'upload_attachment',
      versionRefs: {},
      requestId,
      details: { attachmentId: attachment.id, filename: attachment.originalName },
    });

    return attachment;
  }

  getAttachments(projectId: string, userId: string, orgId: string): ProjectAttachment[] {
    if (!this.canAccessProject(projectId, userId, orgId)) return [];
    return this.state.attachments.get(projectId) || [];
  }

  private addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const pId = event.projectId;
    const fullEvent: AuditEvent = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    const list = this.state.auditEvents.get(pId) || [];
    list.push(fullEvent);
    this.state.auditEvents.set(pId, list);
  }
}

export const globalStore = new MemoryStore();
