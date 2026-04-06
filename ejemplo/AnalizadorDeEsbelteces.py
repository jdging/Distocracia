import streamlit as st
import pandas as pd
import math
from typing import Tuple, Dict, List, Optional, Any

# =============================================================================
# CONFIGURACIÓN Y ESTILOS
# =============================================================================
st.set_page_config(page_title="Verificador de Esbelteces V2.0", layout="wide", page_icon="🏗️")

LOGO_FILE = "Logo.png"
COLOR_MARCA = "#2b3263"
ALIAS_TRANSFERENCIA = "jdg.ing"

st.markdown(f"""
<style>
    .subtitle-text {{
        color: {COLOR_MARCA} !important;
        font-weight: bold;
        font-size: 1.2em;
        margin-top: -10px;
    }}
    .logo-img {{
        width: 100%;
        max-width: 250px;
        margin-bottom: 20px;
    }}
    button[title="View fullscreen"] {{visibility: hidden;}}
    .alias-button {{
        background-color: {COLOR_MARCA};
        color: white;
        padding: 8px 15px;
        border-radius: 5px;
        font-weight: bold;
        font-size: 0.9em;
        display: block;
        text-align: center;
        box-shadow: 0px 2px 5px rgba(0,0,0,0.2);
        cursor: default;
        margin-top: 15px;
    }}
    .alias-text {{
        font-weight: normal;
        margin-top: 5px;
        display: block;
    }}
    /* Mejoras visuales en las alertas */
    .stAlert {{ margin-top: 10px; }}
</style>
""", unsafe_allow_html=True)

# =============================================================================
# SIDEBAR
# =============================================================================

with st.sidebar:
    # Esta función maneja la carga y el estilo de forma nativa en Streamlit.
    try:
        st.image(LOGO_FILE)
    except FileNotFoundError:
        st.warning(f"¡Atención! No se encontró el archivo '{LOGO_FILE}'.")

    st.markdown(
        f"""
        <div style="text-align: center;">
            <p style="color: gray; font-style: italic; font-size: 0.9em; margin-top: 10px; margin-bottom: 15px;">
                Reglamento CIRSOC 301-18.<br>
                Todos los cálculos se hacen con k = 1
            </p>
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown(
        f"""
        <div class="alias-button">
            🤝 Invitación a Colaborar
            <span class="alias-text">Alias: <strong>{ALIAS_TRANSFERENCIA}</strong></span>
        </div>
        """,
        unsafe_allow_html=True
    )

st.title("Analizador de Esbelteces")
st.markdown(f"""
<div class="subtitle-text">Desarrollado por Ing. Juan David Guzmán (V2.0)</div>
<a href="https://jdging.github.io/Portafolio/" target="_blank" style="font-size: 0.9em; text-decoration: none; color: gray;">Ver Portafolio</a>
<hr style="margin-top: 5px; margin-bottom: 20px;">
""", unsafe_allow_html=True)

# =============================================================================
# CARGA DE DATOS
# =============================================================================
FILE_NAME = "AnalizadorDeEsbelteces_Data.xlsx"

@st.cache_data
def cargar_base_datos() -> Dict[str, pd.DataFrame] | None | str:
    """Carga la base de datos de perfiles con manejo de errores."""
    try:
        # sheet_name=None carga todas las hojas en un diccionario
        xls_dict = pd.read_excel(FILE_NAME, sheet_name=None)
        return xls_dict
    except FileNotFoundError:
        return None
    except Exception as e:
        return str(e)

DB = cargar_base_datos()

if DB is None:
    st.error(f"❌ No se encontró el archivo **{FILE_NAME}** en la carpeta Python.")
    st.stop()
elif isinstance(DB, str):
    st.error(f"❌ Error al leer el Excel: {DB}")
    st.stop()

# =============================================================================
# UTILIDADES DE FORMATO Y CÁLCULO
# =============================================================================

def check_status(val: float, limite: int) -> Tuple[int, str]:
    """Verifica si el valor cumple con el límite reglamentario."""
    val_int = math.ceil(val)
    if val_int <= limite:
        return val_int, "OK"
    return val_int, "NO"

def fmt_full(simbolo: str, tex_formula: str, num: float, den: float, res: float) -> str:
    """
    Formato LaTeX mejorado: Muestra el valor exacto y el redondeo.
    Ej: Lambda = L/r = 200/1.5 = 133.33 -> 134
    """
    # Protección contra visualización de NaN
    if den == 0: return f"${simbolo} = \\text{{Indefinido (div 0)}}$"
    
    return (f"${simbolo} = {tex_formula} = \\frac{{{num:.0f}}}{{{den:.2f}}} = "
            f"{res:.2f} \\rightarrow \\mathbf{{{math.ceil(res)}}}$")

def fmt_pythagoras(simbolo: str, tex_f1: str, tex_f2: str, v1: float, d1: float, v2: float, d2: float, res: float) -> str:
    """Formato LaTeX para composición cuadrática de esbelteces."""
    sust = f"\\sqrt{{\\left(\\frac{{{v1:.0f}}}{{{d1:.2f}}}\\right)^2 + \\left(\\frac{{{v2:.0f}}}{{{d2:.2f}}}\\right)^2}}"
    return (f"${simbolo} = \\sqrt{{ \\left({tex_f1}\\right)^2 + \\left({tex_f2}\\right)^2 }} = "
            f"{sust} = {res:.2f} \\rightarrow \\mathbf{{{math.ceil(res)}}}$")

def validar_inputs(L: float, r: float) -> bool:
    """Retorna True si los inputs son válidos para calcular (evita div por 0)."""
    return L > 0 and r > 0

# =============================================================================
# LÓGICA DE CÁLCULO
# =============================================================================

def calculo_W_UPN(perfil_data: pd.Series, Lx: float, Ly: float) -> Tuple:
    rx = perfil_data['Rx']
    ry = perfil_data['Ry']
    
    # Guarda de seguridad
    if not (validar_inputs(Lx, rx) and validar_inputs(Ly, ry)):
        return 0, 0, {}, {}, ["⚠️ Datos insuficientes: L o r es cero."], None
    
    lam_x = Lx / rx
    lam_y = Ly / ry
    
    res = {"$\lambda_x$": lam_x, "$\lambda_y$": lam_y}
    lam_final = max(lam_x, lam_y)
    
    formulas = [
        r"\textbf{Cálculo de Ejes Principales:}",
        fmt_full("\\lambda_x", "\\frac{L_x}{r_x}", Lx, rx, lam_x),
        fmt_full("\\lambda_y", "\\frac{L_y}{r_y}", Ly, ry, lam_y)
    ]
    return math.ceil(lam_final), math.ceil(lam_final), res, res, formulas, None

def calculo_L(perfil_data: pd.Series, L_tramo: float, has_rompetramo: bool) -> Tuple:
    rv = perfil_data['Rv'] 
    
    # Guarda de seguridad
    if not validar_inputs(L_tramo, rv):
         return 0, 0, {}, {}, ["⚠️ Datos insuficientes: L o r es cero."], None

    factor = 0.5 if has_rompetramo else 1.0
    L_eff_v = L_tramo * factor
    
    lam_v = L_eff_v / rv
    
    res = {"$\lambda_v$": lam_v}
    
    formulas_list = []
    txt_rompe = "c/Rompetramo" if has_rompetramo else "s/Rompetramo"
    factor_txt = "0.5 L" if has_rompetramo else "L"
    
    formulas_list.append(f"\\textbf{{Condición: }} {txt_rompe}")
    formulas_list.append(f"$\\text{{Longitud Efectiva }} L_{{eff}} = {factor_txt} = {L_eff_v:.0f}$")
    formulas_list.append(r"\textbf{Eje de menor inercia (V):}")
    formulas_list.append(fmt_full("\\lambda_v", "\\frac{L_{eff}}{r_v}", L_eff_v, rv, lam_v))
    
    return math.ceil(lam_v), math.ceil(lam_v), res, res, formulas_list, None

def calculo_2L_T(perfil_data: pd.Series, L_tramo: float, a: float, esp_mm: float, has_rompetramo: bool) -> Tuple:
    
    Ix = perfil_data['Ix']
    Ag = perfil_data['Ag']
    ex = perfil_data['ex']
    Rv = perfil_data['Rv'] # Radio de giro minimo individual
    esp_cm = esp_mm / 10.0 
    
    # Propiedades Compuestas
    Im = 2 * Ix
    rm = math.sqrt(Im / (2 * Ag)) if Ag > 0 else 0
    
    Ilib = 2 * (Ix + Ag * (ex + esp_cm/2)**2)
    rlib = math.sqrt(Ilib / (2 * Ag)) if Ag > 0 else 0
    
    # Guarda de seguridad
    if not (validar_inputs(L_tramo, rm) and validar_inputs(L_tramo, rlib) and Rv > 0):
        return 0, 0, {}, {}, ["⚠️ Datos insuficientes o geometría inválida."], None

    # Longitudes Efectivas
    if has_rompetramo:
        L_eff_m = L_tramo * 0.5
        L_eff_lib = L_tramo * 1.0
        condicion_txt = "c/Rompetramo"
    else:
        L_eff_m = L_tramo
        L_eff_lib = L_tramo
        condicion_txt = "s/Rompetramo"

    # Cálculos
    lam_m = L_eff_m / rm
    
    term1 = (L_eff_lib / rlib)**2
    term2 = (0.86 * a / Rv)**2
    lam_lib = math.sqrt(term1 + term2)
    
    formulas = [
        r"\textbf{Propiedades Compuestas:}",
        f"$r_m = {rm:.2f} \\text{{ cm}}, \\quad r_{{lib}} = {rlib:.2f} \\text{{ cm}}$",
        f"\\textbf{{Condición: }} {condicion_txt}",
        r"\textbf{Cálculo de Esbelteces:}"
    ]

    formulas.append(fmt_full("\\lambda_m", "\\frac{L_{eff,m}}{r_m}", L_eff_m, rm, lam_m))         
    formulas.append(fmt_pythagoras("\\lambda_{lib}", "\\frac{L_{eff,lib}}{r_{lib}}", "\\frac{0.86a}{R_v}", L_eff_lib, rlib, 0.86*a, Rv, lam_lib))

    if has_rompetramo:
        lam_final = lam_lib
        res = {"$\lambda_{lib}$": lam_lib}
        msg_final = r"\text{Determinante: } \lambda_{lib}"
    else:
        lam_final = lam_m
        res = {"$\lambda_m$": lam_m}
        msg_final = r"\text{Determinante: } \lambda_{m}"
    
    formulas.append(r"\textbf{Resultado Final:}")
    formulas.append(f"${msg_final} = {lam_final:.2f} \\rightarrow \\mathbf{{{math.ceil(lam_final)}}}$")
    
    # Verificación Constructiva
    check_limit = 0.75 * lam_final
    val_check = a / Rv
    is_ok_constructive = val_check <= check_limit
    
    constructive_data = {
        "val": val_check,
        "limit": check_limit,
        "rv": Rv,
        "ok": is_ok_constructive
    }

    formulas.append(r"\textbf{Verificación Constructiva (Presillas):}")
    formulas.append(f"$\\lambda_{{max}} = {math.ceil(lam_final)}$")
    formulas.append(f"$\\frac{{a}}{{r_v}} = \\frac{{{a}}}{{{Rv}}} = {val_check:.0f}$")
    formulas.append(f"$\\text{{Límite}} = 0.75 \\cdot {math.ceil(lam_final)} = {check_limit:.0f}$")

    return math.ceil(lam_final), math.ceil(lam_final), res, res, formulas, constructive_data

def calculo_2L_X(perfil_data: pd.Series, L_tramo: float, a: float, esp_mm: float, has_rompetramo: bool) -> Tuple:
    
    Ix_indiv = perfil_data['Ix']  
    Rv = perfil_data['rv'] 
    Iz = perfil_data['Iz']
    Ag = perfil_data['Ag']
    ex = perfil_data['ex']
    esp_cm = esp_mm / 10.0
    
    distancia_eje = ex + 0.5 * esp_cm
    I_ort = 2 * (Ix_indiv + Ag * (distancia_eje)**2)
    r_ort = math.sqrt(I_ort / (2 * Ag)) if Ag > 0 else 0
    
    Im = 2 * Iz
    rm = math.sqrt(Im / (2 * Ag)) if Ag > 0 else 0

    # Guarda de seguridad
    if not (validar_inputs(L_tramo, rm) and validar_inputs(L_tramo, r_ort) and Rv > 0):
        return 0, 0, {}, {}, ["⚠️ Datos insuficientes o geometría inválida."], None

    if has_rompetramo:
        L_eff_m = L_tramo * 0.5
        L_eff_ort = L_tramo * 1.0
        condicion_txt = "c/Rompetramo"
    else:
        L_eff_m = L_tramo
        L_eff_ort = L_tramo
        condicion_txt = "s/Rompetramo"
    
    terma = (L_eff_m / rm)**2
    termb = (0.86 * a / Rv)**2
    lam_m = math.sqrt(terma + termb)
    
    term1 = (L_eff_ort / r_ort)**2
    term2 = (0.86 * a / Rv)**2
    lam_ort = math.sqrt(term1 + term2)
    
    formulas = [
        r"\textbf{Propiedades Compuestas: }",
        f"$r_m = {rm:.2f} \\text{{ cm}}, \\quad r_{{ort}} = {r_ort:.2f} \\text{{ cm}}$",
        f"\\textbf{{Condición: }} {condicion_txt}",
        r"\textbf{Cálculo de Esbelteces: }"
    ]

    formulas.append(fmt_pythagoras("\\lambda_{m}", "\\frac{L_{eff,m}}{r_{m}}", "\\frac{0.86 a}{R_v}", L_eff_m, rm, 0.86*a, Rv, lam_m))                
    formulas.append(fmt_pythagoras("\\lambda_{ort}", "\\frac{L_{eff,ort}}{r_{ort}}", "\\frac{0.86 a}{R_v}", L_eff_ort, r_ort, 0.86*a, Rv, lam_ort))

    if has_rompetramo:
        lam_final = lam_ort
        res = {"$\lambda_{ort}$": lam_ort}
        msg_final = r"\text{Determinante: } \lambda_{ort}"
    else:
        lam_final = lam_m
        res = {"$\lambda_m$": lam_m}
        msg_final = r"\text{Determinante: } \lambda_{m}"
    
    formulas.append(r"\textbf{Resultado Final:}")
    formulas.append(f"${msg_final} = {lam_final:.2f} \\rightarrow \\mathbf{{{math.ceil(lam_final)}}}$")

    check_limit = 0.75 * lam_final
    val_check = a / Rv
    is_ok_constructive = val_check <= check_limit
    
    constructive_data = {
        "val": val_check,
        "limit": check_limit,
        "rv": Rv,
        "ok": is_ok_constructive
    }

    formulas.append(r"\textbf{Verificación Constructiva (Presillas):}")
    formulas.append(f"$\\lambda_{{max}} = {math.ceil(lam_final)}$")
    formulas.append(f"$\\frac{{a}}{{r_v}} = \\frac{{{a}}}{{{Rv}}} = {val_check:.0f}$")
    formulas.append(f"$\\text{{Límite}} = 0.75 \\cdot {math.ceil(lam_final)} = {check_limit:.0f}$")

    return math.ceil(lam_final), math.ceil(lam_final), res, res, formulas, constructive_data
    
# =============================================================================
# FUNCIONES AUXILIARES UI
# =============================================================================

def ui_seleccion_presillas(df_perfiles: pd.DataFrame, row: pd.Series, profile_changed: bool, key_suffix: str) -> float:
    """Maneja la lógica de UI para seleccionar el espesor de presillas."""
    raw_opts = sorted(df_perfiles['t'].unique())
    # Convertimos a float y redondeamos para evitar problemas de coma flotante
    t_opts = [round(float(x), 2) for x in raw_opts]
    
    try:
        default_t = round(float(row['t']), 2)
    except:
        default_t = 0.0

    key_box = f"box_t_{key_suffix}"
    
    # Si cambió el perfil y el espesor standard está en la lista, lo preseleccionamos
    if profile_changed:
        if default_t in t_opts:
            st.session_state[key_box] = default_t
    
    val_t_sel = st.selectbox(
        "Espesor presilla 'esp' (mm)", 
        options=t_opts + ["Manual..."], 
        key=key_box
    )
    
    if val_t_sel == "Manual...":
        return st.number_input(f"Espesor manual {key_suffix} (mm)", value=default_t, key=f"man_t_{key_suffix}")
    else:
        return float(val_t_sel)

# =============================================================================
# INTERFAZ PRINCIPAL
# =============================================================================

# Inicialización Session State
if 'L1' not in st.session_state: st.session_state['L1'] = 200
if 'L2' not in st.session_state: st.session_state['L2'] = 200 
if 'global_profile_name' not in st.session_state: st.session_state['global_profile_name'] = ""

col_input, col_result = st.columns([1, 1.3])

with col_input:
    st.subheader("1. Datos de Entrada")
    
    tipos = list(DB.keys())
    tipo_sel = st.selectbox("Tipo de Perfil", tipos)
    
    df = DB[tipo_sel]
    
    # --- PERSISTENCIA DE PERFIL ---
    opciones_disponibles = df['Perfil'].values

    if 'perfil_sel' not in st.session_state or st.session_state['perfil_sel'] not in opciones_disponibles:
        st.session_state['perfil_sel'] = opciones_disponibles[0]

    perfil_sel = st.selectbox("Seleccionar Perfil", opciones_disponibles, key="perfil_sel")

    st.session_state['global_profile_name'] = perfil_sel
    row = df[df['Perfil'] == perfil_sel].iloc[0]
    
    # --- PESO ---
    peso_lineal = row.get('g', 0) 
    st.markdown(f"**Peso Propio:** {peso_lineal} kg/m")
    
    # Reset presilla si cambia perfil
    if 'last_p_check' not in st.session_state: st.session_state['last_p_check'] = perfil_sel
    p_changed = (st.session_state['last_p_check'] != perfil_sel)
    st.session_state['last_p_check'] = perfil_sel

    # Detectar cambio de TIPO (Esto es lo nuevo)
    if 'last_type_check' not in st.session_state: st.session_state['last_type_check'] = tipo_sel
    t_changed = (st.session_state['last_type_check'] != tipo_sel)
    st.session_state['last_type_check'] = tipo_sel

    # Unificamos la condición de reset
    should_reset_ui = p_changed or t_changed
    # -----------------------

    st.markdown("#### Geometría")
    
    # --- INPUTS DINÁMICOS SEGÚN TIPO ---
    
    Lx_in, Ly_in = 0.0, 0.0
    extra_params = {}
    
    # Callbacks para actualizar estado
    def upd_L1(): st.session_state['L1'] = st.session_state.w_L1
    def upd_L2(): st.session_state['L2'] = st.session_state.w_L2
    
    # 1. CASO W y UPN
    if tipo_sel in ["W", "UPN"]:
        Lx_in = st.number_input("Longitud Lx (cm)", min_value=0, value=int(st.session_state['L1']), step=10, key="w_L1", on_change=upd_L1)
        Ly_in = st.number_input("Longitud Ly (cm)", min_value=0, value=int(st.session_state['L2']), step=10, key="w_L2", on_change=upd_L2)
    
    # 2. CASO L y 2L
    else:
        L_tramo = st.number_input("Longitud de Tramo 'L' (cm)", min_value=0, value=int(st.session_state['L1']), step=10, key="w_L1", on_change=upd_L1)
        has_rompetramo = st.checkbox("¿Tiene Rompetramo?", value=False)
        Lx_in = L_tramo 
        
        if tipo_sel == "L":
            extra_params["rompetramo"] = has_rompetramo
            
        elif tipo_sel in ["2L-T", "2L-X"]:
            a = st.number_input("Distancia 'a' (cm)", value=50, step=5)
            # Pasamos 'should_reset_ui' en lugar de solo 'profile_changed'
            esp = ui_seleccion_presillas(df, row, should_reset_ui, key_suffix=tipo_sel)
                
            extra_params["a"], extra_params["esp"] = a, esp
            extra_params["rompetramo"] = has_rompetramo

# =============================================================================
# RESULTADOS
# =============================================================================

with col_result:
    st.subheader("2. Resultados")
    try:
        # Inicialización segura
        lam_comp, lam_trac = 0, 0
        d_comp, d_trac = {}, {}
        formulas = []
        constructive_info = None
        
        # Enrutamiento de cálculos
        if tipo_sel in ["W", "UPN"]:
            lam_comp, lam_trac, d_comp, d_trac, formulas, _ = calculo_W_UPN(row, Lx_in, Ly_in)
            
        elif tipo_sel == "L":
            lam_comp, lam_trac, d_comp, d_trac, formulas, _ = calculo_L(row, Lx_in, extra_params["rompetramo"])
            
        elif tipo_sel == "2L-T":
            lam_comp, lam_trac, d_comp, d_trac, formulas, constructive_info = calculo_2L_T(row, Lx_in, extra_params["a"], extra_params["esp"], extra_params["rompetramo"])
            
        elif tipo_sel == "2L-X":
            lam_comp, lam_trac, d_comp, d_trac, formulas, constructive_info = calculo_2L_X(row, Lx_in, extra_params["a"], extra_params["esp"], extra_params["rompetramo"])

        # Si hubo un error en cálculo (division por cero), formulas tendrá el mensaje de error
        if formulas and "⚠️" in formulas[0]:
            st.warning(formulas[0])
        else:
            # VISUALIZACIÓN DE TARJETAS
            c1, c2 = st.columns(2)
            with c1:
                st.markdown("### Compresión")
                st.markdown("**Límite: 200**")
                st.divider()
                
                for k, v in d_comp.items():
                    val, status = check_status(v, 200)
                    color = "green" if status == "OK" else "red"
                    st.markdown(f"✅ **{k}**: {val} <span style='color:{color}'>({status})</span>" if status=="OK" else f"❌ **{k}**: {val} <span style='color:{color}'>({status})</span>", unsafe_allow_html=True)

            with c2:
                st.markdown("### Tracción")
                st.markdown("**Límite: 300**")
                st.divider()
                for k, v in d_trac.items():
                    val, status = check_status(v, 300)
                    color = "green" if status == "OK" else "red"
                    st.markdown(f"✅ **{k}**: {val} <span style='color:{color}'>({status})</span>" if status=="OK" else f"❌ **{k}**: {val} <span style='color:{color}'>({status})</span>", unsafe_allow_html=True)
            
            # --- DETALLE CONSTRUCTIVO (PRESILLAS) ---
            if constructive_info:
                st.write("")
                val_p = constructive_info['val']
                limit_p = constructive_info['limit']
                is_ok_p = constructive_info['ok']
                
                bg_p = "#d4edda" if is_ok_p else "#fff3cd" # Amarillo si falla leve, o rojo
                bg_p = "#d4edda" if is_ok_p else "#f8d7da"
                text_p = "#155724" if is_ok_p else "#721c24"
                icon_p = "✅" if is_ok_p else "⚠️"
                msg_p = "Verifica Constructivamente" if is_ok_p else "Revisar separación 'a'"
                
                st.markdown(f"""
                <div style="background-color: {bg_p}; color: {text_p}; padding: 10px; border-radius: 5px; margin-top: 10px; border: 1px solid {text_p};">
                    {icon_p} <strong>Presillas: {msg_p}</strong> &nbsp; | &nbsp; 
                    Relación a/rv: <strong>{val_p:.0f}</strong> (Máx: {limit_p:.0f})
                </div>
                """, unsafe_allow_html=True)

            # FORMULAS DESPLEGABLES
            st.write("")
            st.markdown("---")
            with st.expander("Ver Memoria de Cálculo", expanded=False):
                for f in formulas:
                    if f.startswith("$") or f.startswith("\\"): st.latex(f.replace("$", ""))
                    else: st.markdown(f)

    except Exception as e:
        st.error(f"Error inesperado en la ejecución: {e}")