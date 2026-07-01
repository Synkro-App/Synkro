import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField, getDocs, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Credenciales oficiales reales
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
let subsUsuarioGlobal = ""; 

// ALERTA POP-UP INTERNA PERSONALIZADA
function abrirAlertaPersonalizada(mensaje) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const txtMsg = document.getElementById("custom-modal-text");
        const btnOk = document.getElementById("custom-modal-btn-ok");

        txtMsg.textContent = mensaje;
        overlay.classList.remove("hidden");

        function limpiarEvento() {
            btnOk.replaceWith(btnOk.cloneNode(true));
        }

        document.getElementById("custom-modal-btn-ok").addEventListener("click", () => {
            overlay.classList.add("hidden");
            limpiarEvento();
            resolve(true);
        });
    });
}

// --- CÁLCULO RIGUROSO DE EDAD (DD-MM-AAAA / YYYY-MM-DD) ---
function calcularEdadCompleta(fechaNacimientoStr) {
    if (!fechaNacimientoStr) return 0;
    
    let ano, mes, dia;
    if (fechaNacimientoStr.includes("-")) {
        const partes = fechaNacimientoStr.split("-");
        if (partes[0].length === 4) { // YYYY-MM-DD
            ano = parseInt(partes[0], 10);
            mes = parseInt(partes[1], 10) - 1;
            dia = parseInt(partes[2], 10);
        } else { // DD-MM-YYYY
            dia = parseInt(partes[0], 10);
            mes = parseInt(partes[1], 10) - 1;
            ano = parseInt(partes[2], 10);
        }
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

function aplicarTraduccionesEstaticas(idioma) {
    // Cabecera
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs && diccionario["text_subscripcion"] && diccionario["text_subscripcion"][idioma]) {
        lblSubs.textContent = diccionario["text_subscripcion"][idioma];
    }
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver && diccionario["btn_volver"] && diccionario["btn_volver"][idioma]) {
        btnVolver.textContent = diccionario["btn_volver"][idioma];
    }
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout && diccionario["btn_cerrar_sesion"] && diccionario["btn_cerrar_sesion"][idioma]) {
        btnLogout.textContent = diccionario["btn_cerrar_sesion"][idioma];
    }

    // Formulario de Contacto
    const mainTitle = document.getElementById("text_titulo_contacto");
    if (mainTitle && diccionario["text_titulo_contacto"] && diccionario["text_titulo_contacto"][idioma]) {
        mainTitle.textContent = diccionario["text_titulo_contacto"][idioma];
    }
    const lblUser = document.getElementById("text_label_usuario");
    if (lblUser && diccionario["text_label_usuario"] && diccionario["text_label_usuario"][idioma]) {
        lblUser.textContent = diccionario["text_label_usuario"][idioma];
    }
    const lblTipo = document.getElementById("text_label_tipo");
    if (lblTipo && diccionario["text_label_tipo"] && diccionario["text_label_tipo"][idioma]) {
        lblTipo.textContent = diccionario["text_label_tipo"][idioma];
    }
    const lblMensaje = document.getElementById("text_label_mensaje");
    if (lblMensaje && diccionario["text_label_mensaje"] && diccionario["text_label_mensaje"][idioma]) {
        lblMensaje.textContent = diccionario["text_label_mensaje"][idioma];
    }
    const btnEnviar = document.getElementById("btn_enviar_contacto");
    if (btnEnviar && diccionario["btn_enviar_contacto"] && diccionario["btn_enviar_contacto"][idioma]) {
        btnEnviar.textContent = diccionario["btn_enviar_contacto"][idioma];
    }

    // Opciones del Select
    const optPeticion = document.getElementById("option_peticion");
    if (optPeticion && diccionario["option_peticion"] && diccionario["option_peticion"][idioma]) {
        optPeticion.textContent = diccionario["option_peticion"][idioma];
    }
    const optFallo = document.getElementById("option_fallo");
    if (optFallo && diccionario["option_fallo"] && diccionario["option_fallo"][idioma]) {
        optFallo.textContent = diccionario["option_fallo"][idioma];
    }
    const optFeedback = document.getElementById("option_feedback");
    if (optFeedback && diccionario["option_feedback"] && diccionario["option_feedback"][idioma]) {
        optFeedback.textContent = diccionario["option_feedback"][idioma];
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Contacta con Synkro:", error);
    }

    aplicarTraduccionesEstaticas(currentLanguage);

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");
    const inputUserForm = document.getElementById("contact-user");

    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    // Autocompletar el campo del formulario de manera fija
    if (inputUserForm) {
        inputUserForm.value = nombreUsuarioLogueado;
    }

    // --- ENLACES DE REDIRECCIÓN DE LA CABECERA ---
    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) {
        filaPerfil.addEventListener("click", () => {
            window.location.href = "Perfil.html";
        });
    }

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) {
        filaNovas.addEventListener("click", () => {
            window.location.href = "NovaPoints.html";
        });
    }

    // --- ESCUCHA EN TIEMPO REAL DEL USUARIO (onSnapshot) ---
    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    onSnapshot(qUsuario, async (querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            if (imgAvatar) imgAvatar.src = userData.imgperfil || "default-profile.png";
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;

            // Procesado de Edad
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

            // Procesado de Suscripción y días restantes
            if (userData.subs && typeof userData.subs === "object") {
                subsUsuarioGlobal = userData.subs.subs || ""; 
                
                if (userData.subs.fechaExpiracion) {
                    const timestampExpiracion = userData.subs.fechaExpiracion.toDate ? userData.subs.fechaExpiracion.toDate() : new Date(userData.subs.fechaExpiracion);
                    const hoy = new Date();
                    
                    const diferenciaMilisegundos = timestampExpiracion.getTime() - hoy.getTime();
                    const diasCalculados = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

                    if (diasCalculados <= 0) {
                        subsUsuarioGlobal = "";
                        valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
                        
                        const userRef = doc(db, "Usuarios", userDocIdGlobal);
                        await updateDoc(userRef, { subs: deleteField() });
                    } else {
                        if (userData.subs.diasrestantes === undefined || userData.subs.diasrestantes !== diasCalculados) {
                            const userRef = doc(db, "Usuarios", userDocIdGlobal);
                            await updateDoc(userRef, { "subs.diasrestantes": diasCalculados });
                        }
                        valSubs.textContent = `${subsUsuarioGlobal} (${diasCalculados}d)`;
                    }
                } else {
                    const dias = userData.subs.diasrestantes !== undefined ? userData.subs.diasrestantes : 0;
                    valSubs.textContent = `${subsUsuarioGlobal} (${dias}d)`;
                }
            } else {
                subsUsuarioGlobal = "";
                valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
            }
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario:", error);
    });

    // --- MANEJO DEL ENVÍO DEL FORMULARIO CON ID INCREMENTAL ---
    const formContacto = document.getElementById("form-contacto");
    if (formContacto) {
        formContacto.addEventListener("submit", async (e) => {
            e.preventDefault();

            const tipoSeleccionado = document.getElementById("contact-type").value; // peticion, fallo o feedback
            const mensajeTexto = document.getElementById("contact-message").value;

            try {
                // Obtener todos los documentos de la colección para contar los que empiezan por el prefijo
                const contactoRef = collection(db, "ContactaconSynkro");
                const snapshot = await getDocs(contactoRef);

                let contador = 0;
                snapshot.forEach((docSnap) => {
                    // Si el ID del documento empieza exactamente por el tipo seleccionado (ej: "peticion", "fallo"...)
                    if (docSnap.id.startsWith(tipoSeleccionado)) {
                        contador++;
                    }
                });

                // El nuevo ID incremental será el tipo + (contador + 1)
                const nuevoIdDocumento = `${tipoSeleccionado}${contador + 1}`;

                // Mapa de datos a guardar en Firestore
                const nuevoDocDatos = {
                    contestada: false,
                    fecha: Timestamp.fromDate(new Date()),
                    mensaje: mensajeTexto,
                    tipo: tipoSeleccionado,
                    usuario: nombreUsuarioLogueado
                };

                // Guardar el documento con el ID personalizado incremental exacto
                const docRefDestino = doc(db, "ContactaconSynkro", nuevoIdDocumento);
                await setDoc(docRefDestino, nuevoDocDatos);

                // Limpiar el campo del mensaje
                document.getElementById("contact-message").value = "";

                // Alerta de confirmación
                const msgExito = diccionario["alert_envio_exito"]?.[currentLanguage] || "Tu mensaje ha sido enviado correctamente.";
                await abrirAlertaPersonalizada(`${msgExito} (ID: ${nuevoIdDocumento})`);

            } catch (error) {
                console.error("Error al enviar a la colección ContactaconSynkro:", error);
                await abrirAlertaPersonalizada("Hubo un error al procesar el envío.");
            }
        });
    }

    // --- MANEJO DE EVENTOS DE LOS BOTONES DE CABECERA ---
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            window.history.back();
        });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (userDocIdGlobal) {
                try {
                    const userRef = doc(db, "Usuarios", userDocIdGlobal);
                    await updateDoc(userRef, { line: false });
                } catch (err) {
                    console.error("Error al actualizar estado 'line' al desconectar:", err);
                }
            }
            localStorage.clear();
            window.location.href = "index.html";
        });
    }
});