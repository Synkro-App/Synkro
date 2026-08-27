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

// Variables globales de contexto
let datosSerieActual = null;
let tituloSerieBuscado = "";
let numTemporadaSeleccionada = "";

// Diccionario local para traducciones de apoyo
const traduccionesLocales = {
    "label_temporada_num": {
        "es": "Temporada",
        "en": "Season",
        "fr": "Saison",
        "ro": "Sezonul"
    },
    "label_episodios_num": {
        "es": "Episodios:",
        "en": "Episodes:",
        "fr": "Épisodes:",
        "ro": "Episoade:"
    },
    "btn_ver_episodio": {
        "es": "Ver episodio",
        "en": "Watch episode",
        "fr": "Regarder l'épisode",
        "ro": "Vizionează episodul"
    },
    "text_seleccionar_idioma_ver": {
        "es": "Selecciona una opción para reproducir:",
        "en": "Select an option to play:",
        "fr": "Choisissez une option a lire:",
        "ro": "Selectează o opțiune pentru redare:"
    },
    "text_episodio_num_label": {
        "es": "Episodio",
        "en": "Episode",
        "fr": "Épisode",
        "ro": "Episodul"
    }
};

// --- FUNCIÓN PARA FORMATEAR IMÁGENES BASE64 O URL ---
function normalizarSourceImagen(cadenaImagen) {
    if (!cadenaImagen) return "../default-poster.png";
    
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
        btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "");
    }

    const lblEpisodios = document.getElementById("label-num-episodios");
    if (lblEpisodios) {
        lblEpisodios.textContent = obtenerTextoTraduccion("label_episodios_num", "Episodios:");
    }

    const subOpcionesModal = document.getElementById("modal-subtitulo-opciones");
    if (subOpcionesModal) {
        subOpcionesModal.textContent = obtenerTextoTraduccion("text_seleccionar_idioma_ver", "Selecciona una opción para reproducir:");
    }
}

// --- CARGAR INFORMACIÓN DE LA TEMPORADA Y EPISODIOS ---
async function cargarDatosTemporadaHeader() {
    tituloSerieBuscado = localStorage.getItem("titserie");
    numTemporadaSeleccionada = localStorage.getItem("ntemporadaseleccionado");
    const elemHeaderTitulo = document.getElementById("titulo-temporada-full");

    if (!tituloSerieBuscado) {
        if (elemHeaderTitulo) {
            elemHeaderTitulo.textContent = obtenerTextoTraduccion("text_serie_no_encontrada", "Serie no encontrada");
        }
        return;
    }

    try {
        const serieRef = collection(db, "Peliculasyseries");
        const qSerie = query(serieRef, where("titulo.es", "==", tituloSerieBuscado));
        const querySnapshot = await getDocs(qSerie);

        if (!querySnapshot.empty) {
            const serieDoc = querySnapshot.docs[0];
            datosSerieActual = serieDoc.data();

            // Formateo del título traducido
            let tituloTraducido = "";
            if (datosSerieActual.titulo && typeof datosSerieActual.titulo === "object") {
                tituloTraducido = datosSerieActual.titulo[currentLanguage] || datosSerieActual.titulo["es"] || Object.values(datosSerieActual.titulo)[0] || "";
            } else if (typeof datosSerieActual.titulo === "string") {
                tituloTraducido = datosSerieActual.titulo;
            }

            // Etiqueta traducida de Temporada
            const labelTemp = obtenerTextoTraduccion("label_temporada_num", "Temporada");
            const tempTexto = numTemporadaSeleccionada ? `${labelTemp} ${numTemporadaSeleccionada}` : "";

            if (elemHeaderTitulo) {
                if (tempTexto) {
                    elemHeaderTitulo.textContent = `${tituloTraducido} - ${tempTexto}`;
                } else {
                    elemHeaderTitulo.textContent = tituloTraducido;
                }
            }

            // Procesado de la temporada y sus episodios
            renderizarInfoTemporadaYEpisodios();

        } else {
            if (elemHeaderTitulo) {
                elemHeaderTitulo.textContent = obtenerTextoTraduccion("text_serie_no_encontrada", "Serie no encontrada");
            }
        }
    } catch (error) {
        console.error("Error al obtener la serie para la temporada:", error);
        if (elemHeaderTitulo) {
            elemHeaderTitulo.textContent = obtenerTextoTraduccion("text_error_cargando_titulo", "Error al cargar título");
        }
    }
}

function renderizarInfoTemporadaYEpisodios() {
    if (!datosSerieActual || !datosSerieActual.Temporadas) return;

    const mapaTemporadas = datosSerieActual.Temporadas;
    const objetoTemporada = mapaTemporadas[numTemporadaSeleccionada];

    if (!objetoTemporada) {
        console.warn(`No se encontró información para la temporada ${numTemporadaSeleccionada}`);
        return;
    }

    // Elementos DOM Ficha Temporada
    const contenedorCard = document.getElementById("contenedor-info-temporada");
    const imgElem = document.getElementById("img-temporada");
    const valEpisodiosElem = document.getElementById("val-num-episodios");
    const sinopsisElem = document.getElementById("sinopsis-temporada-txt");
    const listaEpisodiosContainer = document.getElementById("contenedor-lista-episodios");

    if (contenedorCard) contenedorCard.style.display = "flex";

    // 1. Imagen de la Temporada
    if (imgElem) {
        imgElem.src = normalizarSourceImagen(objetoTemporada.imgtemporada);
    }

    // 2. Número de episodios
    if (valEpisodiosElem) {
        valEpisodiosElem.textContent = objetoTemporada.nepisodios !== undefined ? objetoTemporada.nepisodios : 0;
    }

    // 3. Sinopsis de la temporada
    if (sinopsisElem) {
        let sinopsisTexto = "";
        if (objetoTemporada.sinopsistemporada && typeof objetoTemporada.sinopsistemporada === "object") {
            sinopsisTexto = objetoTemporada.sinopsistemporada[currentLanguage] || objetoTemporada.sinopsistemporada["es"] || Object.values(objetoTemporada.sinopsistemporada)[0] || "";
        } else if (typeof objetoTemporada.sinopsistemporada === "string") {
            sinopsisTexto = objetoTemporada.sinopsistemporada;
        }
        sinopsisElem.textContent = sinopsisTexto;
    }

    // 4. Renderizado completo de los episodios
    if (listaEpisodiosContainer) {
        listaEpisodiosContainer.innerHTML = "";

        if (objetoTemporada.episodios && typeof objetoTemporada.episodios === "object") {
            const llavesEpisodios = Object.keys(objetoTemporada.episodios);

            // Orden numérico de episodios
            llavesEpisodios.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

            llavesEpisodios.forEach((numEpisodio) => {
                const datosEpisodio = objetoTemporada.episodios[numEpisodio];
                
                if (datosEpisodio) {
                    const tarjetaEpisodio = crearTarjetaEpisodio(numEpisodio, datosEpisodio);
                    listaEpisodiosContainer.appendChild(tarjetaEpisodio);
                }
            });
        }
    }
}

// --- CONSTRUCCIÓN DE CADA TARJETA DE EPISODIO ---
function crearTarjetaEpisodio(numEpisodio, datosEpisodio) {
    const card = document.createElement("div");
    card.className = "episodio-card";

    // 1. Imagen a la izquierda (imgepisodio)
    const imgContainer = document.createElement("div");
    imgContainer.className = "episodio-img-box";
    const imgEpisodio = document.createElement("img");
    imgEpisodio.className = "img-episodio-thumb";
    imgEpisodio.src = normalizarSourceImagen(datosEpisodio.imgepisodio);
    imgEpisodio.alt = `Episodio ${numEpisodio}`;
    imgContainer.appendChild(imgEpisodio);

    // 2. Información del episodio
    const infoContainer = document.createElement("div");
    infoContainer.className = "episodio-info-box";

    const headRow = document.createElement("div");
    headRow.className = "episodio-head-row";

    // Número de episodio (nepisodio)
    const badgeNum = document.createElement("span");
    badgeNum.className = "num-episodio-badge";
    const labelEp = obtenerTextoTraduccion("text_episodio_num_label", "Episodio");
    const valNepisodio = datosEpisodio.nepisodio !== undefined ? datosEpisodio.nepisodio : numEpisodio;
    badgeNum.textContent = `${labelEp} ${valNepisodio}:`;

    // Nombre localizado (nombre)
    const nombreTxt = document.createElement("span");
    nombreTxt.className = "nombre-episodio-txt";
    let textoNombre = "";
    if (datosEpisodio.nombre && typeof datosEpisodio.nombre === "object") {
        textoNombre = datosEpisodio.nombre[currentLanguage] || datosEpisodio.nombre["es"] || Object.values(datosEpisodio.nombre)[0] || "";
    } else if (typeof datosEpisodio.nombre === "string") {
        textoNombre = datosEpisodio.nombre;
    }
    nombreTxt.textContent = textoNombre;

    // Duración (duracionepisodio)
    const duracionTxt = document.createElement("span");
    duracionTxt.className = "duracion-episodio-txt";
    if (datosEpisodio.duracionepisodio) {
        duracionTxt.textContent = `${datosEpisodio.duracionepisodio}`;
    }

    headRow.appendChild(badgeNum);
    headRow.appendChild(nombreTxt);
    headRow.appendChild(duracionTxt);

    // Resumen localizado (resumen)
    const resumenTxt = document.createElement("p");
    resumenTxt.className = "resumen-episodio-txt";
    let textoResumen = "";
    if (datosEpisodio.resumen && typeof datosEpisodio.resumen === "object") {
        textoResumen = datosEpisodio.resumen[currentLanguage] || datosEpisodio.resumen["es"] || Object.values(datosEpisodio.resumen)[0] || "";
    } else if (typeof datosEpisodio.resumen === "string") {
        textoResumen = datosEpisodio.resumen;
    }
    resumenTxt.textContent = textoResumen;

    infoContainer.appendChild(headRow);
    infoContainer.appendChild(resumenTxt);

    // 3. Botón Ver episodio
    const actionContainer = document.createElement("div");
    actionContainer.className = "episodio-action-box";

    const btnVer = document.createElement("button");
    btnVer.type = "button";
    btnVer.className = "btn-default";
    btnVer.textContent = obtenerTextoTraduccion("btn_ver_episodio", "Ver episodio");

    btnVer.addEventListener("click", () => {
        abrirModalOpcionesVer(numEpisodio, textoNombre, datosEpisodio.ver);
    });

    actionContainer.appendChild(btnVer);

    // Unir todo al contenedor general de la tarjeta
    card.appendChild(imgContainer);
    card.appendChild(infoContainer);
    card.appendChild(actionContainer);

    return card;
}

// --- MANEJO DEL MODAL POP-UP (CAMPO MAPA "ver") ---
function abrirModalOpcionesVer(numEpisodio, nombreEpisodio, mapaVer) {
    const modal = document.getElementById("modal-opciones-ver");
    const tituloModal = document.getElementById("modal-titulo-episodio");
    const contenedorBotones = document.getElementById("contenedor-botones-ver");

    if (!modal || !contenedorBotones) return;

    const labelEp = obtenerTextoTraduccion("text_episodio_num_label", "Episodio");
    if (tituloModal) {
        tituloModal.textContent = `${labelEp} ${numEpisodio} - ${nombreEpisodio}`;
    }

    contenedorBotones.innerHTML = "";

    if (mapaVer && typeof mapaVer === "object") {
        const opcionesIdiomas = Object.keys(mapaVer);

        opcionesIdiomas.forEach((nombreOpcion) => {
            const urlEnlace = mapaVer[nombreOpcion];

            const btnOpcion = document.createElement("button");
            btnOpcion.type = "button";
            btnOpcion.className = "btn-opcion-ver";
            btnOpcion.textContent = nombreOpcion;

            btnOpcion.addEventListener("click", () => {
                cerrarModalVer();
                reproducirEnlaceEpisodio(nombreEpisodio, urlEnlace);
            });

            contenedorBotones.appendChild(btnOpcion);
        });
    }

    modal.style.display = "flex";
}

function cerrarModalVer() {
    const modal = document.getElementById("modal-opciones-ver");
    if (modal) modal.style.display = "none";
}

// --- MANEJO DEL REPRODUCTOR EN LA MISMA PÁGINA (IFRAME) ---
function reproducirEnlaceEpisodio(nombreEpisodio, urlEnlace) {
    const contenedorReproductor = document.getElementById("contenedor-reproductor-mpd");
    const txtTituloRep = document.getElementById("titulo-reproduccion-actual");
    const iframeElement = document.getElementById("video-player-iframe");

    if (!contenedorReproductor || !iframeElement) return;

    if (txtTituloRep) {
        txtTituloRep.textContent = nombreEpisodio;
    }

    contenedorReproductor.style.display = "flex";
    contenedorReproductor.scrollIntoView({ behavior: 'smooth' });

    let urlFinal = String(urlEnlace).trim();
    iframeElement.src = urlFinal;
}

function cerrarReproductor() {
    const contenedorReproductor = document.getElementById("contenedor-reproductor-mpd");
    const iframeElement = document.getElementById("video-player-iframe");

    if (iframeElement) {
        iframeElement.src = "";
    }

    if (contenedorReproductor) {
        contenedorReproductor.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Temporadas:", error);
    }

    aplicarTraduccionesEstaticas();
    await cargarDatosTemporadaHeader();

    // Eventos de botones modal y reproductor
    const btnCerrarModal = document.getElementById("btn-cerrar-modal");
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener("click", cerrarModalVer);
    }

    const modalOverlay = document.getElementById("modal-opciones-ver");
    if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) cerrarModalVer();
        });
    }

    const btnCerrarRep = document.getElementById("btn-cerrar-reproductor");
    if (btnCerrarRep) {
        btnCerrarRep.addEventListener("click", cerrarReproductor);
    }

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");

    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "../index.html";
        return;
    }

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
            if (imgAvatar) imgAvatar.src = normalizarSourceImagen(userData.imgperfil) || "../default-profile.png";
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
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en Temporadas:", error);
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