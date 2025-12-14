import { useState } from "react";
import { useUserInfo } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      toast.success("Password updated successfully!");
      setIsEditingPassword(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update password",
      );
    },
  });

  const handlePasswordUpdate = () => {
    // Validation
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in both password fields");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
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
      toast.success("Bank information updated successfully!");
      setIsEditingBankInfo(false);
      // Invalidate user query to refresh data
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update bank information",
      );
    },
  });

  const handleBankInfoUpdate = () => {
    // Validation
    if (
      !bankInfoForm.account_holder ||
      !bankInfoForm.iban ||
      !bankInfoForm.bic
    ) {
      toast.error("Please fill in all bank information fields");
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
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Personal Information Card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Your account details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={user?.first_name || ""}
                disabled
                className="bg-muted/50"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={user?.last_name || ""}
                disabled
                className="bg-muted/50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-muted/50"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={user?.phone || "Not provided"}
              disabled
              className="bg-muted/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Manage your password and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {!isEditingPassword ? (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="password"
                  type="password"
                  value="**********"
                  disabled
                  className="bg-muted/50"
                />
                <Button
                  onClick={() => setIsEditingPassword(true)}
                  variant="outline"
                >
                  Update
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
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
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
                    placeholder="Confirm new password"
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
                  {updatePasswordMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Password
                </Button>
                <Button
                  onClick={handleCancelPasswordEdit}
                  variant="outline"
                  disabled={updatePasswordMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Information Card */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Bank Information</CardTitle>
          <CardDescription>
            Your banking details for withdrawals and deposits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {!isEditingBankInfo ? (
            <div className="space-y-4">
              {/* Account Holder */}
              <div className="space-y-2">
                <Label htmlFor="accountHolder">Account Holder</Label>
                <Input
                  id="accountHolder"
                  value={user?.bank_info?.account_holder || "Not provided"}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              {/* IBAN */}
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  value={user?.bank_info?.iban || "Not provided"}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              {/* BIC */}
              <div className="space-y-2">
                <Label htmlFor="bic">BIC/SWIFT Code</Label>
                <Input
                  id="bic"
                  value={user?.bank_info?.bic || "Not provided"}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <Button
                onClick={() => setIsEditingBankInfo(true)}
                variant="outline"
              >
                Update Bank Information
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Holder */}
              <div className="space-y-2">
                <Label htmlFor="editAccountHolder">Account Holder</Label>
                <Input
                  id="editAccountHolder"
                  value={bankInfoForm.account_holder}
                  onChange={(e) =>
                    setBankInfoForm({
                      ...bankInfoForm,
                      account_holder: e.target.value,
                    })
                  }
                  placeholder="Enter account holder name"
                />
              </div>

              {/* IBAN */}
              <div className="space-y-2">
                <Label htmlFor="editIban">IBAN</Label>
                <Input
                  id="editIban"
                  value={bankInfoForm.iban}
                  onChange={(e) =>
                    setBankInfoForm({
                      ...bankInfoForm,
                      iban: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Enter IBAN (e.g., DE89370400440532013000)"
                />
              </div>

              {/* BIC */}
              <div className="space-y-2">
                <Label htmlFor="editBic">BIC/SWIFT Code</Label>
                <Input
                  id="editBic"
                  value={bankInfoForm.bic}
                  onChange={(e) =>
                    setBankInfoForm({
                      ...bankInfoForm,
                      bic: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Enter BIC/SWIFT (e.g., COBADEFFXXX)"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleBankInfoUpdate}
                  disabled={updateBankInfoMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {updateBankInfoMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Save Bank Information
                </Button>
                <Button
                  onClick={handleCancelBankInfoEdit}
                  variant="outline"
                  disabled={updateBankInfoMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
