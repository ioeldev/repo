import { UsersTable } from "@/components/admin/users/UsersTable";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/admin/useUsers";
import { usePairs } from "@/hooks/usePairs";

export default function AdminUsers() {
    const { users, isLoading, refetch } = useUsers();
    const { pairs } = usePairs();

    // Mock prices - in production these should come from a real source
    const btcPrice = pairs.find((p) => p.pair === "BTCUSDT")?.price ? parseFloat(pairs.find((p) => p.pair === "BTCUSDT")!.price) : 0;
    const eurPrice = 0.92; // Mock EUR/USDT rate

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Liste des clients</h1>
                    <p className="text-sm text-muted-foreground">Gérez tous les utilisateurs de la plateforme</p>
                </div>
                <Button size="sm" onClick={() => console.log("Create user")}>
                    Créer un utilisateur
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
        </div>
    );
}
