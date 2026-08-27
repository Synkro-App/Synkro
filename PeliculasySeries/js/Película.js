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
    deleteField,
    setDoc,
    deleteDoc 
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

// Variables globales para la película actual
let datosPeliculaActual = null;
let tituloBuscadoGlobal = "";

// Banderas de estado
let esFavorita = false;
let esVista = false;

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

    // Etiquetas estáticas de la película
    const lblEdad = document.getElementById("label-edad-recomendada");
    if (lblEdad) lblEdad.textContent = obtenerTextoTraduccion("label_edad_recomendada", "Edad recomendada:");

    const lblEstreno = document.getElementById("label-fecha-estreno");
    if (lblEstreno) lblEstreno.textContent = obtenerTextoTraduccion("label_fecha_estreno", "Fecha de estreno:");

    const lblDuracion = document.getElementById("label-duracion");
    if (lblDuracion) lblDuracion.textContent = obtenerTextoTraduccion("label_duracion", "Duración:");

    const lblCategorias = document.getElementById("label-categorias");
    if (lblCategorias) lblCategorias.textContent = obtenerTextoTraduccion("label_categorias", "Categorías:");

    const lblListas = document.getElementById("label-listas");
    if (lblListas) lblListas.textContent = obtenerTextoTraduccion("label_listas", "Listas:");

    const lblActores = document.getElementById("label-actores");
    if (lblActores) lblActores.textContent = obtenerTextoTraduccion("label_actores", "Actores:");

    // Botones de acción externos
    actualizarTextoBotonFavoritos();
    actualizarTextoBotonVistas();

    const btnTrailer = document.getElementById("btn-ver-trailer");
    if (btnTrailer) btnTrailer.textContent = obtenerTextoTraduccion("btn_ver_trailer", "Ver trailer");

    const btnVerPeli = document.getElementById("btn-ver-pelicula");
    if (btnVerPeli) btnVerPeli.textContent = obtenerTextoTraduccion("btn_ver_pelicula", "Ver película");
}

function actualizarTextoBotonFavoritos() {
    const btnFav = document.getElementById("btn-agregar-favoritas");
    if (!btnFav) return;

    if (esFavorita) {
        btnFav.textContent = obtenerTextoTraduccion("btn_eliminar_favoritas", "Eliminar de favoritas");
    } else {
        btnFav.textContent = obtenerTextoTraduccion("btn_agregar_favoritas", "Agregar a favoritas");
    }
}

function actualizarTextoBotonVistas() {
    const btnVistas = document.getElementById("btn-agregar-vistas");
    if (!btnVistas) return;

    if (esVista) {
        btnVistas.textContent = obtenerTextoTraduccion("btn_eliminar_vistas", "Eliminar de vistas");
    } else {
        btnVistas.textContent = obtenerTextoTraduccion("btn_agregar_vistas", "Agregar a vistas");
    }
}

// Auxiliar para formatear fuentes de imagen (Base64 / URL)
function procesarFuenteImagen(rawImg) {
    if (!rawImg) return "../default-profile.png";
    let finalSrc = String(rawImg).trim();

    if (
        finalSrc.startsWith("http://") || 
        finalSrc.startsWith("https://") || 
        finalSrc.startsWith("data:") || 
        finalSrc.startsWith("blob:") ||
        finalSrc.startsWith("./") ||
        finalSrc.startsWith("../")
    ) {
        return finalSrc;
    } else if (finalSrc.startsWith("iVBORw0KGgo")) {
        return `data:image/png;base64,${finalSrc}`;
    } else if (finalSrc.startsWith("/9j/") || finalSrc.startsWith("9j/")) {
        return `data:image/jpeg;base64,${finalSrc.startsWith("/") ? finalSrc : "/" + finalSrc}`;
    } else if (finalSrc.startsWith("PHN2Zy") || finalSrc.startsWith("<svg")) {
        return finalSrc.startsWith("<svg") 
            ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(finalSrc)}` 
            : `data:image/svg+xml;base64,${finalSrc}`;
    } else {
        return `data:image/jpeg;base64,${finalSrc}`;
    }
}

// --- BÚSQUEDA Y CARGA COMPLETA DE LA PELÍCULA SEGÚN "titpeli" DE LOCALSTORAGE ---
async function cargarDatosPelicula() {
    tituloBuscadoGlobal = localStorage.getItem("titpeli");
    const elemTitulo = document.getElementById("titulo-pelicula");

    if (!tituloBuscadoGlobal) {
        if (elemTitulo) {
            elemTitulo.textContent = obtenerTextoTraduccion("text_pelicula_no_encontrada", "Película no encontrada");
        }
        return;
    }

    try {
        const peliRef = collection(db, "Peliculasyseries");
        const qPeli = query(peliRef, where("titulo.es", "==", tituloBuscadoGlobal));
        const querySnapshot = await getDocs(qPeli);

        if (!querySnapshot.empty) {
            const peliDoc = querySnapshot.docs[0];
            datosPeliculaActual = peliDoc.data();

            // 1. TÍTULO (mapa de idiomas)
            if (datosPeliculaActual.titulo && typeof datosPeliculaActual.titulo === "object") {
                const tituloTraducido = datosPeliculaActual.titulo[currentLanguage] || datosPeliculaActual.titulo["es"] || Object.values(datosPeliculaActual.titulo)[0] || "";
                if (elemTitulo) elemTitulo.textContent = tituloTraducido;
            } else if (typeof datosPeliculaActual.titulo === "string") {
                if (elemTitulo) elemTitulo.textContent = datosPeliculaActual.titulo;
            } else {
                if (elemTitulo) {
                    elemTitulo.textContent = obtenerTextoTraduccion("text_pelicula_no_encontrada", "Película no encontrada");
                }
            }

            // 2. IMAGEN PRINCIPAL DE LA PELÍCULA
            const imgEl = document.getElementById("img-pelicula");
            const rawImg = datosPeliculaActual.imgPelicula || datosPeliculaActual.imgpelicula || datosPeliculaActual.img || datosPeliculaActual.imagen;

            if (imgEl && rawImg) {
                imgEl.src = procesarFuenteImagen(rawImg);
            }

            // 3. EDAD MÍNIMA
            const valEdad = document.getElementById("val-edad-minima");
            if (valEdad) {
                valEdad.textContent = datosPeliculaActual.edadMinima !== undefined ? `${datosPeliculaActual.edadMinima}+` : "";
            }

            // 4. FECHA DE ESTRENO
            const valEstreno = document.getElementById("val-fecha-estreno");
            if (valEstreno) {
                valEstreno.textContent = datosPeliculaActual.fechaestreno || "";
            }

            // 5. DURACIÓN
            const valDuracion = document.getElementById("val-duracion");
            if (valDuracion) {
                valDuracion.textContent = datosPeliculaActual.duracion || "";
            }

            // 6. SINOPSIS
            const valSinopsis = document.getElementById("val-sinopsis");
            if (valSinopsis) {
                if (datosPeliculaActual.sinopsis && typeof datosPeliculaActual.sinopsis === "object") {
                    valSinopsis.textContent = datosPeliculaActual.sinopsis[currentLanguage] || datosPeliculaActual.sinopsis["es"] || Object.values(datosPeliculaActual.sinopsis)[0] || "";
                } else if (typeof datosPeliculaActual.sinopsis === "string") {
                    valSinopsis.textContent = datosPeliculaActual.sinopsis;
                }
            }

            // 7. CATEGORÍAS (Generación de botones rojos)
            const valCategorias = document.getElementById("val-categorias");
            if (valCategorias) {
                valCategorias.innerHTML = "";
                let listaCategorias = [];
                if (Array.isArray(datosPeliculaActual.Categorías)) listaCategorias = datosPeliculaActual.Categorías;
                else if (Array.isArray(datosPeliculaActual.categorias)) listaCategorias = datosPeliculaActual.categorias;
                else if (typeof datosPeliculaActual.Categorías === "string") listaCategorias = datosPeliculaActual.Categorías.split(",").map(c => c.trim());
                else if (typeof datosPeliculaActual.categorias === "string") listaCategorias = datosPeliculaActual.categorias.split(",").map(c => c.trim());

                listaCategorias.forEach(cat => {
                    if (!cat) return;
                    const btnCat = document.createElement("button");
                    btnCat.type = "button";
                    btnCat.className = "btn-red-item";
                    btnCat.textContent = cat;
                    btnCat.addEventListener("click", () => {
                        localStorage.setItem("categoriaseleccionada", cat);
                        window.location.href = "Categorías.html";
                    });
                    valCategorias.appendChild(btnCat);
                });
            }

            // 8. LISTAS (Generación de botones rojos)
            const valListas = document.getElementById("val-listas");
            if (valListas) {
                valListas.innerHTML = "";
                let listaListas = [];
                if (Array.isArray(datosPeliculaActual.Listas)) listaListas = datosPeliculaActual.Listas;
                else if (Array.isArray(datosPeliculaActual.listas)) listaListas = datosPeliculaActual.listas;
                else if (typeof datosPeliculaActual.Listas === "string") listaListas = datosPeliculaActual.Listas.split(",").map(l => l.trim());
                else if (typeof datosPeliculaActual.listas === "string") listaListas = datosPeliculaActual.listas.split(",").map(l => l.trim());

                listaListas.forEach(lis => {
                    if (!lis) return;
                    const btnLis = document.createElement("button");
                    btnLis.type = "button";
                    btnLis.className = "btn-red-item";
                    btnLis.textContent = lis;
                    btnLis.addEventListener("click", () => {
                        localStorage.setItem("listaseleccionada", lis);
                        window.location.href = "Lista.html";
                    });
                    valListas.appendChild(btnLis);
                });
            }

            // 9. ACTORES
            const valActores = document.getElementById("val-actores");
            if (valActores) {
                valActores.innerHTML = "";
                let listaActores = [];
                if (Array.isArray(datosPeliculaActual.Actores)) listaActores = datosPeliculaActual.Actores;
                else if (Array.isArray(datosPeliculaActual.actores)) listaActores = datosPeliculaActual.actores;
                else if (typeof datosPeliculaActual.Actores === "string") listaActores = datosPeliculaActual.Actores.split(",").map(a => a.trim());
                else if (typeof datosPeliculaActual.actores === "string") listaActores = datosPeliculaActual.actores.split(",").map(a => a.trim());

                const actoresRef = collection(db, "Actores");

                for (const nombreActor of listaActores) {
                    if (!nombreActor) continue;

                    const btnActor = document.createElement("button");
                    btnActor.type = "button";
                    btnActor.className = "btn-actor-card";

                    const imgActor = document.createElement("img");
                    imgActor.className = "actor-thumb-round";
                    imgActor.alt = nombreActor;
                    imgActor.src = "../default-profile.png";

                    const spanNombre = document.createElement("span");
                    spanNombre.className = "actor-name-text";
                    spanNombre.textContent = nombreActor;

                    btnActor.appendChild(imgActor);
                    btnActor.appendChild(spanNombre);

                    btnActor.addEventListener("click", () => {
                        localStorage.setItem("actorseleccionado", nombreActor);
                        window.location.href = "Actores.html";
                    });

                    valActores.appendChild(btnActor);

                    try {
                        const qActor = query(actoresRef, where("nombre", "==", nombreActor));
                        const snapshotActor = await getDocs(qActor);

                        if (!snapshotActor.empty) {
                            const dataActor = snapshotActor.docs[0].data();
                            const rawImgActor = dataActor.imgprincipal || dataActor.imgPrincipal || dataActor.img || dataActor.imagen;
                            if (rawImgActor) {
                                imgActor.src = procesarFuenteImagen(rawImgActor);
                            }
                        }
                    } catch (errActor) {
                        console.error(`Error buscando foto de actor ${nombreActor}:`, errActor);
                    }
                }
            }

        } else {
            if (elemTitulo) {
                elemTitulo.textContent = obtenerTextoTraduccion("text_pelicula_no_encontrada", "Película no encontrada");
            }
        }
    } catch (error) {
        console.error("Error al buscar la película por título:", error);
        if (elemTitulo) {
            elemTitulo.textContent = obtenerTextoTraduccion("text_error_cargando_titulo", "Error al cargar título");
        }
    }
}

// --- ESCUCHA DE ESTADO DE SUBCOLECCIONES Y EVENTOS DE BOTONES ---
function inicializarEventosSubcolecciones() {
    if (!userDocIdGlobal || !tituloBuscadoGlobal) return;

    const docFavRef = doc(db, "Usuarios", userDocIdGlobal, "Películas y Series Favoritas", tituloBuscadoGlobal);
    const docVistasRef = doc(db, "Usuarios", userDocIdGlobal, "Películas y Series Vistas", tituloBuscadoGlobal);

    onSnapshot(docFavRef, (snapshot) => {
        esFavorita = snapshot.exists();
        actualizarTextoBotonFavoritos();
    }, (err) => console.error("Error escuchando favoritas:", err));

    onSnapshot(docVistasRef, (snapshot) => {
        esVista = snapshot.exists();
        actualizarTextoBotonVistas();
    }, (err) => console.error("Error escuchando vistas:", err));

    const btnFav = document.getElementById("btn-agregar-favoritas");
    if (btnFav) {
        btnFav.addEventListener("click", async () => {
            if (!userDocIdGlobal || !tituloBuscadoGlobal || !datosPeliculaActual) return;

            try {
                if (esFavorita) {
                    await deleteDoc(docFavRef);
                } else {
                    const payload = {
                        ...datosPeliculaActual,
                        fechaañadido: new Date()
                    };
                    await setDoc(docFavRef, payload);
                }
            } catch (error) {
                console.error("Error al modificar favoritas:", error);
            }
        });
    }

    const btnVistas = document.getElementById("btn-agregar-vistas");
    if (btnVistas) {
        btnVistas.addEventListener("click", async () => {
            if (!userDocIdGlobal || !tituloBuscadoGlobal || !datosPeliculaActual) return;

            try {
                if (esVista) {
                    await deleteDoc(docVistasRef);
                } else {
                    const payload = {
                        ...datosPeliculaActual,
                        fechaañadido: new Date()
                    };
                    await setDoc(docVistasRef, payload);
                }
            } catch (error) {
                console.error("Error al modificar vistas:", error);
            }
        });
    }
}

// --- FORMATEADOR COMPATIBLE PARA REPRODUCCIÓN Y EMBED DE YOUTUBE ---
function normalizarUrlYouTube(url) {
    if (!url) return "";
    let cleanUrl = String(url).trim();

    let videoId = "";
    if (cleanUrl.includes("watch?v=")) {
        videoId = cleanUrl.split("watch?v=")[1].split("&")[0];
    } else if (cleanUrl.includes("youtu.be/")) {
        videoId = cleanUrl.split("youtu.be/")[1].split("?")[0];
    } else if (cleanUrl.includes("embed/")) {
        videoId = cleanUrl.split("embed/")[1].split("?")[0];
    }

    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`;
    }
    return cleanUrl;
}

// --- LÓGICA POP-UP TRAILER ---
function abrirModalTrailer() {
    if (!datosPeliculaActual) return;

    const modalTrailer = document.getElementById("modal-trailer");
    const containerLangs = document.getElementById("modal-trailer-langs");
    const iframeTrailer = document.getElementById("modal-trailer-iframe");

    if (!modalTrailer || !containerLangs || !iframeTrailer) return;

    containerLangs.innerHTML = "";

    const trailerData = datosPeliculaActual.trailer || datosPeliculaActual.Trailer;

    if (!trailerData) return;

    if (typeof trailerData === "object" && !Array.isArray(trailerData)) {
        const clavesIdiomas = Object.keys(trailerData);
        if (clavesIdiomas.length === 0) return;

        let idiomaSeleccionado = clavesIdiomas.includes(currentLanguage) ? currentLanguage : clavesIdiomas[0];

        const cargarUrlEnIframe = (langKey) => {
            let url = trailerData[langKey];
            if (url) {
                iframeTrailer.src = normalizarUrlYouTube(url);
            }
        };

        clavesIdiomas.forEach(langKey => {
            const btnLang = document.createElement("button");
            btnLang.type = "button";
            btnLang.className = `btn-lang-tab ${langKey === idiomaSeleccionado ? "active" : ""}`;
            btnLang.textContent = langKey.toUpperCase();

            btnLang.addEventListener("click", () => {
                const prevActive = containerLangs.querySelector(".btn-lang-tab.active");
                if (prevActive) prevActive.classList.remove("active");
                btnLang.classList.add("active");

                cargarUrlEnIframe(langKey);
            });

            containerLangs.appendChild(btnLang);
        });

        cargarUrlEnIframe(idiomaSeleccionado);

    } else if (typeof trailerData === "string") {
        iframeTrailer.src = normalizarUrlYouTube(trailerData);
    }

    modalTrailer.classList.remove("hidden");
}

function cerrarModalTrailer() {
    const modalTrailer = document.getElementById("modal-trailer");
    const iframeTrailer = document.getElementById("modal-trailer-iframe");

    if (iframeTrailer) iframeTrailer.src = "";
    if (modalTrailer) modalTrailer.classList.add("hidden");
}

// --- CARGA DE ENLACE DE PELÍCULA EN EL IFRAME ---
function cargarVideoEnModal(urlEnlace) {
    const iframeElement = document.getElementById("video-player-pelicula");
    if (!iframeElement) return;

    let urlFinal = String(urlEnlace).trim();
    
    // Si es un enlace de Internet Archive y se desea usar el reproductor embebido directamente, 
    // se puede transformar o simplemente pasar la URL tal cual si acepta inserción.
    iframeElement.src = urlFinal;
}

// --- LÓGICA POP-UP VER PELÍCULA ---
async function abrirModalVer() {
    if (!datosPeliculaActual) return;

    const modalVer = document.getElementById("modal-ver");
    const containerOpciones = document.getElementById("modal-ver-opciones");
    const iframeElement = document.getElementById("video-player-pelicula");

    if (!modalVer || !containerOpciones || !iframeElement) return;

    containerOpciones.innerHTML = "";

    const verData = datosPeliculaActual.ver || datosPeliculaActual.pelicula || datosPeliculaActual.Película;

    if (!verData) return;

    if (typeof verData === "object" && !Array.isArray(verData)) {
        const opciones = Object.entries(verData);

        let opcionSeleccionada = opciones[0];

        opciones.forEach(([etiqueta, urlEnlace], index) => {
            const btnOpcion = document.createElement("button");
            btnOpcion.type = "button";
            btnOpcion.className = `btn-lang-tab ${index === 0 ? "active" : ""}`;
            btnOpcion.textContent = etiqueta;

            btnOpcion.addEventListener("click", () => {
                const prevActive = containerOpciones.querySelector(".btn-lang-tab.active");
                if (prevActive) prevActive.classList.remove("active");
                btnOpcion.classList.add("active");

                cargarVideoEnModal(urlEnlace);
            });

            containerOpciones.appendChild(btnOpcion);
        });

        modalVer.classList.remove("hidden");
        cargarVideoEnModal(opcionSeleccionada[1]);

    } else if (typeof verData === "string") {
        modalVer.classList.remove("hidden");
        cargarVideoEnModal(verData);
    }
}

function cerrarModalVer() {
    const modalVer = document.getElementById("modal-ver");
    const iframeElement = document.getElementById("video-player-pelicula");

    if (iframeElement) {
        iframeElement.src = "";
    }

    if (modalVer) modalVer.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Película:", error);
    }

    aplicarTraduccionesEstaticas();
    await cargarDatosPelicula();

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
            const esPrimerAviso = (userDocIdGlobal === null);
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            if (imgAvatar) imgAvatar.src = userData.imgperfil || "../default-profile.png";
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;

            if (esPrimerAviso) {
                inicializarEventosSubcolecciones();
            }

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
        console.error("Error en tiempo real con el usuario en Película:", error);
    });

    // --- BOTONES DE ACCIÓN (ABRIR MÓDALES) ---
    const btnTrailer = document.getElementById("btn-ver-trailer");
    if (btnTrailer) {
        btnTrailer.addEventListener("click", abrirModalTrailer);
    }

    const btnVerPeli = document.getElementById("btn-ver-pelicula");
    if (btnVerPeli) {
        btnVerPeli.addEventListener("click", abrirModalVer);
    }

    // --- EVENTOS DE CIERRE DE MÓDALES ---
    const btnCerrarTrailer = document.getElementById("btn-cerrar-modal-trailer");
    if (btnCerrarTrailer) {
        btnCerrarTrailer.addEventListener("click", cerrarModalTrailer);
    }

    const btnCerrarVer = document.getElementById("btn-cerrar-modal-ver");
    if (btnCerrarVer) {
        btnCerrarVer.addEventListener("click", cerrarModalVer);
    }

    const modalTrailer = document.getElementById("modal-trailer");
    if (modalTrailer) {
        modalTrailer.addEventListener("click", (e) => {
            if (e.target === modalTrailer) cerrarModalTrailer();
        });
    }

    const modalVer = document.getElementById("modal-ver");
    if (modalVer) {
        modalVer.addEventListener("click", (e) => {
            if (e.target === modalVer) cerrarModalVer();
        });
    }

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