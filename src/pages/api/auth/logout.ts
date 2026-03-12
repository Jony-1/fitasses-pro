import type { APIRoute } from "astro";
import { deleteSession } from "../../../lib/auth/session";

export const POST: APIRoute = async (context) => {
    try {
        const token = context.cookies.get("session")?.value;

        if (token) {
            await deleteSession(token);
        }

        context.cookies.delete("session", {
            path: "/",
        });

        return new Response(null, {
            status: 303,
            headers: {
                Location: "/login",
            },
        });
    } catch (error) {
        console.error("Logout error:", error);

        context.cookies.delete("session", {
            path: "/",
        });

        return new Response(null, {
            status: 303,
            headers: {
                Location: "/login",
            },
        });
    }
};