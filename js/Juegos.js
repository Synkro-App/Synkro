import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField, getDocs } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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

function aplicarTraduccionesEstaticas(idioma) {
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
}

// --- RENDERIZADO Y FILTRADO DOBLE DE JUEGOS ---
async function cargarYFiltrarJuegos() {
    const contenedor = document.getElementById("contenedor-juegos");
    if (!contenedor) return;

    try {
        const juegosSnapshot = await getDocs(collection(db, "Juegos"));
        contenedor.innerHTML = ""; // Limpiamos contenedor

        juegosSnapshot.forEach((docJuego) => {
            const juegoData = docJuego.data();

            // --- FILTRO 1: EDAD (El usuario debe tener igual o más edad que la requerida por el juego) ---
            const edadRequeridaJuego = juegoData.age !== undefined ? Number(juegoData.age) : 0;
            if (edadUsuarioGlobal < edadRequeridaJuego) {
                return; // No pasa el filtro de edad, saltamos este juego
            }

            // --- FILTRO 2: TIPO / SUSCRIPCIÓN (Solo si el tipo es 'Pago') ---
            if (juegoData.type === "Pago") {
                const listaSubsJuego = Array.isArray(juegoData.subs) ? juegoData.subs : [];
                
                // Si la suscripción del usuario no está dentro de la lista permitida por el juego, se oculta
                if (!listaSubsJuego.includes(subsUsuarioGlobal)) {
                    return; // No pasa el filtro de suscripción, saltamos este juego
                }
            }

            // --- CONSTRUCCIÓN DE LA TARJETA DEL JUEGO (Pasa ambos filtros) ---
            const card = document.createElement("div");
            card.className = "juego-card";

            // Obtener el nombre traducido según el mapa de idiomas del documento
            let nombreJuego = "Juego Sin Nombre";
            if (juegoData.nombre && typeof juegoData.nombre === "object") {
                nombreJuego = juegoData.nombre[currentLanguage] || juegoData.nombre["es"] || "Juego";
            } else if (typeof juegoData.nombre === "string") {
                nombreJuego = juegoData.nombre;
            }

            // Imagen (soporta enlaces directos url y base64)
            const imgJuegoSrc = juegoData.img || "default-game.png";

            card.innerHTML = `
                <img src="${imgJuegoSrc}" alt="${nombreJuego}" class="juego-img">
                <span class="juego-titulo">${nombreJuego}</span>
            `;

            // Enrutamiento dinámico estructurado: Juegos/nombre/nombre.html
            card.addEventListener("click", () => {
                if (juegoData.pantalla) {
                    const carpetaYNombre = juegoData.pantalla.trim();
                    window.location.href = `Juegos/${carpetaYNombre}/${carpetaYNombre}.html`;
                }
            });

            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error obteniendo o filtrando la colección de Juegos:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en JUEGOS:", error);
    }

    aplicarTraduccionesEstaticas(currentLanguage);

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");

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

            // Una vez que tenemos la edad y suscripción exacta y actualizada del usuario, ejecutamos el filtro de juegos
            cargarYFiltrarJuegos();
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en JUEGOS:", error);
    });

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