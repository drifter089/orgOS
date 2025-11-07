"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { CollectionFrequency } from "@prisma/client";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const metricSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  type: z.enum(["percentage", "number", "duration", "rate"]),
  targetValue: z.coerce.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  collectionFrequency: z.nativeEnum(CollectionFrequency).optional(),
  dataSource: z.string().optional(),
});

type MetricForm = z.infer<typeof metricSchema>;

interface MetricDialogProps {
  metricId?: string; // For edit mode
  trigger?: React.ReactNode; // Custom trigger
  open?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void; // Callback after successful create/update
}

export function MetricDialog({
  metricId,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: MetricDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditMode = !!metricId;

  const form = useForm<MetricForm>({
    resolver: zodResolver(metricSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "percentage",
      targetValue: undefined,
      unit: "",
      category: "",
      collectionFrequency: undefined,
      dataSource: "",
    },
  });

  // Fetch metric data for edit mode
  const { data: metrics } = api.metric.getAll.useQuery();
  const metricData = metrics?.find((m) => m.id === metricId);

  // Reset form when metric data changes or dialog opens
  useEffect(() => {
    if (open && isEditMode && metricData) {
      form.reset({
        name: metricData.name,
        description: metricData.description ?? "",
        type: metricData.type as "percentage" | "number" | "duration" | "rate",
        targetValue: metricData.targetValue ?? undefined,
        unit: metricData.unit ?? "",
        category: metricData.category ?? "",
        collectionFrequency:
          metricData.collectionFrequency ?? CollectionFrequency.DAILY,
        dataSource: metricData.dataSource ?? "",
      });
    } else if (open && !isEditMode) {
      form.reset({
        name: "",
        description: "",
        type: "percentage",
        targetValue: undefined,
        unit: "",
        category: "",
        collectionFrequency: undefined,
        dataSource: "",
      });
    }
  }, [open, isEditMode, metricData, form]);

  const utils = api.useUtils();

  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
  });

  const updateMetric = api.metric.update.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setOpen(false);
      onSuccess?.();
    },
  });

  function onSubmit(data: MetricForm) {
    const payload = {
      ...data,
      collectionFrequency:
        data.collectionFrequency ?? CollectionFrequency.DAILY,
    };

    if (isEditMode && metricId) {
      updateMetric.mutate({
        id: metricId,
        ...payload,
      });
    } else {
      createMetric.mutate(payload);
    }
  }

  const isPending = createMetric.isPending || updateMetric.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Metric
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Metric" : "Create New Metric"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update metric details"
              : "Add a new KPI metric to track"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Customer Satisfaction"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What does this metric measure?"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="duration">Duration</SelectItem>
                        <SelectItem value="rate">Rate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., %, ms, points" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 85"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : parseFloat(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>Default target/goal</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., user_metrics"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>For grouping</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="collectionFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REAL_TIME">Real-time</SelectItem>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>How often it updates</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dataSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Source</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., posthog, manual"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Where data comes from</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Metric"
                    : "Create Metric"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
