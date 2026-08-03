import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs,
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteField,
    query,
    where 
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

// Diccionario local de fallback para traducciones de esta vista
const traduccionesLocales = {
    "text_sin_elementos": {
        "es": "No hay elementos en esta lista.",
        "en": "There are no items in this list.",
        "fr": "Il n'y a pas d'éléments dans cette liste.",
        "ro": "Nu există elemente în această listă."
    },
    "btn_cerrar_sesion": {
        "es": "Cerrar sesión",
        "en": "Log out",
        "fr": "Déconnexion",
        "ro": "Deconectare"
    },
    "text_ninguna": {
        "es": "Ninguna",
        "en": "None",
        "fr": "Aucune",
        "ro": "Niciuna"
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
}

// --- CARGAR TÍTULO TRADUCIDO Y CONTENIDO DE LA LISTA SELECCIONADA ---
async function inicializarContenidoLista() {
    const listaSeleccionadaNombreEnEspanol = localStorage.getItem("listaseleccionada") || "";
    const lblTitulo = document.getElementById("titulo-catalogo-lista");
    const contenedorGrid = document.getElementById("contenedor-grid-peliculas-lista");

    if (!contenedorGrid) return;
    contenedorGrid.innerHTML = "";

    let nombreListaParaBuscar = listaSeleccionadaNombreEnEspanol;

    try {
        // Consultar la colección Listas para obtener el mapa de idiomas del nombre
        const listasRef = collection(db, "Listas");
        const querySnapshot = await getDocs(listasRef);

        let listaEncontradaData = null;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const campoNombre = data.nombre;
            
            let nombreEs = "";
            if (campoNombre && typeof campoNombre === "object") {
                nombreEs = campoNombre["es"] || Object.values(campoNombre)[0] || "";
            } else if (typeof campoNombre === "string") {
                nombreEs = campoNombre;
            }

            if (nombreEs === listaSeleccionadaNombreEnEspanol) {
                listaEncontradaData = data;
            }
        });

        if (listaEncontradaData && listaEncontradaData.nombre) {
            const mapaNombre = listaEncontradaData.nombre;
            if (typeof mapaNombre === "object") {
                nombreListaParaBuscar = mapaNombre["es"] || Object.values(mapaNombre)[0] || listaSeleccionadaNombreEnEspanol;
                if (lblTitulo) {
                    lblTitulo.textContent = mapaNombre[currentLanguage] || mapaNombre["es"] || listaSeleccionadaNombreEnEspanol;
                }
            } else {
                if (lblTitulo) lblTitulo.textContent = mapaNombre;
            }
        } else {
            if (lblTitulo) lblTitulo.textContent = listaSeleccionadaNombreEnEspanol;
        }

        // --- CONSULTAR PELICULAS Y SERIES QUE TENGAN ESTA LISTA EN SU CAMPO Listas ---
        const pelisRef = collection(db, "Peliculasyseries");
        const pelisSnapshot = await getDocs(pelisRef);

        let elementosEncontrados = 0;

        pelisSnapshot.forEach((docSnap) => {
            const itemData = docSnap.data();
            const listasItem = itemData.Listas;

            // 1. Comprobar si pertenece a la lista seleccionada
            let perteneceALista = false;
            if (Array.isArray(listasItem)) {
                perteneceALista = listasItem.some(l => l.trim().toLowerCase() === nombreListaParaBuscar.trim().toLowerCase());
            } else if (typeof listasItem === "string") {
                perteneceALista = listasItem.trim().toLowerCase() === nombreListaParaBuscar.trim().toLowerCase();
            }

            if (!perteneceALista) return;

            // 2. Filtro de EDAD: Si edadUsuarioGlobal < edadMinima, NO se muestra
            const edadMinimaItem = itemData.edadMinima !== undefined ? Number(itemData.edadMinima) : 0;
            if (edadUsuarioGlobal < edadMinimaItem) {
                return;
            }

            // 3. Filtro de TIPO y SUSCRIPCIÓN
            const tipoItem = itemData.type ? itemData.type.trim().toLowerCase() : "gratis";
            
            if (tipoItem === "pago") {
                // Comprobar que el campo subs (array en la peli/serie) coincida con la suscripción del usuario (subsUsuarioGlobal)
                const subsItem = itemData.subs;
                let coincideSubs = false;

                if (Array.isArray(subsItem)) {
                    coincideSubs = subsItem.some(s => s.trim().toLowerCase() === subsUsuarioGlobal.trim().toLowerCase());
                } else if (typeof subsItem === "string") {
                    coincideSubs = subsItem.trim().toLowerCase() === subsUsuarioGlobal.trim().toLowerCase();
                }

                // Si es de pago y no coincide la suscripción, se omite
                if (!coincideSubs) {
                    return;
                }
            }
            // Si pasa el filtro de edad y (es 'gratis' o 'pago' con suscripción válida), se muestra:
            elementosEncontrados++;
            const tarjetaItem = crearTarjetaMedia(itemData, docSnap.id);
            contenedorGrid.appendChild(tarjetaItem);
        });

        if (elementosEncontrados === 0) {
            contenedorGrid.innerHTML = `<p style="color: #000; font-style: italic;">${obtenerTextoTraduccion("text_sin_elementos", "No hay elementos en esta lista.")}</p>`;
        }

    } catch (error) {
        console.error("Error al cargar la lista y sus elementos:", error);
    }
}

function crearTarjetaMedia(itemData, docId) {
    const card = document.createElement("div");
    card.className = "pelicula-card";

    // Imagen / Poster (imgCartelera)
    const posterBox = document.createElement("div");
    posterBox.className = "poster-box";
    const imgPoster = document.createElement("img");
    imgPoster.className = "img-cartelera-thumb";
    imgPoster.src = normalizarSourceImagen(itemData.imgCartelera);
    imgPoster.alt = "Cartelera";
    posterBox.appendChild(imgPoster);

    // Detalles (Título como mapa de idiomas)
    const detailsBox = document.createElement("div");
    detailsBox.className = "pelicula-details";

    const tituloTxt = document.createElement("span");
    tituloTxt.className = "titulo-pelicula-txt";
    
    let textoTituloLocal = "";
    const campoTitulo = itemData.titulo;
    if (campoTitulo && typeof campoTitulo === "object") {
        textoTituloLocal = campoTitulo[currentLanguage] || campoTitulo["es"] || Object.values(campoTitulo)[0] || "";
    } else if (typeof campoTitulo === "string") {
        textoTituloLocal = campoTitulo;
    }
    tituloTxt.textContent = textoTituloLocal;

    detailsBox.appendChild(tituloTxt);
    card.appendChild(posterBox);
    card.appendChild(detailsBox);

    // --- EVENTO DE CLIC: COMPROBAR TIPO Y GUARDAR EN ESPAÑOL EN LOCALSTORAGE ---
    card.addEventListener("click", () => {
        // Obtener el identificador/título asegurando que se guarda en español (es)
        let tituloEnEspanol = "";
        if (campoTitulo && typeof campoTitulo === "object") {
            tituloEnEspanol = campoTitulo["es"] || Object.values(campoTitulo)[0] || "";
        } else if (typeof campoTitulo === "string") {
            tituloEnEspanol = campoTitulo;
        }

        // Si no hay título en string, usar el docId como fallback o el valor formateado
        const identificadorGuardar = tituloEnEspanol || docId;

        const categoriaMedia = itemData.categoria ? itemData.categoria.trim().toLowerCase() : "";
        // Comprobar si es película o serie
        if (categoriaMedia.includes("pelicula") || categoriaMedia.includes("movie")) {
            localStorage.setItem("titpeli", identificadorGuardar);
            window.location.href = "Película.html";
        } else if (categoriaMedia.includes("serie")) {
            localStorage.setItem("titserie", identificadorGuardar);
            window.location.href = "Serie.html";
        } else {
            // Fallback genérico por si el campo categoría varía ligeramente
            localStorage.setItem("titpeli", identificadorGuardar);
            window.location.href = "Película.html";
        }
    });

    return card;
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Lista:", error);
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

            // Inicializar el contenido de la lista una vez validados los datos de usuario y filtros
            await inicializarContenidoLista();
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en Lista:", error);
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