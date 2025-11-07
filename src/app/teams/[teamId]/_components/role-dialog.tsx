"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { MetricDialog } from "@/app/org/_components/metric-dialog";
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

import { useTeamStore } from "../store/team-store";
import { type RoleNodeData } from "./role-node";

const roleSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  purpose: z.string().min(1, "Purpose is required"),
  metricId: z.string().min(1, "Please select a metric"),
  metricGoal: z.coerce.number().positive().optional(),
  assignedUserId: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

type RoleForm = z.infer<typeof roleSchema>;

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

  const [metricDialogOpen, setMetricDialogOpen] = useState(false);

  const isEditMode = !!roleData;
  const nodes = useTeamStore((state) => state.nodes);
  const setNodes = useTeamStore((state) => state.setNodes);
  const markDirty = useTeamStore((state) => state.markDirty);

  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      title: "",
      purpose: "",
      metricId: "",
      metricGoal: undefined,
      assignedUserId: null,
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
          metricId: roleData.metricId ?? "",
          metricGoal: roleData.metricGoal ?? undefined,
          assignedUserId: roleData.assignedUserId ?? null,
          color: roleData.color ?? COLORS[0],
        });
      } else {
        form.reset({
          title: "",
          purpose: "",
          metricId: "",
          metricGoal: undefined,
          assignedUserId: null,
          color: COLORS[0],
        });
      }
    }
  }, [open, roleData, form]);

  // Fetch metrics for dropdown
  const { data: metrics = [] } = api.metric.getAll.useQuery();

  // Fetch organization members for assignment
  const { data: members = [] } =
    api.organization.getCurrentOrgMembers.useQuery();

  const utils = api.useUtils();

  const createRole = api.role.create.useMutation({
    onSuccess: (newRole) => {
      // Use nodeId from the role (passed through API)
      const nodeId =
        (newRole.nodeId as string | undefined) ?? `role-node-${nanoid(8)}`;

      // Add node to canvas
      const newNode = {
        id: nodeId,
        type: "role-node" as const,
        position: { x: 400, y: 300 },
        data: {
          roleId: newRole.id,
          title: newRole.title,
          purpose: newRole.purpose,
          metricId: newRole.metric.id,
          metricName: newRole.metric.name,
          metricValue: newRole.metric.currentValue ?? undefined,
          metricUnit: newRole.metric.unit ?? undefined,
          metricGoal: newRole.metricGoal ?? undefined,
          assignedUserId: newRole.assignedUserId,
          assignedUserName: newRole.assignedUserId
            ? (members.find((m) => m.user.id === newRole.assignedUserId)?.user
                .firstName ?? `User ${newRole.assignedUserId.substring(0, 8)}`)
            : undefined,
          color: newRole.color,
        },
      };

      setNodes([...nodes, newNode]);
      markDirty();

      // Refresh team data
      void utils.team.getById.invalidate({ id: teamId });

      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Failed to create role:", error);
    },
  });

  const updateRole = api.role.update.useMutation({
    onSuccess: (updatedRole) => {
      // Update node on canvas
      const updatedNodes = nodes.map((node) => {
        if (node.data.roleId === updatedRole.id) {
          return {
            ...node,
            data: {
              ...node.data,
              title: updatedRole.title,
              purpose: updatedRole.purpose,
              metricId: updatedRole.metric.id,
              metricName: updatedRole.metric.name,
              metricValue: updatedRole.metric.currentValue ?? undefined,
              metricUnit: updatedRole.metric.unit ?? undefined,
              metricGoal: updatedRole.metricGoal ?? undefined,
              assignedUserId: updatedRole.assignedUserId,
              assignedUserName: updatedRole.assignedUserId
                ? (members.find((m) => m.user.id === updatedRole.assignedUserId)
                    ?.user.firstName ??
                  `User ${updatedRole.assignedUserId.substring(0, 8)}`)
                : undefined,
              color: updatedRole.color,
            },
          };
        }
        return node;
      });

      setNodes(updatedNodes);
      markDirty();

      // Refresh team data
      void utils.team.getById.invalidate({ id: teamId });

      setOpen(false);
    },
    onError: (error) => {
      console.error("Failed to update role:", error);
    },
  });

  function onSubmit(data: RoleForm) {
    if (isEditMode && roleData) {
      updateRole.mutate({
        id: roleData.roleId,
        title: data.title,
        purpose: data.purpose,
        metricId: data.metricId,
        metricGoal: data.metricGoal,
        assignedUserId:
          data.assignedUserId === "__none__" ? null : data.assignedUserId,
        color: data.color,
      });
    } else {
      const nodeId = `role-node-${nanoid(8)}`;
      createRole.mutate({
        teamId,
        title: data.title,
        purpose: data.purpose,
        metricId: data.metricId,
        metricGoal: data.metricGoal,
        assignedUserId:
          data.assignedUserId === "__none__" ? null : data.assignedUserId,
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
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
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the role's responsibilities..."
                      rows={4}
                      {...field}
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Metric</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setMetricDialogOpen(true)}
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      New Metric
                    </Button>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a metric" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {metrics.length === 0 ? (
                        <div className="text-muted-foreground p-2 text-center text-xs">
                          No metrics yet. Create one above!
                        </div>
                      ) : (
                        metrics.map((metric) => (
                          <SelectItem key={metric.id} value={metric.id}>
                            <div className="flex items-center justify-between gap-4">
                              <span>{metric.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {metric.currentValue?.toFixed(1)} {metric.unit}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metricGoal"
              render={({ field }) => {
                const selectedMetric = metrics.find(
                  (m) => m.id === form.watch("metricId"),
                );
                return (
                  <FormItem>
                    <FormLabel>Role Goal (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={
                          selectedMetric?.targetValue
                            ? `Default: ${selectedMetric.targetValue} ${selectedMetric.unit ?? ""}`
                            : "Enter target value"
                        }
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
                    {selectedMetric && (
                      <p className="text-muted-foreground text-xs">
                        {selectedMetric.targetValue
                          ? `Metric default target: ${selectedMetric.targetValue} ${selectedMetric.unit ?? ""}`
                          : "No default target set for this metric"}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="assignedUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To (Optional)</FormLabel>
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
                        <SelectItem key={member.user.id} value={member.user.id}>
                          <div className="flex items-center gap-2">
                            <span>
                              {member.user.firstName} {member.user.lastName}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {member.user.email}
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
                  <FormLabel>Color</FormLabel>
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
      </DialogContent>

      {/* Nested Metric Creation Dialog */}
      <MetricDialog
        open={metricDialogOpen}
        onOpenChange={setMetricDialogOpen}
        onSuccess={() => {
          // Refetch metrics after successful creation
          void utils.metric.getAll.refetch();
        }}
      />
    </Dialog>
  );
}

// Re-export for backward compatibility
export { RoleDialog as CreateRoleDialog };
