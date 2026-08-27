import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs,
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteField 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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

// Diccionario local de fallback para traducciones de esta vista de series
const traduccionesLocales = {
    "titulo_catalogo_series": {
        "es": "Series",
        "en": "Series",
        "fr": "Séries",
        "ro": "Seriale"
    },
    "text_sin_series": {
        "es": "No se encontraron series disponibles.",
        "en": "No series available were found.",
        "fr": "Aucune série disponible n'a été trouvée.",
        "ro": "Nu au fost găsite seriale disponibile."
    },
    "btn_cerrar_sesion": {
        "es": "Cerrar sesión",
        "en": "Log out",
        "fr": "Déconnexion",
        "ro": "Deconectare"
    }
};

// --- FUNCIÓN PARA FORMATEAR IMÁGENES BASE64 O URL ---
function normalizarSourceImagen(cadenaImagen) {
    if (!cadenaImagen) return "../default-profile.png";
    
    const str = cadenaImagen.trim();
    if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:") || str.startsWith("../") || str.startsWith("./")) {
        return str;
    }
    
    return `data:image/jpeg;base64,${str}`;
}

// --- CÁLCULO RIGUROSO DE EDAD ---
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

function obtenerTextoTraduccion(clave, fallbackTexto) {
    if (diccionario[clave] && diccionario[clave][currentLanguage]) {
        return diccionario[clave][currentLanguage];
    }
    if (traduccionesLocales[clave] && traduccionesLocales[clave][currentLanguage]) {
        return traduccionesLocales[clave][currentLanguage];
    }
    return fallbackTexto;
}

function aplicarTraduccionesEstaticas() {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs) {
        lblSubs.textContent = obtenerTextoTraduccion("text_subscripcion", "");
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.textContent = obtenerTextoTraduccion("btn_volver", "");
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "Cerrar sesión");
    }

    const lblTitulo = document.getElementById("titulo-catalogo-series");
    if (lblTitulo) {
        lblTitulo.textContent = obtenerTextoTraduccion("titulo_catalogo_series", "Series");
    }
}

// --- CONSULTA Y FILTRADO ESTRICTO DE SERIES ---
async function cargarCatalogoSeries() {
    const contenedorGrid = document.getElementById("contenedor-grid-series");
    if (!contenedorGrid) return;

    contenedorGrid.innerHTML = "";

    try {
        const psRef = collection(db, "Peliculasyseries");
        // Filtramos por tipo "serie"
        const qSeries = query(psRef, where("tipo", "==", "serie"));
        const querySnapshot = await getDocs(qSeries);

        if (querySnapshot.empty) {
            contenedorGrid.innerHTML = `<p style="color: #000; font-style: italic;">${obtenerTextoTraduccion("text_sin_series", "No se encontraron series disponibles.")}</p>`;
            return;
        }

        let seriesVisiblesCount = 0;

        querySnapshot.forEach((docSnap) => {
            const serieData = docSnap.data();

            // 1. FILTRO DE EDAD: Si Edad usuario < edadMinima, NO se muestra directamente
            const edadMinima = serieData.edadMinima !== undefined ? Number(serieData.edadMinima) : 0;
            if (edadUsuarioGlobal < edadMinima) {
                return; // Omitir / No mostrar
            }

            // 2. FILTRO DE TIPO Y SUSCRIPCIÓN (Gratis vs Pago)
            const tipoAcceso = serieData.type || "Gratis";
            if (tipoAcceso === "Pago") {
                const arraySubsObra = Array.isArray(serieData.subs) ? serieData.subs : [];
                const tieneSuscripcionValida = arraySubsObra.includes(subsUsuarioGlobal);

                if (!tieneSuscripcionValida) {
                    return; // Omitir / No mostrar si no coincide la suscripción
                }
            }

            // Si pasa los filtros, renderizamos la tarjeta
            const tarjetaSerie = crearTarjetaSerie(serieData);
            contenedorGrid.appendChild(tarjetaSerie);
            seriesVisiblesCount++;
        });

        if (seriesVisiblesCount === 0) {
            contenedorGrid.innerHTML = `<p style="color: #000; font-style: italic;">${obtenerTextoTraduccion("text_sin_series", "No se encontraron series disponibles.")}</p>`;
        }

    } catch (error) {
        console.error("Error al consultar el catálogo de series:", error);
    }
}

function crearTarjetaSerie(serieData) {
    const card = document.createElement("div");
    card.className = "pelicula-card";

    // Cartelera / Poster
    const posterBox = document.createElement("div");
    posterBox.className = "poster-box";
    const imgPoster = document.createElement("img");
    imgPoster.className = "img-cartelera-thumb";
    imgPoster.src = normalizarSourceImagen(serieData.imgCartelera);
    imgPoster.alt = "Cartelera";
    posterBox.appendChild(imgPoster);

    // Detalles (Título)
    const detailsBox = document.createElement("div");
    detailsBox.className = "pelicula-details";

    const tituloTxt = document.createElement("span");
    tituloTxt.className = "titulo-pelicula-txt";
    
    let textoTituloLocal = "";
    if (serieData.titulo && typeof serieData.titulo === "object") {
        textoTituloLocal = serieData.titulo[currentLanguage] || serieData.titulo["es"] || Object.values(serieData.titulo)[0] || "";
    } else if (typeof serieData.titulo === "string") {
        textoTituloLocal = serieData.titulo;
    }
    tituloTxt.textContent = textoTituloLocal;

    detailsBox.appendChild(tituloTxt);
    card.appendChild(posterBox);
    card.appendChild(detailsBox);

    // --- EVENTO DE Clic: GUARDAR EN LOCALSTORAGE COMO titserie Y NAVEGAR A Serie.html ---
    card.addEventListener("click", () => {
        let tituloEnEspanol = "";
        if (serieData.titulo && typeof serieData.titulo === "object") {
            tituloEnEspanol = serieData.titulo["es"] || serieData.titulo[currentLanguage] || Object.values(serieData.titulo)[0] || "";
        } else if (typeof serieData.titulo === "string") {
            tituloEnEspanol = serieData.titulo;
        }

        localStorage.setItem("titserie", tituloEnEspanol);
        window.location.href = "Serie.html";
    });

    return card;
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Series:", error);
    }

    aplicarTraduccionesEstaticas();

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");

    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "../index.html";
        return;
    }

    // Redirecciones de cabecera
    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) {
        filaPerfil.addEventListener("click", () => {
            window.location.href = "../Perfil.html";
        });
    }

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) {
        filaNovas.addEventListener("click", () => {
            window.location.href = "../NovaPoints.html";
        });
    }

    // --- ESCUCHA EN TIEMPO REAL DEL USUARIO ---
    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    onSnapshot(qUsuario, async (querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            if (imgAvatar) imgAvatar.src = normalizarSourceImagen(userData.imgperfil);
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;

            // --- CÁLCULO DE EDAD ---
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

            // --- PROCESADO Y CÁLCULO DE SUSCRIPCIÓN DEL USUARIO ---
            if (userData.subs && typeof userData.subs === "object") {
                subsUsuarioGlobal = userData.subs.subs || ""; 
                
                if (userData.subs.fechaExpiracion) {
                    const timestampExpiracion = userData.subs.fechaExpiracion.toDate ? userData.subs.fechaExpiracion.toDate() : new Date(userData.subs.fechaExpiracion);
                    const hoy = new Date();
                    
                    const diferenciaMilisegundos = timestampExpiracion.getTime() - hoy.getTime();
                    const diasCalculados = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

                    if (diasCalculados <= 0) {
                        subsUsuarioGlobal = "";
                        if (valSubs) valSubs.textContent = obtenerTextoTraduccion("text_ninguna", "Ninguna");
                        
                        const userRef = doc(db, "Usuarios", userDocIdGlobal);
                        await updateDoc(userRef, { subs: deleteField() });
                    } else {
                        if (userData.subs.diasrestantes === undefined || userData.subs.diasrestantes !== diasCalculados) {
                            const userRef = doc(db, "Usuarios", userDocIdGlobal);
                            await updateDoc(userRef, { "subs.diasrestantes": diasCalculados });
                        }
                        if (valSubs) valSubs.textContent = `${subsUsuarioGlobal} (${diasCalculados}d)`;
                    }
                } else {
                    const dias = userData.subs.diasrestantes !== undefined ? userData.subs.diasrestantes : 0;
                    if (valSubs) valSubs.textContent = `${subsUsuarioGlobal} (${dias}d)`;
                }
            } else {
                subsUsuarioGlobal = "";
                if (valSubs) valSubs.textContent = obtenerTextoTraduccion("text_ninguna", "Ninguna");
            }

            // Una vez obtenidos los datos del usuario, cargamos y filtramos el catálogo de series
            await cargarCatalogoSeries();
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en Series:", error);
    });

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
            window.location.href = "../index.html";
        });
    }
});