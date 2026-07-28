import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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

// API KEY proporcionada para Google Translate
const GOOGLE_TRANSLATE_API_KEY = "AIzaSyAZekosHAhS84eh0bgPFJ9AuUcITtdxpKs";

let diccionario = {};
let currentLanguage = "es";
let userDocIdGlobal = null;

let edadUsuarioGlobal = 0; 
let subsUsuarioGlobal = ""; 

// --- CÁLCULO RIGUROSO DE EDAD (DD-MM-AAAA) ---
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

// --- TRADUCCIÓN DINÁMICA DE LA INTERFAZ ---
function aplicarTraduccionesEstaticas(idioma) {
    // Traducciones globales compartidas de la cabecera
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

    // --- TRADUCCIONES ESPECÍFICAS DE LA SECCIÓN TRADUCTOR ---
    
    // 1. Opción "Detectar idioma" en el select de origen
    const optAuto = document.getElementById("opt-detectar-idioma");
    if (optAuto && diccionario["detectar_idioma"] && diccionario["detectar_idioma"][idioma]) {
        optAuto.textContent = diccionario["detectar_idioma"][idioma];
    }

    // 2. Placeholder del cuadro de texto de origen
    const txtSource = document.getElementById("text-source");
    if (txtSource && diccionario["escribe_texto_traducir"] && diccionario["escribe_texto_traducir"][idioma]) {
        txtSource.setAttribute("placeholder", diccionario["escribe_texto_traducir"][idioma]);
    }

    // 3. Placeholder del cuadro de texto de destino
    const txtTarget = document.getElementById("text-target");
    if (txtTarget && diccionario["traduccion"] && diccionario["traduccion"][idioma]) {
        txtTarget.setAttribute("placeholder", diccionario["traduccion"][idioma]);
    }

    // 4. Texto del botón principal "Traducir"
    const btnTraducir = document.getElementById("btn-traducir");
    if (btnTraducir && diccionario["traducir_accion"] && diccionario["traducir_accion"][idioma]) {
        btnTraducir.textContent = diccionario["traducir_accion"][idioma];
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en TRADUCTOR:", error);
    }

    // Aseguramos que la opción "Detectar idioma" tenga un ID asignado en el DOM para poder traducirla
    const selectSource = document.getElementById("select-lang-source");
    if (selectSource && selectSource.options[0]) {
        selectSource.options[0].id = "opt-detectar-idioma";
    }

    aplicarTraduccionesEstaticas(currentLanguage);

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");

    // Elementos internos del traductor
    const selectTarget = document.getElementById("select-lang-target");
    const textSource = document.getElementById("text-source");
    const textTarget = document.getElementById("text-target");
    const btnTraducir = document.getElementById("btn-traducir");

    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    // --- REDIRECCIONES DE FILAS ---
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
        console.error("Error en tiempo real con el usuario en TRADUCTOR:", error);
    });

    // --- LÓGICA DE INTEGRACIÓN CON GOOGLE TRANSLATE API ---
    if (btnTraducir) {
        btnTraducir.addEventListener("click", async () => {
            const textoAEscribir = textSource.value.trim();
            if (!textoAEscribir) {
                textTarget.value = "";
                return;
            }

            const idiomaOrigen = selectSource.value;
            const idiomaDestino = selectTarget.value;

            let url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
            
            const datosPost = {
                q: textoAEscribir,
                target: idiomaDestino
            };

            if (idiomaOrigen !== "auto") {
                datosPost.source = idiomaOrigen;
            }

            try {
                btnTraducir.disabled = true;
                
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(datosPost)
                });

                if (!response.ok) {
                    throw new Error(`Error en la petición: ${response.status}`);
                }

                const data = await response.json();
                
                if (data && data.data && data.data.translations && data.data.translations[0]) {
                    const textoTraducidoEncoded = data.data.translations[0].translatedText;
                    const txtContenedorAux = document.createElement("textarea");
                    txtContenedorAux.innerHTML = textoTraducidoEncoded;
                    textTarget.value = txtContenedorAux.value;
                }

            } catch (error) {
                console.error("Error al traducir el texto:", error);
                textTarget.value = "Ocurrió un error al procesar la traducción.";
            } finally {
                btnTraducir.disabled = false;
            }
        });
    }

    // --- MANEJO DE EVENTOS DE CABECERA ---
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