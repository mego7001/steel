/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC Phase 1 (P1) Domain Types & Contracts
 * Based on: MWEC Phase 1 Executive Specification v1.0 (7 Oct 2026)
 */

export type UserRole = 'owner' | 'admin' | 'engineer' | 'reviewer' | 'viewer';

export interface User {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended';
}

export interface Organization {
  id: string;
  name: string;
  timezone: string; // e.g. "Africa/Cairo"
  defaultCurrency: 'EGP' | 'USD' | 'SAR';
  settingsVersion: number;
}

export interface OrganizationMembership {
  orgId: string;
  userId: string;
  roles: UserRole[];
  status: 'active' | 'inactive';
}

export interface ProjectMembership {
  projectId: string;
  userId: string;
  roles: UserRole[];
  status: 'active' | 'inactive';
}

export type ProjectType = 'booth_kiosk' | 'portal_frame' | 'pitched_truss' | 'other';

export interface ProjectMetadata {
  id: string;
  orgId: string;
  mark: string; // Unique human-readable code e.g. "PRJ-2026-001"
  title: string;
  projectType: ProjectType;
  typeDescriptionOther?: string;
  clientName: string;
  location: string;
  country: string;
  dueDate: string | null;
  currency: 'EGP' | 'USD' | 'SAR';
  displayUnits: 'metric_mm' | 'metric_m' | 'imperial';
  notes: string;
  scopeDescription: string;
  ownerId: string;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SourceKind =
  | 'measured'    // قياس فعلي بالموقع
  | 'supplied'    // وارد من مستندات العميل
  | 'imported'    // مستورد من ملف مرجعي
  | 'code'        // محدد من كود أو مواصفة
  | 'catalog'     // من كتالوج مورد معتمد
  | 'assumed';    // افتراض هندسي تقديري

export type VerificationState = 'unverified' | 'checked' | 'rejected';

export interface InputProvenance {
  sourceKind: SourceKind;
  sourceRef: string;
  enteredBy: string;
  enteredAt: string;
  unit: string;
  note?: string;
  verificationState: VerificationState;
}

export interface ProjectDimensions {
  lengthM: number | null;
  widthM: number | null;
  eaveHeightM: number | null;
  ridgeHeightM: number | null;
  baysCount: number | null;
  roofPitchDeg?: number | null;
}

export interface DesignBasisInputs {
  codeName: string; // e.g. "AISC 360-22 LRFD"
  codeVersion?: string;
  windSpeedKmh: number | null;
  roofLiveLoadKpa: number | null;
  claddingDeadLoadKpa: number | null;
  importanceFactor?: number | null;
  notes?: string;
  capabilityStatus: 'unsupported'; // Honest capability in P1
}

export interface MaterialInput {
  steelGrade: string;
  standard: string;
  FyMpa: number | null;
  FuMpa: number | null;
  sourceRef: string;
  verificationState: VerificationState;
}

export interface WorkspaceDraftData {
  dimensions: ProjectDimensions;
  provenance: Record<string, InputProvenance>; // Keyed by field path e.g. "dimensions.lengthM"
  designBasis: DesignBasisInputs;
  material: MaterialInput;
  assumptionsNotes: string;
  customScopeRequirements?: string;
}

export interface ProjectWorkspace {
  projectId: string;
  version: number; // Monotonically increasing for optimistic concurrency
  schemaVersion: string; // e.g. "1.0.0"
  draftData: WorkspaceDraftData;
  updatedBy: string;
  updatedAt: string;
}

export interface CanonicalHashes {
  inputHash: string;
  geometryHash: string;
  basisHash: string;
  priceHash: string;
}

export interface ProjectRevision {
  id: string;
  projectId: string;
  revisionNo: number;
  parentRevisionId: string | null;
  snapshot: WorkspaceDraftData;
  hashes: CanonicalHashes;
  schemaVersion: string;
  reason: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ProjectIssue {
  id: string;
  projectId: string;
  code: string;
  severity: IssueSeverity;
  fieldPath: string;
  message: string;
  messageAr: string;
  resolutionState: 'open' | 'resolved';
}

export interface ReviewComment {
  id: string;
  projectId: string;
  revisionId: string | null;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export type AttachmentStatus = 'ready' | 'pending' | 'scanning' | 'failed' | 'rejected' | 'deleted';

export interface ProjectAttachment {
  id: string;
  projectId: string;
  storageKey: string;
  originalName: string;
  sizeBytes: number;
  contentType: string; // 'application/pdf' | 'image/png' | 'image/jpeg'
  status: AttachmentStatus;
  sha256: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  projectId: string;
  actorId: string;
  actorName: string;
  action:
    | 'create_project'
    | 'update_workspace'
    | 'create_revision'
    | 'restore_revision'
    | 'archive_project'
    | 'unarchive_project'
    | 'upload_attachment'
    | 'delete_attachment'
    | 'add_review_comment';
  versionRefs: {
    fromVersion?: number;
    toVersion?: number;
    revisionNo?: number;
  };
  requestId: string;
  timestamp: string;
  details: Record<string, any>;
}

export type CapabilityStatus = 'unavailable' | 'experimental' | 'validated';

export interface SystemCapabilityInfo {
  id: string;
  name: string;
  nameAr: string;
  category: 'core' | 'engineering' | 'fabrication' | 'commercial';
  status: CapabilityStatus;
  plannedPhase: string;
  descriptionAr: string;
}
