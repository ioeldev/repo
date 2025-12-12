import { useLocation } from "react-router";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Convert pathname segments to readable labels
function formatSegment(segment: string): string {
    return segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Generate path for breadcrumb links
function generatePath(segments: string[], index: number): string {
    return "/" + segments.slice(0, index + 1).join("/");
}

export function DynamicBreadcrumb() {
    const location = useLocation();

    // Parse pathname into segments, filtering out empty strings
    const segments = location.pathname.split("/").filter(Boolean);

    // If no segments (root path), return null or a simple home breadcrumb
    if (segments.length === 0) {
        return (
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbPage>Home</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        );
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {segments.map((segment, index) => {
                    const isLast = index === segments.length - 1;
                    const label = formatSegment(segment);
                    const path = generatePath(segments, index);

                    return (
                        <div key={path} className="contents">
                            <BreadcrumbItem className={index > 0 ? "hidden md:block" : ""}>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink href={path}>{label}</BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                        </div>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
