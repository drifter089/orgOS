"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Check, Loader2, Sparkles } from "lucide-react";

import type { ChartTransformResult } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { getTemplate } from "@/app/metric/registry";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

import { useMetricDataPrefetch } from "../_hooks/use-metric-data-prefetch";
import type { ContentProps } from "./MetricDialogBase";

function extractSpreadsheetId(url: string): string | null {
  const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
  const match = regex.exec(url);
  return match?.[1] ?? null;
}

const TEMPLATE_ID = "gsheets-column-data";

export function GoogleSheetsMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");

  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [metricName, setMetricName] = useState("");

  // AI transform state
  const [chartData, setChartData] = useState<ChartTransformResult | null>(null);
  const [isAiTransforming, setIsAiTransforming] = useState(false);
  const aiTriggeredForDataRef = useRef<string | null>(null);

  const template = getTemplate(TEMPLATE_ID);
  const transformAIMutation = api.dashboard.transformChartWithAI.useMutation();

  // Fetch spreadsheet metadata
  const { data: metadataData, isLoading: isLoadingMetadata } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "google-sheet",
        endpoint: `/v4/spreadsheets/${spreadsheetId}`,
        method: "GET",
      },
      {
        enabled: !!connection && !!spreadsheetId,
        staleTime: 5 * 60 * 1000,
      },
    );

  // Fetch sheet data for preview
  const { data: sheetData, isLoading: isLoadingSheetData } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "google-sheet",
        endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${selectedSheet}`,
        method: "GET",
      },
      {
        enabled: !!connection && !!spreadsheetId && !!selectedSheet,
        staleTime: 5 * 60 * 1000,
      },
    );

  const sheets = useMemo(() => {
    if (!metadataData?.data) return [];
    const response = metadataData.data as {
      sheets?: Array<{ properties: { title: string } }>;
    };
    return response.sheets?.map((s) => ({ title: s.properties.title })) ?? [];
  }, [metadataData]);

  const previewData = useMemo(() => {
    if (!sheetData?.data) return [];
    const response = sheetData.data as { values?: string[][] };
    return response.values?.slice(0, 10) ?? [];
  }, [sheetData]);

  // Build endpoint params
  const endpointParams = useMemo((): Record<string, string> => {
    if (!spreadsheetId || !selectedSheet || selectedColumns.length === 0)
      return {};
    return {
      SPREADSHEET_ID: spreadsheetId,
      SHEET_NAME: selectedSheet,
      COLUMNS: selectedColumns.join(","),
    };
  }, [spreadsheetId, selectedSheet, selectedColumns]);

  // Pre-fetch raw data when all options are selected
  const prefetch = useMetricDataPrefetch({
    connectionId: connection.connectionId,
    integrationId: "google-sheet",
    template: template ?? null,
    endpointParams,
    enabled:
      !!spreadsheetId &&
      !!selectedSheet &&
      selectedColumns.length > 0 &&
      !!template,
  });

  // Move to step 2 when metadata is loaded
  useEffect(() => {
    if (sheets.length > 0 && step === 1 && spreadsheetId) {
      setStep(2);
    }
  }, [sheets, step, spreadsheetId]);

  // Auto-trigger AI transform when raw data becomes ready
  useEffect(() => {
    const dataKey = JSON.stringify({
      data: prefetch.data ? "exists" : null,
      spreadsheetId,
      selectedSheet,
      columns: selectedColumns,
      name: metricName,
    });

    if (
      prefetch.status === "ready" &&
      prefetch.data &&
      !chartData &&
      !isAiTransforming &&
      metricName &&
      spreadsheetId &&
      selectedSheet &&
      selectedColumns.length > 0 &&
      aiTriggeredForDataRef.current !== dataKey
    ) {
      aiTriggeredForDataRef.current = dataKey;
      setIsAiTransforming(true);

      transformAIMutation.mutate(
        {
          metricConfig: {
            name: metricName,
            description: `Tracking columns from ${selectedSheet} in Google Sheets`,
            metricTemplate: TEMPLATE_ID,
            endpointConfig: endpointParams,
          },
          rawData: prefetch.data,
        },
        {
          onSuccess: (result) => {
            setChartData(result as ChartTransformResult);
            setIsAiTransforming(false);
          },
          onError: () => {
            setIsAiTransforming(false);
          },
        },
      );
    }
  }, [
    prefetch.status,
    prefetch.data,
    chartData,
    isAiTransforming,
    metricName,
    spreadsheetId,
    selectedSheet,
    selectedColumns,
    endpointParams,
    transformAIMutation,
  ]);

  const handleStep1Next = () => {
    const id = extractSpreadsheetId(spreadsheetUrl);
    if (!id || !connection) return;
    setSpreadsheetId(id);
  };

  const handleStep2Next = () => {
    if (!selectedSheet || !connection || !spreadsheetId) return;
    setStep(3);
  };

  const handleCreateMetric = () => {
    if (!connection || !metricName || selectedColumns.length === 0) return;

    // Reset the AI mutation to prevent duplicate calls if it's still running
    // The card will handle refreshing if chartData isn't ready
    transformAIMutation.reset();

    // Pass both raw data AND pre-computed chart data
    onSubmit(
      {
        templateId: TEMPLATE_ID,
        connectionId: connection.connectionId,
        name: metricName,
        description: `Tracking columns from ${selectedSheet} in Google Sheets`,
        endpointParams,
      },
      {
        rawData: prefetch.status === "ready" ? prefetch.data : undefined,
        chartData,
      },
    );
  };

  const toggleColumn = (index: number) => {
    setSelectedColumns((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
    // Reset AI state when columns change
    setChartData(null);
    aiTriggeredForDataRef.current = null;
  };

  const isStep1Valid = spreadsheetUrl.trim() !== "";
  const isStep2Valid = selectedSheet !== "";
  const isStep3Valid = metricName.trim() !== "" && selectedColumns.length > 0;

  const isPrefetching = prefetch.status === "fetching";
  const isPrefetchReady = prefetch.status === "ready";
  const isChartReady = !!chartData;

  return (
    <>
      <div className="space-y-4 py-4">
        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="spreadsheet-url">Google Sheets Link</Label>
            <Input
              id="spreadsheet-url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Paste the full URL from your Google Sheets document
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-select">Select Sheet</Label>
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger id="sheet-select">
                  <SelectValue placeholder="Choose a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((sheet, index) => (
                    <SelectItem
                      key={`${sheet.title}-${index}`}
                      value={sheet.title}
                    >
                      {sheet.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSheet && (
              <div className="text-muted-foreground rounded-md border p-3 text-sm">
                <p className="mb-1 font-medium">Selected:</p>
                <p>{selectedSheet}</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name</Label>
              <Input
                id="metric-name"
                placeholder="e.g., Sales Data"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Preview & Select Columns</Label>
              {isLoadingSheetData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : previewData.length > 0 ? (
                <div className="rounded-md border">
                  <ScrollArea className="h-[400px] w-full">
                    <div className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">
                              #
                            </TableHead>
                            {previewData[0]?.map((_, index) => (
                              <TableHead key={index}>
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedColumns.includes(index)}
                                    onCheckedChange={() => toggleColumn(index)}
                                  />
                                  <span>Col {index + 1}</span>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                              <TableCell className="text-muted-foreground text-center text-xs font-medium">
                                {rowIndex + 1}
                              </TableCell>
                              {row.map((cell, cellIndex) => (
                                <TableCell
                                  key={cellIndex}
                                  className={
                                    selectedColumns.includes(cellIndex)
                                      ? "bg-primary/10"
                                      : ""
                                  }
                                >
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No data available
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Select columns by checking the boxes above. Showing first 10
                rows.
              </p>
            </div>

            {/* Status indicator */}
            {isStep3Valid && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                {isPrefetching && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Fetching data...</span>
                  </>
                )}
                {isPrefetchReady && !isChartReady && !isAiTransforming && (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Data ready</span>
                  </>
                )}
                {isAiTransforming && (
                  <>
                    <Sparkles className="h-3 w-3 animate-pulse text-blue-500" />
                    <span className="text-blue-500">AI analyzing...</span>
                  </>
                )}
                {isChartReady && (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      Chart ready - instant create!
                    </span>
                  </>
                )}
                {prefetch.status === "error" && (
                  <span className="text-amber-600">Will fetch on create</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((step - 1) as 1 | 2)}
          >
            Back
          </Button>
        )}

        {step === 1 && (
          <Button
            onClick={handleStep1Next}
            disabled={!isStep1Valid || isLoadingMetadata}
          >
            {isLoadingMetadata ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Next"
            )}
          </Button>
        )}

        {step === 2 && (
          <Button onClick={handleStep2Next} disabled={!isStep2Valid}>
            Next
          </Button>
        )}

        {step === 3 && (
          <Button
            onClick={handleCreateMetric}
            disabled={!isStep3Valid || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Metric"
            )}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
