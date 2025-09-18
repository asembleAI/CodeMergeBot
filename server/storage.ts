import { type MergeJob, type InsertMergeJob, type WorkspaceFile, type InsertWorkspaceFile } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createMergeJob(job: InsertMergeJob): Promise<MergeJob>;
  getMergeJob(id: string): Promise<MergeJob | undefined>;
  updateMergeJob(id: string, updates: Partial<MergeJob>): Promise<MergeJob | undefined>;
  createWorkspaceFile(file: InsertWorkspaceFile): Promise<WorkspaceFile>;
  getWorkspaceFilesByJobId(jobId: string): Promise<WorkspaceFile[]>;
  deleteWorkspaceFilesByJobId(jobId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private mergeJobs: Map<string, MergeJob>;
  private workspaceFiles: Map<string, WorkspaceFile>;

  constructor() {
    this.mergeJobs = new Map();
    this.workspaceFiles = new Map();
  }

  async createMergeJob(insertJob: InsertMergeJob): Promise<MergeJob> {
    const id = randomUUID();
    const job: MergeJob = {
      ...insertJob,
      id,
      createdAt: new Date(),
      completedAt: null,
      mergedFiles: null,
      conflicts: null,
      summary: null,
    };
    this.mergeJobs.set(id, job);
    return job;
  }

  async getMergeJob(id: string): Promise<MergeJob | undefined> {
    return this.mergeJobs.get(id);
  }

  async updateMergeJob(id: string, updates: Partial<MergeJob>): Promise<MergeJob | undefined> {
    const existing = this.mergeJobs.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    if (updates.status === "completed" || updates.status === "failed") {
      updated.completedAt = new Date();
    }
    
    this.mergeJobs.set(id, updated);
    return updated;
  }

  async createWorkspaceFile(insertFile: InsertWorkspaceFile): Promise<WorkspaceFile> {
    const id = randomUUID();
    const file: WorkspaceFile = { 
      ...insertFile, 
      id,
      content: insertFile.content || null,
      fileType: insertFile.fileType || null,
      isConflict: insertFile.isConflict || false
    };
    this.workspaceFiles.set(id, file);
    return file;
  }

  async getWorkspaceFilesByJobId(jobId: string): Promise<WorkspaceFile[]> {
    return Array.from(this.workspaceFiles.values()).filter(
      file => file.mergeJobId === jobId
    );
  }

  async deleteWorkspaceFilesByJobId(jobId: string): Promise<void> {
    const filesToDelete = Array.from(this.workspaceFiles.entries())
      .filter(([_, file]) => file.mergeJobId === jobId)
      .map(([id]) => id);
    
    filesToDelete.forEach(id => this.workspaceFiles.delete(id));
  }
}

export const storage = new MemStorage();
