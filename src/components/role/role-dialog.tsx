"use client";

import { useCallback, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge, Plus, Sparkles } from "lucide-react";
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
import { useOptimisticRoleUpdate } from "@/hooks/use-optimistic-role-update";
import { useRoleDataWithStatus } from "@/hooks/use-role-data";
import {
  EFFORT_POINT_OPTIONS,
  ROLE_FIELD_TOOLTIPS,
} from "@/lib/role/role-constants";
import { type RoleFormData, roleFormSchema } from "@/lib/role/role-form-schema";
import { ROLE_COLORS, markdownToHtml } from "@/lib/utils";
import { api } from "@/trpc/react";

/**
 * Props for editing an existing role.
 * Only roleId is needed - role data is fetched from cache.
 */
interface EditRoleData {
  roleId: string;
  /** Only needed for canvas context */
  nodeId?: string;
}

/**
 * Suggested role from AI panel
 */
interface SuggestedRole {
  title: string;
  purpose: string;
  accountabilities: string;
  color: string;
}

interface RoleDialogProps {
  teamId: string;
  /** For edit mode: pass roleId (and optionally nodeId for canvas) */
  roleData?: EditRoleData;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Show AI suggestions panel (create mode only, canvas context) */
  showAISuggestions?: boolean;
  /** AI suggestions component (passed from canvas to avoid import issues) */
  aiSuggestionsPanel?: React.ComponentType<{
    teamId: string;
    onSelectRole: (role: SuggestedRole) => void;
    onSelectTitle: (title: string) => void;
    currentTitle: string;
    currentPurpose: string;
    className?: string;
  }>;
  /** Called when role is created (canvas context - for node creation) */
  onRoleCreated?: (data: {
    id: string;
    title: string;
    purpose: string;
    color: string;
    effortPoints?: number;
    metricId?: string;
    assignedUserId?: string | null;
  }) => void;
}

/**
 * Unified role dialog for both create and edit modes.
 * Works in canvas context (with AI suggestions) and standalone (dashboard, etc.)
 */
export function RoleDialog({
  teamId,
  roleData,
  trigger,
  open: controlledOpen,
  onOpenChange,
  showAISuggestions: showAISuggestionsProp = false,
  aiSuggestionsPanel: AISuggestionsPanel,
  onRoleCreated,
}: RoleDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showAISuggestionsState, setShowAISuggestionsState] = useState(true);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditMode = !!roleData;
  const showAISuggestions =
    showAISuggestionsProp && !isEditMode && showAISuggestionsState;

  // Fetch role data from TanStack Query cache for edit mode
  const {
    data: role,
    isLoading: isRoleLoading,
    isError: isRoleError,
  } = useRoleDataWithStatus(teamId, roleData?.roleId ?? "");

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

  // Reset form when dialog opens, using role data from cache
  useEffect(() => {
    if (open) {
      if (isEditMode && role) {
        form.reset({
          title: role.title,
          purpose: role.purpose,
          accountabilities: role.accountabilities ?? "",
          metricId: role.metricId ?? "",
          assignedUserId: role.assignedUserId ?? null,
          effortPoints: role.effortPoints ?? null,
          color: role.color ?? ROLE_COLORS[0],
        });
      } else if (!isEditMode) {
        form.reset({
          title: "",
          purpose: "",
          accountabilities: "",
          metricId: "",
          assignedUserId: null,
          effortPoints: null,
          color: ROLE_COLORS[0],
        });
      }
    }
  }, [open, isEditMode, role, form]);

  // Fetch metrics and members for dropdowns
  const { data: metrics = [] } = api.metric.getByTeamId.useQuery({ teamId });
  const { data: members = [] } = api.organization.getMembers.useQuery();

  // Use optimistic update hook for edit mode
  const updateRole = useOptimisticRoleUpdate(teamId);

  // Use create mutation for create mode
  const createRole = api.role.create.useMutation();

  const handleClose = useCallback(() => {
    setOpen(false);
    form.reset();
  }, [setOpen, form]);

  function onSubmit(data: RoleFormData) {
    const metricId =
      data.metricId === "__none__" || !data.metricId
        ? undefined
        : data.metricId;
    const assignedUserId =
      data.assignedUserId === "__none__" ? null : data.assignedUserId;

    if (isEditMode && roleData) {
      handleClose();
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
      // Create mode - if onRoleCreated is provided, let parent handle creation
      if (onRoleCreated) {
        handleClose();
        onRoleCreated({
          id: "", // Will be assigned by parent/server
          title: data.title,
          purpose: data.purpose,
          color: data.color ?? ROLE_COLORS[0],
          effortPoints: data.effortPoints ?? undefined,
          metricId,
          assignedUserId,
        });
      } else {
        // Standalone create - use direct mutation
        handleClose();
        createRole.mutate({
          teamId,
          title: data.title,
          purpose: data.purpose,
          accountabilities: data.accountabilities,
          metricId,
          assignedUserId,
          effortPoints: data.effortPoints ?? undefined,
          nodeId: `role-node-standalone-${Date.now()}`,
          color: data.color,
        });
      }
    }
  }

  const isPending = createRole.isPending || updateRole.isPending;
  const isFormDisabled = isPending || (isEditMode && isRoleLoading);

  const handleSelectSuggestedRole = (suggestedRole: SuggestedRole) => {
    form.setValue("title", suggestedRole.title, { shouldDirty: true });
    form.setValue("purpose", markdownToHtml(suggestedRole.purpose), {
      shouldDirty: true,
    });
    form.setValue(
      "accountabilities",
      markdownToHtml(suggestedRole.accountabilities),
      { shouldDirty: true },
    );
    form.setValue("color", suggestedRole.color, { shouldDirty: true });
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
        className={`max-h-[90vh] overflow-y-auto transition-[max-width] duration-300 ease-in-out ${showAISuggestions ? "sm:max-w-[53rem]" : "sm:max-w-[31rem]"}`}
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
                  : "Add a new role to your team"}
              </DialogDescription>
            </div>
            {showAISuggestionsProp && !isEditMode && AISuggestionsPanel && (
              <Button
                variant={showAISuggestionsState ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  setShowAISuggestionsState(!showAISuggestionsState)
                }
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                AI
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Show error state for edit mode */}
        {isEditMode && isRoleError && (
          <div className="bg-destructive/10 text-destructive rounded-md p-4 text-center">
            <p className="text-sm font-medium">Failed to load role data</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Please close and try again
            </p>
          </div>
        )}

        {/* Show loading state for edit mode */}
        {isEditMode && isRoleLoading && !isRoleError && (
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-24 rounded" />
            <div className="bg-muted h-24 rounded" />
            <div className="bg-muted h-10 rounded" />
          </div>
        )}

        {/* Show form when not loading/error in edit mode, or always in create mode */}
        {(!isEditMode || (!isRoleLoading && !isRoleError)) && (
          <div
            className={`flex gap-4 ${showAISuggestions ? "flex-col sm:flex-row" : ""}`}
          >
            <TooltipProvider>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className={`space-y-4 ${showAISuggestions ? "flex-1" : "w-full"}`}
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
                              <SelectItem
                                key={points}
                                value={points.toString()}
                              >
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
                                  field.value === color
                                    ? "black"
                                    : "transparent",
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
                    <Button type="submit" disabled={isFormDisabled}>
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

            {/* AI Suggestions Panel - only show in create mode when enabled */}
            {showAISuggestions && AISuggestionsPanel && (
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showAISuggestionsState ? "w-64 opacity-100" : "w-0 opacity-0"
                }`}
              >
                <AISuggestionsPanel
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
        )}
      </DialogContent>
    </Dialog>
  );
}
