import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
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
    "titulo_catalogo_vistas": {
        "es": "Vistas",
        "en": "Watched",
        "fr": "Vues",
        "ro": "Văzute"
    },
    "text_sin_vistas": {
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
    },
    "error_edad_insuficiente": {
        "es": "Ya no cumples la edad requerida para esta Película/Serie",
        "en": "You no longer meet the required age for this Movie/Series",
        "fr": "Vous ne remplissez plus l'âge requis pour ce film/série",
        "ro": "Nu mai îndepliniți vârsta necesară pentru acest film/serie"
    },
    "error_subs_insuficiente": {
        "es": "Ya no tienes la subscripción necesaria para ver esta Película/Serie, necesitas la subscripción: ",
        "en": "You no longer have the necessary subscription to watch this Movie/Series, you need the subscription: ",
        "fr": "Vous n'avez plus l'abonnement nécessaire pour regarder ce film/série, vous avez besoin de l'abonnement : ",
        "ro": "Nu mai aveți abonamentul necesar pentru a viziona acest film/serie, aveți nevoie de abonamentul: "
    },
    "btn_aceptar_modal": {
        "es": "Aceptar",
        "en": "Accept",
        "fr": "Accepter",
        "ro": "Acceptă"
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

    const lblTitulo = document.getElementById("titulo-catalogo-vistas");
    if (lblTitulo) {
        lblTitulo.textContent = obtenerTextoTraduccion("titulo_catalogo_vistas", "Vistas");
    }
}

// --- MODAL PERSONALIZADO (Evita alertas estándar de navegador) ---
function mostrarModalPersonalizado(mensaje) {
    let modalOverlay = document.getElementById("custom-modal-overlay");
    if (!modalOverlay) {
        modalOverlay = document.createElement("div");
        modalOverlay.id = "custom-modal-overlay";
        modalOverlay.className = "modal-overlay-synkro";
        
        const modalContent = document.createElement("div");
        modalContent.className = "modal-content-synkro";
        
        const modalText = document.createElement("p");
        modalText.id = "custom-modal-text";
        modalText.className = "modal-text-synkro";
        
        const modalBtn = document.createElement("button");
        modalBtn.id = "custom-modal-btn";
        modalBtn.className = "btn-default";
        modalBtn.textContent = obtenerTextoTraduccion("btn_aceptar_modal", "Aceptar");
        
        modalBtn.addEventListener("click", () => {
            modalOverlay.style.display = "none";
        });
        
        modalContent.appendChild(modalText);
        modalContent.appendChild(modalBtn);
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
    }
    
    document.getElementById("custom-modal-text").textContent = mensaje;
    document.getElementById("custom-modal-btn").textContent = obtenerTextoTraduccion("btn_aceptar_modal", "Aceptar");
    modalOverlay.style.display = "flex";
}

// --- CARGAR SUBCOLECCIÓN Películas y Series Vistas ---
async function cargarSubcoleccionVistas(userId) {
    const contenedorGrid = document.getElementById("contenedor-grid-vistas");
    if (!contenedorGrid) return;

    contenedorGrid.innerHTML = "";

    try {
        const vistasRef = collection(db, "Usuarios", userId, "Películas y Series Vistas");
        const querySnapshot = await getDocs(vistasRef);

        if (querySnapshot.empty) {
            contenedorGrid.innerHTML = `<p style="color: #000; font-style: italic;">${obtenerTextoTraduccion("text_sin_vistas", "No hay elementos en esta lista.")}</p>`;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const itemData = docSnap.data();
            const itemId = docSnap.id;
            const tarjetaItem = crearTarjetaItemVista(itemId, itemData);
            contenedorGrid.appendChild(tarjetaItem);
        });

    } catch (error) {
        console.error("Error al consultar la subcolección Películas y Series Vistas:", error);
    }
}

function crearTarjetaItemVista(itemId, itemData) {
    const card = document.createElement("div");
    card.className = "pelicula-card";

    // Imagen / Poster del elemento (soporte para img, imagen o imgCartelera)
    const posterBox = document.createElement("div");
    posterBox.className = "poster-box";
    const imgPoster = document.createElement("img");
    imgPoster.className = "img-cartelera-thumb";
    
    const fuenteImagen = itemData.imgCartelera || itemData.img || itemData.imagen;
    imgPoster.src = normalizarSourceImagen(fuenteImagen);
    imgPoster.alt = "Imagen";
    posterBox.appendChild(imgPoster);

    // Detalles (Título, Tipo y Fecha Añadido)
    const detailsBox = document.createElement("div");
    detailsBox.className = "pelicula-details";

    // 1. Título
    const tituloTxt = document.createElement("span");
    tituloTxt.className = "titulo-pelicula-txt";
    
    let textoNombreLocal = "";
    const campoTitulo = itemData.titulo || itemData.nombre;
    if (campoTitulo && typeof campoTitulo === "object") {
        textoNombreLocal = campoTitulo[currentLanguage] || campoTitulo["es"] || Object.values(campoTitulo)[0] || "";
    } else if (typeof campoTitulo === "string") {
        textoNombreLocal = campoTitulo;
    }
    tituloTxt.textContent = textoNombreLocal;
    detailsBox.appendChild(tituloTxt);

    // 2. Tipo (bajo el nombre)
    const tipoTxt = document.createElement("span");
    tipoTxt.className = "tipo-pelicula-txt";
    let textoTipoLocal = "";
    const campoTipo = itemData.tipo;
    if (campoTipo && typeof campoTipo === "object") {
        textoTipoLocal = campoTipo[currentLanguage] || campoTipo["es"] || Object.values(campoTipo)[0] || "";
    } else if (typeof campoTipo === "string") {
        textoTipoLocal = campoTipo;
    }
    tipoTxt.textContent = textoTipoLocal;
    detailsBox.appendChild(tipoTxt);

    // 3. Fecha Añadido (bajo el tipo)
    const fechaTxt = document.createElement("span");
    fechaTxt.className = "fecha-pelicula-txt";
    let fechaValor = itemData.fechaañadido || itemData.fechaAñadido || "";
    if (fechaValor) {
        if (typeof fechaValor.toDate === "function") {
            fechaValor = fechaValor.toDate().toLocaleDateString();
        } else if (fechaValor instanceof Date) {
            fechaValor = fechaValor.toLocaleDateString();
        }
    }
    fechaTxt.textContent = fechaValor;
    detailsBox.appendChild(fechaTxt);

    card.appendChild(posterBox);
    card.appendChild(detailsBox);

    // --- LÓGICA DE VALIDACIÓN AL HACER CLIC ---
    card.addEventListener("click", () => {
        // Validación de Edad
        const edadMinima = Number(itemData.edadMinima || itemData.edadminima || 0);
        if (edadUsuarioGlobal < edadMinima) {
            const mensajeErrorEdad = obtenerTextoTraduccion("error_edad_insuficiente", "Ya no cumples la edad requerida para esta Película/Serie");
            mostrarModalPersonalizado(mensajeErrorEdad);
            return;
        }

        // Validación de Tipo y Suscripción
        const tipoElemento = (itemData.type || itemData.tipoItem || "Gratis").toLowerCase();
        
        if (tipoElemento === "pago" || tipoElemento === "de pago") {
            const subsRequeridas = itemData.subs; // Puede ser array o string
            let arraySubsPeli = [];
            
            if (Array.isArray(subsRequeridas)) {
                arraySubsPeli = subsRequeridas;
            } else if (typeof subsRequeridas === "string") {
                arraySubsPeli = [subsRequeridas];
            }

            // Comprobar si coincide con la suscripción del usuario (subsUsuarioGlobal)
            const tieneSubsValida = arraySubsPeli.includes(subsUsuarioGlobal);

            if (!tieneSubsValida) {
                const textoSubsFaltante = arraySubsPeli.join(", ");
                const mensajeBaseSubs = obtenerTextoTraduccion("error_subs_insuficiente", "Ya no tienes la subscripción necesaria para ver esta Película/Serie, necesitas la subscripción: ");
                mostrarModalPersonalizado(mensajeBaseSubs + textoSubsFaltante);
                return;
            }
        }

        // Si pasa todos los filtros, comprobar si es película o serie
        const categoriaItem = (itemData.categoria || itemData.format || itemData.mediaType || "pelicula").toLowerCase();
        
        // Verificamos si es serie explícitamente o película por defecto
        const esSerie = categoriaItem.includes("serie") || categoriaItem === "tv" || itemData.titserie !== undefined;

        if (esSerie) {
            localStorage.setItem("titserie", itemId);
            window.location.href = "Serie.html";
        } else {
            localStorage.setItem("titpeli", itemId);
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
        console.error("Error cargando idiomas.json en Vistas:", error);
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

    // --- CONSULTA Y VALIDACIÓN DEL USUARIO ---
    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    try {
        const querySnapshot = await getDocs(qUsuario);
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

            // Cargar los elementos de la subcolección del usuario
            await cargarSubcoleccionVistas(userDocIdGlobal);
        }
    } catch (error) {
        console.error("Error al obtener los datos del usuario en Vistas:", error);
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