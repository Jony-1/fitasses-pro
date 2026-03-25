import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { hashPassword, createSession, setSessionCookie } from "../../../lib/auth";
import {
    normalizeEmail,
    normalizeText,
    isValidEmail,
    isStrongPassword,
    isValidFullName,
    isValidHeight,
    isValidGender,
    isValidNotes,
    isValidBirthDate,
} from "../../../lib/utils/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData();

    const fullName = normalizeText(formData.get("full_name"));
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    const birthDate = normalizeText(formData.get("birth_date")) || null;
    const gender = normalizeText(formData.get("gender")) || null;
    const heightRaw = normalizeText(formData.get("height_m"));
    const notes = normalizeText(formData.get("notes")) || null;
    const trainerIdRaw = normalizeText(formData.get("trainer_id"));

    if (!fullName || !email || !password || !confirmPassword || !trainerIdRaw) {
        return redirect("/clients/register/client?error=missing_fields");
    }

    if (!isValidFullName(fullName)) {
        return redirect("/clients/register/client?error=invalid_name");
    }

    if (!isValidEmail(email)) {
        return redirect("/clients/register/client?error=invalid_email");
    }

    if (password !== confirmPassword) {
        return redirect("/clients/register/client?error=password_mismatch");
    }

    if (!isStrongPassword(password)) {
        return redirect("/clients/register/client?error=weak_password");
    }

    if (!isValidBirthDate(birthDate)) {
        return redirect("/clients/register/client?error=invalid_birth_date");
    }

    if (!isValidGender(gender)) {
        return redirect("/clients/register/client?error=invalid_gender");
    }

    if (!isValidNotes(notes)) {
        return redirect("/clients/register/client?error=invalid_notes");
    }

    const trainerId = Number(trainerIdRaw);
    if (!trainerIdRaw || Number.isNaN(trainerId)) {
        return redirect("/clients/register/client?error=invalid_trainer");
    }

    const height = heightRaw === "" ? null : Number(heightRaw);
    if (heightRaw !== "" && (Number.isNaN(height) || !isValidHeight(height))) {
        return redirect("/clients/register/client?error=invalid_height");
    }

    const trainerResult = await sql`
        SELECT id
        FROM users
        WHERE id = ${trainerId}
          AND role = 'trainer'
        LIMIT 1
    `;

    if (trainerResult.length === 0) {
        return redirect("/clients/register/client?error=trainer_not_found");
    }

    const existingUser = await sql`
        SELECT id
        FROM users
        WHERE email = ${email}
        LIMIT 1
    `;

    if (existingUser.length > 0) {
        return redirect("/clients/register/client?error=email_exists");
    }

    const passwordHash = await hashPassword(password);

    const insertedUsers = await sql`
        INSERT INTO users (name, email, password_hash, role)
        VALUES (${fullName}, ${email}, ${passwordHash}, 'client')
        RETURNING id, name, email, role
    `;

    const user = insertedUsers[0];

    await sql`
        INSERT INTO clients (
            trainer_id,
            user_id,
            full_name,
            birth_date,
            height_m,
            notes,
            gender
        )
        VALUES (
            ${trainerId},
            ${user.id},
            ${fullName},
            ${birthDate},
            ${height},
            ${notes},
            ${gender}
        )
    `;

    const session = await createSession(user.id);
    setSessionCookie(cookies, session.token, session.expiresAt);

    return redirect("/dashboard");
};