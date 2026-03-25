import { defineMiddleware } from "astro:middleware";
import { getSessionUser } from "./lib/auth/auth";

const PUBLIC_PATHS = ["/login", "/register", "clients/register/client","clients/register/trainer",  "/api/create-trainer"];

export const onRequest = defineMiddleware(async (context, next) => {
    const sessionToken = context.cookies.get("session")?.value ?? null;
    const user = sessionToken ? await getSessionUser(sessionToken) : null;

    context.locals.user = user;

    const pathname = context.url.pathname;

    const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith("/clients/register/") ||
        pathname.startsWith("/api/auth/login") ||
        pathname.startsWith("/api/auth/logout") ||
        pathname.startsWith("/api/auth/register-");
        
    if (!user && !isPublic) {
        return context.redirect("/login");
    }

    return next();
});