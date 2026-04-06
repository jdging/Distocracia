# Bitácora del Proyecto

> Registro cronológico de cada sesión de trabajo. Cada entrada documenta qué se hizo, qué se decidió y qué queda pendiente.

---

### 2026-03-31 - Sesión 1
**Objetivo:** Inicializar proyecto, definir arquitectura completa y arrancar código
**Logros:**
- Proyecto configurado (CLAUDE.md, CONTEXTO.md, BITACORA.md, STACK.md, todo.md)
- Arquitectura y stack definidos: HTML/CSS/JS puro + KaTeX + GitHub Pages
- Estilo editorial definido: fondo oscuro `#1a1d2e`, Cormorant Garamond + JetBrains Mono, animación decrypt en hero
- JSON de perfiles generado desde Excel (W/UPN/L/2L-T/2L-X) → `src/assets/data/perfiles.json`
- Primer módulo cambiado de "viento" a "Analizador de Esbelteces" (port de app Streamlit existente)
- Contenido del About extraído del CV actualizado
- 4 servicios reales definidos
- Código iniciado: index.html + portal/esbelteces.html en construcción
**Pendientes:** Completar index.html y esbelteces.html. Luego: about, servicios, contacto, portal hub, módulos restantes
**Notas:**
- Email profesional: ing.guzmanjuandavid@gmail.com
- Logo: logo.svg (fondo oscuro) / logoclaro.svg (fondo claro)
- Tipografía y colores finales pendientes de validación con R.P.
- Sidebar del portal: diseño aprobado (iconos + tooltips, estilo LIFE.html)

---

### 2026-04-01 - Sesión 2
**Objetivo:** Retomar sesión cortada. Verificar estado de archivos en progreso, crear portal hub, arreglar esbelteces y crear about.
**Logros:**
- Verificado estado de archivos: `index.html` (completo), `esbelteces.html` (completo, lógica inline), `esbelteces.js` (nunca creado — no necesario)
- Creado `src/portal/index.html` — hub del portal con 3 grupos (Verificación, Cargas, Dimensionamiento), módulo 01 live, 02-08 "próximo"
- Fix esbelteces: reemplazado `fetch()` por `<script src="perfiles.js">` para compatibilidad con `file://` (Chrome bloquea fetch en file://)
- Creado `src/assets/data/perfiles.js` — datos de perfiles como variable global `PERFILES_DB`
- Creado `src/about.html` — CV completo en dark theme + botón "Descargar CV" (`download="CVGuzman.html"`)
**Pendientes:** servicios.html, contacto.html, validación visual con R.P., deploy en GitHub Pages
**Notas:**
- El download del CV funciona en Live Server (same-origin). En file:// Chrome puede bloquearlo.
- Los estilos CSS siguen siendo inline en cada HTML — refactoring a archivos separados es deuda técnica pendiente.

---

### 2026-04-01 - Sesión 3
**Objetivo:** CSS refactoring (extraer estilos inline a archivos compartidos) + crear servicios.html
**Logros:**
- Creados 3 archivos CSS compartidos: `variables.css` (base universal), `site.css` (nav/footer/botones/section para sitio público), `portal.css` (sidebar/layout/header para portal)
- Refactorizados los 4 HTML existentes: `index.html`, `about.html`, `portal/index.html`, `portal/esbelteces.html`
- Cada archivo ahora carga los CSS compartidos vía `<link>` y conserva solo estilos page-specific inline
- Conflictos resueltos: `--accent` diverge entre site (#9098b8) y portal (#c9b99a) → portal.css lo sobreescribe a nivel `:root`; `html/body` height/overflow diverge → portal.css lo sobreescribe también
- Creada `src/servicios.html` — página de servicios con hero corto + 4 secciones en grid 2 columnas, alcance detallado, normativas/stack como tags, CTA final
**Pendientes:** contacto.html, 7 módulos del portal, validación visual con R.P., deploy en GitHub Pages
**Notas:**
- La deuda técnica de CSS inline está saldada. Toda la base compartida ahora vive en `assets/css/`.
- about.html necesita overrides inline para `.section-header` (2rem vs 3rem) y `.section-label` (0.6rem vs 0.63rem) — diferencias reales de diseño, no bugs.
- esbelteces.html conserva inline las vars de estado OK/NO (`--ok-bg`, `--no-bg`, etc.) ya que son específicas del módulo.

---

### 2026-04-01 - Sesión 5
**Objetivo:** Tres mejoras de UI al sitio público: imagen de fondo en el hero, logo no clickeable, botón Home en el nav.
**Logros:**
- `index.html` — Hero background image: `bangkok.jpg` con overlay de tinte via CSS multi-background (`linear-gradient` + `url()`). Variable `--hero-overlay-opacity: 0.70` para ajustar opacidad. Bloque `<style id="hero-bg">` con killswitch comentado para desactivar rápidamente.
- Todos los 4 HTML públicos — Logo cambiado de `<a class="nav-logo" href="index.html">` a `<span class="nav-logo">`. Evita que el click en el logo abra el SVG.
- Todos los 4 HTML públicos — Agregado `<li><a href="index.html">Home</a></li>` como primer ítem en `.nav-links`. En `index.html` lleva `class="active"`.
**Pendientes:** Validación visual con R.P., deploy en GitHub Pages, 7 módulos del portal.
**Notas:**
- CSS multi-background evita conflictos de z-index con el pseudo-elemento `::after` ("ESTRUCTURAS" watermark) — el background siempre va detrás de todo.
- El portal no tiene top nav — no se tocaron `portal/index.html` ni `portal/esbelteces.html`.

---

### 2026-04-01 - Sesión 4
**Objetivo:** Crear `src/contacto.html` — última página pendiente del sitio público.
**Logros:**
- Creada `src/contacto.html` — hero ("Hablemos.") + grid 2 columnas: info de contacto (email, LinkedIn, GitHub, ubicación) + formulario.
- Formulario integrado con Formspree (endpoint `xvzvqvak`): envío via `fetch()` con `Accept: application/json` → sin redirect, feedback inline verde/rojo según respuesta.
- Fallback en el mensaje de error: muestra el email directo si el fetch falla (sin red, file://).
- Sitio público 100% completo: index ✓ · about ✓ · servicios ✓ · contacto ✓.
**Pendientes:** Validación visual con R.P., deploy en GitHub Pages, 7 módulos del portal.
**Notas:**
- El formulario requiere Live Server o GitHub Pages — en file:// Chrome bloquea fetch() cross-origin. Comportamiento esperado.
- El endpoint de Formspree está hardcodeado en el HTML (`https://formspree.io/f/xvzvqvak`). Si cambia, actualizarlo en contacto.html.

---
<!-- Claude: agregar nuevas sesiones arriba de este comentario, manteniendo el formato -->
