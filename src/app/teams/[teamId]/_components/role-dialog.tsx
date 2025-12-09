"use client";

import { useCallback, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge, Plus, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { useForm } from "react-hook-form";

import { FormLabelWithTooltip } from "@/components/form-label-with-tooltip";
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
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ROLE_COLORS, markdownToHtml } from "@/lib/utils";
import { api } from "@/trpc/react";

import { useCreateRole } from "../hooks/use-create-role";
import type { SuggestedRole } from "../hooks/use-role-suggestions";
import { useUpdateRole } from "../hooks/use-update-role";
import { useTeamStoreApi } from "../store/team-store";
import {
  type RoleFormData,
  getViewportCenter,
  roleFormSchema,
} from "../utils/role-schema";
import { AIRoleSuggestions } from "./ai-role-suggestions";
import { type RoleNodeData } from "./role-node";
import { EFFORT_POINT_OPTIONS, ROLE_FIELD_TOOLTIPS } from "./role-tooltips";

interface RoleDialogProps {
  teamId: string;
  roleData?: RoleNodeData & { nodeId: string };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RoleDialog({
  teamId,
  roleData,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: RoleDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditMode = !!roleData;
  const storeApi = useTeamStoreApi();

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      title: "",
      purpose: "",
      accountabilities: "",
      metricId: "",
      assignedUserId: null,
      effortPoints: null,
      color: ROLE_COLORS[0],
    },
  });

  // Reset form when roleData changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset(
        roleData
          ? {
              title: roleData.title,
              purpose: roleData.purpose,
              accountabilities: roleData.accountabilities ?? "",
              metricId: roleData.metricId ?? "",
              assignedUserId: roleData.assignedUserId ?? null,
              effortPoints: roleData.effortPoints ?? null,
              color: roleData.color ?? ROLE_COLORS[0],
            }
          : {
              title: "",
              purpose: "",
              accountabilities: "",
              metricId: "",
              assignedUserId: null,
              effortPoints: null,
              color: ROLE_COLORS[0],
            },
      );
    }
  }, [open, roleData, form]);

  // Fetch metrics and members for dropdowns
  const { data: metrics = [] } = api.metric.getByTeamId.useQuery({ teamId });
  const { data: members = [] } = api.organization.getMembers.useQuery();

  // Shared callbacks for hooks
  const getMetric = useCallback(
    (metricId: string) => metrics.find((m) => m.id === metricId),
    [metrics],
  );
  const getMember = useCallback(
    (userId: string) => members.find((m) => m.id === userId),
    [members],
  );
  const onBeforeMutate = useCallback(() => {
    setOpen(false);
    form.reset();
  }, [setOpen, form]);

  // Mutation hooks
  const createRole = useCreateRole({
    teamId,
    getNodeOptions: useCallback(() => {
      const reactFlowInstance = storeApi.getState().reactFlowInstance;
      return { position: getViewportCenter(reactFlowInstance) };
    }, [storeApi]),
    getMetric,
    getMember,
    onBeforeMutate,
  });

  const updateRole = useUpdateRole({
    teamId,
    getMetric,
    getMember,
    onBeforeMutate,
  });

  function onSubmit(data: RoleFormData) {
    const metricId =
      data.metricId === "__none__" || !data.metricId
        ? undefined
        : data.metricId;
    const assignedUserId =
      data.assignedUserId === "__none__" ? null : data.assignedUserId;

    if (isEditMode && roleData) {
      updateRole.mutate({
        id: roleData.roleId,
        title: data.title,
        purpose: data.purpose,
        accountabilities: data.accountabilities,
        metricId,
        assignedUserId,
        effortPoints: data.effortPoints,
        color: data.color,
      });
    } else {
      createRole.mutate({
        teamId,
        title: data.title,
        purpose: data.purpose,
        accountabilities: data.accountabilities,
        metricId,
        assignedUserId,
        effortPoints: data.effortPoints ?? undefined,
        nodeId: `role-node-${nanoid(8)}`,
        color: data.color,
      });
    }
  }

  const isPending = createRole.isPending || updateRole.isPending;

  const handleSelectSuggestedRole = (role: SuggestedRole) => {
    form.setValue("title", role.title, { shouldDirty: true });
    form.setValue("purpose", markdownToHtml(role.purpose), {
      shouldDirty: true,
    });
    form.setValue("accountabilities", markdownToHtml(role.accountabilities), {
      shouldDirty: true,
    });
    form.setValue("color", role.color, { shouldDirty: true });
  };

  const watchedTitle = form.watch("title");
  const watchedPurpose = form.watch("purpose");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto transition-[max-width] duration-300 ease-in-out ${!isEditMode && showAISuggestions ? "sm:max-w-[53rem]" : "sm:max-w-[31rem]"}`}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {isEditMode ? "Edit Role" : "Create New Role"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update role details and assignments"
                  : "Add a new role to your team canvas"}
              </DialogDescription>
            </div>
            {!isEditMode && (
              <Button
                variant={showAISuggestions ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAISuggestions(!showAISuggestions)}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                AI
              </Button>
            )}
          </div>
        </DialogHeader>

        <div
          className={`flex gap-4 ${!isEditMode && showAISuggestions ? "flex-col sm:flex-row" : ""}`}
        >
          <TooltipProvider>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={`space-y-4 ${!isEditMode && showAISuggestions ? "flex-1" : "w-full"}`}
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Title"
                        tooltip={ROLE_FIELD_TOOLTIPS.title}
                        required
                      />
                      <FormControl>
                        <Input
                          placeholder="e.g., Product Manager"
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
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Purpose"
                        tooltip={ROLE_FIELD_TOOLTIPS.purpose}
                        required
                      />
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Describe the role's responsibilities..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountabilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Accountabilities"
                        tooltip={ROLE_FIELD_TOOLTIPS.accountabilities}
                      />
                      <FormControl>
                        <RichTextEditor
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          placeholder="List key accountabilities for this role..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metricId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Metric"
                        tooltip={ROLE_FIELD_TOOLTIPS.metric}
                      />
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a metric (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {metrics.map((metric) => (
                            <SelectItem key={metric.id} value={metric.id}>
                              {metric.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Assigned To"
                        tooltip={ROLE_FIELD_TOOLTIPS.assignedTo}
                      />
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <span>
                                  {member.firstName} {member.lastName}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {member.email}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effortPoints"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Effort Points"
                        tooltip={ROLE_FIELD_TOOLTIPS.effortPoints}
                      />
                      <Select
                        onValueChange={(value) =>
                          field.onChange(
                            value === "__none__" ? null : parseInt(value, 10),
                          )
                        }
                        value={field.value?.toString() ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select effort points">
                              {field.value && (
                                <div className="flex items-center gap-2">
                                  <Gauge className="h-4 w-4" />
                                  <span>
                                    {field.value}{" "}
                                    {field.value === 1 ? "point" : "points"}
                                  </span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {EFFORT_POINT_OPTIONS.map((points) => (
                            <SelectItem key={points} value={points.toString()}>
                              <div className="flex items-center gap-2">
                                <Gauge className="h-4 w-4" />
                                <span>
                                  {points} {points === 1 ? "point" : "points"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabelWithTooltip
                        label="Color"
                        tooltip={ROLE_FIELD_TOOLTIPS.color}
                      />
                      <div className="flex gap-2">
                        {ROLE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className="h-8 w-8 rounded-md border-2 transition-all hover:scale-110"
                            style={{
                              backgroundColor: color,
                              borderColor:
                                field.value === color ? "black" : "transparent",
                            }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                        ? "Update Role"
                        : "Create Role"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TooltipProvider>

          {/* AI Suggestions Panel - only show in create mode */}
          {!isEditMode && (
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showAISuggestions ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
            >
              <AIRoleSuggestions
                teamId={teamId}
                onSelectRole={handleSelectSuggestedRole}
                onSelectTitle={(title) => form.setValue("title", title)}
                currentTitle={watchedTitle}
                currentPurpose={watchedPurpose}
                className="shrink-0"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
