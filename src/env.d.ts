/// <reference types="astro/client" />

type AppUser = {
    id: number;
    name: string;
    email: string;
    role: "admin" | "trainer" | "client";
  } | null;
  
  declare namespace App {
    interface Locals {
      user: AppUser;
    }
  }