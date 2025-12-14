import { DepositsWithdrawsTable } from "@/components/admin/deposits-withdraws/DepositsWithdrawsTable";
import { useDepositsWithdraws } from "@/hooks/admin/useDepositsWithdraws";

export default function AdminDepositsWithdraws() {
  const { data, isLoading, refetch } = useDepositsWithdraws();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dépôts et Retraits</h1>
          <p className="text-sm text-muted-foreground">
            Gérer les demandes de dépôts et de retraits des utilisateurs
          </p>
        </div>
      </div>

      <DepositsWithdrawsTable data={data} onUpdate={refetch} />
    </div>
  );
}
