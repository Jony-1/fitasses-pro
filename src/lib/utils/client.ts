export function genderEmoji(gender: string | null) {
    const g = String(gender || "").trim().toLowerCase();

    if (g === "hombre") return "👨";
    if (g === "mujer") return "👩";

    return "👨‍🚀";
}

export function formatMetric(value: unknown, suffix = "") {
    if (value === null || value === undefined || value === "") return "-";

    const num = Number(value);
    if (Number.isNaN(num)) return "-";

    return `${num.toFixed(2)}${suffix}`;
}

export function formatChange(value: number | null, suffix = "") {
    if (value === null) return "-";

    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}${suffix}`;
}

export function calculateChange(current: unknown, previous: unknown) {
    const currentNum = Number(current);
    const previousNum = Number(previous);

    if (Number.isNaN(currentNum) || Number.isNaN(previousNum)) return null;

    return currentNum - previousNum;
}
export function changeColor(value: number | null) {
    if (value === null) return "text-slate-500";

    if (value < 0) return "text-emerald-500";
    if (value > 0) return "text-red-500";

    return "text-slate-500";
}