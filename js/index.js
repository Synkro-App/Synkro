// Importación oficial del SDK de Firebase v9+ Web Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Credenciales fijas de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA-BvWXn2ua_LNWrzyH6V58n0aAHlnmCac",
    authDomain: "synkro-49fd9.firebaseapp.com",
    projectId: "synkro-49fd9",
    storageBucket: "synkro-49fd9.firebasestorage.app",
    messagingSenderId: "156492808380",
    appId: "1:156492808380:web:847dc0f1293a2a004850b9",
    measurementId: "G-4ZSBVCVED5"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let diccionario = {};
let currentErrorKey = ""; // Almacena la clave del error actual para refrescar dinámicamente si cambian de idioma

// Función interna para hashear contraseñas en SHA-256
async function hashSHA256(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(bytes => bytes.toString(16).padStart(2, '0')).join('');
}

// Función encargada de aplicar las traducciones
function aplicarTraducciones(idioma) {
    if (!diccionario || Object.keys(diccionario).length === 0) return;

    const elementosALocalizar = [
        { id: "label_usuario", propiedad: "textContent" },
        { id: "label_contrasena", propiedad: "textContent" },
        { id: "btn_entrar", propiedad: "textContent" },
        { id: "btn_cambiar_contrasena", propiedad: "textContent" },
        { id: "btn_usuario_prueba", propiedad: "textContent" },
        { id: "text_no_cuenta", propiedad: "textContent" },
        { id: "btn_registrate", propiedad: "textContent" },
        { id: "modal_texto_prueba", propiedad: "textContent" },
        { id: "modal_si", propiedad: "textContent" },
        { id: "modal_no", propiedad: "textContent" },
        { id: "modal_cerrar", propiedad: "textContent" }
    ];

    elementosALocalizar.forEach(item => {
        const elemento = document.getElementById(item.id);
        if (elemento && diccionario[item.id] && diccionario[item.id][idioma]) {
            elemento[item.propiedad] = diccionario[item.id][idioma];
        }
    });

    // Placeholders
    const inputUser = document.getElementById("username");
    const inputPass = document.getElementById("password");
    if (inputUser && diccionario["placeholder_usuario"] && diccionario["placeholder_usuario"][idioma]) {
        inputUser.placeholder = diccionario["placeholder_usuario"][idioma];
    }
    if (inputPass && diccionario["placeholder_contrasena"] && diccionario["placeholder_contrasena"][idioma]) {
        inputPass.placeholder = diccionario["placeholder_contrasena"][idioma];
    }

    // Mantener la traducción del mensaje de error activo en el pop-up si estuviera abierto
    const errorModalText = document.getElementById("error-modal-text");
    if (errorModalText && currentErrorKey && diccionario[currentErrorKey] && diccionario[currentErrorKey][idioma]) {
        errorModalText.textContent = diccionario[currentErrorKey][idioma];
    }
}

// Función para lanzar el Pop-up personalizado de error
function mostrarErrorPopUp(claveIdioma) {
    currentErrorKey = claveIdioma;
    const errorModal = document.getElementById("error-modal");
    const errorModalText = document.getElementById("error-modal-text");
    const idiomaActivo = localStorage.getItem("idioma") || "es";

    if (errorModal && errorModalText && diccionario[claveIdioma]) {
        errorModalText.textContent = diccionario[claveIdioma][idiomaActivo];
        errorModal.style.display = "flex";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const langSelect = document.getElementById("lang-select");
    const btnUsuarioPrueba = document.getElementById("btn_usuario_prueba");
    const customModal = document.getElementById("custom-modal");
    const modalSi = document.getElementById("modal_si");
    const modalNo = document.getElementById("modal_no");
    const errorModal = document.getElementById("error-modal");
    const modalCerrar = document.getElementById("modal_cerrar");

    // 1. Cargar diccionario de idiomas
    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json:", error);
    }

    const savedLanguage = localStorage.getItem("idioma") || "es";
    langSelect.value = savedLanguage;
    localStorage.setItem("idioma", savedLanguage);
    aplicarTraducciones(savedLanguage);

    langSelect.addEventListener("change", (event) => {
        const selectedLanguage = event.target.value;
        localStorage.setItem("idioma", selectedLanguage);
        aplicarTraducciones(selectedLanguage);
    });

    // 2. Control Modales de Cierre Manual
    if (btnUsuarioPrueba && customModal) {
        btnUsuarioPrueba.addEventListener("click", () => {
            customModal.style.display = "flex";
        });
    }
    if (modalNo && customModal) {
        modalNo.addEventListener("click", () => {
            customModal.style.display = "none";
        });
    }
    if (modalSi) {
        modalSi.addEventListener("click", () => {
            window.location.href = "Synkroprueba.html";
        });
    }
    if (modalCerrar && errorModal) {
        modalCerrar.addEventListener("click", () => {
            errorModal.style.display = "none";
            currentErrorKey = ""; // Limpiar rastro del error al cerrar
        });
    }

    // 3. Lógica de Autenticación ("Entrar") con Firebase Firestore
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const usuarioInput = document.getElementById("username").value.trim();
            const contrasenaInput = document.getElementById("password").value;

            if (!usuarioInput || !contrasenaInput) return;

            try {
                // Instanciar referencia al documento cuya clave (ID) es el campo 'usuario'
                const userDocRef = doc(db, "Usuarios", usuarioInput);
                const userSnapshot = await getDoc(userDocRef);

                // Validación 1: Comprobar si el documento del usuario existe en Firestore
                if (!userSnapshot.exists()) {
                    mostrarErrorPopUp("error_usuario_no_existe");
                    return;
                }

                const userData = userSnapshot.data();
                const contrasenaHasheadaInput = await hashSHA256(contrasenaInput);

                // Validación 2: Comprobar si las contraseñas coinciden (ambas en SHA-256)
                // Se valida ignorando diferencias de mayúsculas/minúsculas en el string hexadecimal resultante por seguridad estándar
                if (userData.contraseña !== contrasenaHasheadaInput) {
                    mostrarErrorPopUp("error_contrasena_incorrecta");
                    return;
                }

                // Autenticación Exitosa:
                // A) Cambiar el campo 'line' a true en Firestore
                await updateDoc(userDocRef, {
                    line: true
                });

                // B) Guardar el usuario en localStorage bajo la clave 'user'
                localStorage.setItem("user", usuarioInput);

                // C) Redirigir a la interfaz principal de la aplicación
                window.location.href = "Synkro.html";

            } catch (error) {
                console.error("Error durante el proceso de autenticación en Firebase:", error);
            }
        });
    }
});