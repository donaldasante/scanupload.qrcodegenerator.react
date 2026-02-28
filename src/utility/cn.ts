import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS class names safely, resolving conflicts using tailwind-merge
 * and handling conditional classes via clsx.
 *
 * @example
 * cn("px-4 py-2 bg-blue-500", isActive && "bg-green-500") // bg-green-500 wins
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
