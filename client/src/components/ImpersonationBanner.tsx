import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { useGetMe } from "@/hooks/useAuth";
import { useIsImpersonating, useExitImpersonation } from "@/hooks/useImpersonation";
import { useTranslation } from "react-i18next";

export const ImpersonationBanner = () => {
    const isImpersonating = useIsImpersonating();
    const exitImpersonation = useExitImpersonation();
    const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
    const { data: me } = useGetMe(true);
    const { t } = useTranslation();

    useEffect(() => {
        if (isImpersonating && me?.data?.user) {
            setImpersonatedUser(me.data.user);
        }
    }, [isImpersonating, me]);

    if (!isImpersonating) {
        return null;
    }

    return (
        <div className="bg-card px-4 py-2 flex items-center justify-between shadow-lg z-50">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                    {t("user.impersonation.impersonating")}: {impersonatedUser?.first_name}{" "}
                    {impersonatedUser?.last_name} ({impersonatedUser?.email})
                </span>
            </div>
            <Button
                variant="ghost"
                size="sm"
                onClick={exitImpersonation}
            >
                <X className="h-4 w-4" />
                {t("user.impersonation.exitImpersonation")}
            </Button>
        </div>
    );
};
