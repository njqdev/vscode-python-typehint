

export function capitalized(s: string): string {
    return s.length > 1 ? s[0].toUpperCase() + s.slice(1) : s;
}