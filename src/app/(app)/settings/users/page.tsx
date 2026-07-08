import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/settings/forbidden";
import { AddUserDialog } from "@/components/settings/add-user-dialog";
import { UsersTable } from "@/components/settings/users-table";
import { requireUser } from "@/lib/auth-guards";
import { getUsers } from "@/actions/users";

export default async function UsersSettingsPage() {
  const user = await requireUser();

  if (user.role !== "ADMIN") {
    return <Forbidden />;
  }

  const users = await getUsers();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Users</CardTitle>
        <AddUserDialog />
      </CardHeader>
      <CardContent>
        <UsersTable users={users} />
      </CardContent>
    </Card>
  );
}
