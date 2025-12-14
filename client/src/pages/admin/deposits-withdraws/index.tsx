import { useTranslation } from "react-i18next";
import { DepositsWithdrawsTable } from "@/components/admin/deposits-withdraws/DepositsWithdrawsTable";
import { useDepositsWithdraws } from "@/hooks/admin/useDepositsWithdraws";

export default function AdminDepositsWithdraws() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useDepositsWithdraws();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t("admin.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.pages.depositsWithdraws.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.pages.depositsWithdraws.description")}
          </p>
        </div>
      </div>

      <DepositsWithdrawsTable data={data} onUpdate={refetch} />
    </div>
  );
}
