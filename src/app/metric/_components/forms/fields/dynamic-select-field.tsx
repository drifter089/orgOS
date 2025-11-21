"use client";

import { Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

interface DynamicSelectFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  connectionId: string;
  templateId: string;
  dropdownKey: string;
  dependsOnValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DynamicSelectField({
  label,
  description,
  value,
  onChange,
  connectionId,
  templateId,
  dropdownKey,
  dependsOnValue,
  placeholder,
  required,
  disabled,
}: DynamicSelectFieldProps) {
  // Auto-fetch dropdown options
  const { data: options, isLoading } = api.metric.fetchDynamicOptions.useQuery(
    {
      connectionId,
      templateId,
      dropdownKey,
      dependsOnValue,
    },
    {
      enabled: !disabled,
    },
  );

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                (placeholder ?? `Select ${label}`)
              )
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
