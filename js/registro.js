import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// Base de datos local usando el nombre completo del país como clave principal
const datosPaises = {
    "España": { extension: "+34", digitos: 9, ciudades: ["Madrid", "Comunidad Valenciana", "Castilla y León", "Cataluña", "Andalucía", "Galicia", "País Vasco"] },
    "Francia": { extension: "+33", digitos: 9, ciudades: ["Île-de-France", "Provenza-Alpes-Costa Azul", "Nueva Aquitania", "Occitania"] },
    "Rumanía": { extension: "+40", digitos: 9, ciudades: ["Bucarest", "Cluj", "Timiș", "Constanța", "Iași"] },
    "Estados Unidos": { extension: "+1",  digitos: 10, ciudades: ["California", "New York", "Texas", "Florida", "Illinois"] },
    "México": { extension: "+52", digitos: 10, ciudades: ["Ciudad de México", "Jalisco", "Nuevo León", "Puebla"] },
    "Argentina": { extension: "+54", digitos: 10, ciudades: ["Buenos Aires", "Córdoba", "Santa Fe", "Mendoza"] }
};

async function hashSHA256(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(bytes => bytes.toString(16).padStart(2, '0')).join('');
}

function validarContrasenaEstricta(password) {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[\.,!¡?¿@#\$%\^&\*_\+\-=\[\]\{\};:'"<>\\\/|`~]/.test(password)) return false;
    return true;
}

function validarEmailEstricto(email) {
    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regexEmail.test(email);
}

function calcularEdadExacta(fechaNacimientoString) {
    const cumpleanos = new Date(fechaNacimientoString);
    const hoy = new Date("2026-06-27"); 
    
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const diferenciaMeses = hoy.getMonth() - cumpleanos.getMonth();
    
    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < cumpleanos.getDate())) {
        edad--;
    }
    return edad;
}

function aplicarTraducciones(idioma) {
    if (!diccionario || Object.keys(diccionario).length === 0) return;

    const elementosALocalizar = [
        { id: "titulo_registro", propiedad: "textContent" },
        { id: "label_nombre_completo", propiedad: "textContent" },
        { id: "label_usuario", propiedad: "textContent" },
        { id: "label_contrasena", propiedad: "textContent" },
        { id: "label_pais", propiedad: "textContent" },
        { id: "label_ciudad", propiedad: "textContent" },
        { id: "label_fecha_nacimiento", propiedad: "textContent" },
        { id: "label_auth_menor", propiedad: "textContent" },
        { id: "label_sexo", propiedad: "textContent" },
        { id: "label_telefono", propiedad: "textContent" },
        { id: "label_email", propiedad: "textContent" },
        { id: "btn_registrar", propiedad: "textContent" },
        { id: "text_ya_cuenta", propiedad: "textContent" },
        { id: "btn_inicia_sesion", propiedad: "textContent" },
        { id: "sexo_hombre", propiedad: "textContent" },
        { id: "sexo_mujer", propiedad: "textContent" },
        { id: "sexo_otro", propiedad: "textContent" },
        { id: "sexo_no_decir", propiedad: "textContent" },
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
            document.getElementById("modal_cerrar").onclick = () => {
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
        console.error("Error cargando idiomas.json en Registro", error);
    }

    const idiomaActivo = localStorage.getItem("idioma") || "es";
    aplicarTraducciones(idiomaActivo);

    const modalCerrar = document.getElementById("modal_cerrar");
    const statusModal = document.getElementById("status-modal");
    if (modalCerrar && statusModal) {
        modalCerrar.addEventListener("click", () => {
            if (currentStatusKey !== "exito_registro") {
                statusModal.style.display = "none";
                currentStatusKey = "";
            }
        });
    }

    const selectPais = document.getElementById("pais");
    const selectCiudad = document.getElementById("Ciudad");
    const selectExtension = document.getElementById("extension");
    const inputFechaNacimiento = document.getElementById("fechanacimiento");
    const authMinorRow = document.getElementById("auth-minor-row");
    const inputAuthMenor = document.getElementById("contraseñaautorizacion");

    selectPais.addEventListener("change", (e) => {
        const paisSeleccionado = e.target.value;
        const config = datosPaises[paisSeleccionado];

        if (config) {
            selectExtension.value = config.extension;
            selectCiudad.innerHTML = '<option value="" disabled selected>--</option>';
            config.ciudades.forEach(ciudad => {
                const opt = document.createElement("option");
                opt.value = ciudad;
                opt.textContent = ciudad;
                selectCiudad.appendChild(opt);
            });
            selectCiudad.disabled = false;
        }
    });

    inputFechaNacimiento.addEventListener("change", (e) => {
        if (!e.target.value) return;
        const edadCalculada = calcularEdadExacta(e.target.value);

        if (edadCalculada < 18) {
            authMinorRow.classList.remove("hidden");
            inputAuthMenor.required = true;
        } else {
            authMinorRow.classList.add("hidden");
            inputAuthMenor.required = false;
            inputAuthMenor.value = "";
        }
    });

    const registroForm = document.getElementById("registro-form");
    if (registroForm) {
        registroForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const usuarioVal = document.getElementById("usuario").value.trim();
            const nombreVal = document.getElementById("Nombrecompleto").value.trim();
            const contrasenaVal = document.getElementById("contraseña").value;
            const paisVal = selectPais.value; // Guardará el texto completo: "España", "Francia", etc.
            const ciudadVal = selectCiudad.value;
            const fechaNacVal = inputFechaNacimiento.value;
            const sexoVal = document.getElementById("sexo").value;
            const extensionVal = selectExtension.value;
            const telefonoVal = document.getElementById("nTelefono").value.trim();
            const emailVal = document.getElementById("email").value.trim();

            try {
                const userDocRef = doc(db, "Usuarios", usuarioVal);
                const userSnapshot = await getDoc(userDocRef);

                if (userSnapshot.exists()) {
                    mostrarStatusPopUp("error_usuario_existe");
                    return;
                }

                if (!validarContrasenaEstricta(contrasenaVal)) {
                    mostrarStatusPopUp("error_requisitos_contrasena");
                    return;
                }

                if (!validarEmailEstricto(emailVal)) {
                    mostrarStatusPopUp("error_email_invalido");
                    return;
                }

                const longitudRequerida = datosPaises[paisVal].digitos;
                if (telefonoVal.length !== longitudRequerida) {
                    mostrarStatusPopUp("error_telefono_invalido");
                    return;
                }

                const edadFinal = calcularEdadExacta(fechaNacVal);
                let authMenorHasheada = "";

                if (edadFinal < 18) {
                    const authMenorVal = inputAuthMenor.value;
                    if (!validarContrasenaEstricta(authMenorVal)) {
                        mostrarStatusPopUp("error_requisitos_auth_menor");
                        return;
                    }
                    authMenorHasheada = await hashSHA256(authMenorVal);
                }

                const [anio, mes, dia] = fechaNacVal.split("-");
                const fechaNacFormateada = `${dia}-${mes}-${anio}`;
                const contrasenaHasheada = await hashSHA256(contrasenaVal);

                const nuevoUsuarioData = {
                    Nombrecompleto: nombreVal,
                    usuario: usuarioVal,
                    contraseña: contrasenaHasheada,
                    país: paisVal, // Almacenado perfectamente completo en Firestore
                    Ciudad: ciudadVal,
                    fechanacimiento: fechaNacFormateada,
                    sexo: sexoVal,
                    extension: extensionVal,
                    nTelefono: parseInt(telefonoVal, 10),
                    email: emailVal,
                    Edad: edadFinal,
                    NovaPoints: 10000,
                    contraseñaautorizacion: authMenorHasheada,
                    fecharegistro: Timestamp.now(), 
                    line: false,
                    role: "usuario",
                    usuarioX: true
                };

                await setDoc(userDocRef, nuevoUsuarioData);
                mostrarStatusPopUp("exito_registro", true);

            } catch (error) {
                console.error("Error durante el registro en Firebase:", error);
                mostrarStatusPopUp("error_campos_incompletos");
            }
        });
    }
});