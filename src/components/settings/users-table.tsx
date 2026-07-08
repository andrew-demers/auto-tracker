import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditUserDialog } from "@/components/settings/edit-user-dialog";
import { ResetPasswordButton } from "@/components/settings/reset-password-button";
import { DeleteUserButton } from "@/components/settings/delete-user-button";

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  notifyEnabled: boolean;
}

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Notifications</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.email}</TableCell>
            <TableCell>{user.name || "-"}</TableCell>
            <TableCell>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                {user.role === "ADMIN" ? "Admin" : "User"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={user.notifyEnabled ? "secondary" : "outline"}>
                {user.notifyEnabled ? "On" : "Off"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <EditUserDialog
                  userId={user.id}
                  defaultValues={{
                    name: user.name ?? "",
                    role: user.role,
                    notifyEnabled: user.notifyEnabled,
                  }}
                />
                <ResetPasswordButton userId={user.id} userEmail={user.email} />
                <DeleteUserButton userId={user.id} userEmail={user.email} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
