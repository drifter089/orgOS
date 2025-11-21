"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

import { GoogleSheetsPreview } from "../previews/google-sheets-preview";
import { DynamicSelectField } from "./fields/dynamic-select-field";
import { NumberField } from "./fields/number-field";
import { SelectField } from "./fields/select-field";
import { TextField } from "./fields/text-field";

interface TemplateMetricFormProps {
  connectionId: string;
  integrationId: string;
  onSuccess?: () => void;
}

export function TemplateMetricForm({
  connectionId,
  integrationId,
  onSuccess,
}: TemplateMetricFormProps) {
  // Fetch templates for this integration
  const { data: templates, isLoading: loadingTemplates } =
    api.metric.getTemplatesByIntegration.useQuery({
      integrationId,
    });

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const selectedTemplate = templates?.find(
    (t) => t.templateId === selectedTemplateId,
  );

  // Form state - dynamic based on selected template
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");

  // Create mutation
  const createMutation = api.metric.createFromTemplate.useMutation({
    onSuccess: () => {
      // Reset form
      setSelectedTemplateId("");
      setFormValues({});
      setMetricName("");
      setTargetValue("");
      onSuccess?.();
    },
  });

  // Update form value
  const updateFormValue = (name: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle create
  const handleCreate = () => {
    if (!selectedTemplate) return;

    createMutation.mutate({
      templateId: selectedTemplate.templateId,
      connectionId,
      name: metricName || selectedTemplate.label,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      endpointParams: formValues,
    });
  };

  // Check if form is valid
  const isFormValid = () => {
    if (!selectedTemplate) return false;

    const requiredParams = selectedTemplate.requiredParams.filter(
      (p) => p.required,
    );
    return requiredParams.every((param) => {
      const value = formValues[param.name];
      return value && value.length > 0;
    });
  };

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Metric</CardTitle>
        <CardDescription>
          Select a template and configure your metric
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Metric Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem
                  key={template.templateId}
                  value={template.templateId}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{template.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {template.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Form Fields */}
        {selectedTemplate && (
          <>
            <Separator />

            {/* Render each required param dynamically */}
            {selectedTemplate.requiredParams.map((param) => {
              const value = formValues[param.name] ?? "";

              // Handle different field types
              if (param.type === "text") {
                return (
                  <TextField
                    key={param.name}
                    label={param.label}
                    description={param.description}
                    value={value}
                    onChange={(v) => updateFormValue(param.name, v)}
                    placeholder={param.placeholder}
                    required={param.required}
                  />
                );
              }

              if (param.type === "number") {
                return (
                  <NumberField
                    key={param.name}
                    label={param.label}
                    description={param.description}
                    value={value}
                    onChange={(v) => updateFormValue(param.name, v)}
                    placeholder={param.placeholder}
                    required={param.required}
                  />
                );
              }

              if (param.type === "select" && param.options) {
                return (
                  <SelectField
                    key={param.name}
                    label={param.label}
                    description={param.description}
                    value={value}
                    onChange={(v) => updateFormValue(param.name, v)}
                    options={param.options}
                    placeholder={param.placeholder}
                    required={param.required}
                  />
                );
              }

              if (param.type === "dynamic-select" && param.dynamicOptionsKey) {
                // Check if this field depends on another
                const dependsOnValue = param.dependsOn
                  ? formValues[param.dependsOn]
                  : undefined;
                const isDisabled = Boolean(
                  param.dependsOn && !formValues[param.dependsOn],
                );

                return (
                  <DynamicSelectField
                    key={param.name}
                    label={param.label}
                    description={param.description}
                    value={value}
                    onChange={(v) => {
                      updateFormValue(param.name, v);
                      // Clear dependent fields when parent changes
                      const dependentFields =
                        selectedTemplate.requiredParams.filter(
                          (p) => p.dependsOn === param.name,
                        );
                      dependentFields.forEach((field) => {
                        updateFormValue(field.name, "");
                      });
                    }}
                    connectionId={connectionId}
                    templateId={selectedTemplate.templateId}
                    dropdownKey={param.dynamicOptionsKey}
                    dependsOnValue={dependsOnValue}
                    placeholder={param.placeholder}
                    required={param.required}
                    disabled={isDisabled}
                  />
                );
              }

              return null;
            })}

            {/* Google Sheets Preview (special case) */}
            {integrationId === "google-sheet" &&
              formValues.SPREADSHEET_ID &&
              formValues.SHEET_NAME && (
                <GoogleSheetsPreview
                  connectionId={connectionId}
                  spreadsheetId={formValues.SPREADSHEET_ID}
                  sheetName={formValues.SHEET_NAME}
                />
              )}

            <Separator />

            {/* Metric Configuration */}
            <div className="space-y-4">
              <h3 className="font-semibold">Metric Configuration</h3>

              <div className="space-y-2">
                <Label>Metric Name (Optional)</Label>
                <Input
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder={selectedTemplate.label}
                />
                <p className="text-muted-foreground text-sm">
                  Leave blank to use template name
                </p>
              </div>

              <div className="space-y-2">
                <Label>Target Value (Optional)</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="e.g., 1000"
                />
                <p className="text-muted-foreground text-sm">
                  Set a target goal for this metric
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleCreate}
              disabled={!isFormValid() || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Metric"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
