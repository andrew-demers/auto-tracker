import Link from "next/link";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import CSV</CardTitle>
        <CardDescription>
          Bring in fuel logs or expenses from a spreadsheet or another app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <UploadCloud className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Import from a CSV file</p>
              <p className="text-xs text-muted-foreground">
                Upload a file, map its columns, then review before importing.
              </p>
            </div>
          </div>
          <Button render={<Link href="/import" />} nativeButton={false}>
            Start import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
