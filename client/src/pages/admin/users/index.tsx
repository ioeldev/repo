import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { CreateUserDialog } from "@/components/admin/users/CreateUserDialog";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/admin/useUsers";
import { usePairs } from "@/hooks/usePairs";
import { useCurrency } from "@/hooks/useCurrency";

export default function AdminUsers() {
  const { users, isLoading, refetch } = useUsers();
  const { pairs } = usePairs();
  const { eurPrice } = useCurrency();
  const { t } = useTranslation();
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);

  // Get BTC price from pairs API
  const btcPrice = pairs.find((p) => p.pair === "BTCUSDT")?.price
    ? parseFloat(pairs.find((p) => p.pair === "BTCUSDT")!.price)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.pages.users.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.pages.users.description")}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateUserDialogOpen(true)}>
          {t("admin.pages.users.createButton")}
        </Button>
      </div>

      <UsersTable
        users={users}
        pairs={pairs}
        btcPrice={btcPrice}
        eurPrice={eurPrice}
        isLoading={isLoading}
        onUserDeleted={refetch}
        onUserUpdated={refetch}
      />

      <CreateUserDialog
        open={createUserDialogOpen}
        onOpenChange={setCreateUserDialogOpen}
      />
    </div>
  );
}
