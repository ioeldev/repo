import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePositions } from "@/hooks/usePositions";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const POSITIONS_PER_PAGE = 10;

export default function PositionsPage() {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<"open" | "closed" | undefined>(undefined);

    const { positions, pagination, isLoading } = usePositions(currentPage, POSITIONS_PER_PAGE, statusFilter);

    const handleNextPage = () => {
        if (currentPage < pagination.totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">{t("user.pages.positions.title")}</h1>
                <p className="text-muted-foreground mt-2">{t("user.pages.positions.description")}</p>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <Button
                    variant={statusFilter === undefined ? "default" : "outline"}
                    onClick={() => {
                        setStatusFilter(undefined);
                        setCurrentPage(1);
                    }}
                >
                    {t("user.pages.positions.all")}
                </Button>
                <Button
                    variant={statusFilter === "open" ? "default" : "outline"}
                    onClick={() => {
                        setStatusFilter("open");
                        setCurrentPage(1);
                    }}
                >
                    {t("user.pages.positions.open")}
                </Button>
                <Button
                    variant={statusFilter === "closed" ? "default" : "outline"}
                    onClick={() => {
                        setStatusFilter("closed");
                        setCurrentPage(1);
                    }}
                >
                    {t("user.pages.positions.closed")}
                </Button>
            </div>

            <Card className="border-0">
                <CardHeader>
                    <CardTitle>{t("user.pages.positions.yourPositions")}</CardTitle>
                    <CardDescription>
                        {t("user.pages.positions.showing", {
                            from: positions.length > 0 ? (currentPage - 1) * POSITIONS_PER_PAGE + 1 : 0,
                            to: Math.min(currentPage * POSITIONS_PER_PAGE, pagination.total),
                            total: pagination.total,
                        })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Table */}
                    <PositionsTable positions={positions} isLoading={isLoading} />

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                {t("user.pages.positions.page", {
                                    current: pagination.page,
                                    total: pagination.totalPages,
                                })}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1 || isLoading}
                                    className="gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    {t("user.pages.positions.previous")}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={currentPage >= pagination.totalPages || isLoading}
                                    className="gap-2"
                                >
                                    {t("user.pages.positions.next")}
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
