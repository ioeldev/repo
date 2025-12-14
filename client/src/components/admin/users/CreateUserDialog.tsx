import { useState } from "react";
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
                    <DialogTitle>Ajouter un client</DialogTitle>
                    <DialogDescription>
                        Créer un nouveau compte utilisateur
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {isSuperAdmin && (
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => handleChange("role", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="client">Client</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="firstName">Prenom</Label>
                        <Input
                            id="firstName"
                            placeholder="Prenom"
                            value={formData.firstName}
                            onChange={(e) => handleChange("firstName", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                            id="lastName"
                            placeholder="Nom"
                            value={formData.lastName}
                            onChange={(e) => handleChange("lastName", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            placeholder="Phone"
                            value={formData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Mot de passe"
                            value={formData.password}
                            onChange={(e) => handleChange("password", e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="address">Adresse</Label>
                        <Input
                            id="address"
                            placeholder="Adresse"
                            value={formData.address?.address || ""}
                            onChange={(e) => handleChange("address.address", e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="postal_code">Code postal</Label>
                        <Input
                            id="postal_code"
                            placeholder="Code postal"
                            value={formData.address?.postal_code || ""}
                            onChange={(e) => handleChange("address.postal_code", e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="city">Ville</Label>
                        <Input
                            id="city"
                            placeholder="Ville"
                            value={formData.address?.city || ""}
                            onChange={(e) => handleChange("address.city", e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="country">Pays</Label>
                        <Input
                            id="country"
                            placeholder="Pays"
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
                            Annuler
                        </Button>
                        <Button type="submit" disabled={signup.isPending}>
                            {signup.isPending ? "Création..." : "Sign Up"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
