"use client";

import { useState } from "react";

import {
  ArrowDown,
  Check,
  Code,
  Copy,
  Database,
  FileJson,
  LineChart,
  Maximize2,
  Settings,
  X,
  Zap,
} from "lucide-react";

import { JsonViewer } from "@/components/json-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

import { PipelineStep } from "./pipeline-step";

interface DevMetricClientProps {
  metricId: string;
}

function CodeBlock({ code, title = "Code" }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  const CodeContent = ({ maxHeight }: { maxHeight?: string }) => (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full border-collapse font-mono text-xs">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-muted/50">
              <td className="border-border/50 text-muted-foreground/50 border-r px-3 py-0.5 text-right select-none">
                {i + 1}
              </td>
              <td className="px-3 py-0.5 whitespace-pre">{line || " "}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="group bg-muted/30 relative rounded-lg border">
        {/* Header */}
        <div className="bg-muted/50 flex items-center justify-between border-b px-3 py-1.5">
          <span className="text-muted-foreground text-xs font-medium">
            {title}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground/60 text-[10px]">
              {lines.length} lines
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-2"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Code content */}
        <CodeContent maxHeight="350px" />
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="flex max-h-[90vh] !w-[80vw] !max-w-[80vw] flex-col gap-0 p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle>{title}</DialogTitle>
                <p className="text-muted-foreground text-sm">
                  {lines.length} lines
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullscreen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 p-4">
            <CodeContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DevMetricClient({ metricId }: DevMetricClientProps) {
  const { data, isLoading, error } = api.devTool.getMetricPipelineData.useQuery(
    { metricId },
  );

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-1/3 rounded"></div>
          <div className="bg-muted h-4 w-1/2 rounded"></div>
          <div className="bg-muted h-64 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-5xl p-8">
        <div className="text-red-600">Error: {error.message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto max-w-5xl p-8">
        <div className="text-muted-foreground">No data found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-600 text-amber-600">
            DEV TOOL
          </Badge>
          <h1 className="text-2xl font-bold">Metric Data Pipeline</h1>
        </div>
        <p className="text-muted-foreground">
          Debugging view for metric: <strong>{data.metricInfo.name}</strong>
        </p>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-4">
        {/* Step 1: Metric Info */}
        <PipelineStep
          stepNumber={1}
          title="Metric Info (AI Context)"
          icon={<Settings className="h-4 w-4" />}
          description="Information passed to AI for transformer generation"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Metric ID:</span>{" "}
                <code className="text-xs">{data.metricInfo.id}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Template ID:</span>{" "}
                <code className="text-xs">
                  {data.metricInfo.templateId ?? "N/A"}
                </code>
              </div>
              <div>
                <span className="text-muted-foreground">Last Fetched:</span>{" "}
                {data.metricInfo.lastFetchedAt
                  ? new Date(data.metricInfo.lastFetchedAt).toLocaleString()
                  : "Never"}
              </div>
              <div>
                <span className="text-muted-foreground">Last Error:</span>{" "}
                <span
                  className={data.metricInfo.lastError ? "text-red-600" : ""}
                >
                  {data.metricInfo.lastError ?? "None"}
                </span>
              </div>
            </div>

            {data.metricInfo.template && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Template Info</h4>
                <JsonViewer
                  data={data.metricInfo.template}
                  maxPreviewHeight="150px"
                />
              </div>
            )}

            {data.metricInfo.endpointConfig && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Endpoint Config</h4>
                <JsonViewer
                  data={data.metricInfo.endpointConfig}
                  maxPreviewHeight="100px"
                />
              </div>
            )}

            {data.metricInfo.integration && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Integration</h4>
                <JsonViewer
                  data={data.metricInfo.integration}
                  maxPreviewHeight="100px"
                />
              </div>
            )}
          </div>
        </PipelineStep>

        <ArrowDown className="text-muted-foreground mx-auto h-6 w-6" />

        {/* Step 2: Raw API Response */}
        <PipelineStep
          stepNumber={2}
          title="Raw API Response"
          icon={<FileJson className="h-4 w-4" />}
          description="Response from the integration API (from MetricApiLog)"
          badge={
            data.apiLogs.length > 0 ? `${data.apiLogs.length} logs` : "No logs"
          }
          status={data.apiLogs.length === 0 ? "missing" : undefined}
        >
          {data.apiLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No API logs recorded yet. This will be populated after the next
              data fetch.
            </p>
          ) : (
            <div className="space-y-4">
              {data.apiLogs.map((log, index) => (
                <div key={log.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant={log.success ? "default" : "destructive"}>
                      {log.success ? "Success" : "Failed"}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(log.fetchedAt).toLocaleString()}
                    </span>
                    {log.endpoint && (
                      <code className="text-muted-foreground text-xs">
                        {log.endpoint}
                      </code>
                    )}
                    {index === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Latest
                      </Badge>
                    )}
                  </div>
                  {log.error && (
                    <p className="text-sm text-red-600">{log.error}</p>
                  )}
                  <JsonViewer data={log.rawResponse} maxPreviewHeight="200px" />
                </div>
              ))}
            </div>
          )}
        </PipelineStep>

        <ArrowDown className="text-muted-foreground mx-auto h-6 w-6" />

        {/* Step 3: DataIngestionTransformer */}
        <PipelineStep
          stepNumber={3}
          title="DataIngestionTransformer"
          icon={<Code className="h-4 w-4" />}
          description="AI-generated code: API Response → DataPoint[]"
          status={data.dataIngestionTransformer ? "success" : "missing"}
        >
          {data.dataIngestionTransformer ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Template ID:</span>{" "}
                  <code className="text-xs">
                    {data.dataIngestionTransformer.templateId}
                  </code>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {new Date(
                    data.dataIngestionTransformer.createdAt,
                  ).toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Transformer Code</h4>
                <CodeBlock
                  code={data.dataIngestionTransformer.transformerCode}
                  title="DataIngestionTransformer.js"
                />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No DataIngestionTransformer found. This will be created on first
              data fetch.
            </p>
          )}
        </PipelineStep>

        <ArrowDown className="text-muted-foreground mx-auto h-6 w-6" />

        {/* Step 4: MetricDataPoint Table */}
        <PipelineStep
          stepNumber={4}
          title="MetricDataPoint Records"
          icon={<Database className="h-4 w-4" />}
          description="Stored time-series data in database"
          badge={`${data.dataPoints.length} points`}
        >
          {data.dataPoints.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No data points stored yet.
            </p>
          ) : (
            <ScrollArea className="h-[300px] rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Value</TableHead>
                    <TableHead>Dimensions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dataPoints.map((dp) => (
                    <TableRow key={dp.id}>
                      <TableCell className="font-mono text-xs">
                        {new Date(dp.timestamp).toISOString()}
                      </TableCell>
                      <TableCell className="font-mono">{dp.value}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {dp.dimensions ? JSON.stringify(dp.dimensions) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </PipelineStep>

        <ArrowDown className="text-muted-foreground mx-auto h-6 w-6" />

        {/* Step 5: Chart Input Data */}
        <PipelineStep
          stepNumber={5}
          title="ChartTransformer Input"
          icon={<Zap className="h-4 w-4" />}
          description="DataPoints passed to ChartTransformer"
          defaultOpen={false}
        >
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              The same {data.dataPoints.length} data points from Step 4 are
              passed to the ChartTransformer with the following structure:
            </p>
            <JsonViewer
              data={data.dataPoints.slice(0, 10).map((dp) => ({
                timestamp: dp.timestamp,
                value: dp.value,
                dimensions: dp.dimensions,
              }))}
              maxPreviewHeight="200px"
            />
            {data.dataPoints.length > 10 && (
              <p className="text-muted-foreground text-xs">
                Showing first 10 of {data.dataPoints.length} points...
              </p>
            )}
          </div>
        </PipelineStep>

        <ArrowDown className="text-muted-foreground mx-auto h-6 w-6" />

        {/* Step 6: ChartTransformer */}
        <PipelineStep
          stepNumber={6}
          title="ChartTransformer"
          icon={<Code className="h-4 w-4" />}
          description="AI-generated code: DataPoint[] → ChartConfig"
          status={data.chartTransformer ? "success" : "missing"}
        >
          {data.chartTransformer ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Chart Type:</span>{" "}
                  <Badge variant="outline">
                    {data.chartTransformer.chartType}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Cadence:</span>{" "}
                  <Badge variant="outline">
                    {data.chartTransformer.cadence}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>{" "}
                  {data.chartTransformer.version}
                </div>
              </div>
              {data.chartTransformer.userPrompt && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-sm">
                    User Prompt:
                  </span>
                  <p className="bg-muted/50 rounded-lg p-2 text-sm">
                    {data.chartTransformer.userPrompt}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Transformer Code</h4>
                <CodeBlock
                  code={data.chartTransformer.transformerCode}
                  title="ChartTransformer.js"
                />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No ChartTransformer found. This will be created when the chart is
              configured.
            </p>
          )}
        </PipelineStep>

        <ArrowDown className="text-muted-foreground mx-auto h-6 w-6" />

        {/* Step 7: Final ChartConfig */}
        <PipelineStep
          stepNumber={7}
          title="Final ChartConfig"
          icon={<LineChart className="h-4 w-4" />}
          description="Stored in DashboardChart.chartConfig"
          status={data.chartConfig ? "success" : "missing"}
        >
          {data.chartConfig ? (
            <div className="space-y-4">
              {data.dashboardChartId && (
                <div className="text-sm">
                  <span className="text-muted-foreground">
                    Dashboard Chart ID:
                  </span>{" "}
                  <code className="text-xs">{data.dashboardChartId}</code>
                </div>
              )}
              <JsonViewer data={data.chartConfig} maxPreviewHeight="400px" />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No chart configuration found. This will be generated after the
              ChartTransformer runs.
            </p>
          )}
        </PipelineStep>
      </div>
    </div>
  );
}
