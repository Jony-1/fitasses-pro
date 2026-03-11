export function formatDateOnly(value: unknown): string {
    if (!value) return "-";

    if (value instanceof Date) {
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, "0");
        const day = String(value.getUTCDate()).padStart(2, "0");
        return `${day}/${month}/${year}`;
    }

    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return "-";

    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
}

export function dateOnlyInputValue(value: unknown): string {
    if (!value) return "";

    if (value instanceof Date) {
        const year = value.getUTCFullYear();
        const month = String(value.getUTCMonth() + 1).padStart(2, "0");
        const day = String(value.getUTCDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    const raw = String(value).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return "";

    const [, year, month, day] = match;
    return `${year}-${month}-${day}`;
}

export function formatDateTimeLocal(value: unknown) {
    if (!value) return "-";

    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("es-CO");
}