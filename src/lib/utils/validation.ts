const PASSWORD_REGEX =
    /^(?=.*[A-Z])(?=.*\d).{4,72}$/;

const EMAIL_REGEX =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeText(value: unknown) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value: unknown) {
    return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string) {
    return EMAIL_REGEX.test(email);
}

export function isStrongPassword(password: string) {
    return PASSWORD_REGEX.test(password);
}

export function isValidFullName(name: string) {
    return name.length >= 3 && name.length <= 120;
}

export function isValidHeight(height: number | null) {
    if (height === null) return true;
    return height >= 0.5 && height <= 2.8;
}

export function isValidGender(gender: string | null) {
    if (gender === null || gender === "") return true;
    return ["Masculino", "Femenino", "Prefiero no decirlo", "Hombre", "Mujer"].includes(gender);
}

export function isValidNotes(notes: string | null) {
    if (notes === null) return true;
    return notes.length <= 1000;
}

export function isValidBirthDate(value: string | null) {
    if (!value) return true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;

    const today = new Date();
    const todayOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
    );

    return date <= todayOnly;
}
