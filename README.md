# Curso2_ficha_proyecto

Plataforma colaborativa para la creación, registro y administración de Fichas de Proyecto: IA Aplicada del Instituto Profesional IPLACEX.

## Características Principales
- **Autenticación por Roles**: Perfil Estudiante (`AlfabetizacionIA` / `IAG2026`) y Administrador / Docente (`admon` / `hipopotamo`).
- **Gestión de Ficha de Proyecto**:
  - Antecedentes Generales y Equipo de Trabajo.
  - Propuesta de Solución (Modelos de IA, Estructura Técnica y Tipo de Herramienta).
  - Marco Ético y Normativo.
  - Resumen y Exportación en PDF.
- **Autoguardado Dinámico**: Persistencia local continua y sincronización en la nube con API Serverless.
- **Dashboard Estadístico Ejecutivo**: KPIs en tiempo real y gráficos de distribución para el perfil docente.
- **Exportación Oficial a Excel (.xlsx)**: Generación directa con las 7 columnas institucionales requeridas.

## Despliegue en Vercel
Configurado para despliegue directo con serverless function en `/api/projects`.
