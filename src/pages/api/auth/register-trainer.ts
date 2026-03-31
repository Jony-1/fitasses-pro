import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ redirect }) => {
    return redirect("/clients/register/trainer?status=managed_only");
};
