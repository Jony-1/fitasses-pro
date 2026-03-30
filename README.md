# FitAssess Pro

FitAssess Pro es una plataforma web para gimnasios, entrenadores, clientes y administradores que conecta gestión, valoraciones, rutinas y progreso físico en un solo flujo.

## Pitch

FitAssess Pro convierte el seguimiento fitness en una experiencia operativa y medible.

En lugar de repartir la información entre chats, hojas de cálculo, notas sueltas y rutinas externas, concentra todo en una sola aplicación con vistas diferenciadas por rol y un recorrido claro desde la planificación hasta el resultado.

## Problema

El seguimiento de clientes en gimnasios y entrenamiento personalizado suele romperse por tres motivos:

- la información se guarda en herramientas separadas
- el entrenador pierde visibilidad de quien necesita seguimiento
- el cliente no tiene una experiencia clara para ejecutar su rutina y ver su avance

## Solución

FitAssess Pro unifica en una sola plataforma:

- gestión de clientes y entrenadores
- valoraciones físicas e historial corporal
- rutinas activas por cliente
- modo entrenamiento guiado con registro de sesión
- dashboard con alertas, tendencias y seguimiento

## Roles

- Administrador: gestiona gimnasios, entrenadores y visión general del sistema.
- Gestor de gimnasio: supervisa su gimnasio y el rendimiento operativo de su equipo.
- Entrenador: administra clientes, registra valoraciones, asigna rutinas y da seguimiento.
- Cliente: consulta su rutina, progreso y valoraciones desde una experiencia simple.

## Flujo principal de uso

1. Inicia sesión como entrenador.
2. Accede al panel de control con clientes que requieren atención, valoraciones recientes y acciones rápidas.
3. Navega al listado de clientes y selecciona uno.
4. Accede a la rutina del cliente y activa el modo entrenamiento guiado.
5. Registra una sesión de entrenamiento completando el flujo paso a paso.
6. Revisa el progreso del cliente con visualizaciones claras y seguimiento continuo.
7. Consulta el historial de valoraciones y compara mediciones a lo largo del tiempo.

## Características diferenciadoras

- Conecta cuatro roles reales en una experiencia unificada.
- Flujo completo de gestión, ejecución y medición en una sola plataforma.
- Modo entrenamiento guiado que mejora la adherencia y precisión del entrenamiento.
- Dashboard operativo que transforma datos en seguimiento accionable.
- Producto listo para uso productivo con arquitectura escalable y mantenible.

## Tecnologías

- **Frontend:** Astro, TypeScript, Tailwind CSS
- **Backend:** Node.js, PostgreSQL, Drizzle ORM  
- **Visualización:** Chart.js
- **Autenticación:** Sistema propio con sesiones en base de datos
- **Despliegue:** Compatible con Railway, Vercel, Docker

## Instalación

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run start
```

## Validación recomendada

Para cambios importantes en la interfaz o en la lógica principal:

```bash
npm run build
```

## Acceso rápido

- Página inicial: `/`
- Inicio de sesión: `/login`

## Características implementadas

FitAssess Pro incluye:

- autenticación por roles
- dashboards operativos
- gestión de clientes
- valoraciones corporales
- progreso visual
- rutinas activas
- entrenamiento guiado
- modo oscuro

La plataforma está en desarrollo activo con próximas mejoras en automatización, análisis avanzado y seguimiento inteligente.
