export interface WorkspaceConfig {
  url: string;
  branch: string;
  token: string;
}

export interface AIConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
}

export interface FileTreeItem {
  path: string;
  type: "file" | "directory";
  children?: FileTreeItem[];
  isConflict?: boolean;
}

export interface MergeJobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  workspaceAUrl: string;
  workspaceBUrl: string;
  workspaceABranch?: string;
  workspaceBBranch?: string;
  aiProvider: string;
  mergedFiles?: any[];
  conflicts?: any[];
  summary?: any;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WorkspaceFile {
  id: string;
  mergeJobId: string;
  workspace: "a" | "b";
  filePath: string;
  content?: string;
  fileType?: string;
  isConflict: boolean;
}
