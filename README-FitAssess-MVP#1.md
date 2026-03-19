# FitAssess Pro — MVP Setup

Sistema para gestión de **valoraciones físicas de gimnasio**.

## Stack actual del MVP

- Astro (SSR)
- PostgreSQL
- Railway (hosting DB)
- TailwindCSS 4
- Node adapter

## Objetivo del MVP

```text
Entrenador
 ├─ Clientes
 │   ├─ Crear cliente
 │   ├─ Listar clientes
 │   └─ Perfil cliente (siguiente paso)
 │
 └─ Valoraciones físicas (siguiente MVP)
```

## 1. Creación del proyecto Astro

Proyecto creado con Astro:

```bash
npm create astro@latest
```

Estructura inicial:

```text
fitasses-pro
│
├─ src
│   ├─ pages
│   ├─ layouts
│   ├─ lib
│   │   └─ db
│   └─ styles
│
├─ public
├─ astro.config.mjs
├─ package.json
└─ tsconfig.json
```

## 2. Configuración Astro SSR

Archivo:

`astro.config.mjs`

Configuración utilizada:

```js
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Esto permite:

- SSR
- API endpoints
- conexión directa a PostgreSQL

## 3. Configuración TailwindCSS 4

Se usa:

`@tailwindcss/vite`

Archivo:

`src/styles/global.css`

```css
@import "tailwindcss";

html {
  font-family: "Manrope", sans-serif;
}
```

## 4. tsconfig.json

Se agregaron tipos de Node para usar:

- fs
- path

Archivo:

`tsconfig.json`

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "types": ["node"]
  }
}
```

Instalación:

```bash
npm install -D @types/node
```

## 5. Base de datos en Railway

Se creó un proyecto en Railway y se agregó un servicio PostgreSQL.

Railway genera la variable:

`DATABASE_URL`

## 6. Variables de entorno

Archivo:

`.env`

Ejemplo:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

## 7. Conexión a PostgreSQL

Archivo:

`src/lib/db/client.ts`

```ts
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

export const sql = postgres(connectionString, {
  ssl: "require"
});
```

Esto permite ejecutar queries así:

```ts
const clients = await sql`
  SELECT * FROM clients
`;
```

## 8. Inicialización de base de datos

Archivo SQL:

`src/lib/db/schema.sql`

Contiene:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'trainer',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER REFERENCES users(id),
    full_name TEXT NOT NULL,
    birth_date DATE,
    height_m NUMERIC(3,2),
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_conditions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,
    weight_kg NUMERIC(5,2),
    body_fat_pct NUMERIC(5,2),
    muscle_pct NUMERIC(5,2),
    daily_calories INTEGER,
    metabolic_age INTEGER,
    visceral_fat INTEGER,
    bmi NUMERIC(5,2),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_measurements (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    shoulders_cm NUMERIC(5,2),
    chest_cm NUMERIC(5,2),
    right_arm_cm NUMERIC(5,2),
    waist_cm NUMERIC(5,2),
    hips_cm NUMERIC(5,2),
    right_thigh_cm NUMERIC(5,2),
    calf_cm NUMERIC(5,2)
);
```

## 9. Endpoint para inicializar DB

Archivo:

`src/pages/api/init-db.ts`

```ts
import type { APIRoute } from "astro";
import { sql } from "../../lib/db/client";
import fs from "fs";
import path from "path";

export const GET: APIRoute = async () => {
  const filePath = path.resolve("src/lib/db/schema.sql");
  const schema = fs.readFileSync(filePath, "utf8");

  await sql.unsafe(schema);

  return new Response(
    JSON.stringify({
      status: "database initialized"
    }),
    { status: 200 }
  );
};
```

Se ejecuta:

```text
http://localhost:4321/api/init-db
```

Resultado:

```text
database initialized
```

## 10. Layout principal

Archivo:

`src/layouts/layout.astro`

Contiene:

- Sidebar
- Header
- Slot principal

Se usa en las páginas del panel.

## 11. Listado de clientes

Página:

`src/pages/clients/index.astro`

Consulta:

```ts
const clients = await sql`
SELECT id, full_name, birth_date, height_m
FROM clients
ORDER BY id DESC
`;
```

Ruta:

```text
http://localhost:4321/clients
```

Muestra tabla de clientes.

## 12. Crear cliente

Formulario:

`src/pages/clients/new.astro`

Formulario:

```html
<form method="POST" action="/api/clients/create">
```

## 13. Endpoint crear cliente

Archivo:

`src/pages/api/clients/create.ts`

```ts
import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();

  const fullName = String(formData.get("full_name") || "").trim();
  const birthDate = String(formData.get("birth_date") || "").trim();
  const heightM = String(formData.get("height_m") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  await sql`
    INSERT INTO clients (full_name, birth_date, height_m, notes)
    VALUES (
      ${fullName},
      ${birthDate || null},
      ${heightM ? Number(heightM) : null},
      ${notes || null}
    )
  `;

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/clients",
    },
  });
};
```

## 14. Flujo actual funcionando

```text
/clients/new
      │
      │ POST
      ▼
/api/clients/create
      │
      │ INSERT PostgreSQL
      ▼
redirect
      │
      ▼
/clients
```

## 15. Estado actual del MVP

Funciona:

- conexión Railway
- PostgreSQL
- SSR Astro
- Layout panel
- Listado clientes
- Crear clientes

## 16. Próximos pasos

### Perfil cliente

`/clients/[id]`

### Valoraciones

- Nueva valoración
- Historial de progreso

### Gráficas

- peso
- % grasa
- medidas

### Dashboard entrenador

- clientes activos
- progreso promedio
- últimas valoraciones

## Estado del proyecto

- FitAssess Pro
- MVP backend funcionando
- estructura limpia
- base para sistema SaaS
