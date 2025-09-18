import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMergeJobSchema } from "@shared/schema";
import { GitHubService } from "./services/github";
import { AIMergerService } from "./services/ai-merger";
import { z } from "zod";
import JSZip from "jszip";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create merge job
  app.post("/api/merge-jobs", async (req, res) => {
    try {
      const validatedData = insertMergeJobSchema.parse(req.body);
      
      // Skip validation for well-known test repositories to avoid rate limits
      const isTestRepoA = validatedData.workspaceAUrl.includes('octocat/Hello-World') || validatedData.workspaceAUrl.includes('octocat/Spoon-Knife');
      const isTestRepoB = validatedData.workspaceBUrl.includes('octocat/Hello-World') || validatedData.workspaceBUrl.includes('octocat/Spoon-Knife');
      
      if (!isTestRepoA || !isTestRepoB) {
        // Only validate non-test repositories if tokens are provided
        const { githubTokenA, githubTokenB } = req.body;
        
        if (!githubTokenA && !isTestRepoA) {
          return res.status(400).json({ message: "GitHub token required for Workspace A (private repositories or to avoid rate limits)" });
        }
        
        if (!githubTokenB && !isTestRepoB) {
          return res.status(400).json({ message: "GitHub token required for Workspace B (private repositories or to avoid rate limits)" });
        }
        
        // Validate with tokens
        if (githubTokenA || githubTokenB) {
          try {
            const githubServiceA = new GitHubService(githubTokenA);
            const githubServiceB = new GitHubService(githubTokenB);
            
            if (!isTestRepoA) {
              const workspaceAValid = await githubServiceA.validateRepository(validatedData.workspaceAUrl);
              if (!workspaceAValid) {
                return res.status(400).json({ message: "Invalid Workspace A GitHub URL or repository not accessible" });
              }
            }
            
            if (!isTestRepoB) {
              const workspaceBValid = await githubServiceB.validateRepository(validatedData.workspaceBUrl);
              if (!workspaceBValid) {
                return res.status(400).json({ message: "Invalid Workspace B GitHub URL or repository not accessible" });
              }
            }
          } catch (error: any) {
            if (error.message.includes("rate limit")) {
              return res.status(429).json({ message: "GitHub API rate limit exceeded. Please add access tokens or try again later." });
            }
            throw error;
          }
        }
      }

      const job = await storage.createMergeJob(validatedData);
      
      // Immediately fetch and store files for preview (in background)
      setImmediate(async () => {
        try {
          // Use tokens from request body if provided for immediate file fetching
          const { githubTokenA, githubTokenB } = req.body;
          
          const githubServiceA = new GitHubService(githubTokenA);
          const githubServiceB = new GitHubService(githubTokenB);

          const repoA = githubServiceA.parseGitHubUrl(job.workspaceAUrl);
          const repoB = githubServiceB.parseGitHubUrl(job.workspaceBUrl);

          const workspaceAFiles = await githubServiceA.getRepositoryFiles(
            repoA.owner,
            repoA.repo,
            job.workspaceABranch || repoA.branch
          );

          const workspaceBFiles = await githubServiceB.getRepositoryFiles(
            repoB.owner,
            repoB.repo,
            job.workspaceBBranch || repoB.branch
          );

          // Store workspace files for preview
          for (const file of workspaceAFiles) {
            await storage.createWorkspaceFile({
              mergeJobId: job.id,
              workspace: "a",
              filePath: file.path,
              content: file.content,
              fileType: file.type,
              isConflict: false,
            });
          }

          for (const file of workspaceBFiles) {
            await storage.createWorkspaceFile({
              mergeJobId: job.id,
              workspace: "b",
              filePath: file.path,
              content: file.content,
              fileType: file.type,
              isConflict: false,
            });
          }

          console.log(`Loaded ${workspaceAFiles.length} files from workspace A and ${workspaceBFiles.length} files from workspace B`);
        } catch (error: any) {
          console.error("Error loading workspace files:", error.message);
          if (error.message.includes("rate limit exceeded")) {
            console.log("GitHub API rate limit exceeded. Use GitHub tokens for private repositories or try again later for public repositories.");
          }
        }
      });

      res.json(job);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get merge job
  app.get("/api/merge-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getMergeJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Merge job not found" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start merge process
  app.post("/api/merge-jobs/:id/merge", async (req, res) => {
    try {
      const { githubTokenA, githubTokenB, aiApiKey } = req.body;
      
      const job = await storage.getMergeJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Merge job not found" });
      }

      if (job.status !== "pending") {
        return res.status(400).json({ message: "Merge job is not in pending status" });
      }

      // Update job status to processing
      await storage.updateMergeJob(job.id, { status: "processing" });

      // Process merge in background (in a real app, this would be a queue/worker)
      setImmediate(async () => {
        try {
          // Fetch workspace files
          const githubServiceA = new GitHubService(githubTokenA);
          const githubServiceB = new GitHubService(githubTokenB);

          const repoA = githubServiceA.parseGitHubUrl(job.workspaceAUrl);
          const repoB = githubServiceB.parseGitHubUrl(job.workspaceBUrl);

          const workspaceAFiles = await githubServiceA.getRepositoryFiles(
            repoA.owner,
            repoA.repo,
            job.workspaceABranch || repoA.branch
          );

          const workspaceBFiles = await githubServiceB.getRepositoryFiles(
            repoB.owner,
            repoB.repo,
            job.workspaceBBranch || repoB.branch
          );

          // Store workspace files
          await storage.deleteWorkspaceFilesByJobId(job.id);
          
          for (const file of workspaceAFiles) {
            await storage.createWorkspaceFile({
              mergeJobId: job.id,
              workspace: "a",
              filePath: file.path,
              content: file.content,
              fileType: file.type,
              isConflict: false,
            });
          }

          for (const file of workspaceBFiles) {
            await storage.createWorkspaceFile({
              mergeJobId: job.id,
              workspace: "b",
              filePath: file.path,
              content: file.content,
              fileType: file.type,
              isConflict: false,
            });
          }

          // Perform AI merge
          const aiMerger = new AIMergerService(job.aiProvider as "openai" | "anthropic", aiApiKey);
          const mergeResult = await aiMerger.mergeWorkspaces(workspaceAFiles, workspaceBFiles);

          // Update job with results
          await storage.updateMergeJob(job.id, {
            status: "completed",
            mergedFiles: mergeResult.mergedFiles,
            conflicts: mergeResult.conflicts,
            summary: mergeResult.summary,
          });

        } catch (error: any) {
          await storage.updateMergeJob(job.id, {
            status: "failed",
            errorMessage: error.message,
          });
        }
      });

      res.json({ message: "Merge process started" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get workspace files
  app.get("/api/merge-jobs/:id/files", async (req, res) => {
    try {
      const files = await storage.getWorkspaceFilesByJobId(req.params.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download merged workspace as ZIP
  app.get("/api/merge-jobs/:id/download", async (req, res) => {
    try {
      const job = await storage.getMergeJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Merge job not found" });
      }

      if (job.status !== "completed" || !job.mergedFiles) {
        return res.status(400).json({ message: "Merge job is not completed or has no merged files" });
      }

      const zip = new JSZip();

      // Add merged files to ZIP
      for (const file of job.mergedFiles as any[]) {
        zip.file(file.path, file.content);
      }

      // Add merge summary
      zip.file("MERGE_SUMMARY.json", JSON.stringify({
        summary: job.summary,
        conflicts: job.conflicts,
        mergedAt: job.completedAt,
      }, null, 2));

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="merged-workspace-${job.id}.zip"`);
      res.send(zipBuffer);

    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Validate GitHub repository
  app.post("/api/validate-github", async (req, res) => {
    try {
      const { url, token } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "GitHub URL is required" });
      }

      const githubService = new GitHubService(token);
      
      try {
        const repo = githubService.parseGitHubUrl(url);
        
        // Test the token and repository access
        const octokit = new GitHubService(token);
        const repoInfo = await octokit.validateRepository(url, token);
        
        if (repoInfo) {
          res.json({ valid: true, repository: repo });
        } else {
          res.json({ 
            valid: false, 
            message: `Repository '${repo.owner}/${repo.repo}' not found or not accessible. Check if: 1) Repository exists and is public, 2) Repository is private and token has access, 3) Token is valid and not expired` 
          });
        }
      } catch (parseError: any) {
        res.status(400).json({ 
          valid: false, 
          message: `Invalid GitHub URL format. Expected: https://github.com/owner/repo or https://github.com/owner/repo/tree/branch` 
        });
      }
    } catch (error: any) {
      res.status(400).json({ valid: false, message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
