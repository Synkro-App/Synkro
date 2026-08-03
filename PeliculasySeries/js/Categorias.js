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

let diccionario = {};
let currentLanguage = "es";
let userDocIdGlobal = null;

let edadUsuarioGlobal = 0; 
let subsUsuarioGlobal = ""; 

let unsubscribeContenido = null; // Para limpiar el listener en tiempo real de contenido si cambia

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

// --- DICCIONARIO DE TRADUCCIÓN PARA EL TIPO (Película / Serie) ---
function traducirTipo(tipoTexto, idioma) {
    if (!tipoTexto) return "";
    const minuscula = tipoTexto.toLowerCase().trim();

    const mapaTipos = {
        es: { pelicula: "Película", serie: "Serie" },
        en: { pelicula: "Movie", serie: "Series" },
        fr: { pelicula: "Film", serie: "Série" },
        ro: { pelicula: "Film", serie: "Serie" }
    };

    const esPeli = minuscula.includes("pel");
    const esSerie = minuscula.includes("ser");

    if (esPeli) return (mapaTipos[idioma] && mapaTipos[idioma].pelicula) || mapaTipos.es.pelicula;
    if (esSerie) return (mapaTipos[idioma] && mapaTipos[idioma].serie) || mapaTipos.es.serie;

    return tipoTexto;
}

// --- CARGAR TÍTULO DE LA CATEGORÍA TRADUCIDO EN TIEMPO REAL ---
function iniciarTituloCategoriaEnTiempoReal(idioma) {
    const txtTitulo = document.getElementById("txt-seccion-titulo");
    if (!txtTitulo) return;

    const categoriaseleccionada = localStorage.getItem("categoriaseleccionada");

    if (!categoriaseleccionada) {
        txtTitulo.textContent = "";
        return;
    }

    txtTitulo.textContent = categoriaseleccionada;

    const categoriasRef = collection(db, "Categorías");
    onSnapshot(categoriasRef, (querySnapshot) => {
        let encontrada = false;

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            
            if (data.nombre && typeof data.nombre === "object") {
                if (data.nombre.es === categoriaseleccionada) {
                    txtTitulo.textContent = data.nombre[idioma] || data.nombre.es || categoriaseleccionada;
                    encontrada = true;
                }
            } else if (data.es === categoriaseleccionada) {
                txtTitulo.textContent = data[idioma] || data.es || categoriaseleccionada;
                encontrada = true;
            } else if (typeof data.nombre === "string" && data.nombre === categoriaseleccionada) {
                txtTitulo.textContent = data.nombre;
                encontrada = true;
            }
        });

        if (!encontrada) {
            txtTitulo.textContent = categoriaseleccionada;
        }
    }, (error) => {
        console.error("Error escuchando 'Categorías' en tiempo real:", error);
    });
}

// --- ESCUCHAR Y FILTRAR PELÍCULAS/SERIES EN TIEMPO REAL ---
function iniciarPeliculasYSeriesEnTiempoReal(idioma, edadUsuario, subsUsuario) {
    const container = document.getElementById("categorias-container");
    if (!container) return;

    // Si había un listener previo del catálogo, lo cancelamos antes de crear uno nuevo
    if (unsubscribeContenido) {
        unsubscribeContenido();
    }

    const categoriaseleccionada = localStorage.getItem("categoriaseleccionada");
    if (!categoriaseleccionada) {
        container.innerHTML = `<div class="msg-sin-contenido">No se seleccionó ninguna categoría.</div>`;
        return;
    }

    const refPelis = collection(db, "Peliculasyseries");
    const qPelis = query(refPelis, where("Categorías", "array-contains", categoriaseleccionada));

    unsubscribeContenido = onSnapshot(qPelis, (querySnapshot) => {
        container.innerHTML = "";

        if (querySnapshot.empty) {
            const txtVacio = diccionario["text_sin_contenido"] ? diccionario["text_sin_contenido"][idioma] : "No hay contenido disponible";
            container.innerHTML = `<div class="msg-sin-contenido">${txtVacio}</div>`;
            return;
        }

        let elementosMostrados = 0;

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();

            // 1. FILTRO DE EDAD: Edad (usuario) < edadMinima (peli) -> Ocultar
            const edadMinima = data.edadMinima !== undefined ? Number(data.edadMinima) : 0;
            if (edadUsuario < edadMinima) {
                return;
            }

            // 2. FILTRO DE TIPO DE ACCESO Y SUBSCRIPCIÓN
            const tipoAcceso = data.type || "";
            let tieneAcceso = false;

            if (tipoAcceso === "Gratis") {
                tieneAcceso = true;
            } else if (tipoAcceso === "Pago") {
                // Comprobar si el array subs de la película contiene la suscripción activa del usuario
                if (Array.isArray(data.subs) && subsUsuario) {
                    if (data.subs.includes(subsUsuario)) {
                        tieneAcceso = true;
                    }
                }
            }

            if (!tieneAcceso) {
                return;
            }

            elementosMostrados++;

            // Imagen (soporta URLs y Base64 directamente en src)
            const imgCartelera = data.imgCartelera || "../default-poster.png";

            // Extraer Título en "es" obligatoriamente para redirección + versión traducida para interfaz
            let tituloEs = "";
            let tituloMostrar = "Sin título";

            if (data.titulo) {
                if (typeof data.titulo === "object") {
                    tituloEs = data.titulo.es || "";
                    tituloMostrar = data.titulo[idioma] || data.titulo.es || Object.values(data.titulo)[0] || "Sin título";
                } else if (typeof data.titulo === "string") {
                    tituloEs = data.titulo;
                    tituloMostrar = data.titulo;
                }
            }

            // Extraer Tipo en "es" ("Película" / "Serie") y su versión traducida
            const tipoEs = data.tipo || "";
            const tipoTraducido = traducirTipo(tipoEs, idioma);

            // Crear Tarjeta
            const card = document.createElement("div");
            card.className = "card-item";

            card.innerHTML = `
                <img src="${imgCartelera}" alt="${tituloMostrar}" class="card-cartelera">
                <div class="card-info">
                    <span class="card-titulo">${tituloMostrar}</span>
                    <span class="card-tipo-badge">${tipoTraducido}</span>
                </div>
            `;

            // EVENTO CLIC PARA NAVEGACIÓN
            card.addEventListener("click", () => {
                const tipoLower = tipoEs.toLowerCase().trim();

                if (tipoLower.includes("pel")) { // Película
                    localStorage.setItem("titpeli", tituloEs);
                    localStorage.setItem("tipopeli", tipoEs);
                    window.location.href = "Película.html";
                } else if (tipoLower.includes("ser")) { // Serie
                    localStorage.setItem("titserie", tituloEs);
                    localStorage.setItem("tiposerie", tipoEs);
                    window.location.href = "Serie.html";
                }
            });

            container.appendChild(card);
        });

        if (elementosMostrados === 0) {
            const txtVacio = diccionario["text_sin_contenido"] ? diccionario["text_sin_contenido"][idioma] : "No hay contenido disponible";
            container.innerHTML = `<div class="msg-sin-contenido">${txtVacio}</div>`;
        }

    }, (error) => {
        console.error("Error escuchando 'Peliculasyseries' en tiempo real:", error);
        container.innerHTML = `<div class="msg-sin-contenido">Error al cargar el contenido.</div>`;
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Categorias:", error);
    }

    aplicarTraduccionesEstaticas(currentLanguage);
    iniciarTituloCategoriaEnTiempoReal(currentLanguage);

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
            if (imgAvatar) imgAvatar.src = userData.imgperfil || "../default-profile.png";
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
                        if (valSubs) valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
                        
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
                if (valSubs) valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
            }

            // Iniciar o actualizar el renderizado del catálogo en tiempo real con los datos frescos del usuario
            iniciarPeliculasYSeriesEnTiempoReal(currentLanguage, edadUsuarioGlobal, subsUsuarioGlobal);
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en Categorias:", error);
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