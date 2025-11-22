"use client";

import { useEffect, useState } from "react";

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
import { templates } from "@/lib/integrations/google-sheets";
import { api } from "@/trpc/react";

// =============================================================================
// Transform Functions (moved from lib/integrations/google-sheets.ts)
// =============================================================================

function transformSheets(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    sheets?: Array<{ properties: { title: string } }>;
  };

  return (
    response.sheets?.map((s) => ({
      label: s.properties.title,
      value: s.properties.title,
    })) ?? []
  );
}

// =============================================================================
// Google Sheets Metrics Creation Page
// =============================================================================

export default function GoogleSheetsMetricsPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [metricName, setMetricName] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [sheetOptions, setSheetOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  const utils = api.useUtils();
  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setSelectedTemplateId("");
      setMetricName("");
      setParams({});
      setSheetOptions([]);
    },
  });

  const fetchSheets = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformSheets(data.data);
      setSheetOptions(options);
    },
  });

  const selectedTemplate = templates.find(
    (t) => t.templateId === selectedTemplateId,
  );

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "google-sheet",
  );

  // Fetch sheets when SPREADSHEET_ID is provided
  useEffect(() => {
    if (
      params.SPREADSHEET_ID &&
      connection &&
      selectedTemplate?.requiredParams.some((p) => p.name === "SHEET_NAME")
    ) {
      fetchSheets.mutate({
        connectionId: connection.connectionId,
        integrationId: "google-sheet",
        endpoint: `/v4/spreadsheets/${params.SPREADSHEET_ID}`,
        method: "GET",
        params: {},
      });
    }
  }, [params.SPREADSHEET_ID, connection, selectedTemplate]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setMetricName("");
    setParams({});
    setSheetOptions([]);
  };

  const handleSave = () => {
    if (!selectedTemplate || !metricName || !connection) return;

    createMetric.mutate({
      templateId: selectedTemplate.templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description: selectedTemplate.description,
      endpointParams: params,
    });
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Google Sheets Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your Google Sheets account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Google Sheets Metric</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={handleTemplateChange}
          >
            <SelectTrigger id="template">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem
                  key={template.templateId}
                  value={template.templateId}
                >
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-muted-foreground text-sm">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        {/* Metric Name */}
        {selectedTemplate && (
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name</Label>
            <Input
              id="name"
              placeholder="e.g., Sales Data"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
            />
          </div>
        )}

        {/* Dynamic Parameters */}
        {selectedTemplate?.requiredParams.map((param) => {
          if (param.type === "text") {
            return (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>{param.label}</Label>
                <Input
                  id={param.name}
                  placeholder={param.placeholder}
                  value={params[param.name] ?? ""}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      [param.name]: e.target.value,
                    }))
                  }
                />
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
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
                  placeholder={param.placeholder}
                  value={params[param.name] ?? ""}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      [param.name]: e.target.value,
                    }))
                  }
                />
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              </div>
            );
          }

          if (param.type === "dynamic-select" && param.name === "SHEET_NAME") {
            return (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>{param.label}</Label>
                <Select
                  value={params[param.name] ?? ""}
                  onValueChange={(value) =>
                    setParams((prev) => ({ ...prev, [param.name]: value }))
                  }
                  disabled={!params.SPREADSHEET_ID || sheetOptions.length === 0}
                >
                  <SelectTrigger id={param.name}>
                    <SelectValue
                      placeholder={
                        !params.SPREADSHEET_ID
                          ? "Enter spreadsheet ID first"
                          : fetchSheets.isPending
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
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              </div>
            );
          }

          return null;
        })}

        {/* Save Button */}
        {selectedTemplate && (
          <Button
            onClick={handleSave}
            disabled={
              !metricName ||
              createMetric.isPending ||
              selectedTemplate.requiredParams.some(
                (p) => p.required && !params[p.name],
              )
            }
          >
            {createMetric.isPending ? "Creating..." : "Create Metric"}
          </Button>
        )}

        {createMetric.isError && (
          <p className="text-destructive text-sm">
            Error: {createMetric.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
