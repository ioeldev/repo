import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { useGetMe } from "@/hooks/useAuth";
import { useIsImpersonating, useExitImpersonation } from "@/hooks/useImpersonation";

export const ImpersonationBanner = () => {
    const isImpersonating = useIsImpersonating();
    const exitImpersonation = useExitImpersonation();
    const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
    const { data: me } = useGetMe(true);

    useEffect(() => {
        if (isImpersonating && me?.data?.user) {
            setImpersonatedUser(me.data.user);
        }
    }, [isImpersonating, me]);

    if (!isImpersonating) {
        return null;
    }

    return (
        <div className="bg-yellow-500 text-black px-4 py-2 flex items-center justify-between shadow-lg z-50">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                    Impersonating: {impersonatedUser?.first_name} {impersonatedUser?.last_name} (
                    {impersonatedUser?.email})
                </span>
            </div>
            <Button
                variant="ghost"
                size="sm"
                onClick={exitImpersonation}
                className="text-black hover:bg-yellow-600 flex items-center gap-1"
            >
                <X className="h-4 w-4" />
                Exit Impersonation
            </Button>
        </div>
    );
};
