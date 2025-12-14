import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import { settingsService } from "@/services/api";
import { toast } from "sonner";

export default function AdminSettings() {
    const { t } = useTranslation();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchLoginBackground = async () => {
            try {
                const response = await settingsService.getLoginBackground();
                if (response.success && response.data.value) {
                    const base64Data = response.data.value;
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);

                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }

                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: "image/png" });
                    const file = new File([blob], "background.png", { type: "image/png" });

                    setSelectedFile(file);
                    setPreviewUrl(URL.createObjectURL(file));
                }
            } catch (error) {
                console.error("Failed to fetch login background:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLoginBackground();
    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveFile = async () => {
        try {
            await settingsService.deleteLoginBackground();
            setSelectedFile(null);
            setPreviewUrl(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            toast.success("Login background removed successfully");
        } catch (error) {
            console.error("Failed to remove login background:", error);
            toast.error("Failed to remove login background");
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        try {
            await settingsService.uploadLoginBackground(selectedFile);
            toast.success("Login background updated successfully");
        } catch (error) {
            console.error("Failed to upload login background:", error);
            toast.error("Failed to upload login background");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{t("admin.pages.settings.title")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("admin.pages.settings.description")}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("admin.pages.settings.loginBackground.title")}</CardTitle>
                    <CardDescription>
                        {t("admin.pages.settings.loginBackground.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="background-upload">
                            {t("admin.pages.settings.loginBackground.uploadLabel")}
                        </Label>
                        <div className="flex items-center gap-4">
                            <input
                                ref={fileInputRef}
                                id="background-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                {t("admin.pages.settings.loginBackground.selectFile")}
                            </Button>
                            {selectedFile && (
                                <span className="text-sm text-muted-foreground">
                                    {selectedFile.name}
                                </span>
                            )}
                        </div>
                    </div>

                    {previewUrl && (
                        <div className="relative w-full max-w-md">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="rounded-lg border object-contain max-h-64 w-full"
                            />
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={handleRemoveFile}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                        {isUploading ? "Uploading..." : t("admin.pages.settings.loginBackground.upload")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
