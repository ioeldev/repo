import { useState } from "react";
import { usePositions } from "@/hooks/usePositions";
import { PositionsTable } from "@/components/positions/PositionsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";

const POSITIONS_PER_PAGE = 10;

export default function PositionsPage() {
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
                <h1 className="text-3xl font-bold text-foreground">Positions</h1>
                <p className="text-muted-foreground mt-2">Manage and view all your trading positions</p>
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
                    All Positions
                </Button>
                <Button
                    variant={statusFilter === "open" ? "default" : "outline"}
                    onClick={() => {
                        setStatusFilter("open");
                        setCurrentPage(1);
                    }}
                >
                    Open
                </Button>
                <Button
                    variant={statusFilter === "closed" ? "default" : "outline"}
                    onClick={() => {
                        setStatusFilter("closed");
                        setCurrentPage(1);
                    }}
                >
                    Closed
                </Button>
            </div>

            <Card className="border-0">
                <CardHeader>
                    <CardTitle>Your Positions</CardTitle>
                    <CardDescription>
                        Showing {positions.length > 0 ? (currentPage - 1) * POSITIONS_PER_PAGE + 1 : 0} to{" "}
                        {Math.min(currentPage * POSITIONS_PER_PAGE, pagination.total)} of {pagination.total} positions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Table */}
                    <PositionsTable positions={positions} isLoading={isLoading} />

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages}
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
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={currentPage >= pagination.totalPages || isLoading}
                                    className="gap-2"
                                >
                                    Next
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
