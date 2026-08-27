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

// Variables globales para la serie actual
let datosSerieActual = null;
let tituloBuscadoGlobal = "";

// Banderas de estado
let esFavorita = false;
let esVista = false;

// Diccionario local para traducciones faltantes en json
const traduccionesNuevas = {
    "label_fecha_fin": {
        "es": "Fecha fin:",
        "en": "End date:",
        "fr": "Date de fin:",
        "ro": "Data de încheiere:"
    },
    "label_total_temporadas": {
        "es": "Número total temporadas:",
        "en": "Total seasons:",
        "fr": "Nombre total de saisons:",
        "ro": "Număr total de sezoane:"
    },
    "label_total_episodios": {
        "es": "Número total de episodios:",
        "en": "Total episodes:",
        "fr": "Nombre total d'épisodes:",
        "ro": "Număr total de episoade:"
    },
    "btn_ver_temporada": {
        "es": "Ver temporada",
        "en": "Watch season",
        "fr": "Voir la saison",
        "ro": "Vezi sezonul"
    },
    "label_temporada_num": {
        "es": "Temporada",
        "en": "Season",
        "fr": "Saison",
        "ro": "Sezonul"
    },
    "label_episodios_num": {
        "es": "episodios",
        "en": "episodes",
        "fr": "épisodes",
        "ro": "episoade"
    }
};

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
    if (traduccionesNuevas[clave] && traduccionesNuevas[clave][currentLanguage]) {
        return traduccionesNuevas[clave][currentLanguage];
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

    // Etiquetas estáticas de la serie
    const lblEdad = document.getElementById("label-edad-recomendada");
    if (lblEdad) lblEdad.textContent = obtenerTextoTraduccion("label_edad_recomendada", "Edad recomendada:");

    const lblEstreno = document.getElementById("label-fecha-estreno");
    if (lblEstreno) lblEstreno.textContent = obtenerTextoTraduccion("label_fecha_estreno", "Fecha de estreno:");

    const lblFechaFin = document.getElementById("label-fecha-fin");
    if (lblFechaFin) lblFechaFin.textContent = obtenerTextoTraduccion("label_fecha_fin", "Fecha fin:");

    const lblTotalTemp = document.getElementById("label-total-temporadas");
    if (lblTotalTemp) lblTotalTemp.textContent = obtenerTextoTraduccion("label_total_temporadas", "Número total temporadas:");

    const lblTotalEp = document.getElementById("label-total-episodios");
    if (lblTotalEp) lblTotalEp.textContent = obtenerTextoTraduccion("label_total_episodios", "Número total de episodios:");

    const lblCategorias = document.getElementById("label-categorias");
    if (lblCategorias) lblCategorias.textContent = obtenerTextoTraduccion("label_categorias", "Categorías:");

    const lblListas = document.getElementById("label-listas");
    if (lblListas) lblListas.textContent = obtenerTextoTraduccion("label_listas", "Listas:");

    const lblActores = document.getElementById("label-actores");
    if (lblActores) lblActores.textContent = obtenerTextoTraduccion("label_actores", "Actores:");

    // Botones de acción externos
    actualizarTextoBotonFavoritos();
    actualizarTextoBotonVistas();
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

// --- BÚSQUEDA Y CARGA COMPLETA DE LA SERIE SEGÚN "titserie" DE LOCALSTORAGE ---
async function cargarDatosSerie() {
    tituloBuscadoGlobal = localStorage.getItem("titserie");
    const elemTitulo = document.getElementById("titulo-serie");

    if (!tituloBuscadoGlobal) {
        if (elemTitulo) {
            elemTitulo.textContent = obtenerTextoTraduccion("text_serie_no_encontrada", "Serie no encontrada");
        }
        return;
    }

    try {
        const serieRef = collection(db, "Peliculasyseries");
        const qSerie = query(serieRef, where("titulo.es", "==", tituloBuscadoGlobal));
        const querySnapshot = await getDocs(qSerie);

        if (!querySnapshot.empty) {
            const serieDoc = querySnapshot.docs[0];
            datosSerieActual = serieDoc.data();

            // 1. TÍTULO (mapa de idiomas)
            if (datosSerieActual.titulo && typeof datosSerieActual.titulo === "object") {
                const tituloTraducido = datosSerieActual.titulo[currentLanguage] || datosSerieActual.titulo["es"] || Object.values(datosSerieActual.titulo)[0] || "";
                if (elemTitulo) elemTitulo.textContent = tituloTraducido;
            } else if (typeof datosSerieActual.titulo === "string") {
                if (elemTitulo) elemTitulo.textContent = datosSerieActual.titulo;
            } else {
                if (elemTitulo) {
                    elemTitulo.textContent = obtenerTextoTraduccion("text_serie_no_encontrada", "Serie no encontrada");
                }
            }

            // 2. EDAD MÍNIMA
            const valEdad = document.getElementById("val-edad-minima");
            if (valEdad) {
                valEdad.textContent = datosSerieActual.edadMinima !== undefined ? `${datosSerieActual.edadMinima}+` : "";
            }

            // 3. FECHA DE ESTRENO
            const valEstreno = document.getElementById("val-fecha-estreno");
            if (valEstreno) {
                valEstreno.textContent = datosSerieActual.fechaestreno || "";
            }

            // 4. FECHA FIN
            const valFechaFin = document.getElementById("val-fecha-fin");
            if (valFechaFin) {
                valFechaFin.textContent = datosSerieActual.fechafin || "";
            }

            // 5. NÚMERO TOTAL TEMPORADAS
            const valTotalTemp = document.getElementById("val-total-temporadas");
            if (valTotalTemp) {
                valTotalTemp.textContent = datosSerieActual.numeroTotalTemporadas !== undefined ? datosSerieActual.numeroTotalTemporadas : (datosSerieActual.totalTemporadas || "");
            }

            // 6. NÚMERO TOTAL EPISODIOS
            const valTotalEp = document.getElementById("val-total-episodios");
            if (valTotalEp) {
                valTotalEp.textContent = datosSerieActual.numeroTotalEpisodios !== undefined ? datosSerieActual.numeroTotalEpisodios : (datosSerieActual.totalEpisodios || "");
            }

            // 7. SINOPSIS
            const valSinopsis = document.getElementById("val-sinopsis");
            if (valSinopsis) {
                if (datosSerieActual.sinopsis && typeof datosSerieActual.sinopsis === "object") {
                    valSinopsis.textContent = datosSerieActual.sinopsis[currentLanguage] || datosSerieActual.sinopsis["es"] || Object.values(datosSerieActual.sinopsis)[0] || "";
                } else if (typeof datosSerieActual.sinopsis === "string") {
                    valSinopsis.textContent = datosSerieActual.sinopsis;
                }
            }

            // 8. CATEGORÍAS (Generación de botones rojos)
            const valCategorias = document.getElementById("val-categorias");
            if (valCategorias) {
                valCategorias.innerHTML = "";
                let listaCategorias = [];
                if (Array.isArray(datosSerieActual.Categorías)) listaCategorias = datosSerieActual.Categorías;
                else if (Array.isArray(datosSerieActual.categorias)) listaCategorias = datosSerieActual.categorias;
                else if (typeof datosSerieActual.Categorías === "string") listaCategorias = datosSerieActual.Categorías.split(",").map(c => c.trim());
                else if (typeof datosSerieActual.categorias === "string") listaCategorias = datosSerieActual.categorias.split(",").map(c => c.trim());

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

            // 9. LISTAS (Generación de botones rojos)
            const valListas = document.getElementById("val-listas");
            if (valListas) {
                valListas.innerHTML = "";
                let listaListas = [];
                if (Array.isArray(datosSerieActual.Listas)) listaListas = datosSerieActual.Listas;
                else if (Array.isArray(datosSerieActual.listas)) listaListas = datosSerieActual.listas;
                else if (typeof datosSerieActual.Listas === "string") listaListas = datosSerieActual.Listas.split(",").map(l => l.trim());
                else if (typeof datosSerieActual.listas === "string") listaListas = datosSerieActual.listas.split(",").map(l => l.trim());

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

            // 10. ACTORES
            const valActores = document.getElementById("val-actores");
            if (valActores) {
                valActores.innerHTML = "";
                let listaActores = [];
                if (Array.isArray(datosSerieActual.Actores)) listaActores = datosSerieActual.Actores;
                else if (Array.isArray(datosSerieActual.actores)) listaActores = datosSerieActual.actores;
                else if (typeof datosSerieActual.Actores === "string") listaActores = datosSerieActual.Actores.split(",").map(a => a.trim());
                else if (typeof datosSerieActual.actores === "string") listaActores = datosSerieActual.actores.split(",").map(a => a.trim());

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

            // 11. GENERACIÓN DE CONTENEDORES CON DATOS POR CADA TEMPORADA
            generarContenedoresTemporadas();

        } else {
            if (elemTitulo) {
                elemTitulo.textContent = obtenerTextoTraduccion("text_serie_no_encontrada", "Serie no encontrada");
            }
        }
    } catch (error) {
        console.error("Error al buscar la serie por título:", error);
        if (elemTitulo) {
            elemTitulo.textContent = obtenerTextoTraduccion("text_error_cargando_titulo", "Error al cargar título");
        }
    }
}

// --- GENERACIÓN Y RELLENADO DE CONTENEDORES POR CADA MAPA EN "Temporadas" ---
function generarContenedoresTemporadas() {
    const contenedorPrincipal = document.getElementById("contenedor-temporadas");
    if (!contenedorPrincipal) return;

    contenedorPrincipal.innerHTML = "";

    const temporadasData = datosSerieActual ? (datosSerieActual.Temporadas || datosSerieActual.temporadas) : null;

    if (temporadasData && typeof temporadasData === "object" && !Array.isArray(temporadasData)) {
        const clavesTemporadas = Object.keys(temporadasData);

        clavesTemporadas.forEach(claveTemp => {
            const tempInfo = temporadasData[claveTemp];
            if (!tempInfo) return;

            const divTemp = document.createElement("div");
            divTemp.className = "temporada-card-container";
            divTemp.id = `temporada-${claveTemp}`;

            // 1. IMAGEN TEMPORADA (imgtemporada)
            const imgTemp = document.createElement("img");
            imgTemp.className = "temp-img-thumb";
            const rawImgTemp = tempInfo.imgtemporada || tempInfo.imgTemporada || tempInfo.img;
            imgTemp.src = procesarFuenteImagen(rawImgTemp);
            imgTemp.alt = `Temporada ${tempInfo.ntemporada || claveTemp}`;

            // 2. CONTENEDOR DE INFORMACIÓN CENTRAL
            const divInfo = document.createElement("div");
            divInfo.className = "temp-info-container";

            // Fila de número de temporada y número de episodios
            const divTitleRow = document.createElement("div");
            divTitleRow.className = "temp-title-row";

            const numTemp = tempInfo.ntemporada !== undefined ? tempInfo.ntemporada : claveTemp;
            const numEpisodios = tempInfo.nepisodios !== undefined ? tempInfo.nepisodios : "";

            const lblTempPrefix = obtenerTextoTraduccion("label_temporada_num", "Temporada");
            const spanNumTemp = document.createElement("span");
            spanNumTemp.className = "temp-numero-title";
            spanNumTemp.textContent = `${lblTempPrefix} ${numTemp}`;

            const lblEpSuffix = obtenerTextoTraduccion("label_episodios_num", "episodios");
            const spanNumEp = document.createElement("span");
            spanNumEp.className = "temp-episodes-text";
            spanNumEp.textContent = `${numEpisodios} ${lblEpSuffix}`;

            divTitleRow.appendChild(spanNumTemp);
            if (numEpisodios !== "") {
                divTitleRow.appendChild(spanNumEp);
            }

            // Sinopsis de la temporada (mapa de idiomas)
            const pSinopsis = document.createElement("p");
            pSinopsis.className = "temp-sinopsis-text";
            const sinopsisObj = tempInfo.sinopsistemporada || tempInfo.sinopsisTemporada || tempInfo.sinopsis;

            if (sinopsisObj && typeof sinopsisObj === "object") {
                pSinopsis.textContent = sinopsisObj[currentLanguage] || sinopsisObj["es"] || Object.values(sinopsisObj)[0] || "";
            } else if (typeof sinopsisObj === "string") {
                pSinopsis.textContent = sinopsisObj;
            } else {
                pSinopsis.textContent = "";
            }

            divInfo.appendChild(divTitleRow);
            divInfo.appendChild(pSinopsis);

            // 3. BOTÓN "VER TEMPORADA"
            const btnVerTemp = document.createElement("button");
            btnVerTemp.type = "button";
            btnVerTemp.className = "btn-default btn-ver-temporada";
            btnVerTemp.textContent = obtenerTextoTraduccion("btn_ver_temporada", "Ver temporada");

            btnVerTemp.addEventListener("click", () => {
                localStorage.setItem("ntemporadaseleccionado", numTemp);
                window.location.href = "Temporadas.html";
            });

            // Añadir todo al contenedor de la temporada
            divTemp.appendChild(imgTemp);
            divTemp.appendChild(divInfo);
            divTemp.appendChild(btnVerTemp);

            contenedorPrincipal.appendChild(divTemp);
        });
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
            if (!userDocIdGlobal || !tituloBuscadoGlobal || !datosSerieActual) return;

            try {
                if (esFavorita) {
                    await deleteDoc(docFavRef);
                } else {
                    const payload = {
                        ...datosSerieActual,
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
            if (!userDocIdGlobal || !tituloBuscadoGlobal || !datosSerieActual) return;

            try {
                if (esVista) {
                    await deleteDoc(docVistasRef);
                } else {
                    const payload = {
                        ...datosSerieActual,
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

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Serie:", error);
    }

    aplicarTraduccionesEstaticas();
    await cargarDatosSerie();

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
        console.error("Error en tiempo real con el usuario en Serie:", error);
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