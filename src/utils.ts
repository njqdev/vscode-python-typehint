
/**
 * 
 * @param s A string longer than 2 chars
 */
export function ToTitleCase(s: string) {
    return `${s[0].toUpperCase}${s.substr(1)}`;
}