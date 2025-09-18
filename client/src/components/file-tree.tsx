import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Folder, 
  FileText, 
  FileCode, 
  AlertTriangle,
  Download,
  Search,
  Sparkles 
} from "lucide-react";
import { WorkspaceFile } from "@/types/workspace";

interface FileTreeProps {
  workspaceAFiles: WorkspaceFile[];
  workspaceBFiles: WorkspaceFile[];
  onStartMerge: () => void;
  onPreviewChanges: () => void;
  onDownloadMerged: () => void;
  canStartMerge: boolean;
  canDownload: boolean;
  loading: boolean;
}

export default function FileTree({ 
  workspaceAFiles, 
  workspaceBFiles, 
  onStartMerge,
  onPreviewChanges,
  onDownloadMerged,
  canStartMerge,
  canDownload,
  loading
}: FileTreeProps) {
  
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'scss'];
    
    if (codeExtensions.includes(extension || '')) {
      return <FileCode className="text-blue-500" size={16} />;
    }
    
    return <FileText className="text-github-gray" size={16} />;
  };

  const buildFileTree = (files: WorkspaceFile[]) => {
    const tree: any = {};
    
    files.forEach(file => {
      const parts = file.filePath.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? file : {};
        }
        if (index < parts.length - 1) {
          current = current[part];
        }
      });
    });
    
    return tree;
  };

  const renderTreeItem = (name: string, item: any, level: number = 0) => {
    const isFile = item.filePath !== undefined;
    const marginLeft = level * 16;
    
    if (isFile) {
      return (
        <div 
          key={item.id}
          className="tree-item px-2 py-1 cursor-pointer rounded text-sm flex items-center hover:bg-gray-50"
          style={{ marginLeft }}
        >
          {getFileIcon(name)}
          <span className="ml-2">{name}</span>
          {item.isConflict && (
            <AlertTriangle className="text-yellow-500 ml-auto" size={14} />
          )}
        </div>
      );
    }
    
    return (
      <div key={name}>
        <div 
          className="tree-item px-2 py-1 cursor-pointer rounded text-sm flex items-center hover:bg-gray-50"
          style={{ marginLeft }}
        >
          <Folder className="text-github-gray" size={16} />
          <span className="ml-2">{name}/</span>
        </div>
        {Object.entries(item).map(([childName, childItem]) => 
          renderTreeItem(childName, childItem, level + 1)
        )}
      </div>
    );
  };

  const workspaceATree = buildFileTree(workspaceAFiles);
  const workspaceBTree = buildFileTree(workspaceBFiles);

  return (
    <div className="space-y-4">
      {/* Workspace A Files */}
      <Card className="border-github-border">
        <CardHeader className="px-4 py-3 border-b border-github-border bg-blue-50">
          <CardTitle className="font-medium text-github-dark flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            Workspace A Files
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 max-h-64 overflow-y-auto">
          {Object.keys(workspaceATree).length > 0 ? (
            Object.entries(workspaceATree).map(([name, item]) =>
              renderTreeItem(name, item)
            )
          ) : (
            <div className="text-center text-github-gray py-4">
              No files loaded
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace B Files */}
      <Card className="border-github-border">
        <CardHeader className="px-4 py-3 border-b border-github-border bg-green-50">
          <CardTitle className="font-medium text-github-dark flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            Workspace B Files
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 max-h-64 overflow-y-auto">
          {Object.keys(workspaceBTree).length > 0 ? (
            Object.entries(workspaceBTree).map(([name, item]) =>
              renderTreeItem(name, item)
            )
          ) : (
            <div className="text-center text-github-gray py-4">
              No files loaded
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge Actions */}
      <Card className="border-github-border">
        <CardContent className="p-4">
          <h3 className="font-medium text-github-dark mb-3">Merge Actions</h3>
          <div className="space-y-2">
            <Button
              onClick={onStartMerge}
              disabled={!canStartMerge || loading}
              className="w-full bg-github-blue text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Sparkles className="mr-2" size={16} />
              {loading ? "Processing..." : "Start AI Merge"}
            </Button>
            
            <Button
              onClick={onPreviewChanges}
              variant="outline"
              className="w-full border-github-border text-github-dark hover:bg-gray-100"
            >
              <Search className="mr-2" size={16} />
              Preview Changes
            </Button>
            
            <Button
              onClick={onDownloadMerged}
              disabled={!canDownload}
              className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="mr-2" size={16} />
              Download Merged
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
