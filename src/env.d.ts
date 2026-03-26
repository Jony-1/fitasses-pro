/// <reference types="astro/client" />

type AppUser = {
    id: number;
    name: string;
    email: string;
    role: "admin" | "gym_manager" | "trainer" | "client";
    gymId: number | null;
} | null;

declare namespace App {
    interface Locals {
        user: AppUser;
    }
}
