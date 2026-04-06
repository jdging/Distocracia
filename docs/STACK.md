# Stack Tecnológico

> Todo lo que está instalado, configurado o en uso en este proyecto.

## Herramientas de desarrollo
| Herramienta | Versión | Para qué se usa | Gratuita |
|------------|---------|-----------------|----------|
| Claude Code | - | Asistente de desarrollo | Sí (con plan) |
| Git | - | Control de versiones | Sí |

## Lenguajes y frameworks
| Tecnología | Versión | Rol |
|-----------|---------|-----|
| HTML5 | - | Markup de todas las páginas |
| CSS3 (custom properties) | - | Estilos, sin framework |
| Vanilla JS (ES6+) | - | Lógica de cálculo y animaciones |

## Tipografías (Google Fonts)
| Fuente | Uso |
|--------|-----|
| Cormorant Garamond | Títulos hero, estilo editorial |
| JetBrains Mono | Body, labels, código — ya en marca JDG |

## Librerías cliente (CDN, sin instalación)
| Librería | Uso |
|----------|-----|
| KaTeX | Render de fórmulas LaTeX en el browser (módulos de cálculo) |

## Datos estáticos
| Archivo | Contenido |
|---------|-----------|
| `src/assets/data/perfiles.json` | Base de datos de perfiles estructurales (exportada del Excel AnalizadorDeEsbelteces_Data.xlsx). Hojas: W (108), UPN (24), L (47), 2L-T (47), 2L-X (47). |
| `src/assets/data/perfiles.js` | Mismos datos que perfiles.json exportados como `const PERFILES_DB = {...}`. Se carga con `<script>` para compatibilidad con file:// (Chrome bloquea fetch en file://). Generado con Node.js. |

## Servicios externos
| Servicio | Tier | Para qué se usa | Costo |
|---------|------|-----------------|-------|
| Google Drive | Gratuito | Almacenamiento del proyecto | $0 |
| GitHub Pages | Gratuito | Hosting del sitio web | $0 |
| Google Fonts | Gratuito | Tipografías (Cormorant Garamond, JetBrains Mono) | $0 |
| Formspree | Gratuito (50 envíos/mes) | Backend del formulario de contacto. Endpoint: `xvzvqvak`. Requiere registro en formspree.io. | $0 |

## Herramientas de desarrollo
| Herramienta | Para qué se usa |
|-------------|-----------------|
| Live Server (VS Code ext.) | Servidor local para desarrollo |
| Python + pandas | Conversión Excel → JSON (tarea única, no es dependencia permanente) |

## Skills de Claude Code instalados
| Skill | Origen | Para qué se usa |
|-------|--------|-----------------|
| auto-context | Template propio | Mantener docs actualizados |

## Pendiente / Futuro
- Firebase Firestore (tier gratuito) — solo si se necesita persistir resultados de cálculo
