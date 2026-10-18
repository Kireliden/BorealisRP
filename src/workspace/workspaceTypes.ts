export const WORKSPACE_FORMAT = "borealis-roleplay-den-workspace";
export const WORKSPACE_SCHEMA_VERSION = 1;

export type WorkspaceManifest = {
  format: typeof WORKSPACE_FORMAT;
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceInfo = {
  path: string;
  manifest: WorkspaceManifest;
};

export type CreateWorkspaceInput = {
  parentPath: string;
  name: string;
};
