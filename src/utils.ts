

export function capitalized(s: string) {
    if (s.length > 1) {
        return s[0].toUpperCase() + s.slice(1);
    }
    return s;
}