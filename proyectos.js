// ============================================================
// modules/proyectos.js — Gestión de proyectos y presupuestos
//
// Qué hace:
//   - CRUD de proyectos (obras por cliente)
//   - Vista detalle: ambientes del proyecto + artículos en cada ambiente
//   - Selector de artículos del catálogo (buscador lazy)
//   - Emisión de presupuesto: snapshot frozen en colección `presupuestos`
//   - Rotación anual: colección proyectos_2026, proyectos_2027...
//
// Flujo de precios:
//   - Al agregar ítem → snapshot del precio actual del catálogo
//   - Al emitir presupuesto → segundo snapshot completo en `presupuestos`
//   - En Archivos (futuro) → comparar snapshot vs precio actual → ▲▼ %
//
// Colecciones Firestore:
//   proyectos_YYYY/{id}                  → datos del proyecto
//   proyectos_YYYY/{id}/ambientes/{id}   → ambientes con items[]
//   presupuestos/{id}                    → snapshots emitidos (frozen)
//   clientes                             → para resolver nombres
//   articulos                            → catálogo (carga lazy)
// ============================================================

(function () {

const AÑO_ACTIVO = new Date().getFullYear();

// === SECCIÓN: Registro del módulo ===
window.AppModules = window.AppModules || {};
window.AppModules.proyectos = {
  init(container) {
    this._state = {
      allProyectos:      [],
      clientes:          {},
      año:               AÑO_ACTIVO,
      view:              'lista',   // 'lista' | 'detalle'
      proyectoActivo:    null,
      ambientes:         [],
      allArticulos:      [],        // catálogo cargado lazy para el buscador
      articulosCargados: false,
      formOpen:          false,
      editingId:         null,
      filtroEstado:      '',
      buscadorOpen:      false,
      buscadorAmbId:     null,      // ambiente destino del buscador
      itemSeleccionado:  null,      // artículo elegido, esperando cant/margen
    };
    renderListaView(container, this._state);
    attachListaListeners(container, this._state);
    loadData(container, this._state);
  }
};

// ============================================================
// === SECCIÓN: Layout de la vista lista ===
// ============================================================
function renderListaView(container, state) {
  container.innerHTML = `
    <div class="proy-toolbar">
      <div class="proy-filters">
        <input type="text" id="proy-search" class="search-input"
          placeholder="Buscar por obra o cliente…" autocomplete="off">
        <select class="cat-filter-select" id="proy-filter-estado">
          <option value="">Todos los estados</option>
          <option value="cotizado">Cotizado</option>
          <option value="vendido">Vendido</option>
          <option value="entregado">Entregado</option>
        </select>
      </div>
      <button class="btn-new-item" id="btn-new-proyecto" type="button">+ Nuevo proyecto</button>
    </div>
    <div id="proy-form-wrap" hidden></div>
    <div id="proy-results"></div>
  `;
}

// ============================================================
// === SECCIÓN: Listeners de la vista lista ===
// ============================================================
function attachListaListeners(container, state) {
  container.querySelector('#proy-search').addEventListener('input', () => {
    renderProyectos(container, state);
  });

  container.querySelector('#proy-filter-estado').addEventListener('change', e => {
    state.filtroEstado = e.target.value;
    renderProyectos(container, state);
  });

  container.querySelector('#btn-new-proyecto').addEventListener('click', () => {
    openForm(container, state, null);
  });

  // Delegación sobre las cards de proyectos
  container.querySelector('#proy-results').addEventListener('click', e => {
    const openBtn = e.target.closest('.btn-open-proy');
    if (openBtn) {
      const proyId = openBtn.closest('[data-proy-id]')?.dataset.proyId;
      const proy   = state.allProyectos.find(p => p.id === proyId);
      if (proy) openDetalle(container, state, proy);
      return;
    }

    const editBtn = e.target.closest('.btn-edit-proy');
    if (editBtn) {
      const proyId = editBtn.closest('[data-proy-id]')?.dataset.proyId;
      const proy   = state.allProyectos.find(p => p.id === proyId);
      if (proy) openForm(container, state, proy);
      return;
    }

    const delBtn = e.target.closest('.btn-delete-proy');
    if (delBtn) {
      const card = delBtn.closest('.proy-card');
      if (card) showProyDeleteConfirm(card);
      return;
    }

    const confirmBtn = e.target.closest('.btn-proy-delete-confirm');
    if (confirmBtn) {
      const card   = confirmBtn.closest('[data-proy-id]');
      const proyId = card?.dataset.proyId;
      const proy   = state.allProyectos.find(p => p.id === proyId);
      deleteProyecto(proyId, proy?.nombre_obra || '?', container, state);
      return;
    }

    const cancelBtn = e.target.closest('.btn-proy-delete-cancel');
    if (cancelBtn) {
      const card = cancelBtn.closest('.proy-card');
      if (card) hideProyDeleteConfirm(card);
      return;
    }
  });
}

// ============================================================
// === SECCIÓN: Carga de datos ===
// Qué hace: carga proyectos del año activo + mapa de clientes en paralelo.
// Por qué orderBy creado_en: mostrar los más recientes primero.
// ============================================================
async function loadData(container, state) {
  const results = container.querySelector('#proy-results');
  results.innerHTML = '<p class="loading-msg">Cargando proyectos…</p>';

  try {
    const db  = firebase.firestore();
    const col = `proyectos_${state.año}`;

    const [proySnap, clientesSnap] = await Promise.all([
      db.collection(col).orderBy('creado_en', 'desc').get(),
      db.collection('clientes').get()
    ]);

    state.clientes = {};
    clientesSnap.docs.forEach(d => {
      state.clientes[d.id] = d.data().nombre || d.data().empresa || d.id;
    });

    state.allProyectos = proySnap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProyectos(container, state);
  } catch (err) {
    console.error('Error cargando proyectos:', err);
    results.innerHTML = '<p class="error-msg">Error al cargar los proyectos. Revisá la conexión.</p>';
  }
}

// ============================================================
// === SECCIÓN: Render de la lista de proyectos ===
// ============================================================
function renderProyectos(container, state) {
  const search  = container.querySelector('#proy-search').value.trim().toLowerCase();
  const results = container.querySelector('#proy-results');

  const filtered = state.allProyectos.filter(p => {
    if (state.filtroEstado && p.estado !== state.filtroEstado) return false;
    if (search) {
      const hay = [p.nombre_obra, state.clientes[p.cliente_id], p.direccion_obra]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    results.innerHTML = `<p class="empty-msg">${
      state.allProyectos.length === 0
        ? 'No hay proyectos. Creá el primero con "+ Nuevo proyecto".'
        : 'Sin resultados para los filtros aplicados.'
    }</p>`;
    return;
  }

  results.innerHTML = `
    <div class="proy-grid">
      ${filtered.map(p => renderProyCard(p, state)).join('')}
    </div>
  `;
}

function renderProyCard(proy, state) {
  const clienteNombre = escapeHtml(state.clientes[proy.cliente_id] || '—');
  const fecha = proy.fecha_inicio
    ? new Date(proy.fecha_inicio + 'T12:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    : '—';
  const nombreObra = escapeHtml(proy.nombre_obra || '—');

  return `
    <div class="proy-card" data-proy-id="${escapeHtml(proy.id)}">
      <div class="proy-card-header">
        <div class="proy-card-title-wrap">
          <span class="proy-card-obra">${nombreObra}</span>
          ${renderEstadoBadge(proy.estado)}
        </div>
        <div class="proy-card-actions">
          <button class="btn-icon btn-edit-proy" title="Editar proyecto" type="button">✎</button>
          <button class="btn-icon btn-icon--danger btn-delete-proy" title="Eliminar proyecto" type="button">✕</button>
        </div>
      </div>
      <div class="proy-card-meta">
        <span>👤 ${clienteNombre}</span>
        ${proy.direccion_obra ? `<span>📍 ${escapeHtml(proy.direccion_obra)}</span>` : ''}
        <span>📅 ${fecha}</span>
      </div>
      <button class="btn-open-proy" type="button">Ver proyecto →</button>
      <div class="proy-card-confirm" hidden>
        <span class="proy-card-confirm-text">¿Eliminar <strong>${nombreObra}</strong>?</span>
        <div class="proy-card-confirm-actions">
          <button class="btn-danger-sm btn-proy-delete-confirm" type="button">Sí, eliminar</button>
          <button class="btn-ghost-sm  btn-proy-delete-cancel"  type="button">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

function renderEstadoBadge(estado) {
  const map = {
    cotizado:  { label: 'Cotizado',  cls: 'proy-badge--cotizado'  },
    vendido:   { label: 'Vendido',   cls: 'proy-badge--vendido'   },
    entregado: { label: 'Entregado', cls: 'proy-badge--entregado' },
  };
  const { label, cls } = map[estado] || { label: estado || 'Sin estado', cls: '' };
  return `<span class="proy-estado-badge ${cls}">${label}</span>`;
}

// ============================================================
// === SECCIÓN: Formulario de proyecto (alta / edición) ===
// Patrón igual que catalogos.js: HTML se regenera en cada apertura.
// ============================================================
function openForm(container, state, proy) {
  state.formOpen  = true;
  state.editingId = proy?.id || null;
  const wrap = container.querySelector('#proy-form-wrap');
  wrap.innerHTML = renderFormHtml(state, proy);
  wrap.hidden    = false;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  attachFormListeners(container, state);
}

function closeForm(container, state) {
  state.formOpen  = false;
  state.editingId = null;
  const wrap = container.querySelector('#proy-form-wrap');
  wrap.innerHTML = '';
  wrap.hidden    = true;
}

function renderFormHtml(state, proy) {
  const editing = !!proy;
  const v = f => proy?.[f] ? escapeHtml(String(proy[f])) : '';

  const clienteOptions = Object.entries(state.clientes)
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .map(([id, nombre]) =>
      `<option value="${escapeHtml(id)}" ${proy?.cliente_id === id ? 'selected' : ''}>
         ${escapeHtml(nombre)}
       </option>`
    ).join('');

  return `
    <div class="art-form-panel">
      <div class="art-form-header">
        <span class="art-form-title">${editing ? 'Editar proyecto' : 'Nuevo proyecto'}</span>
        <button class="btn-icon" id="btn-close-proy-form" type="button" title="Cerrar">✕</button>
      </div>
      <div id="art-form">

        <div class="art-form-row">
          <div class="art-form-field art-form-field--wide">
            <label class="art-form-label">Nombre de la obra <span class="art-form-required">*</span></label>
            <input type="text" class="art-form-input" id="pf-nombre-obra"
              placeholder="Ej: Casa Mendoza — Cocina + Living" value="${v('nombre_obra')}" required>
          </div>
          <div class="art-form-field">
            <label class="art-form-label">Estado</label>
            <select class="art-form-select" id="pf-estado">
              <option value="cotizado"  ${(proy?.estado || 'cotizado') === 'cotizado'  ? 'selected' : ''}>Cotizado</option>
              <option value="vendido"   ${proy?.estado === 'vendido'   ? 'selected' : ''}>Vendido</option>
              <option value="entregado" ${proy?.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
            </select>
          </div>
        </div>

        <div class="art-form-row">
          <div class="art-form-field art-form-field--wide">
            <label class="art-form-label">Cliente <span class="art-form-required">*</span></label>
            <select class="art-form-select" id="pf-cliente-id">
              <option value="">— Seleccioná un cliente —</option>
              ${clienteOptions}
            </select>
          </div>
          <div class="art-form-field">
            <label class="art-form-label">Fecha de inicio</label>
            <input type="date" class="art-form-input" id="pf-fecha-inicio" value="${v('fecha_inicio')}">
          </div>
        </div>

        <div class="art-form-row">
          <div class="art-form-field art-form-field--wide">
            <label class="art-form-label">Dirección de la obra</label>
            <input type="text" class="art-form-input" id="pf-direccion-obra"
              placeholder="Ej: Av. Libertador 1234, CABA" value="${v('direccion_obra')}">
          </div>
        </div>

        <div class="art-form-actions">
          <button type="button" class="btn-primary" id="btn-save-proyecto">
            ${editing ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
          ${editing
            ? `<button type="button" class="btn-danger-sm" id="btn-delete-proy-form" style="padding:0 16px;height:38px">
                 Eliminar proyecto
               </button>`
            : ''}
          <button type="button" class="btn-ghost" id="btn-cancel-proy-form">Cancelar</button>
        </div>

      </div>
    </div>
  `;
}

function attachFormListeners(container, state) {
  const wrap = container.querySelector('#proy-form-wrap');
  wrap.querySelector('#btn-close-proy-form').addEventListener('click',  () => closeForm(container, state));
  wrap.querySelector('#btn-cancel-proy-form').addEventListener('click', () => closeForm(container, state));
  wrap.querySelector('#btn-save-proyecto').addEventListener('click',    () => saveProyecto(container, state));

  const delBtn = wrap.querySelector('#btn-delete-proy-form');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      const nombre = state.allProyectos.find(p => p.id === state.editingId)?.nombre_obra || '?';
      if (confirm(`¿Eliminar "${nombre}"?\nSe perderán los ambientes asociados.`)) {
        if (confirm(`Última confirmación: eliminar "${nombre}".`)) {
          deleteProyecto(state.editingId, nombre, container, state);
        }
      }
    });
  }
}

async function saveProyecto(container, state) {
  const wrap        = container.querySelector('#proy-form-wrap');
  const nombreObra  = wrap.querySelector('#pf-nombre-obra').value.trim();
  const clienteId   = wrap.querySelector('#pf-cliente-id').value;
  const estado      = wrap.querySelector('#pf-estado').value;
  const fechaInicio = wrap.querySelector('#pf-fecha-inicio').value;
  const direccion   = wrap.querySelector('#pf-direccion-obra').value.trim();

  if (!nombreObra) { alert('El nombre de la obra es obligatorio.'); return; }
  if (!clienteId)  { alert('Seleccioná un cliente.');               return; }

  const btn = wrap.querySelector('#btn-save-proyecto');
  btn.disabled    = true;
  btn.textContent = 'Guardando…';

  try {
    const db  = firebase.firestore();
    const col = `proyectos_${state.año}`;
    const FV  = firebase.firestore.FieldValue;

    const data = {
      nombre_obra:    nombreObra,
      cliente_id:     clienteId,
      estado,
      fecha_inicio:   fechaInicio || null,
      direccion_obra: direccion   || null,
      modificado_en:  FV.serverTimestamp(),
    };

    if (state.editingId) {
      await db.collection(col).doc(state.editingId).set(data, { merge: true });
    } else {
      data.creado_en = FV.serverTimestamp();
      await db.collection(col).add(data);
    }

    closeForm(container, state);
    await loadData(container, state);
  } catch (err) {
    console.error('Error guardando proyecto:', err);
    alert('Error al guardar el proyecto.');
    btn.disabled    = false;
    btn.textContent = state.editingId ? 'Guardar cambios' : 'Crear proyecto';
  }
}

async function deleteProyecto(id, nombre, container, state) {
  try {
    const db  = firebase.firestore();
    // Nota: Firestore no elimina subcolecciones automáticamente desde el browser.
    // Los ambientes quedan huérfanos. Limpieza completa vía Cloud Functions (Bloque 2+).
    await db.collection(`proyectos_${state.año}`).doc(id).delete();
    closeForm(container, state);
    await loadData(container, state);
  } catch (err) {
    console.error('Error eliminando proyecto:', err);
    alert('Error al eliminar el proyecto.');
  }
}

function showProyDeleteConfirm(card) {
  card.classList.add('proy-card--confirming');
  card.querySelector('.proy-card-confirm').hidden = false;
}
function hideProyDeleteConfirm(card) {
  card.classList.remove('proy-card--confirming');
  card.querySelector('.proy-card-confirm').hidden = true;
}

// ============================================================
// === SECCIÓN: Vista detalle del proyecto ===
// Qué hace: reemplaza el contenido del container con la vista
//   de ambientes. El botón "← Volver" reconstruye la lista.
// ============================================================
async function openDetalle(container, state, proy) {
  state.view           = 'detalle';
  state.proyectoActivo = proy;
  state.formOpen       = false;
  state.editingId      = null;

  container.innerHTML = renderDetalleLayout(proy, state);
  attachDetalleListeners(container, state);
  await loadAmbientes(container, state);
}

function renderDetalleLayout(proy, state) {
  const clienteNombre = escapeHtml(state.clientes[proy.cliente_id] || '—');
  const fecha = proy.fecha_inicio
    ? new Date(proy.fecha_inicio + 'T12:00:00').toLocaleDateString('es-AR', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
    : '—';

  return `
    <!-- ACOTACIÓN PARA R.P.: header del proyecto — fondo neutro, badge de estado con color -->
    <div class="proy-detalle-header">
      <button class="btn-volver" id="btn-volver-lista" type="button">← Volver</button>
      <div class="proy-detalle-info">
        <div class="proy-detalle-title-row">
          <h1 class="proy-detalle-nombre">${escapeHtml(proy.nombre_obra || '—')}</h1>
          <select class="proy-estado-select" id="proy-estado-inline" title="Cambiar estado del proyecto">
            <option value="cotizado"  ${proy.estado === 'cotizado'  ? 'selected' : ''}>Cotizado</option>
            <option value="vendido"   ${proy.estado === 'vendido'   ? 'selected' : ''}>Vendido</option>
            <option value="entregado" ${proy.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
          </select>
        </div>
        <div class="proy-detalle-meta">
          <span>👤 ${clienteNombre}</span>
          ${proy.direccion_obra ? `<span>📍 ${escapeHtml(proy.direccion_obra)}</span>` : ''}
          <span>📅 ${fecha}</span>
        </div>
      </div>
    </div>

    <!-- Ambientes del proyecto -->
    <div id="proy-ambientes-wrap">
      <p class="loading-msg">Cargando ambientes…</p>
    </div>

    <!-- Total del proyecto (se muestra cuando hay ítems) -->
    <div class="proy-total-bar" id="proy-total-bar" hidden>
      <span class="proy-total-label">Total del proyecto:</span>
      <span class="proy-total-valor" id="proy-total-valor">—</span>
    </div>

    <!-- Pie: botones de acción globales -->
    <div class="proy-detalle-footer">
      <button class="btn-new-item" id="btn-new-ambiente" type="button">+ Nuevo ambiente</button>
      <div class="proy-footer-right">
        <button class="btn-ghost" id="btn-exportar-pdf" type="button">⬇ Exportar PDF</button>
        <button class="btn-primary"  id="btn-emitir-presupuesto" type="button">Emitir presupuesto</button>
      </div>
    </div>
  `;
}

function attachDetalleListeners(container, state) {
  container.querySelector('#btn-volver-lista').addEventListener('click', () => {
    state.view           = 'lista';
    state.proyectoActivo = null;
    state.ambientes      = [];
    renderListaView(container, state);
    attachListaListeners(container, state);
    loadData(container, state);
  });

  container.querySelector('#proy-estado-inline').addEventListener('change', async e => {
    try {
      const db  = firebase.firestore();
      const col = `proyectos_${state.año}`;
      await db.collection(col).doc(state.proyectoActivo.id).update({
        estado:        e.target.value,
        modificado_en: firebase.firestore.FieldValue.serverTimestamp()
      });
      state.proyectoActivo.estado = e.target.value;
      const idx = state.allProyectos.findIndex(p => p.id === state.proyectoActivo.id);
      if (idx !== -1) state.allProyectos[idx].estado = e.target.value;
    } catch (err) {
      console.error('Error actualizando estado:', err);
      alert('Error al cambiar el estado.');
    }
  });

  container.querySelector('#btn-new-ambiente').addEventListener('click', () => {
    openAmbienteForm(container, state);
  });

  container.querySelector('#btn-emitir-presupuesto').addEventListener('click', () => {
    emitirPresupuesto(container, state);
  });

  container.querySelector('#btn-exportar-pdf').addEventListener('click', () => {
    generarPDFTabulado(container, state);
  });
}

// ============================================================
// === SECCIÓN: Carga y render de ambientes ===
// ============================================================
async function loadAmbientes(container, state) {
  const wrap = container.querySelector('#proy-ambientes-wrap');
  try {
    const db  = firebase.firestore();
    const col = `proyectos_${state.año}`;
    const snap = await db
      .collection(col)
      .doc(state.proyectoActivo.id)
      .collection('ambientes')
      .orderBy('creado_en', 'asc')
      .get();

    state.ambientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAmbientes(container, state);
  } catch (err) {
    console.error('Error cargando ambientes:', err);
    wrap.innerHTML = '<p class="error-msg">Error al cargar los ambientes.</p>';
  }
}

function renderAmbientes(container, state) {
  const wrap = container.querySelector('#proy-ambientes-wrap');

  if (state.ambientes.length === 0) {
    wrap.innerHTML = '<p class="empty-msg" style="padding:24px 0">Sin ambientes. Usá "+ Nuevo ambiente" para empezar.</p>';
    updateTotalBar(container, state);
    return;
  }

  wrap.innerHTML = state.ambientes.map(amb => renderAmbienteHtml(amb, state)).join('');
  updateTotalBar(container, state);
  attachAmbientesListeners(container, state);
}

function renderAmbienteHtml(amb, state) {
  const items    = amb.items || [];
  const subtotal = calcSubtotalAmbiente(items);

  return `
    <div class="proy-ambiente" data-amb-id="${escapeHtml(amb.id)}">
      <div class="proy-ambiente-header">
        <span class="proy-ambiente-nombre">${escapeHtml(amb.nombre || '—')}</span>
        <div class="proy-ambiente-header-right">
          ${subtotal > 0 ? `<span class="proy-ambiente-subtotal">${formatPrecio(subtotal)}</span>` : ''}
          <button class="btn-icon btn-icon--danger btn-delete-ambiente" title="Eliminar ambiente" type="button">✕</button>
        </div>
      </div>

      ${items.length > 0 ? `
        <div class="proy-items-wrap">
          <table class="proy-items-table">
            <thead>
              <tr>
                <th class="proy-col-nombre">Artículo</th>
                <th class="proy-col-precio">Precio unit.</th>
                <th class="proy-col-cant">Cant.</th>
                <th class="proy-col-margen">Margen %</th>
                <th class="proy-col-total">Subtotal</th>
                <th class="proy-col-acc"></th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => renderItemRow(item, idx)).join('')}
            </tbody>
          </table>
        </div>
      ` : `<p class="proy-items-empty">Sin artículos — usá "+ Agregar artículo".</p>`}

      <!-- Buscador inline: oculto por defecto, se rellena al abrir -->
      <div class="proy-buscador-wrap" id="buscador-${escapeHtml(amb.id)}" hidden></div>

      <div class="proy-ambiente-footer">
        <button class="btn-ghost-sm btn-add-item" data-amb-id="${escapeHtml(amb.id)}" type="button">
          + Agregar artículo
        </button>
      </div>
    </div>
  `;
}

function renderItemRow(item, idx) {
  const nombre      = escapeHtml(item.nombre || item.sku || '—');
  const precioUnit  = formatPrecio(item.precio_base, item.moneda);
  const margen      = item.margen   ?? 0;
  const cantidad    = item.cantidad ?? 1;
  const precioFinal = calcPrecioFinal(item.precio_base, margen, cantidad);

  return `
    <tr data-item-idx="${idx}">
      <td class="proy-col-nombre">
        ${nombre}
        ${item.sku ? `<span class="proy-item-sku">${escapeHtml(item.sku)}</span>` : ''}
        ${item.precio_publico ? '<span class="art-badge art-badge--pvp">PVP</span>' : ''}
      </td>
      <td class="proy-col-precio">${precioUnit}</td>
      <td class="proy-col-cant">
        <input type="number" class="proy-item-input" value="${cantidad}"
          min="1" data-field="cantidad" data-idx="${idx}" aria-label="Cantidad">
      </td>
      <td class="proy-col-margen">
        <input type="number" class="proy-item-input" value="${margen}"
          min="0" max="500" step="0.5" data-field="margen" data-idx="${idx}"
          aria-label="Margen" ${item.precio_publico ? 'disabled title="Artículo PVP: margen fijo en 0"' : ''}>
      </td>
      <td class="proy-col-total">${formatPrecio(precioFinal)}</td>
      <td class="proy-col-acc">
        <button class="btn-icon btn-icon--danger btn-remove-item"
          data-idx="${idx}" title="Quitar artículo" type="button">✕</button>
      </td>
    </tr>
  `;
}

// ============================================================
// === SECCIÓN: Listeners sobre ambientes e ítems ===
// ============================================================
function attachAmbientesListeners(container, state) {
  const wrap = container.querySelector('#proy-ambientes-wrap');

  wrap.addEventListener('click', async e => {
    // Eliminar ambiente
    const delAmbBtn = e.target.closest('.btn-delete-ambiente');
    if (delAmbBtn) {
      const ambId = delAmbBtn.closest('[data-amb-id]')?.dataset.ambId;
      const amb   = state.ambientes.find(a => a.id === ambId);
      if (!amb) return;
      if (confirm(`¿Eliminar el ambiente "${amb.nombre}"? Se perderán todos sus artículos.`)) {
        await deleteAmbiente(ambId, container, state);
      }
      return;
    }

    // Abrir buscador de artículos
    const addItemBtn = e.target.closest('.btn-add-item');
    if (addItemBtn) {
      openBuscador(container, state, addItemBtn.dataset.ambId);
      return;
    }

    // Quitar ítem de la tabla
    const removeItemBtn = e.target.closest('.btn-remove-item');
    if (removeItemBtn) {
      const ambId = removeItemBtn.closest('[data-amb-id]')?.dataset.ambId;
      const idx   = parseInt(removeItemBtn.dataset.idx, 10);
      await removeItemFromAmbiente(ambId, idx, container, state);
      return;
    }
  });

  // Edición inline de cantidad y margen (event: change para no disparar en cada tecla)
  wrap.addEventListener('change', async e => {
    const input = e.target.closest('.proy-item-input');
    if (!input) return;
    const ambId = input.closest('[data-amb-id]')?.dataset.ambId;
    const idx   = parseInt(input.dataset.idx, 10);
    const field = input.dataset.field;
    const value = parseFloat(input.value) || 0;
    await updateItemField(ambId, idx, field, value, container, state);
  });
}

// ============================================================
// === SECCIÓN: CRUD de ambientes ===
// ============================================================
function openAmbienteForm(container, state) {
  if (container.querySelector('#form-nuevo-ambiente')) return; // ya abierto

  const footer = container.querySelector('.proy-detalle-footer');
  const div    = document.createElement('div');
  div.id        = 'form-nuevo-ambiente';
  div.className = 'proy-ambiente-form-inline';
  div.innerHTML = `
    <input type="text" class="art-form-input" id="inp-ambiente-nombre"
      placeholder="Nombre del ambiente (ej: Cocina, Living, Dormitorio)" autocomplete="off">
    <button class="btn-primary" id="btn-save-ambiente"   type="button">Agregar</button>
    <button class="btn-ghost"   id="btn-cancel-ambiente" type="button">Cancelar</button>
  `;
  footer.before(div);
  div.querySelector('#inp-ambiente-nombre').focus();

  div.querySelector('#btn-cancel-ambiente').addEventListener('click', () => div.remove());
  div.querySelector('#btn-save-ambiente').addEventListener('click',   () => saveAmbiente(div, container, state));
  div.querySelector('#inp-ambiente-nombre').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveAmbiente(div, container, state);
  });
}

async function saveAmbiente(formDiv, container, state) {
  const nombre = formDiv.querySelector('#inp-ambiente-nombre').value.trim();
  if (!nombre) { formDiv.querySelector('#inp-ambiente-nombre').focus(); return; }

  const btn = formDiv.querySelector('#btn-save-ambiente');
  btn.disabled    = true;
  btn.textContent = 'Guardando…';

  try {
    const db  = firebase.firestore();
    const col = `proyectos_${state.año}`;
    await db.collection(col)
      .doc(state.proyectoActivo.id)
      .collection('ambientes')
      .add({ nombre, items: [], creado_en: firebase.firestore.FieldValue.serverTimestamp() });
    formDiv.remove();
    await loadAmbientes(container, state);
  } catch (err) {
    console.error('Error guardando ambiente:', err);
    btn.disabled    = false;
    btn.textContent = 'Agregar';
    alert('Error al guardar el ambiente.');
  }
}

async function deleteAmbiente(ambId, container, state) {
  try {
    const db  = firebase.firestore();
    const col = `proyectos_${state.año}`;
    await db.collection(col)
      .doc(state.proyectoActivo.id)
      .collection('ambientes')
      .doc(ambId)
      .delete();
    await loadAmbientes(container, state);
  } catch (err) {
    console.error('Error eliminando ambiente:', err);
    alert('Error al eliminar el ambiente.');
  }
}

// ============================================================
// === SECCIÓN: Buscador de artículos del catálogo ===
// Qué hace: abre un panel inline debajo del ambiente seleccionado
//   con un buscador de texto que filtra el catálogo en memoria.
// Por qué lazy: evita cargar ~1000 artículos si el usuario nunca
//   abre el buscador. Una vez cargados quedan en state.allArticulos.
// ============================================================
async function openBuscador(container, state, ambId) {
  // Cerrar cualquier buscador abierto
  container.querySelectorAll('.proy-buscador-wrap').forEach(b => {
    b.hidden = true; b.innerHTML = '';
  });
  state.buscadorOpen     = false;
  state.itemSeleccionado = null;

  const buscadorDiv = container.querySelector(`#buscador-${ambId}`);
  if (!buscadorDiv) return;

  state.buscadorOpen  = true;
  state.buscadorAmbId = ambId;
  buscadorDiv.hidden  = false;
  buscadorDiv.innerHTML = '<p class="loading-msg" style="padding:12px">Cargando catálogo…</p>';

  // Carga lazy
  if (!state.articulosCargados) {
    try {
      const snap = await firebase.firestore().collection('articulos').limit(1000).get();
      state.allArticulos      = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.articulosCargados = true;
    } catch (err) {
      console.error('Error cargando artículos:', err);
      buscadorDiv.innerHTML = '<p class="error-msg" style="padding:12px">Error al cargar el catálogo.</p>';
      return;
    }
  }

  renderBuscador(buscadorDiv, state, '');
  attachBuscadorListeners(buscadorDiv, container, state);
}

function filtrarArticulos(allArticulos, query) {
  if (query.length < 2) return allArticulos.slice(0, 20);
  return allArticulos.filter(a => {
    const hay = [a.descripcion, a.nombre, a.sku_interno, a.sku, a.categoria_id]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(query.toLowerCase());
  }).slice(0, 30);
}

function renderBuscador(buscadorDiv, state, query) {
  if (state.itemSeleccionado) {
    buscadorDiv.innerHTML = `
      <div class="proy-buscador">
        ${renderItemForm(state.itemSeleccionado)}
      </div>
    `;
    return;
  }

  const items = filtrarArticulos(state.allArticulos, query);
  buscadorDiv.innerHTML = `
    <div class="proy-buscador">
      <div class="proy-buscador-header">
        <input type="text" class="art-form-input" id="buscador-input"
          placeholder="Buscar artículo por nombre, SKU o categoría…"
          value="${escapeHtml(query)}" autocomplete="off">
        <button class="btn-icon" id="btn-close-buscador" type="button" title="Cerrar buscador">✕</button>
      </div>
      <div class="proy-buscador-resultados">
        ${items.length === 0
          ? '<p class="empty-msg" style="padding:12px">Sin resultados.</p>'
          : items.map(a => `
              <div class="buscador-item" data-art-id="${escapeHtml(a.id)}">
                <div class="buscador-item-main">
                  <span class="buscador-item-nombre">${escapeHtml(a.descripcion || a.nombre || '—')}</span>
                  <span class="buscador-item-meta">
                    ${escapeHtml(a.sku_interno || a.sku || '')}
                    ${a.categoria_id ? `· ${escapeHtml(a.categoria_id)}` : ''}
                  </span>
                </div>
                <span class="buscador-item-precio">${formatPrecio(a.precio_base || a.precio_lista, a.moneda)}</span>
              </div>
            `).join('')
        }
      </div>
    </div>
  `;
}

function renderItemForm(art) {
  const nombre       = escapeHtml(art.descripcion || art.nombre || '—');
  const precio       = formatPrecio(art.precio_base || art.precio_lista, art.moneda);
  const margenDefault = art.precio_publico ? 0 : 30; // PVP → sin margen, resto → 30% default

  return `
    <div class="proy-item-form">
      <div class="proy-item-form-nombre">
        <strong>${nombre}</strong>
        <span class="buscador-item-precio">${precio} / unidad</span>
      </div>
      <div class="art-form-row">
        <div class="art-form-field">
          <label class="art-form-label">Cantidad</label>
          <input type="number" class="art-form-input art-form-input--num"
            id="item-cantidad" value="1" min="1">
        </div>
        <div class="art-form-field">
          <label class="art-form-label">
            Margen %
            ${art.precio_publico
              ? '<span class="proy-pvp-note">(PVP — sin margen)</span>'
              : ''}
          </label>
          <input type="number" class="art-form-input art-form-input--num"
            id="item-margen" value="${margenDefault}"
            min="0" max="500" step="0.5"
            ${art.precio_publico ? 'disabled' : ''}>
        </div>
        <div class="art-form-field art-form-row--align-end">
          <button class="btn-primary" id="btn-confirm-add-item" type="button">
            Agregar al ambiente
          </button>
          <button class="btn-ghost" id="btn-cancel-item-form" type="button">
            Volver
          </button>
        </div>
      </div>
    </div>
  `;
}

// Reasigna listeners al buscador después de cada re-render
function attachBuscadorListeners(buscadorDiv, container, state) {
  function reattach() {
    const closeBtn   = buscadorDiv.querySelector('#btn-close-buscador');
    const input      = buscadorDiv.querySelector('#buscador-input');
    const resultados = buscadorDiv.querySelector('.proy-buscador-resultados');
    const confirmBtn = buscadorDiv.querySelector('#btn-confirm-add-item');
    const cancelBtn  = buscadorDiv.querySelector('#btn-cancel-item-form');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        buscadorDiv.hidden     = true;
        buscadorDiv.innerHTML  = '';
        state.buscadorOpen     = false;
        state.itemSeleccionado = null;
      });
    }

    if (input) {
      input.focus();
      input.addEventListener('input', () => {
        renderBuscador(buscadorDiv, state, input.value);
        reattach();
      });
    }

    if (resultados) {
      resultados.addEventListener('click', e => {
        const item  = e.target.closest('.buscador-item');
        if (!item) return;
        const art   = state.allArticulos.find(a => a.id === item.dataset.artId);
        if (!art) return;
        state.itemSeleccionado = art;
        renderBuscador(buscadorDiv, state, '');
        reattach();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        const cantidad = parseInt(buscadorDiv.querySelector('#item-cantidad').value, 10) || 1;
        const margen   = parseFloat(buscadorDiv.querySelector('#item-margen').value)    || 0;
        await addItemToAmbiente(state.buscadorAmbId, state.itemSeleccionado, cantidad, margen, container, state);
        buscadorDiv.hidden     = true;
        buscadorDiv.innerHTML  = '';
        state.buscadorOpen     = false;
        state.itemSeleccionado = null;
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        state.itemSeleccionado = null;
        renderBuscador(buscadorDiv, state, '');
        reattach();
      });
    }
  }

  reattach();
}

// ============================================================
// === SECCIÓN: CRUD de ítems en ambiente ===
// ============================================================
async function addItemToAmbiente(ambId, art, cantidad, margen, container, state) {
  // Snapshot de precio al momento de agregar.
  // Si el catálogo cambia después, este proyecto no se ve afectado.
  const precioBase = art.precio_base || art.precio_lista || 0;
  const newItem = {
    articulo_id:    art.id,
    nombre:         art.descripcion    || art.nombre || '',
    sku:            art.sku_interno    || art.sku    || '',
    precio_base:    precioBase,               // snapshot
    moneda:         art.moneda        || 'ARS', // snapshot
    precio_publico: !!art.precio_publico,      // snapshot
    cantidad,
    margen:         art.precio_publico ? 0 : margen,
    precio_final:   calcPrecioFinal(precioBase, art.precio_publico ? 0 : margen, cantidad),
  };

  try {
    const db  = firebase.firestore();
    const col = `proyectos_${state.año}`;
    await db.collection(col)
      .doc(state.proyectoActivo.id)
      .collection('ambientes')
      .doc(ambId)
      .update({ items: firebase.firestore.FieldValue.arrayUnion(newItem) });
    await loadAmbientes(container, state);
  } catch (err) {
    console.error('Error agregando ítem:', err);
    alert('Error al agregar el artículo.');
  }
}

async function removeItemFromAmbiente(ambId, idx, container, state) {
  const amb   = state.ambientes.find(a => a.id === ambId);
  if (!amb) return;
  const items = [...(amb.items || [])];
  items.splice(idx, 1);
  await saveItemsArray(ambId, items, container, state);
}

async function updateItemField(ambId, idx, field, value, container, state) {
  const amb   = state.ambientes.find(a => a.id === ambId);
  if (!amb) return;
  const items = (amb.items || []).map(i => ({ ...i }));
  if (!items[idx]) return;
  items[idx][field]       = value;
  items[idx].precio_final = calcPrecioFinal(items[idx].precio_base, items[idx].margen, items[idx].cantidad);
  await saveItemsArray(ambId, items, container, state);
}

async function saveItemsArray(ambId, items, container, state) {
  try {
    const db  = firebase.firestore();
    const col = `proyectos_${state.año}`;
    await db.collection(col)
      .doc(state.proyectoActivo.id)
      .collection('ambientes')
      .doc(ambId)
      .update({ items });
    await loadAmbientes(container, state);
  } catch (err) {
    console.error('Error actualizando ítems:', err);
    alert('Error al actualizar los artículos.');
  }
}

// ============================================================
// === SECCIÓN: Total del proyecto ===
// ============================================================
function updateTotalBar(container, state) {
  const bar   = container.querySelector('#proy-total-bar');
  const valor = container.querySelector('#proy-total-valor');
  if (!bar || !valor) return;

  const total = state.ambientes.reduce((acc, amb) => acc + calcSubtotalAmbiente(amb.items || []), 0);

  if (total > 0) {
    bar.hidden        = false;
    valor.textContent = new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', maximumFractionDigits: 0
    }).format(total);
  } else {
    bar.hidden = true;
  }
}

// ============================================================
// === SECCIÓN: Emisión de presupuesto (snapshot frozen) ===
// Qué hace: crea un documento en la colección `presupuestos` con
//   todos los datos del proyecto y sus ambientes al momento de emitir.
// Por qué: al entregar el presupuesto al cliente, los precios no deben
//   cambiar aunque el catálogo se actualice posteriormente.
// Versionado: si ya existe un presupuesto emitido, crea version: N+1.
//   El módulo Archivos (futuro) mostrará todas las versiones y comparará
//   precios del snapshot vs. precios actuales del catálogo (▲▼ %).
// ============================================================
async function emitirPresupuesto(container, state) {
  if (state.ambientes.length === 0) {
    alert('El proyecto no tiene ambientes. Agregá al menos uno antes de emitir.');
    return;
  }
  const totalItems = state.ambientes.reduce((acc, a) => acc + (a.items?.length || 0), 0);
  if (totalItems === 0) {
    alert('Los ambientes están vacíos. Agregá artículos antes de emitir el presupuesto.');
    return;
  }
  if (!confirm('¿Emitir presupuesto? Se creará un snapshot frozen de los precios actuales.')) return;

  const btn = container.querySelector('#btn-emitir-presupuesto');
  btn.disabled    = true;
  btn.textContent = 'Emitiendo…';

  try {
    const db   = firebase.firestore();
    const proy = state.proyectoActivo;

    // Calcular número de versión
    const prevSnap = await db.collection('presupuestos')
      .where('proyecto_id', '==', proy.id)
      .where('año',         '==', state.año)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    const version = prevSnap.empty ? 1 : (prevSnap.docs[0].data().version || 0) + 1;

    // Construir el snapshot completo
    const ambientesSnapshot = state.ambientes.map(amb => ({
      ambiente_id: amb.id,
      nombre:      amb.nombre,
      items:       (amb.items || []).map(i => ({ ...i })), // copia profunda
      subtotal:    calcSubtotalAmbiente(amb.items || []),
    }));
    const total = ambientesSnapshot.reduce((acc, a) => acc + a.subtotal, 0);

    const FV = firebase.firestore.FieldValue;
    await db.collection('presupuestos').add({
      proyecto_id:        proy.id,
      año:                state.año,
      version,
      estado:             'emitido',
      nombre_obra:        proy.nombre_obra,
      cliente_id:         proy.cliente_id,
      cliente_nombre:     state.clientes[proy.cliente_id] || '—',
      direccion_obra:     proy.direccion_obra || null,
      fecha_emision:      FV.serverTimestamp(),
      ambientes_snapshot: ambientesSnapshot,
      total,
      template_version:   'v1',    // para re-renderizar PDFs históricos (CLAUDE.md)
      creado_en:          FV.serverTimestamp(),
      creado_por:         firebase.auth().currentUser?.uid || null,
    });

    // Pasar a "vendido" si estaba en "cotizado"
    if (proy.estado === 'cotizado') {
      await db.collection(`proyectos_${state.año}`).doc(proy.id).update({
        estado: 'vendido', modificado_en: FV.serverTimestamp()
      });
      state.proyectoActivo.estado = 'vendido';
      const sel = container.querySelector('#proy-estado-inline');
      if (sel) sel.value = 'vendido';
    }

    alert(`Presupuesto v${version} emitido. Lo encontrás en el módulo Archivos.`);
  } catch (err) {
    console.error('Error emitiendo presupuesto:', err);
    alert('Error al emitir el presupuesto. Revisá la consola.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Emitir presupuesto';
  }
}

// ============================================================
// === SECCIÓN: Generación de PDF — Salida 1: Presupuesto tabulado ===
//
// Qué hace: lee config/empresa y config/condiciones_presupuesto
//   de Firestore, construye el objeto de datos y lo delega al
//   template window.Templates.presupuesto() para obtener el HTML.
//   Luego lo renderiza en un iframe off-screen y lo pasa a html2pdf.js.
//
// Por qué iframe: el template devuelve un HTML completo con <style>
//   en el <head>. El iframe permite que esos estilos se apliquen
//   correctamente antes de que html2canvas capture el DOM (DEC-010).
//
// Por qué delegar al template: separa la responsabilidad de datos
//   (proyectos.js) del diseño visual (templates/template-presupuesto.js).
//   Cambiar el layout del PDF no requiere tocar este módulo.
// ============================================================
async function generarPDFTabulado(container, state) {
  if (state.ambientes.length === 0) {
    alert('El proyecto no tiene ambientes con artículos para exportar.');
    return;
  }
  const totalItems = state.ambientes.reduce((acc, a) => acc + (a.items?.length || 0), 0);
  if (totalItems === 0) {
    alert('Los ambientes están vacíos. Agregá artículos antes de exportar.');
    return;
  }

  if (typeof html2pdf === 'undefined') {
    alert('Error: la librería de PDF no está cargada. Verificá la conexión a internet.');
    return;
  }

  if (typeof window.Templates?.presupuesto !== 'function') {
    alert('Error: el template de presupuesto no está cargado. Recargá la página.');
    return;
  }

  const btnPdf = container.querySelector('#btn-exportar-pdf');
  btnPdf.disabled    = true;
  btnPdf.textContent = 'Generando PDF…';

  let iframe = null;

  try {
    const db   = firebase.firestore();
    const proy = state.proyectoActivo;

    // Leer datos de empresa y condiciones desde Firestore.
    // Se leen en el momento de generar para reflejar siempre la versión más reciente.
    const [empresaDoc, condDoc] = await Promise.all([
      db.collection('config').doc('empresa').get(),
      db.collection('config').doc('condiciones_presupuesto').get(),
    ]);

    const empresa     = empresaDoc.exists ? empresaDoc.data()                  : {};
    const condiciones = condDoc.exists    ? (condDoc.data().condiciones || []) : [];

    const fechaHoy = new Intl.DateTimeFormat('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date());

    // Construir el objeto de datos que recibe el template.
    // Los campos opcionales del cliente (cuit, tel, email) quedan vacíos
    // hasta que se integre la vista de cliente en el modelo (TODO: Bloque 3+).
    const datos = {
      empresa,
      condiciones,
      proyecto: {
        nombre_obra:    proy.nombre_obra    || '',
        cliente_nombre: state.clientes?.[proy.cliente_id] || proy.cliente_nombre || '—',
        cliente_cuit:   '',   // TODO: traer de la colección clientes cuando esté disponible
        cliente_tel:    '',
        cliente_email:  '',
        direccion_obra: proy.direccion_obra || '',
        fecha:          fechaHoy,
        version:        '',
      },
      ambientes: state.ambientes,
    };

    // Obtener el HTML completo del template
    const htmlCompleto = window.Templates.presupuesto(datos);

    // Renderizar en un iframe off-screen para que los estilos del <head>
    // del template se apliquen antes de que html2canvas capture el DOM.
    iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    await new Promise(resolve => {
      iframe.onload = resolve;
      iframe.contentDocument.open();
      iframe.contentDocument.write(htmlCompleto);
      iframe.contentDocument.close();
    });

    // Capturar el elemento raíz del presupuesto dentro del iframe
    const elemento = iframe.contentDocument.getElementById('presupuesto-render')
                  || iframe.contentDocument.body;

    const nombreArchivo = `Presupuesto_${(proy.nombre_obra || 'obra').replace(/\s+/g, '_')}_${fechaHoy.replace(/\//g, '-')}.pdf`;
    const opciones = {
      margin:      [0, 0, 0, 0],
      filename:    nombreArchivo,
      image:       { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    await html2pdf().set(opciones).from(elemento).save();

  } catch (err) {
    console.error('Error generando PDF:', err);
    alert('Error al generar el PDF. Revisá la consola.');
  } finally {
    if (iframe) document.body.removeChild(iframe);
    btnPdf.disabled    = false;
    btnPdf.textContent = '⬇ Exportar PDF';
  }
}

// ============================================================
// === SECCIÓN: Utilidades ===
// ============================================================
function calcPrecioFinal(precioBase, margen, cantidad) {
  const base = parseFloat(precioBase) || 0;
  const mg   = parseFloat(margen)     || 0;
  const qty  = parseFloat(cantidad)   || 1;
  return base * (1 + mg / 100) * qty;
}

function calcSubtotalAmbiente(items) {
  return items.reduce((acc, item) =>
    acc + calcPrecioFinal(item.precio_base, item.margen, item.cantidad), 0);
}

function formatPrecio(valor, moneda) {
  if (valor == null || valor === '') return '—';
  const locale = 'es-AR';
  const cur    = moneda === 'USD' ? 'USD' : 'ARS';
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency: cur, maximumFractionDigits: 0
  }).format(parseFloat(valor) || 0);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

})();
