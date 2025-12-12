import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { oklch2hex } from "colorizr";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const convertOklchString = (oklch: string) => {
    const regex = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/;
    const match = oklch.match(regex);
    if (match) {
        return {
            l: parseFloat(match[1]),
            c: parseFloat(match[2]),
            h: parseFloat(match[3]),
        };
    }
    return { l: 0, c: 0, h: 0 };
};

export const getHexColorFromOklch = (oklchString: string) => {
    const bgColor = oklch2hex(convertOklchString(oklchString));
    return bgColor;
};
