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
    "titulo_catalogo_listas": {
        "es": "Listas",
        "en": "Lists",
        "fr": "Listes",
        "ro": "Liste"
    },
    "text_sin_listas": {
        "es": "No se encontraron listas disponibles.",
        "en": "No lists available were found.",
        "fr": "Aucune liste disponible n'a été trouvée.",
        "ro": "Nu au fost găsite liste disponibile."
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
    "menu_vistas": {
        "es": "Vistas",
        "en": "Watched",
        "fr": "Vues",
        "ro": "Văzute"
    },
    "menu_favoritas": {
        "es": "Favoritas",
        "en": "Favorites",
        "fr": "Favoris",
        "ro": "Favorite"
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

    const lblTitulo = document.getElementById("titulo-catalogo-listas");
    if (lblTitulo) {
        lblTitulo.textContent = obtenerTextoTraduccion("titulo_catalogo_listas", "Listas");
    }
}

// --- CREAR TARJETA ESTÁTICA ---
function crearTarjetaEstatica(nombreTraduccionClave, textoFallback, rutaImagen, urlDestino) {
    const card = document.createElement("div");
    card.className = "pelicula-card";

    // Imagen / Poster de la tarjeta estática
    const posterBox = document.createElement("div");
    posterBox.className = "poster-box";
    const imgPoster = document.createElement("img");
    imgPoster.className = "img-cartelera-thumb";
    imgPoster.src = rutaImagen;
    imgPoster.alt = textoFallback;
    posterBox.appendChild(imgPoster);

    // Detalles (Texto traducido)
    const detailsBox = document.createElement("div");
    detailsBox.className = "pelicula-details";

    const tituloTxt = document.createElement("span");
    tituloTxt.className = "titulo-pelicula-txt";
    tituloTxt.textContent = obtenerTextoTraduccion(nombreTraduccionClave, textoFallback);

    detailsBox.appendChild(tituloTxt);
    card.appendChild(posterBox);
    card.appendChild(detailsBox);

    // --- EVENTO DE CLIC: NAVEGAR A LA VISTA CORRESPONDIENTE ---
    card.addEventListener("click", () => {
        window.location.href = urlDestino;
    });

    return card;
}

// --- CONSULTA Y RENDERIZADO DE LA COLECCIÓN LISTAS Y ESTÁTICAS ---
async function cargarColeccionListas() {
    const contenedorGrid = document.getElementById("contenedor-grid-listas");
    if (!contenedorGrid) return;

    contenedorGrid.innerHTML = "";

    // 1. Añadir primero las dos tarjetas estáticas requeridas
    const tarjetaVistas = crearTarjetaEstatica("menu_vistas", "Vistas", "vistas.png", "Vistas.html");
    const tarjetaFavoritas = crearTarjetaEstatica("menu_favoritas", "Favoritas", "favoritas.png", "Favoritas.html");
    
    contenedorGrid.appendChild(tarjetaVistas);
    contenedorGrid.appendChild(tarjetaFavoritas);

    try {
        const listasRef = collection(db, "Listas");
        const querySnapshot = await getDocs(listasRef);

        querySnapshot.forEach((docSnap) => {
            const listaData = docSnap.data();
            const tarjetaLista = crearTarjetaLista(listaData);
            contenedorGrid.appendChild(tarjetaLista);
        });

    } catch (error) {
        console.error("Error al consultar la colección Listas:", error);
    }
}

function crearTarjetaLista(listaData) {
    const card = document.createElement("div");
    card.className = "pelicula-card";

    // Imagen / Poster de la lista (campo 'img')
    const posterBox = document.createElement("div");
    posterBox.className = "poster-box";
    const imgPoster = document.createElement("img");
    imgPoster.className = "img-cartelera-thumb";
    imgPoster.src = normalizarSourceImagen(listaData.img);
    imgPoster.alt = "Imagen de Lista";
    posterBox.appendChild(imgPoster);

    // Detalles (Nombre como mapa de idiomas)
    const detailsBox = document.createElement("div");
    detailsBox.className = "pelicula-details";

    const tituloTxt = document.createElement("span");
    tituloTxt.className = "titulo-pelicula-txt";
    
    let textoNombreLocal = "";
    const campoNombre = listaData.nombre;
    if (campoNombre && typeof campoNombre === "object") {
        textoNombreLocal = campoNombre[currentLanguage] || campoNombre["es"] || Object.values(campoNombre)[0] || "";
    } else if (typeof campoNombre === "string") {
        textoNombreLocal = campoNombre;
    }
    tituloTxt.textContent = textoNombreLocal;

    detailsBox.appendChild(tituloTxt);
    card.appendChild(posterBox);
    card.appendChild(detailsBox);

    // --- EVENTO DE CLIC: GUARDAR COMO listaseleccionada Y NAVEGAR A Lista.html ---
    card.addEventListener("click", () => {
        let nombreEnEspanol = "";
        if (campoNombre && typeof campoNombre === "object") {
            nombreEnEspanol = campoNombre["es"] || campoNombre[currentLanguage] || Object.values(campoNombre)[0] || "";
        } else if (typeof campoNombre === "string") {
            nombreEnEspanol = campoNombre;
        }

        localStorage.setItem("listaseleccionada", nombreEnEspanol);
        window.location.href = "Lista.html";
    });

    return card;
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Listas:", error);
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

            // Cargar las tarjetas estáticas y la colección Listas una vez validados los datos de sesión
            await cargarColeccionListas();
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en Listas:", error);
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