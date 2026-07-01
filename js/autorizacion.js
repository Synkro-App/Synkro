import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA-BvWXn2ua_LNWrzyH6V58n0aAHlnmCac",
    authDomain: "synkro-49fd9.firebaseapp.com",
    projectId: "synkro-49fd9",
    storageBucket: "synkro-49fd9.firebasestorage.app",
    messagingSenderId: "156492808380",
    appId: "1:156492808380:web:847dc0f1293a2a004850b9",
    measurementId: "G-4ZSBVCVED5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let diccionario = {};
let currentLanguage = "es";
let userDocIdGlobal = null;
let edadUsuarioGlobal = 0;
let contrasenaNormalFirebaseHash = "";
let contrasenaAutorizacionFirebaseHash = "";
let datosUsuarioMemoria = {};

let resolvePopupActual = null;

async function generarHashSHA256(cadena) {
    const encoder = new TextEncoder();
    const data = encoder.encode(cadena);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Mantiene la conversión estándar a hexadecimal sin alterar a minúsculas forzadas para respetar mayúsculas y minúsculas
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function calcularEdadCompleta(fechaNacimientoStr) {
    if (!fechaNacimientoStr || !fechaNacimientoStr.includes("-")) return 0;
    const partes = fechaNacimientoStr.split("-");
    if (partes.length !== 3) return 0;
    
    let dia, mes, ano;
    if (partes[2].length === 4) { 
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        ano = parseInt(partes[2], 10);
    } else if (partes[0].length === 4) { 
        ano = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        dia = parseInt(partes[2], 10);
    } else {
        return 0;
    }

    const hoy = new Date();
    let edad = hoy.getFullYear() - ano;
    const diferenciaMeses = hoy.getMonth() - mes;
    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < dia)) {
        edad--;
    }
    return edad;
}

function validarFuerzaContrasena(password) {
    if (password.length < 8) return false;
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneMinuscula = /[a-z]/.test(password);
    const tieneNumero = /[0-9]/.test(password);
    const tieneSigno = /[^A-Za-z0-9]/.test(password);
    return tieneMayuscula && tieneMinuscula && tieneNumero && tieneSigno;
}

function abrirPopupAutorizacion({ textoKey, mostrarInput = false, mostrarBotonCancelar = false }) {
    return new Promise((resolve) => {
        resolvePopupActual = resolve;
        
        const overlay = document.getElementById("custom-popup-overlay");
        const txtMsg = document.getElementById("popup-message-text");
        const inputCont = document.getElementById("popup-input-container");
        const inputElement = document.getElementById("popup-secure-input");
        const btnCancel = document.getElementById("popup-btn-cancel");
        const btnConfirm = document.getElementById("popup-btn-confirm");

        inputElement.value = "";
        txtMsg.textContent = (diccionario[textoKey] && diccionario[textoKey][currentLanguage]) ? diccionario[textoKey][currentLanguage] : textoKey;
        btnConfirm.textContent = (diccionario["btn_aceptar"] && diccionario["btn_aceptar"][currentLanguage]) ? diccionario["btn_aceptar"][currentLanguage] : "Aceptar";
        btnCancel.textContent = (diccionario["btn_cancelar"] && diccionario["btn_cancelar"][currentLanguage]) ? diccionario["btn_cancelar"][currentLanguage] : "Cancelar";

        if (mostrarInput) inputCont.classList.remove("select-hidden");
        else inputCont.classList.add("select-hidden");

        if (mostrarBotonCancelar) btnCancel.classList.remove("select-hidden");
        else btnCancel.classList.add("select-hidden");

        overlay.classList.remove("select-hidden");
    });
}

function cerrarPopupAutorizacion(resultadoValor) {
    const overlay = document.getElementById("custom-popup-overlay");
    overlay.classList.add("select-hidden");
    if (resolvePopupActual) {
        resolvePopupActual(resultadoValor);
        resolvePopupActual = null;
    }
}

function aplicarTraduccionesYClaves(idioma) {
    const mainTitle = document.getElementById("title_cambiar_pass_auth");
    if (mainTitle && diccionario["title_cambiar_pass_auth"] && diccionario["title_cambiar_pass_auth"][idioma]) {
        mainTitle.textContent = diccionario["title_cambiar_pass_auth"][idioma];
    }

    const lblName = document.getElementById("label_nombre_completo");
    if (lblName && diccionario["label_nombre_completo"] && diccionario["label_nombre_completo"][idioma]) lblName.textContent = diccionario["label_nombre_completo"][idioma];

    const lblUser = document.getElementById("label_usuario");
    if (lblUser && diccionario["label_usuario"] && diccionario["label_usuario"][idioma]) lblUser.textContent = diccionario["label_usuario"][idioma];

    const lblEmail = document.getElementById("label_email");
    if (lblEmail && diccionario["label_email"] && diccionario["label_email"][idioma]) lblEmail.textContent = diccionario["label_email"][idioma];

    const lblPassNormal = document.getElementById("label_contrasena");
    if (lblPassNormal && diccionario["label_contrasena"] && diccionario["label_contrasena"][idioma]) lblPassNormal.textContent = diccionario["label_contrasena"][idioma];

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver && diccionario["btn_volver"] && diccionario["btn_volver"][idioma]) btnVolver.textContent = diccionario["btn_volver"][idioma];

    const btnGuardar = document.getElementById("btn_guardar_datos");
    if (btnGuardar && diccionario["btn_guardar_datos"] && diccionario["btn_guardar_datos"][idioma]) btnGuardar.textContent = diccionario["btn_guardar_datos"][idioma];
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json:", error);
    }

    aplicarTraduccionesYClaves(currentLanguage);

    document.getElementById("popup-btn-confirm").addEventListener("click", () => {
        const inp = document.getElementById("popup-secure-input");
        cerrarPopupAutorizacion({ clickConfirmar: true, valorInput: inp.value });
    });

    document.getElementById("popup-btn-cancel").addEventListener("click", () => {
        cerrarPopupAutorizacion({ clickConfirmar: false, valorInput: "" });
    });

    const nombreUsuarioLogueado = localStorage.getItem("user");
    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
    btnVolver.addEventListener("click", () => {
        window.history.back();
    });
}

    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    onSnapshot(qUsuario, async (querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            datosUsuarioMemoria = userData;
            // CORRECCIÓN: Nombre exacto del campo con 'ñ'
            contrasenaNormalFirebaseHash = userData.contraseña || "";
            contrasenaAutorizacionFirebaseHash = userData.contraseñaautorizacion || "";

            if (userData.fechanacimiento) {
                const edadCalculada = calcularEdadCompleta(userData.fechanacimiento);
                if (userData.Edad === undefined || Number(userData.Edad) !== edadCalculada) {
                    edadUsuarioGlobal = edadCalculada;
                    const userRef = doc(db, "Usuarios", userDocIdGlobal);
                    await updateDoc(userRef, { Edad: edadCalculada });
                } else {
                    edadUsuarioGlobal = Number(userData.Edad);
                }
            } else {
                edadUsuarioGlobal = userData.Edad !== undefined ? Number(userData.Edad) : 0;
            }
        }
    }, (error) => {
        console.error("Error en snapshot:", error);
    });

    const formAuth = document.getElementById("form-cambiar-auth");
    if (formAuth) {
        formAuth.addEventListener("submit", async (e) => {
            e.preventDefault();

            // PASO 1: Comprobar Edad estrictamente al dar al botón
            if (edadUsuarioGlobal >= 18) {
                await abrirPopupAutorizacion({ textoKey: "error_solo_menores", mostrarInput: false, mostrarBotonCancelar: false });
                return; 
            }

            // PASO 2: Si es menor (< 18), comprobar campos de texto y contraseña (Con distinción estricta de mayúsculas/minúsculas)
            const inputFullname = document.getElementById("auth-fullname").value.trim();
            const inputUsername = document.getElementById("auth-username").value.trim();
            const inputEmail = document.getElementById("auth-email").value.trim();
            const inputPassword = document.getElementById("auth-password").value.trim();

            const hashPasswordInp = await generarHashSHA256(inputPassword);

            // CORRECCIÓN: Comparación exacta con mayúsculas/minúsculas respetadas al 100%
            if (inputFullname !== datosUsuarioMemoria.Nombrecompleto || 
                inputUsername !== datosUsuarioMemoria.usuario || 
                inputEmail !== datosUsuarioMemoria.email ||
                hashPasswordInp !== contrasenaNormalFirebaseHash) {
                
                await abrirPopupAutorizacion({ textoKey: "error_campos_no_coinciden", mostrarInput: false, mostrarBotonCancelar: false });
                return;
            }

            // PASO 3: Pedir contraseña de autorización vieja (existente)
            const popVieja = await abrirPopupAutorizacion({ textoKey: "prompt_ingresar_pass", mostrarInput: true, mostrarBotonCancelar: true });
            if (!popVieja.clickConfirmar || !popVieja.valorInput) return; 

            const hashIntentoAuthVieja = await generarHashSHA256(popVieja.valorInput);
            
            // CORRECCIÓN: Comparación exacta distinguiendo mayúsculas/minúsculas
            if (hashIntentoAuthVieja !== contrasenaAutorizacionFirebaseHash) {
                await abrirPopupAutorizacion({ textoKey: "error_pass_incorrecta", mostrarInput: false, mostrarBotonCancelar: false });
                return;
            }

            // PASO 4: Pedir la nueva contraseña de autorización
            const popNueva = await abrirPopupAutorizacion({ textoKey: "label_nueva_pass_auth", mostrarInput: true, mostrarBotonCancelar: true });
            if (!popNueva.clickConfirmar || !popNueva.valorInput) return;

            const nuevaContrasenaTexto = popNueva.valorInput.trim();

            // PASO 5: Validar la fuerza de la contraseña
            if (!validarFuerzaContrasena(nuevaContrasenaTexto)) {
                await abrirPopupAutorizacion({ textoKey: "error_fuerza_contrasena", mostrarInput: false, mostrarBotonCancelar: false });
                return;
            }

            // PASO 6: Guardar el cambio final
            try {
                const hashNuevaAuthCompleto = await generarHashSHA256(nuevaContrasenaTexto);
                const userRef = doc(db, "Usuarios", userDocIdGlobal);
                
                // Actualiza guardando el nuevo hash respetando mayúsculas y minúsculas de la salida SHA-256
                await updateDoc(userRef, { contraseñaautorizacion: hashNuevaAuthCompleto });

                await abrirPopupAutorizacion({ textoKey: "exito_cambio_guardado", mostrarInput: false, mostrarBotonCancelar: false });
                window.location.href = "Perfil.html";
            } catch (error) {
                console.error("Error guardando nueva contraseña de autorización:", error);
            }
        });
    }
});