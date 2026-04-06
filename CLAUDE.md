# Proyecto: JDG Sistemas & Estructuras

## Identidad del Proyecto
- **Cliente:** JDG (proyecto propio)
- **Descripción:** Plataforma web profesional con sitio tipo portafolio editorial (home, about, servicios, contacto) y portal de ingeniería estructural con software de cálculo online organizado por módulos en sidebar (cargas de viento/cubierta/nieve, dimensionamiento de vigas/correas/anclajes/columnas).
- **Estado:** En desarrollo activo
- **Fecha inicio:** 2026-03-31
- **Stack:** HTML5 + CSS3 + Vanilla JS · KaTeX (CDN) · Cormorant Garamond + JetBrains Mono · GitHub Pages

## Reglas de Oro (no negociables)

1. **NUNCA escribas código sin antes consultarme.** Mostrá un resumen de lo que entendiste, qué vas a hacer, y esperá mi OK.
2. **Actualizá el contexto del proyecto** después de cada cambio significativo (ver `docs/BITACORA.md` y `docs/CONTEXTO.md`).
3. **Herramientas gratuitas primero.** Siempre priorizá soluciones gratuitas y de código abierto. Si hay una opción paga que es claramente superior, mencionala como alternativa, pero la recomendación principal debe ser gratuita.
4. **Ecosistema Google preferido:** Google Sheets, Apps Script, Firebase, AppSheet, Looker Studio, Drive, Calendar, etc.
5. **Sugerí herramientas del vault** (`docs/VAULT.md`) cuando detectes que una puede servir para la tarea actual. No instales nada sin mi aprobación.
6. **Consultá con R.P.** (diseñadora gráfica) cuando algo involucre decisiones de diseño visual, branding, o UX que excedan lo técnico. Nombrala explícitamente en la sugerencia.
7. **Documentos HTML con marca:** Todo documento generado (presupuesto, informe, propuesta) debe usar el template HTML con los assets de `marca/`. Deben ser exportables a PDF.

## Comandos del Proyecto
- No hay build commands — proyecto HTML puro, sin npm ni bundler.
- Desarrollo: abrir con Live Server (VS Code) desde `src/`.
- Regenerar perfiles.js desde perfiles.json (si se actualiza el Excel):
  ```
  node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('src/assets/data/perfiles.json','utf8')); fs.writeFileSync('src/assets/data/perfiles.js','const PERFILES_DB = '+JSON.stringify(d)+';');"
  ```

## Comandos de Sesión (Claude Code)
- `/project:init` → Inicializar proyecto nuevo desde template
- `/project:status` → Ver resumen rápido del estado actual
- `/project:update-context` → Actualizar toda la documentación
- `/project:close-session` → Cerrar sesión y documentar todo
- `/project:suggest-tools` → Sugerir herramientas útiles del vault
- `/project:sync-to-template` → Proponer sincronización de aprendizajes al template maestro

## Arquitectura
- **Frontend:** HTML5 + CSS3 + Vanilla JS (ES6+). Sin frameworks.
  - CSS compartido en `src/assets/css/`: `variables.css` (base universal) → `site.css` (sitio público) o `portal.css` (portal). Cada HTML conserva solo estilos page-specific inline.
  - Orden de carga obligatorio: `variables.css` siempre primero, luego el contextual. portal.css sobreescribe `--accent` y `html/body`.
- **Backend:** Ninguno. Todo es estático.
- **Base de datos:** Archivos estáticos — `src/assets/data/perfiles.json` (fuente) + `perfiles.js` (variable global para compatibilidad con file://).
- **Hosting:** GitHub Pages (pendiente deploy).
- **Integraciones:** KaTeX (CDN) para render de fórmulas LaTeX. Google Fonts para tipografías.

## Estructura de Carpetas
```
[NOMBRE_PROYECTO]/
├── CLAUDE.md              ← este archivo (instrucciones para Claude Code)
├── CLAUDE.local.md        ← preferencias personales (gitignored)
├── .claude/               ← configuración de Claude Code
│   ├── settings.json      ← permisos y hooks
│   ├── rules/             ← reglas modulares por contexto
│   ├── commands/          ← comandos slash personalizados
│   ├── skills/            ← workflows automáticos
│   ├── hooks/             ← scripts de automatización
│   └── agents/            ← subagentes especializados
├── docs/                  ← documentación viva del proyecto
│   ├── CONTEXTO.md        ← resumen actual del proyecto (siempre actualizado)
│   ├── BITACORA.md        ← log cronológico de decisiones y cambios
│   ├── DECISIONES.md      ← registro de decisiones arquitectónicas
│   ├── STACK.md           ← tecnologías y herramientas en uso
│   └── VAULT.md           ← bóveda de herramientas sugeridas
├── tasks/
│   ├── todo.md            ← tareas pendientes y en progreso
│   └── lessons.md         ← lecciones aprendidas (errores que no repetir)
├── marca/
│   ├── jdg/               ← assets de marca propia (logo.svg, colores, etc.)
│   └── cliente/           ← assets del cliente (si aplica)
├── presupuesto/           ← templates HTML de documentos comerciales
└── src/                   ← código fuente del proyecto
```

## Convenciones
- Idioma del código: inglés (variables, funciones, comentarios técnicos)
- Idioma de documentación: español (argentino)
- Commits: conventional commits en español
- Los archivos de contexto (`docs/`) se actualizan en cada sesión de trabajo
- Nunca usar `vale la pena` ni `no vale la pena` en ninguna respuesta

## Watch Out For
- **fetch() + file://** → Chrome bloquea fetch() en protocolo file://. Para datos locales, usar `<script src="datos.js">` con variable global. Ver LEC-002 y DEC-002.
- **Dos fuentes de datos de perfiles** → `perfiles.json` es la fuente. `perfiles.js` es derivado. Si se actualiza el JSON, hay que regenerar el JS con el comando de Node en la sección de arriba.
- **Orden de carga de CSS** → `variables.css` siempre antes que `site.css` o `portal.css`. Si se invierte el orden, los overrides de `--accent` y `html/body` en portal.css no funcionan. Ver DEC-004.
- **--accent tiene dos valores** → `#9098b8` (azul-gris) en el sitio público; `#c9b99a` (cálido) en el portal. portal.css sobreescribe el `:root`. No "arreglar" esta diferencia — es intencional.
- **html/body en portal** → portal.css fuerza `height:100%; overflow:hidden`. Si una página nueva del portal necesita scroll, hay que sobreescribir explícitamente en su `<style>` inline.
- **Overrides inline comentados** → about.html tiene `.section-header { margin-bottom: 2rem }` y `.section-label { font-size: 0.6rem }` que difieren de site.css. No removerlos ni "unificarlos" sin verificar que el diseño sigue siendo correcto.
- **Tipografía y colores pendientes de validación** → La paleta actual (`#1a1d2e`, Cormorant + JetBrains Mono) está aprobada provisoriamente pero pendiente de revisión con R.P. No hacer cambios de branding sin consultarla.
- **KaTeX + defer** → KaTeX se carga con `defer`. Se usa solo en eventos de click (accordion). No hay race condition, pero si se usa en carga inicial habría que moverlo.
- **Formspree en file://** → contacto.html usa fetch() para enviar el formulario a Formspree. Eso falla en file:// (Chrome bloquea fetch cross-origin sin servidor). Es comportamiento esperado — el formulario solo tiene sentido con Live Server o GitHub Pages.
- **Endpoint Formspree** → `https://formspree.io/f/xvzvqvak` hardcodeado en contacto.html. Si cambia la cuenta o el form, actualizar en ese archivo. Límite: 50 envíos/mes en plan gratuito.
- **Hero background killswitch** → index.html tiene un `<style id="hero-bg">` separado con la imagen y el tinte. Para desactivar: comentar ese bloque completo. Para ajustar opacidad: cambiar `--hero-overlay-opacity` (0.70 default). Ver DEC-006.
- **Logo nav es `<span>`, no `<a>`** → Intencional. Clickear el logo antes abría el SVG. Si en el futuro se quiere que navegue a home, cambiar a `<a href="index.html" class="nav-logo">` — site.css no usa selectores `a`-específicos en `.nav-logo`, funciona en cualquier elemento.
