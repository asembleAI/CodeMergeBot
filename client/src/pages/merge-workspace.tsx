import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ConfigurationPanel from "@/components/configuration-panel";
import FileTree from "@/components/file-tree";
import CodeDiffViewer from "@/components/code-diff-viewer";
import MergeSummaryComponent from "@/components/merge-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Maximize2 } from "lucide-react";
import { WorkspaceConfig, AIConfig, MergeJobStatus, WorkspaceFile } from "@/types/workspace";

export default function MergeWorkspace() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [workspaceAConfig, setWorkspaceAConfig] = useState<WorkspaceConfig | null>(null);
  const [workspaceBConfig, setWorkspaceBConfig] = useState<WorkspaceConfig | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for merge job status
  const { data: mergeJob, isLoading: jobLoading } = useQuery<MergeJobStatus>({
    queryKey: ["/api/merge-jobs", currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      // Refetch every 2 seconds if job is processing
      return data?.data?.status === "processing" ? 2000 : false;
    },
  });

  // Query for workspace files
  const { data: workspaceFiles = [] } = useQuery<WorkspaceFile[]>({
    queryKey: ["/api/merge-jobs", currentJobId, "files"],
    enabled: !!currentJobId,
    refetchInterval: 2000, // Auto-refresh every 2 seconds to catch file loading
  });

  // Create merge job mutation
  const createJobMutation = useMutation({
    mutationFn: async ({ workspaceA, workspaceB, ai }: {
      workspaceA: WorkspaceConfig;
      workspaceB: WorkspaceConfig;
      ai: AIConfig;
    }) => {
      const response = await apiRequest("POST", "/api/merge-jobs", {
        workspaceAUrl: workspaceA.url,
        workspaceBUrl: workspaceB.url,
        workspaceABranch: workspaceA.branch,
        workspaceBBranch: workspaceB.branch,
        aiProvider: ai.provider,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.id);
      toast({
        title: "Merge job created",
        description: "Workspaces loaded successfully. Ready to merge.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create merge job",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start merge mutation
  const startMergeMutation = useMutation({
    mutationFn: async () => {
      if (!currentJobId || !workspaceAConfig || !workspaceBConfig || !aiConfig) {
        throw new Error("Missing configuration");
      }

      const response = await apiRequest("POST", `/api/merge-jobs/${currentJobId}/merge`, {
        githubTokenA: workspaceAConfig.token,
        githubTokenB: workspaceBConfig.token,
        aiApiKey: aiConfig.apiKey,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Merge started",
        description: "AI is analyzing and merging your workspaces...",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merge-jobs", currentJobId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start merge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLoadWorkspaces = (workspaceA: WorkspaceConfig, workspaceB: WorkspaceConfig, ai: AIConfig) => {
    setWorkspaceAConfig(workspaceA);
    setWorkspaceBConfig(workspaceB);
    setAiConfig(ai);
    
    createJobMutation.mutate({ workspaceA, workspaceB, ai });
  };

  const handleStartMerge = () => {
    startMergeMutation.mutate();
  };

  const handlePreviewChanges = () => {
    if (mergeJob?.mergedFiles && mergeJob.mergedFiles.length > 0) {
      toast({
        title: "Preview available",
        description: "Check the code diff viewer below for merged results.",
      });
    } else {
      toast({
        title: "No preview available",
        description: "Start the merge process to preview changes.",
      });
    }
  };

  const handleDownloadMerged = async () => {
    if (!currentJobId) return;

    try {
      const response = await fetch(`/api/merge-jobs/${currentJobId}/download`);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `merged-workspace-${currentJobId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your merged workspace is being downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const workspaceAFiles = workspaceFiles.filter(f => f.workspace === "a");
  const workspaceBFiles = workspaceFiles.filter(f => f.workspace === "b");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Ready to merge</Badge>;
      case "processing":
        return <Badge className="bg-blue-500 text-white animate-pulse">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-github-bg">
      {/* Header */}
      <header className="bg-white border-b border-github-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🔀</div>
              <h1 className="text-xl font-bold text-github-dark">CodeMerge AI</h1>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">Beta</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-github-gray hover:text-github-dark">
                <span className="mr-2">❓</span>
                Help
              </Button>
              <Button variant="ghost" size="sm" className="text-github-gray hover:text-github-dark">
                <span className="mr-2">⚙️</span>
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Configuration Panel */}
        <div className="mb-6">
          <ConfigurationPanel
            onLoadWorkspaces={handleLoadWorkspaces}
            loading={createJobMutation.isPending}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* File Trees Sidebar */}
          <div className="xl:col-span-1">
            <FileTree
              workspaceAFiles={workspaceAFiles}
              workspaceBFiles={workspaceBFiles}
              onStartMerge={handleStartMerge}
              onPreviewChanges={handlePreviewChanges}
              onDownloadMerged={handleDownloadMerged}
              canStartMerge={!!currentJobId && mergeJob?.status === "pending" && (workspaceAFiles.length > 0 || workspaceBFiles.length > 0)}
              canDownload={mergeJob?.status === "completed"}
              loading={startMergeMutation.isPending || mergeJob?.status === "processing"}
            />
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">
            {/* Status Bar */}
            <Card className="border-github-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        mergeJob?.status === "completed" ? "bg-green-500" :
                        mergeJob?.status === "processing" ? "bg-blue-500 animate-pulse" :
                        mergeJob?.status === "failed" ? "bg-red-500" :
                        "bg-gray-400"
                      }`}></div>
                      {mergeJob ? getStatusBadge(mergeJob.status) : <span className="text-sm text-github-gray">No active job</span>}
                    </div>
                    
                    {mergeJob && (
                      <>
                        <div className="text-sm text-github-gray">
                          Files analyzed: <span className="font-medium">{workspaceFiles.length}</span>
                        </div>
                        <div className="text-sm text-github-gray">
                          Conflicts detected: <span className={`font-medium ${mergeJob.conflicts?.length ? 'text-yellow-600' : 'text-green-600'}`}>
                            {mergeJob.conflicts?.length || 0}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/merge-jobs", currentJobId] })}
                      className="text-github-gray hover:text-github-dark"
                    >
                      <RefreshCw size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-github-gray hover:text-github-dark"
                    >
                      <Maximize2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Code Diff Viewer */}
            <CodeDiffViewer
              mergedFiles={mergeJob?.mergedFiles || []}
              conflicts={mergeJob?.conflicts || []}
            />

            {/* Merge Summary */}
            <MergeSummaryComponent summary={mergeJob?.summary} />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {mergeJob?.status === "failed" && mergeJob.errorMessage && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="text-sm text-red-800">
                <strong>Merge Failed:</strong> {mergeJob.errorMessage}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
