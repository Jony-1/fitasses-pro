import { defineMiddleware } from "astro:middleware";
import { getSessionUser } from "./lib/auth/auth";

const PUBLIC_EXACT_PATHS = new Set([
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/api/auth/password-reset-request",
    "/api/auth/password-reset",
]);
const PUBLIC_PREFIXES = [
    "/clients/register/",
    "/reset-password/",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/register-",
];

export const onRequest = defineMiddleware(async (context, next) => {
    const sessionToken = context.cookies.get("session")?.value ?? null;
    const user = sessionToken ? await getSessionUser(sessionToken) : null;

    context.locals.user = user;

    const pathname = context.url.pathname;

    const isPublic = PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
        
    if (!user && !isPublic) {
        return context.redirect("/login");
    }

    return next();
});
