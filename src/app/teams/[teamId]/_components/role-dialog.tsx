"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Gauge, Plus } from "lucide-react";
import { nanoid } from "nanoid";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { api } from "@/trpc/react";

import { useTeamStore, useTeamStoreApi } from "../store/team-store";
import { type RoleNodeData } from "./role-node";
import { EFFORT_POINT_OPTIONS, ROLE_FIELD_TOOLTIPS } from "./role-tooltips";

const roleSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  purpose: z.string().min(1, "Purpose is required"),
  accountabilities: z.string().optional(),
  metricId: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  effortPoints: z.number().int().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

type RoleForm = z.infer<typeof roleSchema>;

/** Calculate the center position of the current viewport in flow coordinates */
function getViewportCenter(
  reactFlowInstance: {
    screenToFlowPosition: (position: { x: number; y: number }) => {
      x: number;
      y: number;
    };
  } | null,
): { x: number; y: number } {
  if (!reactFlowInstance) {
    return { x: 400, y: 300 };
  }

  const container = document.querySelector(".react-flow");
  if (!container) {
    return { x: 400, y: 300 };
  }

  const rect = container.getBoundingClientRect();
  const screenCenterX = rect.left + rect.width / 2;
  const screenCenterY = rect.top + rect.height / 2;

  return reactFlowInstance.screenToFlowPosition({
    x: screenCenterX,
    y: screenCenterY,
  });
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
];

interface RoleDialogProps {
  teamId: string;
  roleData?: RoleNodeData & { nodeId: string }; // For edit mode
  trigger?: React.ReactNode; // Custom trigger (for node double-click)
  open?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void; // Controlled open state
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
  const storeApi = useTeamStoreApi();
  const setNodes = useTeamStore((state) => state.setNodes);
  const markDirty = useTeamStore((state) => state.markDirty);

  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      title: "",
      purpose: "",
      accountabilities: "",
      metricId: "",
      assignedUserId: null,
      effortPoints: null,
      color: COLORS[0],
    },
  });

  // Reset form when roleData changes or dialog opens
  useEffect(() => {
    if (open) {
      if (roleData) {
        form.reset({
          title: roleData.title,
          purpose: roleData.purpose,
          accountabilities: roleData.accountabilities ?? "",
          metricId: roleData.metricId ?? "",
          assignedUserId: roleData.assignedUserId ?? null,
          effortPoints: roleData.effortPoints ?? null,
          color: roleData.color ?? COLORS[0],
        });
      } else {
        form.reset({
          title: "",
          purpose: "",
          accountabilities: "",
          metricId: "",
          assignedUserId: null,
          effortPoints: null,
          color: COLORS[0],
        });
      }
    }
  }, [open, roleData, form]);

  // Fetch metrics for dropdown (only metrics belonging to this team)
  const { data: metrics = [] } = api.metric.getByTeamId.useQuery({ teamId });

  // Fetch organization members for assignment
  const { data: members = [] } = api.organization.getMembers.useQuery();

  const utils = api.useUtils();

  const createRole = api.role.create.useMutation({
    onMutate: async (variables) => {
      setOpen(false);
      form.reset();

      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });
      const currentNodes = storeApi.getState().nodes;
      const previousNodes = [...currentNodes];
      const reactFlowInstance = storeApi.getState().reactFlowInstance;

      const tempRoleId = `temp-role-${nanoid(8)}`;
      const nodeId = variables.nodeId;

      const selectedMetric = variables.metricId
        ? metrics.find((m) => m.id === variables.metricId)
        : null;

      const optimisticRole = {
        id: tempRoleId,
        title: variables.title,
        purpose: variables.purpose,
        accountabilities: variables.accountabilities ?? null,
        teamId: variables.teamId,
        metricId: variables.metricId ?? null,
        nodeId: variables.nodeId,
        assignedUserId: variables.assignedUserId ?? null,
        effortPoints: variables.effortPoints ?? null,
        color: variables.color ?? "#3b82f6",
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: selectedMetric
          ? selectedMetric
          : variables.metricId
            ? {
                id: variables.metricId,
                name: "Loading...",
                description: null,
                organizationId: "",
                type: "number" as const,
                targetValue: null,
                currentValue: null,
                unit: null,
                mockDataPrompt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : null,
        isPending: true,
      };

      const position = getViewportCenter(reactFlowInstance);

      const optimisticNode = {
        id: nodeId,
        type: "role-node" as const,
        position,
        data: {
          roleId: tempRoleId,
          title: variables.title,
          purpose: variables.purpose,
          accountabilities: variables.accountabilities ?? undefined,
          metricId: variables.metricId ?? undefined,
          metricName: selectedMetric?.name ?? undefined,
          assignedUserId: variables.assignedUserId ?? null,
          assignedUserName: variables.assignedUserId
            ? (() => {
                const member = members.find(
                  (m) => m.id === variables.assignedUserId,
                );
                if (member) {
                  return (
                    [member.firstName, member.lastName]
                      .filter(Boolean)
                      .join(" ") || member.email
                  );
                }
                return `User ${variables.assignedUserId?.substring(0, 8)}`;
              })()
            : undefined,
          color: variables.color ?? "#3b82f6",
          isPending: true,
        },
      };

      setNodes([...currentNodes, optimisticNode]);
      markDirty();

      utils.role.getByTeam.setData({ teamId }, (old) => {
        const roleWithPending = optimisticRole as typeof old extends
          | (infer T)[]
          | undefined
          ? T
          : never;
        if (!old) return [roleWithPending];
        return [...old, roleWithPending];
      });

      return { previousRoles, previousNodes, tempRoleId, nodeId };
    },
    onSuccess: (newRole, _variables, context) => {
      if (!context) return;

      // Use fresh state to preserve user's node position changes during mutation
      const currentNodes = storeApi.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (node.id === context.nodeId && node.type === "role-node") {
          return {
            ...node,
            data: {
              ...node.data,
              roleId: newRole.id,
              metricName: newRole.metric?.name ?? undefined,
              isPending: undefined,
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [newRole];
        return old.map((role) =>
          role.id === context.tempRoleId ? newRole : role,
        );
      });
    },
    onError: (error, variables, context) => {
      if (context?.previousRoles) {
        utils.role.getByTeam.setData({ teamId }, context.previousRoles);
      }
      if (context?.previousNodes) {
        setNodes(context.previousNodes);
      }
      toast.error("Failed to create role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });

  const updateRole = api.role.update.useMutation({
    onMutate: async (variables) => {
      setOpen(false);
      form.reset();

      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });
      const currentNodes = storeApi.getState().nodes;
      const previousNodes = [...currentNodes];

      const selectedMetric = variables.metricId
        ? metrics.find((m) => m.id === variables.metricId)
        : null;

      const updatedNodes = currentNodes.map((node) => {
        if (node.type === "role-node" && node.data.roleId === variables.id) {
          return {
            ...node,
            data: {
              ...node.data,
              title: variables.title ?? node.data.title,
              purpose: variables.purpose ?? node.data.purpose,
              accountabilities: variables.accountabilities ?? undefined,
              metricId: variables.metricId ?? undefined,
              metricName: selectedMetric?.name ?? undefined,
              assignedUserId: variables.assignedUserId ?? null,
              assignedUserName: variables.assignedUserId
                ? (() => {
                    const member = members.find(
                      (m) => m.id === variables.assignedUserId,
                    );
                    if (member) {
                      return (
                        [member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") || member.email
                      );
                    }
                    return `User ${variables.assignedUserId.substring(0, 8)}`;
                  })()
                : undefined,
              color: variables.color ?? node.data.color,
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      markDirty();

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((role) =>
          role.id === variables.id
            ? {
                ...role,
                title: variables.title ?? role.title,
                purpose: variables.purpose ?? role.purpose,
                accountabilities: variables.accountabilities ?? null,
                metricId: variables.metricId ?? null,
                assignedUserId: variables.assignedUserId ?? null,
                color: variables.color ?? role.color,
                metric: selectedMetric ?? null,
              }
            : role,
        );
      });

      return { previousRoles, previousNodes };
    },
    onSuccess: (updatedRole) => {
      const currentNodes = storeApi.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (node.type === "role-node" && node.data.roleId === updatedRole.id) {
          return {
            ...node,
            data: {
              ...node.data,
              metricName: updatedRole.metric?.name ?? undefined,
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [updatedRole];
        return old.map((role) =>
          role.id === updatedRole.id ? updatedRole : role,
        );
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRoles) {
        utils.role.getByTeam.setData({ teamId }, context.previousRoles);
      }
      if (context?.previousNodes) {
        setNodes(context.previousNodes);
      }
      toast.error("Failed to update role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });

  function onSubmit(data: RoleForm) {
    if (isEditMode && roleData) {
      updateRole.mutate({
        id: roleData.roleId,
        title: data.title,
        purpose: data.purpose,
        accountabilities: data.accountabilities,
        metricId:
          data.metricId === "__none__" || !data.metricId
            ? undefined
            : data.metricId,
        assignedUserId:
          data.assignedUserId === "__none__" ? null : data.assignedUserId,
        effortPoints: data.effortPoints,
        color: data.color,
      });
    } else {
      const nodeId = `role-node-${nanoid(8)}`;
      createRole.mutate({
        teamId,
        title: data.title,
        purpose: data.purpose,
        accountabilities: data.accountabilities,
        metricId:
          data.metricId === "__none__" || !data.metricId
            ? undefined
            : data.metricId,
        assignedUserId:
          data.assignedUserId === "__none__" ? null : data.assignedUserId,
        effortPoints: data.effortPoints ?? undefined,
        nodeId,
        color: data.color,
      });
    }
  }

  const isPending = createRole.isPending || updateRole.isPending;

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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update role details and assignments"
              : "Add a new role to your team canvas"}
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {COLORS.map((color) => (
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
      </DialogContent>
    </Dialog>
  );
}
