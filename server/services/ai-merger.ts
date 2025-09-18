import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GitHubFile } from "./github";

export interface MergeResult {
  mergedFiles: MergedFile[];
  conflicts: Conflict[];
  summary: MergeSummary;
}

export interface MergedFile {
  path: string;
  content: string;
  type: string;
  changes: Change[];
}

export interface Change {
  type: "added" | "removed" | "modified";
  lineNumber: number;
  content: string;
  source: "workspace_a" | "workspace_b" | "ai_generated";
}

export interface Conflict {
  filePath: string;
  type: "naming" | "content" | "dependency";
  description: string;
  recommendation: string;
  options: ConflictOption[];
}

export interface ConflictOption {
  id: string;
  description: string;
  preview: string;
}

export interface MergeSummary {
  totalFiles: number;
  mergedFiles: number;
  conflictsResolved: number;
  linesAdded: number;
  recommendations: string[];
}

export class AIMergerService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;

  constructor(provider: "openai" | "anthropic", apiKey: string) {
    if (provider === "openai") {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  async mergeWorkspaces(
    workspaceAFiles: GitHubFile[],
    workspaceBFiles: GitHubFile[]
  ): Promise<MergeResult> {
    try {
      // Analyze file structures
      const fileAnalysis = this.analyzeFileStructures(workspaceAFiles, workspaceBFiles);
      
      // Detect conflicts
      const conflicts = await this.detectConflicts(workspaceAFiles, workspaceBFiles);
      
      // Merge files using AI
      const mergedFiles = await this.performAIMerge(workspaceAFiles, workspaceBFiles, conflicts);
      
      // Generate summary
      const summary = this.generateSummary(workspaceAFiles, workspaceBFiles, mergedFiles, conflicts);

      return {
        mergedFiles,
        conflicts,
        summary,
      };
    } catch (error: any) {
      throw new Error(`AI merge failed: ${error.message}`);
    }
  }

  private analyzeFileStructures(workspaceA: GitHubFile[], workspaceB: GitHubFile[]) {
    const aFiles = new Set(workspaceA.map(f => f.path));
    const bFiles = new Set(workspaceB.map(f => f.path));
    
    return {
      commonFiles: workspaceA.filter(f => bFiles.has(f.path)),
      uniqueToA: workspaceA.filter(f => !bFiles.has(f.path)),
      uniqueToB: workspaceB.filter(f => !aFiles.has(f.path)),
    };
  }

  private async detectConflicts(
    workspaceA: GitHubFile[],
    workspaceB: GitHubFile[]
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const { commonFiles } = this.analyzeFileStructures(workspaceA, workspaceB);

    for (const fileA of commonFiles) {
      const fileB = workspaceB.find(f => f.path === fileA.path);
      if (fileB && fileA.content !== fileB.content) {
        const conflict = await this.analyzeFileConflict(fileA, fileB);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private async analyzeFileConflict(fileA: GitHubFile, fileB: GitHubFile): Promise<Conflict | null> {
    const prompt = `
    Analyze these two versions of the same file and identify the type of conflict:

    File: ${fileA.path}
    
    Version A:
    ${fileA.content}
    
    Version B:
    ${fileB.content}
    
    Respond with JSON in this format:
    {
      "hasConflict": boolean,
      "type": "naming" | "content" | "dependency",
      "description": "Brief description of the conflict",
      "recommendation": "AI recommendation for resolution"
    }
    `;

    try {
      let response: any;
      
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });
        response = JSON.parse(completion.choices[0].message.content || "{}");
      } else if (this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: "claude-sonnet-4-20250514", // newest Anthropic model
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        const textContent = message.content.find(block => block.type === 'text');
        response = JSON.parse(textContent?.text || "{}");
      }

      if (response.hasConflict) {
        return {
          filePath: fileA.path,
          type: response.type,
          description: response.description,
          recommendation: response.recommendation,
          options: [
            {
              id: "use_a",
              description: "Use Version A",
              preview: fileA.content.substring(0, 200) + "...",
            },
            {
              id: "use_b",
              description: "Use Version B",
              preview: fileB.content.substring(0, 200) + "...",
            },
            {
              id: "ai_merge",
              description: "AI Recommended Merge",
              preview: response.recommendation,
            },
          ],
        };
      }

      return null;
    } catch (error) {
      console.error("Error analyzing file conflict:", error);
      return null;
    }
  }

  private async performAIMerge(
    workspaceA: GitHubFile[],
    workspaceB: GitHubFile[],
    conflicts: Conflict[]
  ): Promise<MergedFile[]> {
    const mergedFiles: MergedFile[] = [];
    const { commonFiles, uniqueToA, uniqueToB } = this.analyzeFileStructures(workspaceA, workspaceB);

    // Add unique files from both workspaces
    for (const file of uniqueToA) {
      mergedFiles.push({
        path: file.path,
        content: file.content,
        type: file.type,
        changes: [{
          type: "added",
          lineNumber: 1,
          content: file.content,
          source: "workspace_a",
        }],
      });
    }

    for (const file of uniqueToB) {
      mergedFiles.push({
        path: file.path,
        content: file.content,
        type: file.type,
        changes: [{
          type: "added",
          lineNumber: 1,
          content: file.content,
          source: "workspace_b",
        }],
      });
    }

    // Merge common files
    for (const fileA of commonFiles) {
      const fileB = workspaceB.find(f => f.path === fileA.path);
      if (fileB) {
        const mergedFile = await this.mergeFileContents(fileA, fileB);
        mergedFiles.push(mergedFile);
      }
    }

    return mergedFiles;
  }

  private async mergeFileContents(fileA: GitHubFile, fileB: GitHubFile): Promise<MergedFile> {
    if (fileA.content === fileB.content) {
      return {
        path: fileA.path,
        content: fileA.content,
        type: fileA.type,
        changes: [],
      };
    }

    const prompt = `
    Intelligently merge these two versions of the same file. The goal is to combine functionality from both versions while maintaining code quality and consistency.

    File: ${fileA.path}
    
    Version A (Workspace A):
    ${fileA.content}
    
    Version B (Workspace B):
    ${fileB.content}
    
    Please provide a merged version that:
    1. Combines functionality from both versions
    2. Resolves any conflicts intelligently
    3. Maintains proper code structure and syntax
    4. Preserves important functionality from both versions
    
    Respond with JSON in this format:
    {
      "mergedContent": "the merged file content",
      "changes": [
        {
          "type": "added" | "modified" | "removed",
          "lineNumber": number,
          "content": "the change description",
          "source": "workspace_a" | "workspace_b" | "ai_generated"
        }
      ]
    }
    `;

    try {
      let response: any;
      
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        });
        response = JSON.parse(completion.choices[0].message.content || "{}");
      } else if (this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: "claude-sonnet-4-20250514", // newest Anthropic model
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        });
        const textContent = message.content.find(block => block.type === 'text');
        response = JSON.parse(textContent?.text || "{}");
      }

      return {
        path: fileA.path,
        content: response.mergedContent || fileA.content,
        type: fileA.type,
        changes: response.changes || [],
      };
    } catch (error) {
      console.error("Error merging file contents:", error);
      // Fallback to workspace A content
      return {
        path: fileA.path,
        content: fileA.content,
        type: fileA.type,
        changes: [],
      };
    }
  }

  private generateSummary(
    workspaceA: GitHubFile[],
    workspaceB: GitHubFile[],
    mergedFiles: MergedFile[],
    conflicts: Conflict[]
  ): MergeSummary {
    const totalFiles = new Set([
      ...workspaceA.map(f => f.path),
      ...workspaceB.map(f => f.path),
    ]).size;

    const linesAdded = mergedFiles.reduce((total, file) => {
      return total + file.changes.filter(c => c.type === "added").length;
    }, 0);

    const recommendations = [
      "Review merged files for proper functionality",
      "Test the integrated codebase thoroughly",
      "Update documentation to reflect changes",
      "Consider refactoring common patterns",
    ];

    return {
      totalFiles,
      mergedFiles: mergedFiles.length,
      conflictsResolved: conflicts.length,
      linesAdded,
      recommendations,
    };
  }
}
