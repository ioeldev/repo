import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserInfo } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "@/services/api/users";
import { toast } from "sonner";

interface PasswordUpdateForm {
    newPassword: string;
    confirmPassword: string;
}

interface BankInfoForm {
    account_holder: string;
    iban: string;
    bic: string;
}

export default function UserSettings() {
    const { t } = useTranslation();
    const { user } = useUserInfo();
    const queryClient = useQueryClient();

    // State for password editing
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState<PasswordUpdateForm>({
        newPassword: "",
        confirmPassword: "",
    });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // State for bank info editing
    const [isEditingBankInfo, setIsEditingBankInfo] = useState(false);
    const [bankInfoForm, setBankInfoForm] = useState<BankInfoForm>({
        account_holder: user?.bank_info?.account_holder || "",
        iban: user?.bank_info?.iban || "",
        bic: user?.bank_info?.bic || "",
    });

    // Mutation for updating password
    const updatePasswordMutation = useMutation({
        mutationFn: async (newPassword: string) => {
            return usersService.updatePassword(newPassword);
        },
        onSuccess: () => {
            toast.success(t("user.toast.passwordUpdated"));
            setIsEditingPassword(false);
            setPasswordForm({ newPassword: "", confirmPassword: "" });
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            // Invalidate user query to refresh data
            queryClient.invalidateQueries({ queryKey: ["me"] });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || t("user.toast.passwordUpdateFailed"));
        },
    });

    const handlePasswordUpdate = () => {
        // Validation
        if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
            toast.error(t("user.toast.fillPasswordFields"));
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            toast.error(t("user.toast.passwordTooShort"));
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error(t("user.toast.passwordsDoNotMatch"));
            return;
        }

        updatePasswordMutation.mutate(passwordForm.newPassword);
    };

    const handleCancelPasswordEdit = () => {
        setIsEditingPassword(false);
        setPasswordForm({ newPassword: "", confirmPassword: "" });
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    // Mutation for updating bank info
    const updateBankInfoMutation = useMutation({
        mutationFn: async (bankInfo: BankInfoForm) => {
            return usersService.updateMe({ bank_info: bankInfo });
        },
        onSuccess: () => {
            toast.success(t("user.toast.bankInfoUpdated"));
            setIsEditingBankInfo(false);
            // Invalidate user query to refresh data
            queryClient.invalidateQueries({ queryKey: ["me"] });
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || t("user.toast.bankInfoUpdateFailed"));
        },
    });

    const handleBankInfoUpdate = () => {
        // Validation
        if (!bankInfoForm.account_holder || !bankInfoForm.iban || !bankInfoForm.bic) {
            toast.error(t("user.toast.fillBankInfoFields"));
            return;
        }

        updateBankInfoMutation.mutate(bankInfoForm);
    };

    const handleCancelBankInfoEdit = () => {
        setIsEditingBankInfo(false);
        setBankInfoForm({
            account_holder: user?.bank_info?.account_holder || "",
            iban: user?.bank_info?.iban || "",
            bic: user?.bank_info?.bic || "",
        });
    };

    return (
        <div className="space-y-6 container max-w-4xl px-4 md:px-6 lg:px-8 py-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">{t("user.pages.settings.title")}</h1>
                <p className="text-muted-foreground mt-2">{t("user.pages.settings.description")}</p>
            </div>

            {/* Personal Information Card */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle>{t("user.pages.settings.personalInfo.title")}</CardTitle>
                    <CardDescription>{t("user.pages.settings.personalInfo.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* First Name */}
                        <div className="space-y-2">
                            <Label htmlFor="firstName">{t("user.pages.settings.personalInfo.firstName")}</Label>
                            <Input id="firstName" value={user?.first_name || ""} disabled className="bg-muted/50" />
                        </div>

                        {/* Last Name */}
                        <div className="space-y-2">
                            <Label htmlFor="lastName">{t("user.pages.settings.personalInfo.lastName")}</Label>
                            <Input id="lastName" value={user?.last_name || ""} disabled className="bg-muted/50" />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email">{t("user.pages.settings.personalInfo.email")}</Label>
                        <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted/50" />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t("user.pages.settings.personalInfo.phone")}</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={user?.phone || t("user.pages.settings.bankInfo.notProvided")}
                            disabled
                            className="bg-muted/50"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Security Card */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle>{t("user.pages.settings.security.title")}</CardTitle>
                    <CardDescription>{t("user.pages.settings.security.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    {!isEditingPassword ? (
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("user.pages.settings.security.password")}</Label>
                            <div className="flex gap-3 items-center">
                                <Input
                                    id="password"
                                    type="password"
                                    value="**********"
                                    disabled
                                    className="bg-muted/50"
                                />
                                <Button onClick={() => setIsEditingPassword(true)} variant="outline">
                                    {t("user.pages.settings.security.update")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">{t("user.pages.settings.security.newPassword")}</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showNewPassword ? "text" : "password"}
                                        value={passwordForm.newPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                newPassword: e.target.value,
                                            })
                                        }
                                        placeholder={t("user.pages.settings.security.enterNewPassword")}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">
                                    {t("user.pages.settings.security.confirmPassword")}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                confirmPassword: e.target.value,
                                            })
                                        }
                                        placeholder={t("user.pages.settings.security.confirmNewPassword")}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handlePasswordUpdate}
                                    disabled={updatePasswordMutation.isPending}
                                    className="flex items-center gap-2"
                                >
                                    {updatePasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t("user.pages.settings.security.savePassword")}
                                </Button>
                                <Button
                                    onClick={handleCancelPasswordEdit}
                                    variant="outline"
                                    disabled={updatePasswordMutation.isPending}
                                >
                                    {t("user.pages.settings.security.cancel")}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bank Information Card */}
            <Card>
                <CardHeader className="border-b">
                    <CardTitle>{t("user.pages.settings.bankInfo.title")}</CardTitle>
                    <CardDescription>{t("user.pages.settings.bankInfo.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    {!isEditingBankInfo ? (
                        <div className="space-y-4">
                            {/* Account Holder */}
                            <div className="space-y-2">
                                <Label htmlFor="accountHolder">{t("user.pages.settings.bankInfo.accountHolder")}</Label>
                                <Input
                                    id="accountHolder"
                                    value={
                                        user?.bank_info?.account_holder || t("user.pages.settings.bankInfo.notProvided")
                                    }
                                    disabled
                                    className="bg-muted/50"
                                />
                            </div>

                            {/* IBAN */}
                            <div className="space-y-2">
                                <Label htmlFor="iban">{t("user.pages.settings.bankInfo.iban")}</Label>
                                <Input
                                    id="iban"
                                    value={user?.bank_info?.iban || t("user.pages.settings.bankInfo.notProvided")}
                                    disabled
                                    className="bg-muted/50"
                                />
                            </div>

                            {/* BIC */}
                            <div className="space-y-2">
                                <Label htmlFor="bic">{t("user.pages.settings.bankInfo.bic")}</Label>
                                <Input
                                    id="bic"
                                    value={user?.bank_info?.bic || t("user.pages.settings.bankInfo.notProvided")}
                                    disabled
                                    className="bg-muted/50"
                                />
                            </div>

                            <Button onClick={() => setIsEditingBankInfo(true)} variant="outline">
                                {t("user.pages.settings.bankInfo.update")}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Account Holder */}
                            <div className="space-y-2">
                                <Label htmlFor="editAccountHolder">
                                    {t("user.pages.settings.bankInfo.accountHolder")}
                                </Label>
                                <Input
                                    id="editAccountHolder"
                                    value={bankInfoForm.account_holder}
                                    onChange={(e) =>
                                        setBankInfoForm({
                                            ...bankInfoForm,
                                            account_holder: e.target.value,
                                        })
                                    }
                                    placeholder={t("user.pages.settings.bankInfo.enterAccountHolder")}
                                />
                            </div>

                            {/* IBAN */}
                            <div className="space-y-2">
                                <Label htmlFor="editIban">{t("user.pages.settings.bankInfo.iban")}</Label>
                                <Input
                                    id="editIban"
                                    value={bankInfoForm.iban}
                                    onChange={(e) =>
                                        setBankInfoForm({
                                            ...bankInfoForm,
                                            iban: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder={t("user.pages.settings.bankInfo.enterIban")}
                                />
                            </div>

                            {/* BIC */}
                            <div className="space-y-2">
                                <Label htmlFor="editBic">{t("user.pages.settings.bankInfo.bic")}</Label>
                                <Input
                                    id="editBic"
                                    value={bankInfoForm.bic}
                                    onChange={(e) =>
                                        setBankInfoForm({
                                            ...bankInfoForm,
                                            bic: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder={t("user.pages.settings.bankInfo.enterBic")}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleBankInfoUpdate}
                                    disabled={updateBankInfoMutation.isPending}
                                    className="flex items-center gap-2"
                                >
                                    {updateBankInfoMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {t("user.pages.settings.bankInfo.saveBankInfo")}
                                </Button>
                                <Button
                                    onClick={handleCancelBankInfoEdit}
                                    variant="outline"
                                    disabled={updateBankInfoMutation.isPending}
                                >
                                    {t("common.cancel")}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
