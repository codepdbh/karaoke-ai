import { AppShell } from "@/components/app-shell";
import { UserManagement } from "@/features/admin/user-management";

export default function AdminUsersPage() {
  return (
    <AppShell>
      <UserManagement />
    </AppShell>
  );
}
