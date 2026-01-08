"use client";

import { useCallback, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge, Plus } from "lucide-react";
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
import { useOptimisticRoleUpdate } from "@/hooks/use-optimistic-role-update";
import { useRoleDataWithStatus } from "@/hooks/use-role-data";
import {
  EFFORT_POINT_OPTIONS,
  ROLE_FIELD_TOOLTIPS,
} from "@/lib/role/role-constants";
import { type RoleFormData, roleFormSchema } from "@/lib/role/role-form-schema";
import { ROLE_COLORS } from "@/lib/utils";
import { api } from "@/trpc/react";

import { useCreateRole } from "../hooks/use-create-role";
import { useUpdateRole } from "../hooks/use-update-role";
import { useTeamStoreApiOptional } from "../store/team-store";
import { getViewportCenter } from "../utils/role-schema";

interface EditRoleData {
  roleId: string;
  nodeId?: string;
}

interface RoleDialogProps {
  teamId: string;
  roleData?: EditRoleData;
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
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditMode = !!roleData;

  const storeApi = useTeamStoreApiOptional();
  const isInCanvasContext = !!storeApi;

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

  const { data: metrics = [] } = api.metric.getByTeamId.useQuery({ teamId });
  const { data: members = [] } = api.organization.getMembers.useQuery();

  const onBeforeMutate = useCallback(() => {
    setOpen(false);
    form.reset();
  }, [setOpen, form]);

  const canvasCreateRole = useCreateRole({
    teamId,
    getNodeOptions: useCallback(() => {
      if (!storeApi) return { position: { x: 400, y: 300 } };
      const reactFlowInstance = storeApi.getState().reactFlowInstance;
      return { position: getViewportCenter(reactFlowInstance) };
    }, [storeApi]),
    onBeforeMutate,
  });

  const canvasUpdateRole = useUpdateRole({
    teamId,
    onBeforeMutate,
  });

  const genericUpdateRole = useOptimisticRoleUpdate(teamId);
  const genericCreateRole = api.role.create.useMutation({
    onSuccess: () => {
      onBeforeMutate();
    },
  });

  function onSubmit(data: RoleFormData) {
    const metricId =
      data.metricId === "__none__" || !data.metricId
        ? undefined
        : data.metricId;
    const assignedUserId =
      data.assignedUserId === "__none__" ? null : data.assignedUserId;

    if (isEditMode && roleData) {
      const updatePayload = {
        id: roleData.roleId,
        title: data.title,
        purpose: data.purpose,
        accountabilities: data.accountabilities,
        metricId,
        assignedUserId,
        effortPoints: data.effortPoints,
        color: data.color,
      };

      if (isInCanvasContext) {
        canvasUpdateRole.mutate(updatePayload);
      } else {
        onBeforeMutate();
        genericUpdateRole.mutate(updatePayload);
      }
    } else {
      const createPayload = {
        teamId,
        title: data.title,
        purpose: data.purpose,
        accountabilities: data.accountabilities,
        metricId,
        assignedUserId,
        effortPoints: data.effortPoints ?? undefined,
        nodeId: `role-node-${nanoid(8)}`,
        color: data.color,
      };

      if (isInCanvasContext) {
        canvasCreateRole.mutate(createPayload);
      } else {
        genericCreateRole.mutate(createPayload);
      }
    }
  }

  const isPending = isInCanvasContext
    ? canvasCreateRole.isPending || canvasUpdateRole.isPending
    : genericCreateRole.isPending || genericUpdateRole.isPending;
  const isFormDisabled = isPending || (isEditMode && isRoleLoading);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[31rem]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update role details and assignments"
              : "Add a new role to your team"}
          </DialogDescription>
        </DialogHeader>

        {isEditMode && isRoleError && (
          <div className="bg-destructive/10 text-destructive rounded-md p-4 text-center">
            <p className="text-sm font-medium">Failed to load role data</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Please close and try again
            </p>
          </div>
        )}

        {isEditMode && isRoleLoading && !isRoleError && (
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-10 rounded" />
            <div className="bg-muted h-24 rounded" />
            <div className="bg-muted h-24 rounded" />
            <div className="bg-muted h-10 rounded" />
          </div>
        )}

        {(!isEditMode || (!isRoleLoading && !isRoleError)) && (
          <TooltipProvider>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
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
        )}
      </DialogContent>
    </Dialog>
  );
}
