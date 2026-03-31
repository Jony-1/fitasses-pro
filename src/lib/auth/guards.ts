import type { APIContext } from "astro";

export function requireUser(context: APIContext) {
    const user = context.locals.user;

    if (!user) {
        throw new Error("UNAUTHORIZED");
    }

    return user;
}

export function requireTrainer(context: APIContext) {
    const user = requireUser(context);

    if (user.role !== "trainer" && user.role !== "admin" && user.role !== "gym_manager") {
        throw new Error("FORBIDDEN");
    }

    return user;
}

export function requireAdmin(context: APIContext) {
    const user = requireUser(context);

    if (user.role !== "admin") {
        throw new Error("FORBIDDEN");
    }

    return user;
}

export function requireAdminOrGymManager(context: APIContext) {
    const user = requireUser(context);

    if (user.role !== "admin" && user.role !== "gym_manager") {
        throw new Error("FORBIDDEN");
    }

    return user;
}
