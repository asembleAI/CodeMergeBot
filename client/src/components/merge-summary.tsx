import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, CheckCircle, Info, Sparkles } from "lucide-react";

interface MergeSummary {
  totalFiles: number;
  mergedFiles: number;
  conflictsResolved: number;
  linesAdded: number;
  recommendations: string[];
}

interface MergeSummaryProps {
  summary?: MergeSummary;
}

export default function MergeSummaryComponent({ summary }: MergeSummaryProps) {
  if (!summary) {
    return (
      <Card className="border-github-border">
        <CardContent className="p-8 text-center">
          <div className="text-github-gray">
            Merge summary will appear here after the merge process is completed.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-github-border">
      <CardHeader>
        <CardTitle className="font-medium text-github-dark flex items-center">
          <BarChart className="mr-2 text-github-blue" size={20} />
          Merge Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summary.mergedFiles}</div>
            <div className="text-sm text-green-700">Files Successfully Merged</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{summary.conflictsResolved}</div>
            <div className="text-sm text-yellow-700">Conflicts Resolved</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{summary.linesAdded}</div>
            <div className="text-sm text-blue-700">Lines Added</div>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="space-y-3">
          <h4 className="font-medium text-github-dark">AI Merge Recommendations:</h4>
          <div className="space-y-2">
            {summary.recommendations.map((recommendation, index) => {
              const getIcon = (rec: string) => {
                if (rec.toLowerCase().includes('success') || rec.toLowerCase().includes('integrated')) {
                  return <CheckCircle className="text-green-600" size={16} />;
                } else if (rec.toLowerCase().includes('ai') || rec.toLowerCase().includes('created')) {
                  return <Sparkles className="text-purple-600" size={16} />;
                } else {
                  return <Info className="text-blue-600" size={16} />;
                }
              };

              const getBgColor = (rec: string) => {
                if (rec.toLowerCase().includes('success') || rec.toLowerCase().includes('integrated')) {
                  return 'bg-green-50';
                } else if (rec.toLowerCase().includes('ai') || rec.toLowerCase().includes('created')) {
                  return 'bg-purple-50';
                } else {
                  return 'bg-blue-50';
                }
              };

              return (
                <div key={index} className={`flex items-start space-x-3 p-3 ${getBgColor(recommendation)} rounded`}>
                  {getIcon(recommendation)}
                  <div className="text-sm flex-1">
                    {recommendation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>Total Files Processed:</strong> {summary.totalFiles} files from both workspaces
          </div>
          <div className="text-sm text-gray-600 mt-1">
            <strong>Merge Success Rate:</strong> {summary.totalFiles > 0 ? Math.round((summary.mergedFiles / summary.totalFiles) * 100) : 0}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
