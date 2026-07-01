import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
let currentStatusKey = ""; 
let usuarioValidadoRef = null; 
let requiereAuthMenor = false;

async function hashSHA256(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(bytes => bytes.toString(16).padStart(2, '0')).join('');
}

function validarRequisitosContrasena(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false; 
    if (!/[a-z]/.test(password)) return false; 
    if (!/[0-9]/.test(password)) return false; 
    if (!/[\.,!¡?¿@#\$%\^&\*_\+\-=\[\]\{\};:'"<>\\\/|`~]/.test(password)) return false; 
    return true;
}

function aplicarTraducciones(idioma) {
    if (!diccionario || Object.keys(diccionario).length === 0) return;

    const elementosALocalizar = [
        { id: "titulo_cambiar_contrasena", propiedad: "textContent" },
        { id: "label_nombre_completo", propiedad: "textContent" },
        { id: "label_usuario", propiedad: "textContent" },
        { id: "label_email", propiedad: "textContent" },
        { id: "label_auth_menor", propiedad: "textContent" },
        { id: "label_nueva_contrasena", propiedad: "textContent" },
        { id: "btn_verificar", propiedad: "textContent" },
        { id: "btn_guardar", propiedad: "textContent" },
        { id: "btn_volver", propiedad: "textContent" },
        { id: "modal_cerrar", propiedad: "textContent" }
    ];

    elementosALocalizar.forEach(item => {
        const elemento = document.getElementById(item.id);
        if (elemento && diccionario[item.id] && diccionario[item.id][idioma]) {
            elemento[item.propiedad] = diccionario[item.id][idioma];
        }
    });

    const statusModalText = document.getElementById("status-modal-text");
    if (statusModalText && currentStatusKey && diccionario[currentStatusKey] && diccionario[currentStatusKey][idioma]) {
        statusModalText.textContent = diccionario[currentStatusKey][idioma];
    }
}

function mostrarStatusPopUp(claveIdioma, esExito = false) {
    currentStatusKey = claveIdioma;
    const modal = document.getElementById("status-modal");
    const modalText = document.getElementById("status-modal-text");
    const idiomaActivo = localStorage.getItem("idioma") || "es";

    if (modal && modalText && diccionario[claveIdioma]) {
        modalText.textContent = diccionario[claveIdioma][idiomaActivo];
        modal.style.display = "flex";
        
        if (esExito) {
            const btnCerrar = document.getElementById("modal_cerrar");
            btnCerrar.onclick = () => {
                window.location.href = "index.html";
            };
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json", error);
    }

    const idiomaActivo = localStorage.getItem("idioma") || "es";
    aplicarTraducciones(idiomaActivo);

    const modalCerrar = document.getElementById("modal_cerrar");
    const statusModal = document.getElementById("status-modal");
    if (modalCerrar && statusModal) {
        modalCerrar.addEventListener("click", () => {
            if (currentStatusKey !== "exito_cambio_contrasena") {
                statusModal.style.display = "none";
                currentStatusKey = "";
            }
        });
    }

    const verifyForm = document.getElementById("verify-form");
    const newPasswordForm = document.getElementById("new-password-form");
    const authMinorGroup = document.getElementById("auth-minor-group");
    const inputAuthMenor = document.getElementById("contraseñaautorizacion");

    if (verifyForm) {
        verifyForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nombreInput = document.getElementById("Nombrecompleto").value.trim();
            const usuarioInput = document.getElementById("usuario").value.trim();
            const emailInput = document.getElementById("email").value.trim();

            try {
                const userDocRef = doc(db, "Usuarios", usuarioInput);
                const userSnapshot = await getDoc(userDocRef);

                if (!userSnapshot.exists()) {
                    mostrarStatusPopUp("error_datos_no_coinciden");
                    return;
                }

                const userData = userSnapshot.data();

                if (userData.Nombrecompleto !== nombreInput || userData.email !== emailInput) {
                    mostrarStatusPopUp("error_datos_no_coinciden");
                    return;
                }

                usuarioValidadoRef = userDocRef;
                const edadUsuario = parseInt(userData.Edad, 10) || 0;

                if (edadUsuario < 18) {
                    if (!requiereAuthMenor) {
                        requiereAuthMenor = true;
                        authMinorGroup.classList.remove("hidden");
                        inputAuthMenor.required = true;
                        return; 
                    }

                    const authInputVal = inputAuthMenor.value;
                    const authHasheadaInput = await hashSHA256(authInputVal);

                    if (userData.contraseñaautorizacion !== authHasheadaInput) {
                        mostrarStatusPopUp("error_auth_incorrecta");
                        return;
                    }
                }

                verifyForm.classList.add("hidden");
                newPasswordForm.classList.remove("hidden");

            } catch (error) {
                console.error("Error en verificación Firebase:", error);
            }
        });
    }

    if (newPasswordForm) {
        newPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const nuevaContrasena = document.getElementById("nueva_contrasena").value;

            if (!validarRequisitosContrasena(nuevaContrasena)) {
                mostrarStatusPopUp("error_requisitos_contrasena");
                return;
            }

            try {
                if (!usuarioValidadoRef) return;

                const nuevaContrasenaHasheada = await hashSHA256(nuevaContrasena);

                await updateDoc(usuarioValidadoRef, {
                    contraseña: nuevaContrasenaHasheada
                });

                mostrarStatusPopUp("exito_cambio_contrasena", true);

            } catch (error) {
                console.error("Error actualizando la contraseña:", error);
            }
        });
    }
});