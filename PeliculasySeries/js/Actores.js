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

// Variables globales para la galería de imágenes del actor
let arrayImagenesActor = [];
let indiceImagenActual = 0;
let nombreActorSeleccionado = "";

// Diccionario de apoyo local para traducciones
const traduccionesLocales = {
    "label_nacimiento_fecha": {
        "es": "Fecha de nacimiento:",
        "en": "Date of birth:",
        "fr": "Date de naissance:",
        "ro": "Data nașterii:"
    },
    "label_lugar_nacimiento": {
        "es": "Lugar:",
        "en": "Place:",
        "fr": "Lieu:",
        "ro": "Locul:"
    },
    "label_filmografia_obras": {
        "es": "Filmografía y Obras",
        "en": "Filmography and Works",
        "fr": "Filmographie et Œuvres",
        "ro": "Filmografie și Lucrări"
    },
    "text_tipo_pelicula": {
        "es": "Película",
        "en": "Movie",
        "fr": "Film",
        "ro": "Film"
    },
    "text_tipo_serie": {
        "es": "Serie",
        "en": "Series",
        "fr": "Série",
        "ro": "Serial"
    },
    "text_actor_no_encontrado": {
        "es": "Actor no encontrado",
        "en": "Actor not found",
        "fr": "Acteur non trouvé",
        "ro": "Actorul nu a fost găsit"
    },
    "text_sin_obras": {
        "es": "No se encontraron películas ni series relacionadas.",
        "en": "No related movies or series were found.",
        "fr": "Aucun film ou série asociado n'a été trouvé.",
        "ro": "Nu au fost găsite filme sau seriale conexe."
    },
    "text_error_edad_modal": {
        "es": "No tienes la edad recomendada para esta Película/Serie",
        "en": "You do not have the recommended age for this Movie/Series",
        "fr": "Vous n'avez pas l'âge recommandé pour ce Film/Série",
        "ro": "Nu aveți vârsta recomandată pentru acest Film/Serial"
    },
    "text_error_subs_modal": {
        "es": "Esta Película/Serie necesita la subscripción:",
        "en": "This Movie/Series requires subscription:",
        "fr": "Ce Film/Série nécessite el abonnement:",
        "ro": "Acest Film/Serial necesită abonamentul:"
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
        btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "");
    }

    const lblNac = document.getElementById("label-nacimiento");
    if (lblNac) {
        lblNac.textContent = obtenerTextoTraduccion("label_nacimiento_fecha", "Fecha de nacimiento:");
    }

    const lblLug = document.getElementById("label-lugar");
    if (lblLug) {
        lblLug.textContent = obtenerTextoTraduccion("label_lugar_nacimiento", "Lugar:");
    }

    const lblFilm = document.getElementById("titulo-filmografia");
    if (lblFilm) {
        lblFilm.textContent = obtenerTextoTraduccion("label_filmografia_obras", "Filmografía y Obras");
    }
}

// --- POP-UP MODAL PERSONALIZADO ---
function mostrarModalAviso(mensajeText) {
    const modal = document.getElementById("modal-aviso-acceso");
    const txtMensaje = document.getElementById("modal-aviso-mensaje");

    if (modal && txtMensaje) {
        txtMensaje.textContent = mensajeText;
        modal.style.display = "flex";
    }
}

function cerrarModalAviso() {
    const modal = document.getElementById("modal-aviso-acceso");
    if (modal) modal.style.display = "none";
}

// --- CARGA DE DATOS DEL ACTOR Y SUS OBRAS ---
async function cargarDatosActor() {
    nombreActorSeleccionado = localStorage.getItem("actorseleccionado");
    const tituloActorElem = document.getElementById("titulo-actor-nombre");

    if (!nombreActorSeleccionado) {
        if (tituloActorElem) {
            tituloActorElem.textContent = obtenerTextoTraduccion("text_actor_no_encontrado", "Actor no encontrado");
        }
        return;
    }

    if (tituloActorElem) {
        tituloActorElem.textContent = nombreActorSeleccionado;
    }

    try {
        const actoresRef = collection(db, "Actores");
        const qActor = query(actoresRef, where("nombre", "==", nombreActorSeleccionado));
        const querySnapshot = await getDocs(qActor);

        if (!querySnapshot.empty) {
            const actorData = querySnapshot.docs[0].data();

            if (actorData.imagenes && Array.isArray(actorData.imagenes) && actorData.imagenes.length > 0) {
                arrayImagenesActor = actorData.imagenes;
                mostrarImagenGaleria(0);
            } else {
                mostrarImagenGaleria(0);
            }

            renderizarFichaInfoActor(actorData);

        } else {
            console.warn("No se encontró ficha para el actor:", nombreActorSeleccionado);
        }

        await cargarFilmografiaActor();

    } catch (error) {
        console.error("Error al cargar información del actor:", error);
    }
}

function mostrarImagenGaleria(index) {
    const imgElem = document.getElementById("img-actor-display");
    const btnPrev = document.getElementById("btn-galeria-prev");
    const btnNext = document.getElementById("btn-galeria-next");

    if (!imgElem) return;

    if (arrayImagenesActor.length === 0) {
        imgElem.src = "../default-profile.png";
        if (btnPrev) btnPrev.style.display = "none";
        if (btnNext) btnNext.style.display = "none";
        return;
    }

    indiceImagenActual = index;
    imgElem.src = normalizarSourceImagen(arrayImagenesActor[indiceImagenActual]);

    if (arrayImagenesActor.length > 1) {
        if (btnPrev) btnPrev.style.display = "flex";
        if (btnNext) btnNext.style.display = "flex";
    } else {
        if (btnPrev) btnPrev.style.display = "none";
        if (btnNext) btnNext.style.display = "none";
    }
}

function renderizarFichaInfoActor(actorData) {
    const contenedorCard = document.getElementById("contenedor-info-actor");
    const valNacimiento = document.getElementById("val-nacimiento");
    const valLugar = document.getElementById("val-lugar");
    const txtBio = document.getElementById("info-actor-txt");

    if (contenedorCard) contenedorCard.style.display = "flex";

    if (valNacimiento) {
        valNacimiento.textContent = actorData.fechanacimiento || "---";
    }

    if (valLugar) {
        valLugar.textContent = actorData.lugar || "---";
    }

    if (txtBio) {
        let textoInfo = "";
        const mapaInfo = actorData["info del actor"];

        if (mapaInfo && typeof mapaInfo === "object") {
            textoInfo = mapaInfo[currentLanguage] || mapaInfo["es"] || Object.values(mapaInfo)[0] || "";
        } else if (typeof mapaInfo === "string") {
            textoInfo = mapaInfo;
        }
        
        txtBio.textContent = textoInfo;
    }
}

// --- BÚSQUEDA EN COLECCIÓN Peliculasyseries ---
async function cargarFilmografiaActor() {
    const contenedorGrid = document.getElementById("contenedor-grid-filmografia");
    if (!contenedorGrid) return;

    contenedorGrid.innerHTML = "";

    try {
        const psRef = collection(db, "Peliculasyseries");
        const qPS = query(psRef, where("Actores", "array-contains", nombreActorSeleccionado));
        const querySnapshot = await getDocs(qPS);

        if (querySnapshot.empty) {
            contenedorGrid.innerHTML = `<p style="color: #000; font-style: italic;">${obtenerTextoTraduccion("text_sin_obras", "No se encontraron películas ni series relacionadas.")}</p>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const obraData = docSnap.data();
            const tarjetaObra = crearTarjetaFilmografia(obraData);
            contenedorGrid.appendChild(tarjetaObra);
        });

    } catch (error) {
        console.error("Error al consultar las obras del actor:", error);
    }
}

function crearTarjetaFilmografia(obraData) {
    const card = document.createElement("div");
    card.className = "filmografia-card";

    // Poster (imgCartelera)
    const posterBox = document.createElement("div");
    posterBox.className = "poster-box";
    const imgPoster = document.createElement("img");
    imgPoster.className = "img-cartelera-thumb";
    imgPoster.src = normalizarSourceImagen(obraData.imgCartelera);
    imgPoster.alt = "Cartelera";
    posterBox.appendChild(imgPoster);

    // Detalles (titulo + tipo)
    const detailsBox = document.createElement("div");
    detailsBox.className = "filmografia-details";

    // Título traducido para la vista
    const tituloTxt = document.createElement("span");
    tituloTxt.className = "titulo-obras-txt";
    let textoTituloLocal = "";
    if (obraData.titulo && typeof obraData.titulo === "object") {
        textoTituloLocal = obraData.titulo[currentLanguage] || obraData.titulo["es"] || Object.values(obraData.titulo)[0] || "";
    } else if (typeof obraData.titulo === "string") {
        textoTituloLocal = obraData.titulo;
    }
    tituloTxt.textContent = textoTituloLocal;

    // Tipo traducido (Película / Serie)
    const tipoBadge = document.createElement("span");
    tipoBadge.className = "tipo-obras-badge";
    let textoTipo = "";
    const tipoRaw = (obraData.tipo || "").toLowerCase();

    const esPelicula = tipoRaw.includes("pelicula") || tipoRaw.includes("movie") || tipoRaw === "película";

    if (esPelicula) {
        textoTipo = obtenerTextoTraduccion("text_tipo_pelicula", "Película");
    } else {
        textoTipo = obtenerTextoTraduccion("text_tipo_serie", "Serie");
    }
    tipoBadge.textContent = textoTipo;

    detailsBox.appendChild(tituloTxt);
    detailsBox.appendChild(tipoBadge);

    card.appendChild(posterBox);
    card.appendChild(detailsBox);

    // --- EVENTO DE Clic CON LÓGICA COMPLETA DE NAVEGACIÓN Y FILTROS ---
    card.addEventListener("click", () => {
        procesarAccesoYNavegacion(obraData, esPelicula);
    });

    return card;
}

// --- SISTEMA DE CONTROL DE FILTROS Y REDIRECCIÓN ---
function procesarAccesoYNavegacion(obraData, esPelicula) {
    // 1. FILTRO DE EDAD
    const edadMinima = obraData.edadMinima !== undefined ? Number(obraData.edadMinima) : 0;
    
    if (edadUsuarioGlobal < edadMinima) {
        const msgEdad = obtenerTextoTraduccion("text_error_edad_modal", "No tienes la edad recomendada para esta Película/Serie");
        mostrarModalAviso(msgEdad);
        return;
    }

    // 2. FILTRO DE ACCESO Y SUSCRIPCIÓN (type)
    const tipoAcceso = obraData.type || "Gratis";

    if (tipoAcceso === "Pago") {
        const arraySubsObra = Array.isArray(obraData.subs) ? obraData.subs : [];
        const tieneSuscripcionValida = arraySubsObra.includes(subsUsuarioGlobal);

        if (!tieneSuscripcionValida) {
            const prefijoMsg = obtenerTextoTraduccion("text_error_subs_modal", "Esta Película/Serie necesita la subscripción:");
            const listaSubsStr = arraySubsObra.join(", ");
            mostrarModalAviso(`${prefijoMsg} ${listaSubsStr}`);
            return;
        }
    }

    // 3. EXTRAER SIEMPRE EL TÍTULO EN ESPAÑOL ("es") PARA LOCALSTORAGE
    let tituloEnEspanol = "";
    if (obraData.titulo && typeof obraData.titulo === "object") {
        tituloEnEspanol = obraData.titulo["es"] || obraData.titulo[currentLanguage] || Object.values(obraData.titulo)[0] || "";
    } else if (typeof obraData.titulo === "string") {
        tituloEnEspanol = obraData.titulo;
    }

    // 4. ALMACENAR EN LOCALSTORAGE Y NAVEGAR
    if (esPelicula) {
        localStorage.setItem("titpeli", tituloEnEspanol);
        window.location.href = "Película.html";
    } else {
        localStorage.setItem("titserie", tituloEnEspanol);
        window.location.href = "Serie.html";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Actores:", error);
    }

    aplicarTraduccionesEstaticas();
    await cargarDatosActor();

    // Eventos Modal Aviso Pop-up
    const btnCerrarModalAviso = document.getElementById("btn-cerrar-modal-aviso");
    if (btnCerrarModalAviso) {
        btnCerrarModalAviso.addEventListener("click", cerrarModalAviso);
    }

    const btnAceptarModalAviso = document.getElementById("btn-aceptar-modal-aviso");
    if (btnAceptarModalAviso) {
        btnAceptarModalAviso.addEventListener("click", cerrarModalAviso);
    }

    const modalOverlayAviso = document.getElementById("modal-aviso-acceso");
    if (modalOverlayAviso) {
        modalOverlayAviso.addEventListener("click", (e) => {
            if (e.target === modalOverlayAviso) cerrarModalAviso();
        });
    }

    // Eventos Carrusel de imágenes
    const btnPrev = document.getElementById("btn-galeria-prev");
    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            let nuevoIndex = indiceImagenActual - 1;
            if (nuevoIndex < 0) nuevoIndex = arrayImagenesActor.length - 1;
            mostrarImagenGaleria(nuevoIndex);
        });
    }

    const btnNext = document.getElementById("btn-galeria-next");
    if (btnNext) {
        btnNext.addEventListener("click", () => {
            let nuevoIndex = indiceImagenActual + 1;
            if (nuevoIndex >= arrayImagenesActor.length) nuevoIndex = 0;
            mostrarImagenGaleria(nuevoIndex);
        });
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
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en Actores:", error);
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