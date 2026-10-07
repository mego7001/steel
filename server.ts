/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC Phase 1 Master Express Full-Stack Server
 * Mounts Vite dev middleware in dev mode per environment constraints.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalStore } from './server/storage.js';
import { P1_SYSTEM_CAPABILITIES } from './src/services/capabilitiesCatalog.js';
import { validateWorkspaceDraft } from './src/services/dataValidator.js';
import { computeCanonicalHashes } from './src/services/canonicalHash.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Request correlation ID and auth context extraction
  app.use((req: Request, res: Response, next: NextFunction) => {
    const reqId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    res.setHeader('x-request-id', reqId);

    // Simulated session or header-based user/org authentication
    const userId = (req.headers['x-user-id'] as string) || 'usr_eng_ahmed';
    const orgId = (req.headers['x-org-id'] as string) || 'org_factory_a';

    (req as any).auth = {
      userId,
      orgId,
      requestId: reqId,
    };
    next();
  });

  // --- API V1 ROUTES ---
  const api = express.Router();

  // 1. Session & Identity
  api.get('/me', (req: Request, res: Response) => {
    const { userId, orgId } = (req as any).auth;
    const user = globalStore.state.users.get(userId);
    const org = globalStore.state.organizations.get(orgId);
    const orgMem = globalStore.state.orgMemberships.get(`${orgId}_${userId}`);

    // Provide all users for test suite & user-switching in P1
    const allUsers = Array.from(globalStore.state.users.values());
    const allOrgs = Array.from(globalStore.state.organizations.values());

    res.json({
      currentUser: user || null,
      currentOrg: org || null,
      roles: orgMem ? orgMem.roles : [],
      allTestUsers: allUsers,
      allOrganizations: allOrgs,
    });
  });

  // 2. Capabilities Matrix (P1-GRD-06, Section 3)
  api.get('/capabilities', (_req: Request, res: Response) => {
    res.json({
      phase: 'P1',
      version: '1.0.0',
      capabilities: P1_SYSTEM_CAPABILITIES,
    });
  });

  // 3. Projects List
  api.get('/projects', (req: Request, res: Response) => {
    const { userId, orgId } = (req as any).auth;
    const filterArchived = req.query.archived === 'true';
    const search = (req.query.search as string || '').toLowerCase().trim();

    let list = globalStore.listProjects(userId, orgId, filterArchived);
    if (search) {
      list = list.filter((p) => p.title.toLowerCase().includes(search) || p.mark.toLowerCase().includes(search));
    }

    res.json({
      projects: list,
      total: list.length,
    });
  });

  // 4. Create Project (P1-PRJ-01, P1-PRJ-02)
  api.post('/projects', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (idempotencyKey) {
      const cached = globalStore.state.idempotencyKeys.get(`${orgId}_${userId}_${idempotencyKey}`);
      if (cached && Date.now() < cached.expiresAt) {
        return res.status(201).json(cached.response);
      }
    }

    try {
      const result = globalStore.createProject(req.body, userId, orgId, requestId);

      if (idempotencyKey) {
        globalStore.state.idempotencyKeys.set(`${orgId}_${userId}_${idempotencyKey}`, {
          response: result,
          requestHash: JSON.stringify(req.body),
          expiresAt: Date.now() + 24 * 3600 * 1000,
        });
      }

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({
        error: {
          code: 'CREATE_FAILED',
          message: err.message,
          correlation_id: requestId,
        },
      });
    }
  });

  // 5. Open Project Metadata
  api.get('/projects/:id', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const project = globalStore.getProject(req.params.id, userId, orgId);

    if (!project) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'المشروع غير موجود أو لا تملك صلاحية الوصول إليه.',
          correlation_id: requestId,
        },
      });
    }

    const roles = globalStore.getUserRolesInProject(project.id, userId, orgId);
    res.json({
      project,
      userRoles: roles,
    });
  });

  // 6. Get Workspace Draft
  api.get('/projects/:id/workspace', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const workspace = globalStore.getWorkspace(req.params.id, userId, orgId);
    const metadata = globalStore.getProject(req.params.id, userId, orgId);

    if (!workspace || !metadata) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'المشروع غير موجود.', correlation_id: requestId },
      });
    }

    const issues = validateWorkspaceDraft(metadata, workspace.draftData);

    res.json({
      workspace,
      metadata,
      issues,
    });
  });

  // 7. Update Workspace Draft with Optimistic Concurrency (P1-PRJ-03, P1-PRJ-04)
  api.patch('/projects/:id/workspace', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const { draftData, expectedVersion } = req.body;

    if (typeof expectedVersion !== 'number') {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'يلزم تمرير expectedVersion كرقم صحيح للتحقق من عدم تعارض الحفظ.',
          correlation_id: requestId,
        },
      });
    }

    try {
      const result = globalStore.updateWorkspace(
        req.params.id,
        draftData,
        expectedVersion,
        userId,
        orgId,
        requestId
      );

      const issues = validateWorkspaceDraft(result.metadata, result.workspace.draftData);

      res.json({
        ...result,
        issues,
      });
    } catch (err: any) {
      if (err.code === 'REVISION_CONFLICT') {
        return res.status(409).json({
          error: {
            code: 'REVISION_CONFLICT',
            message: 'تم تعديل المشروع من جلسة أخرى. يرجى مراجعة التغييرات قبل الحفظ لمنع فقد البيانات.',
            entity_id: req.params.id,
            details: err.details,
            correlation_id: requestId,
          },
        });
      }
      res.status(403).json({
        error: {
          code: 'UPDATE_FAILED',
          message: err.message,
          correlation_id: requestId,
        },
      });
    }
  });

  // 8. Validate Workspace Draft
  api.post('/projects/:id/validate', async (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const workspace = globalStore.getWorkspace(req.params.id, userId, orgId);
    const metadata = globalStore.getProject(req.params.id, userId, orgId);

    if (!workspace || !metadata) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', correlation_id: requestId } });
    }

    const issues = validateWorkspaceDraft(metadata, workspace.draftData);
    const hashes = await computeCanonicalHashes(workspace.draftData, { currency: metadata.currency });

    res.json({
      projectId: req.params.id,
      version: workspace.version,
      issues,
      hashes,
      completenessStatus: issues.filter((i) => i.severity === 'error').length === 0 ? 'valid' : 'has_errors',
    });
  });

  // 9. Revisions / Snapshots (P1-PRJ-05)
  api.get('/projects/:id/revisions', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const revs = globalStore.getRevisions(req.params.id, userId, orgId);
    res.json({ revisions: revs });
  });

  api.post('/projects/:id/revisions', async (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const { reason, expectedVersion } = req.body;

    try {
      const revision = await globalStore.createRevision(
        req.params.id,
        reason,
        expectedVersion,
        userId,
        orgId,
        requestId
      );
      res.status(201).json({ revision });
    } catch (err: any) {
      if (err.code === 'REVISION_CONFLICT') {
        return res.status(409).json({
          error: {
            code: 'REVISION_CONFLICT',
            message: 'تعذر إنشاء النسخة: الإصدار غير متطابق مع النسخة الحالية.',
            details: err.details,
            correlation_id: requestId,
          },
        });
      }
      res.status(400).json({ error: { code: 'REVISION_FAILED', message: err.message, correlation_id: requestId } });
    }
  });

  // 10. Restore Revision (P1-PRJ-05)
  api.post('/projects/:id/restore', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const { revisionId, expectedVersion } = req.body;

    try {
      const result = globalStore.restoreRevision(
        req.params.id,
        revisionId,
        expectedVersion,
        userId,
        orgId,
        requestId
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: { code: 'RESTORE_FAILED', message: err.message, correlation_id: requestId } });
    }
  });

  // 11. Archive / Unarchive Project (P1-PRJ-07)
  api.post('/projects/:id/archive', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    try {
      const metadata = globalStore.archiveProject(req.params.id, userId, orgId, requestId);
      res.json({ metadata });
    } catch (err: any) {
      res.status(403).json({ error: { code: 'ARCHIVE_FAILED', message: err.message, correlation_id: requestId } });
    }
  });

  api.post('/projects/:id/unarchive', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    try {
      const metadata = globalStore.unarchiveProject(req.params.id, userId, orgId, requestId);
      res.json({ metadata });
    } catch (err: any) {
      res.status(403).json({ error: { code: 'UNARCHIVE_FAILED', message: err.message, correlation_id: requestId } });
    }
  });

  // 12. Review Comments
  api.get('/projects/:id/review-comments', (req: Request, res: Response) => {
    const { userId, orgId } = (req as any).auth;
    const comments = globalStore.getReviewComments(req.params.id, userId, orgId);
    res.json({ comments });
  });

  api.post('/projects/:id/review-comments', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const { revisionId, text } = req.body;

    try {
      const comment = globalStore.addReviewComment(req.params.id, revisionId || null, text, userId, orgId, requestId);
      res.status(201).json({ comment });
    } catch (err: any) {
      res.status(400).json({ error: { code: 'COMMENT_FAILED', message: err.message, correlation_id: requestId } });
    }
  });

  // 13. Attachments (P1-FIL-01..03)
  api.get('/projects/:id/attachments', (req: Request, res: Response) => {
    const { userId, orgId } = (req as any).auth;
    const attachments = globalStore.getAttachments(req.params.id, userId, orgId);
    res.json({ attachments });
  });

  api.post('/projects/:id/attachments/upload-intent', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const { originalName, sizeBytes, contentType } = req.body;

    try {
      const attachment = globalStore.addAttachment(
        req.params.id,
        { originalName, sizeBytes, contentType },
        userId,
        orgId,
        requestId
      );
      res.status(201).json({ attachment });
    } catch (err: any) {
      res.status(400).json({ error: { code: 'UPLOAD_FAILED', message: err.message, correlation_id: requestId } });
    }
  });

  api.get('/projects/:id/attachments/:attId/download', (req: Request, res: Response) => {
    const { userId, orgId, requestId } = (req as any).auth;
    const attachments = globalStore.getAttachments(req.params.id, userId, orgId);
    const target = attachments.find((a) => a.id === req.params.attId);

    if (!target) {
      return res.status(404).json({ error: { code: 'ATTACHMENT_NOT_FOUND', correlation_id: requestId } });
    }

    res.json({
      downloadUrl: `/secure_files/${target.storageKey}`,
      filename: target.originalName,
      sha256: target.sha256,
      note: 'تنزيل ملف مرجعي وارد غير متحقق',
    });
  });

  // 14. Audit Log
  api.get('/projects/:id/audit', (req: Request, res: Response) => {
    const { userId, orgId } = (req as any).auth;
    const events = globalStore.getAuditEvents(req.params.id, userId, orgId);
    res.json({ auditEvents: events });
  });

  // 15. Guarded Endpoints (P1-GRD-01 / P1-GRD-02) - STRICTLY BLOCKED IN P1!
  const blockFabricationRelease = (req: Request, res: Response) => {
    res.status(409).json({
      error: {
        code: 'CAPABILITY_NOT_AVAILABLE',
        message: 'إطلاق التصنيع وتصدير ملفات الماكينات CAM محظور تماماً في المرحلة P1 لعدم صلاحية المحركات التجريبية السابقة للاعتماد الهندسي والتصنيعي.',
        planned_phase: 'P4',
        correlation_id: (req as any).auth.requestId,
      },
    });
  };

  api.post('/projects/:id/release', blockFabricationRelease);
  api.get('/projects/:id/export/dxf', blockFabricationRelease);
  api.get('/projects/:id/export/nc1', blockFabricationRelease);

  // Mount API router
  app.use('/api/v1', api);

  // Health check endpoint
  app.get('/health', (_req, res) => res.json({ status: 'healthy', version: 'P1-1.0.0' }));

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MWEC P1 Server] running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[MWEC P1 Server] Startup error:', err);
  process.exit(1);
});
