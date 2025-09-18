import { Octokit } from "@octokit/rest";

export interface GitHubFile {
  path: string;
  content: string;
  type: string;
  sha: string;
}

export interface GitHubRepository {
  owner: string;
  repo: string;
  branch: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  parseGitHubUrl(url: string): GitHubRepository {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/);
    if (!match) {
      throw new Error("Invalid GitHub URL format");
    }

    const [, owner, repo, branch] = match;
    return {
      owner: owner.trim(),
      repo: repo.replace(/\.git$/, "").trim(),
      branch: branch || "main",
    };
  }

  async getRepositoryFiles(
    owner: string,
    repo: string,
    branch: string = "main",
    path: string = ""
  ): Promise<GitHubFile[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      const files: GitHubFile[] = [];
      const items = Array.isArray(response.data) ? response.data : [response.data];

      for (const item of items) {
        if (item.type === "file" && this.isSupportedFileType(item.name)) {
          // Get file content
          const fileResponse = await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: item.path,
            ref: branch,
          });

          if ("content" in fileResponse.data) {
            const content = Buffer.from(fileResponse.data.content, "base64").toString("utf-8");
            files.push({
              path: item.path,
              content,
              type: this.getFileType(item.name),
              sha: item.sha,
            });
          }
        } else if (item.type === "dir") {
          // Recursively get files from subdirectories
          const subFiles = await this.getRepositoryFiles(owner, repo, branch, item.path);
          files.push(...subFiles);
        }
      }

      return files;
    } catch (error: any) {
      throw new Error(`Failed to fetch repository files: ${error.message}`);
    }
  }

  private isSupportedFileType(filename: string): boolean {
    const supportedExtensions = [
      ".js", ".jsx", ".ts", ".tsx",
      ".py", ".html", ".css", ".scss",
      ".json", ".md", ".txt", ".yaml", ".yml",
      ".xml", ".sql", ".sh", ".env"
    ];
    
    // Also include files without extensions (like README)
    const hasExtension = filename.includes('.');
    const isSupportedExt = supportedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
    
    return isSupportedExt || !hasExtension;
  }

  private getFileType(filename: string): string {
    const extension = filename.toLowerCase().split(".").pop();
    const typeMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      md: "markdown",
      txt: "text",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      sql: "sql",
      sh: "shell",
      env: "env"
    };
    
    return typeMap[extension || ""] || "text";
  }

  async validateRepository(url: string, token?: string): Promise<boolean> {
    try {
      const { owner, repo, branch } = this.parseGitHubUrl(url);
      
      if (token) {
        this.octokit = new Octokit({ auth: token });
      }

      const repoResponse = await this.octokit.rest.repos.get({ owner, repo });
      
      // Check if branch exists
      try {
        await this.octokit.rest.repos.getBranch({ owner, repo, branch });
      } catch {
        // Branch doesn't exist, but repo is valid
        console.warn(`Branch '${branch}' not found in ${owner}/${repo}, using default branch`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`Repository validation failed for ${url}:`, error.message);
      if (error.status === 404) {
        console.error("Repository not found or not accessible");
      } else if (error.status === 401) {
        console.error("Authentication failed - check token permissions");
      }
      return false;
    }
  }
}
