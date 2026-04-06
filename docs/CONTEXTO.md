# Contexto del Proyecto

> Este archivo es el resumen vivo del proyecto. Claude lo actualiza después de cada sesión de trabajo. Si estás leyendo esto en una nueva sesión, acá tenés todo lo que necesitás saber.

## ¿Qué es este proyecto?
**JDG Sistemas & Estructuras** es una plataforma web propia con dos grandes secciones:

1. **Sitio portafolio** — página pública tipo editorial minimalista con secciones: Home, About, Servicios y Contacto. Representa la identidad profesional de JDG.
2. **Portal de ingeniería estructural** — aplicación web con software de cálculo técnico organizado en módulos accesibles desde un sidebar lateral:
   - Verificación: esbelteces
   - Cargas: viento, cubierta, nieve
   - Dimensionamiento: vigas, correas, anclajes, columnas

## ¿Qué hace hasta ahora?
- `src/index.html` — home completo: nav fija, hero con animación decrypt ("SISTEMAS & ESTRUCTURAS") + imagen de fondo `bangkok.jpg` con tinte overlay (killswitch `<style id="hero-bg">`), sección servicios (4 cards), portal CTA con lista de módulos, footer.
- `src/about.html` — CV completo en dark theme: resumen, competencias + skill tags, experiencia laboral, proyecto destacado (Wash Motion), educación, idiomas. Botón "Descargar CV".
- `src/servicios.html` — 4 servicios detallados: hero corto + grid 2 columnas (número+título | contenido expandido), alcance, normativas y stack como tags, CTA final.
- `src/contacto.html` — página de contacto: hero + grid 2 columnas (info de contacto | formulario). Formulario enviado vía Formspree (endpoint xvzvqvak) con fetch() + JSON → sin redirect, feedback inline.
- `src/portal/index.html` — hub del portal: sidebar + 3 grupos de módulos (Verificación / Cargas / Dimensionamiento). Módulo 01 live, 02-08 "próximo".
- `src/portal/esbelteces.html` — Analizador de Esbelteces funcional: sidebar con 8 módulos, inputs dinámicos por tipo de perfil (W/UPN/L/2L-T/2L-X), cálculo completo, render de resultados, accordion con memoria de cálculo KaTeX.
- `src/assets/data/perfiles.json` — base de datos de perfiles (W:108, UPN:24, L:47, 2L-T:47, 2L-X:47).
- `src/assets/data/perfiles.js` — mismos datos como variable global `PERFILES_DB` (para compatibilidad con file://).

## Arquitectura CSS (refactoring completo — Sesión 3)
Tres archivos compartidos en `src/assets/css/`:
- `variables.css` — `:root` (colores, tipografías, sizing), reset, body base, `a`. Cargado por **todos** los HTML.
- `site.css` — nav, section-header, footer, botones (`.btn-primary`, `.btn-ghost`), responsive. Cargado por páginas del **sitio público**.
- `portal.css` — sobreescribe `--accent` a `#c9b99a` (tono cálido), `html/body` altura/overflow, sidebar, portal-layout, module-header, scrollbar. Cargado por páginas del **portal**.

Cada HTML conserva solo estilos page-specific inline. Conflictos resueltos con overrides comentados.

## Stack actual
HTML5 + CSS3 (variables.css + site.css + portal.css) + Vanilla JS · KaTeX (CDN) · Cormorant Garamond + JetBrains Mono · GitHub Pages

## Decisiones de diseño tomadas
- Estilo editorial minimalista con toque "code developer"
- Fondo oscuro `#1a1d2e` (jdg-black), texto `#e8e4da`, navy `#2b3263` como acento/sidebar
- `--accent: #9098b8` (azul-gris) para el sitio público; `--accent: #c9b99a` (cálido) para el portal — portal.css sobreescribe el `:root`
- Hero con animación decrypt: letras random que se resuelven hasta "SISTEMAS & ESTRUCTURAS"
- Tipografía: Cormorant Garamond (serif editorial) para títulos + JetBrains Mono para body
- Logo: `logo.svg` sobre fondo oscuro, `logoclaro.svg` sobre fondo claro
- **Tipografía y colores finales pendientes de validación con R.P.**

## Estructura de páginas
**Sitio público:** index.html ✓ · about.html ✓ · servicios.html ✓ · contacto.html ✓ — sitio público completo
**Portal:** portal/index.html ✓ (hub) · portal/esbelteces.html ✓ · +7 módulos pendientes

## Estado de funcionalidades
| Funcionalidad                    | Estado     | Notas                                        |
|----------------------------------|------------|----------------------------------------------|
| index.html (home + decrypt)      | Completo   | Nav, hero, servicios, portal CTA, footer     |
| about.html                       | Completo   | CV completo + botón descargar                |
| servicios.html                   | Completo   | 4 servicios, grid editorial, tags            |
| portal/index.html (hub)          | Completo   | 3 grupos, módulo 01 live                     |
| portal/esbelteces.html           | Completo   | W/UPN/L/2L-T/2L-X + KaTeX                   |
| CSS refactoring                  | Completo   | variables.css + site.css + portal.css        |
| contacto.html                    | Completo   | Formspree + fetch() + feedback inline        |
| portal/viento.html               | Pendiente  | —                                            |
| portal/cubierta.html             | Pendiente  | —                                            |
| portal/nieve.html                | Pendiente  | —                                            |
| portal/vigas.html                | Pendiente  | —                                            |
| portal/correas.html              | Pendiente  | —                                            |
| portal/anclajes.html             | Pendiente  | —                                            |
| portal/columnas.html             | Pendiente  | —                                            |

## Gotchas técnicos conocidos
- **fetch() + file://** → Chrome bloquea fetch() en protocolo file://. Solución: usar `<script src="datos.js">` con variable global.
- **KaTeX + defer** → KaTeX cargado con `defer`, se usa solo en eventos de usuario (click) → no hay race condition.
- **--accent conflict** → Site usa `#9098b8` (azul-gris); portal usa `#c9b99a` (cálido). portal.css sobreescribe `:root { --accent: #c9b99a }` — cargar siempre en ese orden.
- **html/body portal** → portal.css fuerza `height: 100%; overflow: hidden`. Si una página del portal necesita scroll, hay que revertirlo explícitamente.
- **Botón Descargar CV** → Funciona en Live Server. En file:// Chrome puede bloquear downloads cross-file.
- **Hero background killswitch** → `index.html` tiene un bloque `<style id="hero-bg">` separado. Para desactivar la imagen: comentar todo ese bloque. Para ajustar la opacidad del tinte: cambiar `--hero-overlay-opacity` (0 = imagen pura, 1 = sin imagen, 0.70 = default).
- **Logo nav no es clickeable** → El logo en el nav es `<span class="nav-logo">`, no `<a>`. Intencional — evita que el click abra el SVG. Si en el futuro se quiere que navegue a home, cambiar a `<a href="index.html" class="nav-logo">` (site.css no usa selectores `a`-específicos en `.nav-logo`).

## Último update
- **Fecha:** 2026-04-01
- **Sesión:** 5
- **Resumen:** Hero background image con killswitch en index.html. Logo nav no-clickeable. Botón Home en nav de los 4 HTML públicos.
