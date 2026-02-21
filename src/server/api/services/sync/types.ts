/**
 * Nango Sync Types
 */

export interface NangoRecordMetadata {
  deleted_at: string | null;
  last_action: "ADDED" | "UPDATED" | "DELETED";
  first_seen_at: string;
  last_modified_at: string;
  cursor: string;
}

export interface NangoRecord<T = Record<string, unknown>> {
  id: string;
  _nango_metadata: NangoRecordMetadata;
  data: T;
}

export interface NangoListRecordsResponse<T = Record<string, unknown>> {
  records: NangoRecord<T>[];
  next_cursor: string | null;
}

export interface SyncConfigInput {
  connectionId: string;
  syncName: string;
  modelName: string;
  frequency?: string;
  autoStart?: boolean;
  trackDeletes?: boolean;
}

export type SyncStatus = "active" | "paused" | "error" | "pending";

export interface SyncProcessResult {
  added: number;
  updated: number;
  deleted: number;
  totalProcessed: number;
  cursor: string | null;
}
