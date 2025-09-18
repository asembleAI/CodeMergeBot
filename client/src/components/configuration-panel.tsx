import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, GitBranch } from "lucide-react";
import { WorkspaceConfig, AIConfig } from "@/types/workspace";

interface ConfigurationPanelProps {
  onLoadWorkspaces: (workspaceA: WorkspaceConfig, workspaceB: WorkspaceConfig, aiConfig: AIConfig) => void;
  loading: boolean;
}

export default function ConfigurationPanel({ onLoadWorkspaces, loading }: ConfigurationPanelProps) {
  const [workspaceA, setWorkspaceA] = useState<WorkspaceConfig>({
    url: "",
    branch: "main",
    token: "",
  });

  const [workspaceB, setWorkspaceB] = useState<WorkspaceConfig>({
    url: "",
    branch: "main",
    token: "",
  });

  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: "openai",
    apiKey: "",
  });

  const handleSubmit = () => {
    if (!workspaceA.url || !workspaceB.url || !aiConfig.apiKey) {
      return;
    }
    
    onLoadWorkspaces(workspaceA, workspaceB, aiConfig);
  };

  const isFormValid = workspaceA.url && workspaceB.url && aiConfig.apiKey;

  return (
    <Card className="border-github-border">
      <CardHeader className="bg-gray-50 border-b border-github-border">
        <CardTitle className="text-lg font-semibold text-github-dark flex items-center">
          <Settings className="mr-2 text-github-blue" size={20} />
          Workspace Configuration
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workspace A */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <Label className="font-medium text-github-dark">Workspace A (Base)</Label>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-github-gray mb-2">
                GitHub Repository URL
              </Label>
              <Input
                type="url"
                placeholder="https://github.com/octocat/Hello-World"
                value={workspaceA.url}
                onChange={(e) => setWorkspaceA({ ...workspaceA, url: e.target.value })}
                className="border-github-border focus:ring-github-blue focus:border-github-blue"
              />
              <div className="text-xs text-gray-500 mt-1">
                Example: https://github.com/octocat/Hello-World
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-github-gray mb-2">
                  Branch
                </Label>
                <Input
                  placeholder="main"
                  value={workspaceA.branch}
                  onChange={(e) => setWorkspaceA({ ...workspaceA, branch: e.target.value })}
                  className="border-github-border focus:ring-github-blue focus:border-github-blue"
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-github-gray mb-2">
                  Access Token
                </Label>
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxx"
                  value={workspaceA.token}
                  onChange={(e) => setWorkspaceA({ ...workspaceA, token: e.target.value })}
                  className="border-github-border focus:ring-github-blue focus:border-github-blue"
                />
              </div>
            </div>
          </div>

          {/* Workspace B */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <Label className="font-medium text-github-dark">Workspace B (Feature)</Label>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-github-gray mb-2">
                GitHub Repository URL
              </Label>
              <Input
                type="url"
                placeholder="https://github.com/octocat/Spoon-Knife"
                value={workspaceB.url}
                onChange={(e) => setWorkspaceB({ ...workspaceB, url: e.target.value })}
                className="border-github-border focus:ring-github-blue focus:border-github-blue"
              />
              <div className="text-xs text-gray-500 mt-1">
                Example: https://github.com/octocat/Spoon-Knife
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="block text-sm font-medium text-github-gray mb-2">
                  Branch
                </Label>
                <Input
                  placeholder="feature/login"
                  value={workspaceB.branch}
                  onChange={(e) => setWorkspaceB({ ...workspaceB, branch: e.target.value })}
                  className="border-github-border focus:ring-github-blue focus:border-github-blue"
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-github-gray mb-2">
                  Access Token
                </Label>
                <Input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxx"
                  value={workspaceB.token}
                  onChange={(e) => setWorkspaceB({ ...workspaceB, token: e.target.value })}
                  className="border-github-border focus:ring-github-blue focus:border-github-blue"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Test Button */}
        <div className="mt-6 pt-6 border-t border-github-border">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
            <div className="flex items-start space-x-2">
              <div className="text-blue-600 dark:text-blue-400">ℹ️</div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Rate Limit Solution:</strong> Use the test repositories below (no tokens needed) or add GitHub tokens above for your own repositories.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-github-dark">Quick Test</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWorkspaceA({
                  url: "https://github.com/octocat/Hello-World",
                  branch: "master",
                  token: "",
                });
                setWorkspaceB({
                  url: "https://github.com/octocat/Spoon-Knife",
                  branch: "main", 
                  token: "",
                });
              }}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Load Test Repositories
            </Button>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="mt-6 pt-6 border-t border-github-border">
          <h3 className="text-md font-medium text-github-dark mb-3">AI Model Configuration</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <Label className="block text-sm font-medium text-github-gray mb-2">
                AI Provider
              </Label>
              <Select
                value={aiConfig.provider}
                onValueChange={(value: "openai" | "anthropic") => 
                  setAiConfig({ ...aiConfig, provider: value })
                }
              >
                <SelectTrigger className="border-github-border focus:ring-github-blue focus:border-github-blue">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium text-github-gray mb-2">
                API Key
              </Label>
              <Input
                type="password"
                placeholder="sk-xxxxxxxxxxxxxxxx"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                className="border-github-border focus:ring-github-blue focus:border-github-blue"
              />
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || loading}
                className="w-full bg-github-blue text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <GitBranch className="mr-2" size={16} />
                {loading ? "Loading..." : "Load Workspaces"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
