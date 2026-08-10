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

// Campos locales sincronizados
let edadUsuarioGlobal = 0; 
let subsUsuarioGlobal = ""; 

// Array local para actualizar la vista dinámicamente si cambia la lista
let categoriasCargadas = [];

// --- CÁLCULO RIGUROSO DE EDAD (DD-MM-AAAA o YYYY-MM-DD) ---
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

    const txtTitulo = document.getElementById("txt-seccion-titulo");
    if (txtTitulo && diccionario["text_categorias"] && diccionario["text_categorias"][idioma]) {
        txtTitulo.textContent = diccionario["text_categorias"][idioma];
    }

    const btnPeliculas = document.getElementById("btn_peliculas");
    if (btnPeliculas && diccionario["btn_peliculas"] && diccionario["btn_peliculas"][idioma]) {
        btnPeliculas.textContent = diccionario["btn_peliculas"][idioma];
    }

    const btnSeries = document.getElementById("btn_series");
    if (btnSeries && diccionario["btn_series"] && diccionario["btn_series"][idioma]) {
        btnSeries.textContent = diccionario["btn_series"][idioma];
    }

    const btnListas = document.getElementById("btn_listas");
    if (btnListas && diccionario["btn_listas"] && diccionario["btn_listas"][idioma]) {
        btnListas.textContent = diccionario["btn_listas"][idioma];
    }

    // Re-renderizar nombres de categorías si ya se han obtenido de Firestore
    renderizarCategorias(categoriasCargadas);
}

// --- RENDERIZADO DINÁMICO DE CATEGORÍAS ---
function renderizarCategorias(listaCategorias) {
    const contenedor = document.getElementById("peliculas-series-container");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (!listaCategorias || listaCategorias.length === 0) {
        return;
    }

    listaCategorias.forEach(cat => {
        const card = document.createElement("div");
        card.className = "category-card";
        card.dataset.id = cat.id;

        const img = document.createElement("img");
        img.className = "category-card-img";
        img.src = cat.img || "default-profile.png";
        img.alt = "Categoría";

        // Nombre según idioma activo para mostrar visualmente
        let nombreTraducido = "";
        if (cat.nombre && typeof cat.nombre === "object") {
            nombreTraducido = cat.nombre[currentLanguage] || cat.nombre["es"] || cat.nombre["en"] || "";
        } else if (typeof cat.nombre === "string") {
            nombreTraducido = cat.nombre;
        }

        // Nombre garantizado en "es" para guardar en localStorage
        let nombreEspanol = "";
        if (cat.nombre && typeof cat.nombre === "object") {
            nombreEspanol = cat.nombre["es"] || cat.nombre["en"] || "";
        } else if (typeof cat.nombre === "string") {
            nombreEspanol = cat.nombre;
        }

        const titulo = document.createElement("span");
        titulo.className = "category-card-title";
        titulo.textContent = nombreTraducido;

        card.appendChild(img);
        card.appendChild(titulo);

        // Guardar nombre en "es" en localStorage y redirigir
        card.addEventListener("click", () => {
            localStorage.setItem("categoriaseleccionada", nombreEspanol);
            window.location.href = "PeliculasySeries/Categorías.html";
        });

        contenedor.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en PeliculasySeries:", error);
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

    // --- NAVEGACIÓN DE BOTONES DE CATEGORÍAS ---
    const btnPeliculas = document.getElementById("btn_peliculas");
    if (btnPeliculas) {
        btnPeliculas.addEventListener("click", () => {
            window.location.href = "PeliculasySeries/Películas.html";
        });
    }

    const btnSeries = document.getElementById("btn_series");
    if (btnSeries) {
        btnSeries.addEventListener("click", () => {
            window.location.href = "PeliculasySeries/Series.html";
        });
    }

    const btnListas = document.getElementById("btn_listas");
    if (btnListas) {
        btnListas.addEventListener("click", () => {
            window.location.href = "PeliculasySeries/Listas.html";
        });
    }

    // --- ENLACES DE REDIRECCIÓN DE LAS FILAS DE LA CABECERA ---
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

    // --- ESCUCHA EN TIEMPO REAL DE LA COLECCIÓN Categorías ---
    const categoriasRef = collection(db, "Categorías");
    onSnapshot(categoriasRef, (snapshot) => {
        categoriasCargadas = [];
        snapshot.forEach(docSnap => {
            categoriasCargadas.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        renderizarCategorias(categoriasCargadas);
    }, (error) => {
        console.error("Error al escuchar la colección Categorías:", error);
    });

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

            // --- PROCESADO Y GUARDADO DE EDAD LITERAL EN FIRESTORE ---
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

            // --- PROCESADO, CÁLCULO Y GUARDADO DE DÍAS RESTANTES DE SUSCRIPCIÓN ---
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
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en PeliculasySeries:", error);
    });

    // --- MANEJO DE EVENTOS DE LOS BOTONES DE CABECERA ---
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