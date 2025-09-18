import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, AlertTriangle, Check, X } from "lucide-react";

interface MergedFile {
  path: string;
  content: string;
  type: string;
  changes: Change[];
}

interface Change {
  type: "added" | "removed" | "modified";
  lineNumber: number;
  content: string;
  source: "workspace_a" | "workspace_b" | "ai_generated";
}

interface Conflict {
  filePath: string;
  type: "naming" | "content" | "dependency";
  description: string;
  recommendation: string;
  options: ConflictOption[];
}

interface ConflictOption {
  id: string;
  description: string;
  preview: string;
}

interface CodeDiffViewerProps {
  mergedFiles: MergedFile[];
  conflicts: Conflict[];
  onResolveConflict?: (conflictIndex: number, optionId: string) => void;
}

export default function CodeDiffViewer({ 
  mergedFiles = [], 
  conflicts = [],
  onResolveConflict 
}: CodeDiffViewerProps) {
  const [selectedFile, setSelectedFile] = useState<string>(mergedFiles[0]?.path || "");
  
  const currentFile = mergedFiles.find(f => f.path === selectedFile);
  const currentConflict = conflicts.find(c => c.filePath === selectedFile);

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderCodeWithHighlights = (content: string, changes: Change[]) => {
    const lines = content.split('\n');
    
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      const change = changes.find(c => c.lineNumber === lineNumber);
      
      let className = "px-4 py-1 border-l-4 border-transparent";
      if (change) {
        switch (change.type) {
          case "added":
            className = "px-4 py-1 bg-green-50 border-l-4 border-green-500";
            break;
          case "removed":
            className = "px-4 py-1 bg-red-50 border-l-4 border-red-500";
            break;
          case "modified":
            className = "px-4 py-1 bg-yellow-50 border-l-4 border-yellow-500";
            break;
        }
      }
      
      return (
        <div key={index} className={className}>
          <span className="text-gray-400 text-sm mr-4 inline-block w-8">
            {lineNumber}
          </span>
          <code className="font-mono text-sm">{line || ' '}</code>
        </div>
      );
    });
  };

  if (mergedFiles.length === 0) {
    return (
      <Card className="border-github-border">
        <CardContent className="p-8 text-center">
          <div className="text-github-gray">
            No merged files to display. Start the merge process to see results.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-github-border">
      <CardHeader className="border-b border-github-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="font-medium text-github-dark">Code Preview</h3>
            <div className="flex items-center space-x-2">
              {mergedFiles.map((file) => (
                <Button
                  key={file.path}
                  variant={selectedFile === file.path ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFile(file.path)}
                  className={selectedFile === file.path 
                    ? "bg-blue-100 text-blue-800" 
                    : "text-github-gray hover:bg-gray-100"
                  }
                >
                  {file.path.split('/').pop()}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentFile && copyToClipboard(currentFile.content)}
              className="text-github-gray hover:text-github-dark"
            >
              <Copy className="mr-1" size={14} />
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => currentFile && downloadFile(currentFile.path, currentFile.content)}
              className="text-github-gray hover:text-github-dark"
            >
              <Download className="mr-1" size={14} />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {currentFile ? (
          <Tabs defaultValue="merged" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="merged">Merged Result</TabsTrigger>
              <TabsTrigger value="changes">Changes Summary</TabsTrigger>
            </TabsList>
            
            <TabsContent value="merged" className="mt-4">
              <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-auto">
                <div className="font-mono text-sm">
                  {renderCodeWithHighlights(currentFile.content, currentFile.changes)}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="changes" className="mt-4">
              <div className="space-y-3">
                {currentFile.changes.map((change, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-md bg-gray-50">
                    <Badge 
                      variant={change.type === "added" ? "default" : 
                               change.type === "removed" ? "destructive" : "secondary"}
                    >
                      {change.type}
                    </Badge>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Line {change.lineNumber}</div>
                      <div className="text-sm text-gray-600 mt-1">{change.content}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Source: {change.source.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                ))}
                
                {currentFile.changes.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No changes detected for this file
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Select a file to view its contents
          </div>
        )}

        {/* Conflict Resolution */}
        {currentConflict && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="text-yellow-600 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800">Merge Conflict Detected</h4>
                <p className="text-sm text-yellow-700 mt-1">{currentConflict.description}</p>
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-yellow-800">
                    AI Recommendation: {currentConflict.recommendation}
                  </div>
                  
                  <div className="space-y-2">
                    {currentConflict.options.map((option, index) => (
                      <div key={option.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{option.description}</div>
                          <div className="text-xs text-gray-500 mt-1 font-mono">
                            {option.preview.substring(0, 100)}...
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => onResolveConflict?.(index, option.id)}
                            className="bg-green-600 text-white hover:bg-green-700"
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-600 hover:bg-gray-100"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
