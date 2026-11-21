# Beez Industries · Sistema de Gestión de Energía

Mockup funcional de una plataforma SaaS de gestión energética para plantas industriales,
con plantilla enfocada en **molinos de arroz**. Los datos de medición son simulados.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
```

En macOS también se puede abrir `Iniciar.command`.

### Cuentas de demostración (contraseña `beez2026`)

| Correo | Rol |
|---|---|
| ronald.salazar@beezcorp.com | Súper administrador Beez (consola, todas las plantas) |
| carlos.mendoza@electrointegra.pe | Integrador (plantas asignadas) |
| jorge.paredes@molinosanmartin.pe | Administrador de planta |
| lucia.vega@molinosanmartin.pe | Supervisor |
| pedro.huaman@molinosanmartin.pe | Operador (solo lectura) |

## Módulos

- **Inicio**: KPIs, tendencia, distribución por áreas, ingreso a planta (tensión con límites).
- **Balance**: consumo mensual del medidor general, comparación con el mes anterior, detalle por día y área, últimos 12 meses.
- **Dashboards**: paneles tipo Grafana movibles y redimensionables, zoom por arrastre, anotaciones.
- **Medidores**: tabla, tarjetas, lecturas de totalizadores y detalle con curvas por variable.
- **Áreas**, **Reportes** (CSV / PDF) y **Alertas** (con salto al evento en la curva).
- **Unifilar**: símbolos IEC, conexiones libres, tipos de línea, medidores coloreados por estado y panel de información al pulsar un medidor.
- **Integración**: editor de flujos tipo Node-RED con drivers por marca y Modbus genérico.
- **Consola Beez**: clientes, MRR/ARR, salud de clientes, facturación mensual/anual, solicitudes de mejora de plan, planes y accesos.
- **Planes**: Starter (5 medidores), Pro (12) y Enterprise (ilimitado), con límites aplicados en la app.

## Stack

React 18 + Vite, Zustand (estado persistido en el navegador), Recharts, React Flow (@xyflow/react),
react-grid-layout y Three.js (escena 3D del login).

## Estructura

```
src/
  data/     catálogo de drivers y datos de demostración (plantas, usuarios, solicitudes)
  lib/      simulación de medidores, SaaS (roles/planes), facturación, alertas
  components/ widgets, editores, modales, escena 3D
  pages/    una página por sección del menú
```
