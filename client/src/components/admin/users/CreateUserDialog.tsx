import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSignup } from "@/hooks/useAuth";
import { useUserPermissions } from "@/hooks/useAuth";
import type { SignupRequest } from "@/types/auth";

interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserPermissions();
    const signup = useSignup();

    const [formData, setFormData] = useState<SignupRequest>({
        email: "",
        password: "",
        phone: "",
        firstName: "",
        lastName: "",
        role: "client",
    });

    const handleChange = (field: string, value: string) => {
        if (field.startsWith("address.")) {
            const addressField = field.split(".")[1];
            setFormData((prev) => ({
                ...prev,
                address: {
                    address: prev.address?.address || "",
                    city: prev.address?.city || "",
                    country: prev.address?.country || "",
                    postal_code: prev.address?.postal_code || "",
                    [addressField]: value,
                },
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [field]: value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await signup.mutateAsync(formData);
            // Reset form
            setFormData({
                email: "",
                password: "",
                phone: "",
                firstName: "",
                lastName: "",
                role: "client",
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to create user:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('admin.createUser.title')}</DialogTitle>
                    <DialogDescription>
                        {t('admin.createUser.description')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {isSuperAdmin && (
                        <div className="grid gap-2">
                            <Label htmlFor="role">{t('admin.createUser.role')}</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => handleChange("role", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('admin.createUser.selectRole')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="client">{t('admin.createUser.roleClient')}</SelectItem>
                                    <SelectItem value="admin">{t('admin.createUser.roleAdmin')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="firstName">{t('admin.createUser.firstName')}</Label>
                        <Input
                            id="firstName"
                            placeholder={t('admin.createUser.firstName')}
                            value={formData.firstName}
                            onChange={(e) => handleChange("firstName", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="lastName">{t('admin.createUser.lastName')}</Label>
                        <Input
                            id="lastName"
                            placeholder={t('admin.createUser.lastName')}
                            value={formData.lastName}
                            onChange={(e) => handleChange("lastName", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">{t('admin.createUser.phone')}</Label>
                        <Input
                            id="phone"
                            placeholder={t('admin.createUser.phone')}
                            value={formData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">{t('admin.createUser.email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('admin.createUser.email')}
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">{t('admin.createUser.password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder={t('admin.createUser.password')}
                            value={formData.password}
                            onChange={(e) => handleChange("password", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">{t('admin.createUser.address')}</Label>
                        <Input
                            id="address"
                            placeholder={t('admin.createUser.address')}
                            value={formData.address?.address || ""}
                            onChange={(e) => handleChange("address.address", e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="postal_code">{t('admin.createUser.postalCode')}</Label>
                        <Input
                            id="postal_code"
                            placeholder={t('admin.createUser.postalCode')}
                            value={formData.address?.postal_code || ""}
                            onChange={(e) => handleChange("address.postal_code", e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="city">{t('admin.createUser.city')}</Label>
                        <Input
                            id="city"
                            placeholder={t('admin.createUser.city')}
                            value={formData.address?.city || ""}
                            onChange={(e) => handleChange("address.city", e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="country">{t('admin.createUser.country')}</Label>
                        <Input
                            id="country"
                            placeholder={t('admin.createUser.country')}
                            value={formData.address?.country || ""}
                            onChange={(e) => handleChange("address.country", e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={signup.isPending}
                        >
                            {t('admin.createUser.cancel')}
                        </Button>
                        <Button type="submit" disabled={signup.isPending}>
                            {signup.isPending ? t('admin.createUser.creating') : t('admin.createUser.submit')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
