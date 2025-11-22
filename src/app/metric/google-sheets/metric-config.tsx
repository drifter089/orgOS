/**
 * Google Sheets-specific metric configuration UI
 * Provides integration-specific forms and logic for creating Google Sheets metrics
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { templates } from "./templates";
import { GOOGLE_SHEETS_TRANSFORMS } from "./transforms";

/**
 * Google Sheets-specific metric configuration UI
 * Provides integration-specific forms and logic for creating Google Sheets metrics
 */

interface GoogleSheetsMetricConfigProps {
  connectionId: string;
  templateId: string;
  onSave: (config: {
    name: string;
    endpointParams: Record<string, string>;
  }) => void;
}

export function GoogleSheetsMetricConfig({
  connectionId,
  templateId,
  onSave,
}: GoogleSheetsMetricConfigProps) {
  const template = templates.find((t) => t.templateId === templateId);
  const [params, setParams] = useState<Record<string, string>>({});
  const [metricName, setMetricName] = useState(template?.label ?? "");

  if (!template) return <div>Template not found</div>;

  // Find sheet name dropdown (if exists)
  const sheetParam = template.requiredParams.find(
    (p) => p.name === "SHEET_NAME",
  );

  // Fetch sheets for dropdown (depends on SPREADSHEET_ID)
  const shouldFetchSheets = sheetParam?.dynamicConfig && params.SPREADSHEET_ID;

  const sheetEndpoint =
    sheetParam?.dynamicConfig?.endpoint?.replace(
      "{SPREADSHEET_ID}",
      params.SPREADSHEET_ID ?? "",
    ) ?? "";

  const { data: sheetsData, isLoading: isLoadingSheets } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId,
        integrationId: "google-sheet",
        endpoint: sheetEndpoint,
        method: sheetParam?.dynamicConfig?.method ?? "GET",
      },
      {
        enabled: !!shouldFetchSheets,
      },
    );

  const sheetOptions = sheetsData?.data
    ? GOOGLE_SHEETS_TRANSFORMS.sheets(sheetsData.data)
    : [];

  // Fetch preview data (for column data template)
  const shouldFetchPreview =
    template.previewEndpoint && params.SPREADSHEET_ID && params.SHEET_NAME;

  const previewEndpoint = template.previewEndpoint
    ?.replace("{SPREADSHEET_ID}", params.SPREADSHEET_ID ?? "")
    .replace("{SHEET_NAME}", params.SHEET_NAME ?? "");

  const { data: previewData, isLoading: isLoadingPreview } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId,
        integrationId: "google-sheet",
        endpoint: previewEndpoint ?? "",
        method: "GET",
      },
      {
        enabled: !!shouldFetchPreview,
      },
    );

  const previewRows = previewData?.data
    ? GOOGLE_SHEETS_TRANSFORMS.sheetPreview(previewData.data)
    : [];

  const handleSave = () => {
    onSave({
      name: metricName,
      endpointParams: params,
    });
  };

  const isComplete = template.requiredParams.every(
    (param) => !param.required || params[param.name],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="metric-name">Metric Name</Label>
        <Input
          id="metric-name"
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          placeholder="Metric name"
        />
      </div>

      {template.requiredParams.map((param) => {
        if (param.type === "text") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Input
                id={param.name}
                value={params[param.name] ?? ""}
                onChange={(e) => {
                  const newParams = { ...params, [param.name]: e.target.value };
                  // Clear dependent params
                  if (param.name === "SPREADSHEET_ID") {
                    newParams.SHEET_NAME = "";
                  }
                  setParams(newParams);
                }}
                placeholder={param.placeholder}
              />
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "number") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Input
                id={param.name}
                type="number"
                value={params[param.name] ?? ""}
                onChange={(e) =>
                  setParams({ ...params, [param.name]: e.target.value })
                }
                placeholder={param.placeholder}
              />
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "dynamic-select" && param.name === "SHEET_NAME") {
          const isDisabled = !params.SPREADSHEET_ID || isLoadingSheets;
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) =>
                  setParams({ ...params, [param.name]: value })
                }
                disabled={isDisabled}
              >
                <SelectTrigger id={param.name}>
                  <SelectValue
                    placeholder={
                      !params.SPREADSHEET_ID
                        ? "Enter spreadsheet ID first"
                        : isLoadingSheets
                          ? "Loading sheets..."
                          : param.placeholder
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sheetOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "select" && param.options) {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) =>
                  setParams({ ...params, [param.name]: value })
                }
              >
                <SelectTrigger id={param.name}>
                  <SelectValue placeholder={param.placeholder ?? param.label} />
                </SelectTrigger>
                <SelectContent>
                  {param.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        return null;
      })}

      {/* Preview Section */}
      {shouldFetchPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sheet Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPreview ? (
              <p className="text-muted-foreground text-sm">
                Loading preview...
              </p>
            ) : previewRows.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewRows[0]?.map((_, idx) => (
                        <TableHead key={idx}>Col {idx}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.slice(0, 10).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewRows.length > 10 && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    Showing first 10 rows of {previewRows.length}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No data found</p>
            )}
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={!isComplete} className="w-full">
        Save Metric
      </Button>
    </div>
  );
}
