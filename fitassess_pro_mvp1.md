# FitAssess Pro

## MVP 1 -- Sistema base de gestión de clientes y valoraciones

### Descripción

FitAssess Pro es una aplicación web orientada a entrenadores o
profesionales del fitness para registrar clientes y realizar seguimiento
de sus valoraciones físicas a lo largo del tiempo.

El **MVP 1** tuvo como objetivo construir un sistema funcional que
permitiera registrar clientes, agregar valoraciones físicas y consultar
su historial.

------------------------------------------------------------------------

# Objetivo del MVP 1

Construir una aplicación mínima funcional que permita:

-   registrar clientes
-   registrar valoraciones físicas
-   consultar historial de valoraciones
-   visualizar métricas corporales
-   desplegar el sistema en un entorno real

------------------------------------------------------------------------

# Stack tecnológico

Frontend / Fullstack

-   Astro
-   TailwindCSS

Backend

-   Node runtime (Astro server)
-   PostgreSQL

Base de datos

-   PostgreSQL (Railway)

Infraestructura

-   Railway (deploy)
-   GitHub (control de versiones)

------------------------------------------------------------------------

# Arquitectura general

La aplicación sigue una arquitectura simple orientada a MVP:

Frontend (Astro + Tailwind)\
│\
Server routes (Astro API)\
│\
Database queries\
│\
PostgreSQL (Railway)

------------------------------------------------------------------------

# Módulos implementados en MVP 1

## 1. Gestión de clientes

Permite administrar los clientes del sistema.

Funcionalidades:

-   crear cliente
-   editar cliente
-   eliminar cliente
-   ver información del cliente

Datos almacenados:

-   nombre
-   fecha de nacimiento
-   estatura
-   notas
-   fecha de creación

------------------------------------------------------------------------

## 2. Registro de valoraciones físicas

Permite registrar las métricas corporales de cada cliente.

### Datos principales

-   peso
-   grasa corporal
-   masa muscular
-   edad metabólica
-   grasa visceral
-   calorías diarias

### Medidas corporales

-   hombros
-   pecho
-   brazo
-   cintura
-   cadera
-   muslo
-   pantorrilla

Además se permite agregar:

-   notas de valoración
-   fecha de la valoración

------------------------------------------------------------------------

## 3. Historial de valoraciones

Cada cliente puede tener múltiples valoraciones.

El sistema permite:

-   visualizar historial completo
-   ver cada valoración con detalle
-   mostrar métricas principales
-   calcular IMC automáticamente
-   visualizar evolución del cliente

------------------------------------------------------------------------

# Funcionalidades completadas en MVP 1

Checklist final del MVP:

-   crear cliente sin errores
-   editar cliente sin errores
-   eliminar cliente sin errores
-   registrar valoración sin errores
-   visualizar historial correctamente
-   fechas correctas
-   interfaz responsive funcional
-   deploy estable en Railway

Con estas funcionalidades el sistema cumple el objetivo del MVP.

------------------------------------------------------------------------

# Interfaz de usuario

Se implementó una interfaz simple y funcional:

-   layout base reutilizable
-   sidebar de navegación
-   formularios para clientes
-   formularios para valoraciones
-   tarjetas de métricas
-   historial organizado por fechas

También se implementó:

-   modo oscuro
-   modo claro
-   componentes reutilizables

------------------------------------------------------------------------

# Despliegue

La aplicación se encuentra desplegada en Railway.

Flujo de despliegue:

Desarrollo local\
→ Push a GitHub\
→ Railway detecta cambios\
→ Build automático\
→ Deploy en producción

Esto permite que cualquier usuario pueda acceder al sistema y
utilizarlo.

------------------------------------------------------------------------

# Resultado del MVP 1

El MVP 1 logra:

-   gestionar clientes
-   registrar valoraciones físicas
-   consultar historial de evolución
-   operar completamente desde la web

El sistema ya es utilizable para realizar seguimiento básico de
clientes.

------------------------------------------------------------------------

# Lecciones aprendidas

Durante el desarrollo del MVP se identificaron varios puntos
importantes:

-   comenzar con arquitectura simple acelera el desarrollo
-   Tailwind permite crear interfaces rápidas
-   Astro funciona bien para aplicaciones fullstack pequeñas
-   Railway facilita el despliegue de proyectos MVP

------------------------------------------------------------------------

# Próximos pasos

## MVP 2

El objetivo del MVP 2 será mejorar la experiencia del sistema.

Funcionalidades planeadas:

-   edición de valoraciones
-   eliminación de valoraciones
-   validaciones avanzadas en formularios
-   mejor responsive para dispositivos móviles
-   pulido visual en modo dark y light
-   mensajes de éxito y error más claros para el usuario

------------------------------------------------------------------------

# Futuras mejoras (MVP 3)

Posibles mejoras futuras:

-   gráficas de evolución corporal
-   comparativas entre valoraciones
-   exportar reporte en PDF
-   panel de estadísticas
-   autenticación de usuarios

------------------------------------------------------------------------

# Autor

Jonathan Sierra Galindo\
Ingeniería de Software

Proyecto personal de desarrollo.
