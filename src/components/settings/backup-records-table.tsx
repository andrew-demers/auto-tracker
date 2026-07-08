"use client";

import { format } from "date-fns";
import { CloudCog, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { formatBytes } from "@/lib/units";
import type { BackupRecord } from "@/generated/prisma/client";

export function BackupRecordsTable({ records }: { records: BackupRecord[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={CloudCog}
        title="No backups yet"
        description="Connect Google Drive and run a backup to see history here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">
                {format(record.createdAt, "MMM d, yyyy h:mm a")}
              </TableCell>
              <TableCell>{formatBytes(record.sizeBytes)}</TableCell>
              <TableCell>
                {record.status === "SUCCESS" ? (
                  <Badge
                    variant="outline"
                    className="border-[#bfe8c9] bg-[#e6f6ea] text-[#1a7a34] dark:border-[rgba(39,166,68,0.35)] dark:bg-[rgba(39,166,68,0.16)] dark:text-[#3ecf66]"
                  >
                    Success
                  </Badge>
                ) : (
                  <Badge variant="destructive" title={record.errorMessage ?? undefined}>
                    Failed
                  </Badge>
                )}
                {record.status === "FAILED" && record.errorMessage ? (
                  <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                    {record.errorMessage}
                  </p>
                ) : null}
              </TableCell>
              <TableCell>
                {record.driveFileId ? (
                  <a
                    href={`https://drive.google.com/file/d/${record.driveFileId}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open in Drive
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
