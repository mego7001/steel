/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MWEC Phase 1 Master Application
 * Based on MWEC Phase 1 Executive Specification v1.0
 */

import React, { useEffect, useState } from 'react';
import {
  Organization,
  ProjectMetadata,
  SystemCapabilityInfo,
  User,
  UserRole,
} from './types/p1';
import { apiClient } from './services/apiClient';
import { SessionHeader } from './components/p1/SessionHeader';
import { ProjectsListView } from './components/p1/ProjectsListView';
import { ProjectWorkspaceView } from './components/p1/ProjectWorkspaceView';
import { NewProjectModal } from './components/p1/NewProjectModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>(['engineer']);
  const [allTestUsers, setAllTestUsers] = useState<User[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [capabilities, setCapabilities] = useState<SystemCapabilityInfo[]>([]);

  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'PROJECTS_LIST' | 'WORKSPACE'>('WORKSPACE');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load Session and Initial Projects
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [session, caps] = await Promise.all([
        apiClient.getSession(),
        apiClient.getCapabilities(),
      ]);

      setCurrentUser(session.currentUser);
      setCurrentOrg(session.currentOrg);
      setUserRoles(session.roles);
      setAllTestUsers(session.allTestUsers);
      setAllOrganizations(session.allOrganizations);
      setCapabilities(caps.capabilities);

      const prjs = await apiClient.listProjects();
      setProjects(prjs.projects);

      // Open first active project by default or stay on list
      if (prjs.projects.length > 0 && !activeProjectId) {
        setActiveProjectId(prjs.projects[0].id);
        setCurrentView('WORKSPACE');
      }
    } catch (err) {
      console.error('Failed to load initial session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Switch User / Org Session (Testing multi-tenancy & permissions)
  const handleSwitchSession = async (userId: string, orgId: string) => {
    apiClient.setSession(userId, orgId);
    setActiveProjectId(null);
    setCurrentView('PROJECTS_LIST');
    await loadInitialData();
  };

  // Create Project handler
  const handleCreateProject = async (payload: any, idempotencyKey: string) => {
    const res = await apiClient.createProject(payload, idempotencyKey);
    const prjs = await apiClient.listProjects();
    setProjects(prjs.projects);
    setActiveProjectId(res.metadata.id);
    setCurrentView('WORKSPACE');
  };

  // Archive Project handler
  const handleArchiveProject = async (projectId: string) => {
    await apiClient.archiveProject(projectId);
    const prjs = await apiClient.listProjects();
    setProjects(prjs.projects);
  };

  // Unarchive Project handler
  const handleUnarchiveProject = async (projectId: string) => {
    await apiClient.unarchiveProject(projectId);
    const prjs = await apiClient.listProjects();
    setProjects(prjs.projects);
  };

  const isOwner = userRoles.includes('owner');
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Session & Identity Top Bar */}
      <SessionHeader
        currentUser={currentUser}
        currentOrg={currentOrg}
        roles={userRoles}
        allTestUsers={allTestUsers}
        allOrganizations={allOrganizations}
        capabilities={capabilities}
        onSwitchSession={handleSwitchSession}
        onOpenProjectsList={() => setCurrentView('PROJECTS_LIST')}
        activeProjectMark={activeProject?.mark}
      />

      {/* Main App Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-sm">
            جاري تهيئة مساحة العمل والاتصال بالخادم...
          </div>
        ) : currentView === 'PROJECTS_LIST' || !activeProjectId ? (
          <ProjectsListView
            projects={projects}
            roles={userRoles}
            onOpenProject={(id) => {
              setActiveProjectId(id);
              setCurrentView('WORKSPACE');
            }}
            onNewProjectClick={() => setIsNewProjectModalOpen(true)}
            onArchiveProject={handleArchiveProject}
            onUnarchiveProject={handleUnarchiveProject}
            isOwner={isOwner}
          />
        ) : (
          <ProjectWorkspaceView
            projectId={activeProjectId}
            userRoles={userRoles}
            capabilities={capabilities}
            onBackToList={() => setCurrentView('PROJECTS_LIST')}
            isOwner={isOwner}
          />
        )}
      </main>

      {/* Clean Project Creation Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>نظام الاستشاري للأعمال المعدنية MWEC — منصة المرحلة الأولى P1 (تأسيس المشاريع الموثوق)</span>
          <span className="font-mono text-[11px] text-slate-400">
            P1 Verified • Multi-Tenant Isolated • SHA-256 Canonical Hashes • Guarded CAM Releases
          </span>
        </div>
      </footer>
    </div>
  );
}
