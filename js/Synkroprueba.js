import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Credenciales oficiales reales provistas por el usuario
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

// Variables para almacenar en memoria los documentos recuperados de Firestore
let cacheSecciones = [];
let cacheJuegos = [];
let cachePeliculas = [];
let cacheBiblioteca = [];
let cacheMusica = [];

function aplicarTraducciones(idioma) {
    if (!diccionario || Object.keys(diccionario).length === 0) return;

    const elementosALocalizar = [
        { id: "text_prueba", propiedad: "textContent" },
        { id: "text_subscripcion", propiedad: "textContent" },
        { id: "text_ninguna", propiedad: "textContent" },
        { id: "btn_volver", propiedad: "textContent" },
        { id: "title_secciones", propiedad: "textContent" },
        { id: "title_juegos", propiedad: "textContent" },
        { id: "title_peliculas", propiedad: "textContent" },
        { id: "title_biblioteca", propiedad: "textContent" },
        { id: "title_musica", propiedad: "textContent" },
        
        // Subtítulos internos de filas
        { id: "label_secciones_gratis", propiedad: "textContent", claveDiccionario: "row_gratis" },
        { id: "label_secciones_mixtas", propiedad: "textContent", claveDiccionario: "row_mixtas" },
        { id: "label_secciones_pago", propiedad: "textContent", claveDiccionario: "row_pago" },
        { id: "label_juegos_gratis", propiedad: "textContent", claveDiccionario: "row_gratis" },
        { id: "label_juegos_pago", propiedad: "textContent", claveDiccionario: "row_pago" },
        { id: "label_peliculas_gratis", propiedad: "textContent", claveDiccionario: "row_gratis" },
        { id: "label_peliculas_pago", propiedad: "textContent", claveDiccionario: "row_pago" },
        { id: "label_biblioteca_gratis", propiedad: "textContent", claveDiccionario: "row_gratis" },
        { id: "label_biblioteca_pago", propiedad: "textContent", claveDiccionario: "row_pago" },
        { id: "label_musica_gratis", propiedad: "textContent", claveDiccionario: "row_gratis" },
        { id: "label_musica_pago", propiedad: "textContent", claveDiccionario: "row_pago" },
        { id: "btn_cerrar_detalle", propiedad: "textContent", claveDiccionario: "modal_cerrar" }
    ];

    elementosALocalizar.forEach(item => {
        const elemento = document.getElementById(item.id);
        const clave = item.claveDiccionario || item.id;
        if (elemento && diccionario[clave] && diccionario[clave][idioma]) {
            elemento[item.propiedad] = diccionario[clave][idioma];
        }
    });

    // Re-renderizar todo al cambiar de idioma
    renderizarTodo();
}

// Carga simultánea de todas las colecciones reales de tu Firestore
async function cargarTodasLasColecciones() {
    try {
        const [snapSec, snapJue, snapPel, snapBib, snapMus] = await Promise.all([
            getDocs(collection(db, "Secciones")),
            getDocs(collection(db, "Juegos")),
            getDocs(collection(db, "Peliculasyseries")),
            getDocs(collection(db, "Biblioteca")),
            getDocs(collection(db, "Musica"))
        ]);

        cacheSecciones = snapSec.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cacheJuegos = snapJue.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cachePeliculas = snapPel.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cacheBiblioteca = snapBib.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cacheMusica = snapMus.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        renderizarTodo();
    } catch (error) {
        console.error("Error al cargar las colecciones desde Firestore: ", error);
    }
}

function renderizarTodo() {
    renderizarSecciones();
    renderizarJuegos();
    renderizarPeliculas();
    renderizarBiblioteca();
    renderizarMusica();
}

// Auxiliar para extraer el texto dinámico según mapas de idioma
function obtenerTextoTraducido(campo) {
    if (!campo) return "";
    if (typeof campo === "object") {
        return campo[currentLanguage] || campo["es"] || "";
    }
    return campo;
}

// Auxiliar para crear las estructuras de las rejillas de items
function crearItemDOM(imgSrc, nombreTexto, elementoDatos, origenColeccion) {
    const box = document.createElement("div");
    box.className = "item-thumb-box";

    const img = document.createElement("img");
    img.className = "item-img";
    img.src = imgSrc || "default-profile.png";
    img.alt = "Thumb";

    const span = document.createElement("span");
    span.className = "item-name";
    span.textContent = nombreTexto;

    box.appendChild(img);
    box.appendChild(span);

    box.addEventListener("click", () => {
        abrirModalDetallado(elementoDatos, origenColeccion);
    });

    return box;
}

// 1. Contenedor: Secciones (Gratis, Mixtas, Pago)
function renderizarSecciones() {
    const g = document.getElementById("secciones_gratis_items");
    const m = document.getElementById("secciones_mixtas_items");
    const p = document.getElementById("secciones_pago_items");
    if (!g || !m || !p) return;

    g.innerHTML = ""; m.innerHTML = ""; p.innerHTML = "";

    cacheSecciones.forEach(doc => {
        const nombre = obtenerTextoTraducido(doc.nombre);
        const item = crearItemDOM(doc.imagen, nombre, doc, "Secciones");

        if (doc.type === "Gratis") g.appendChild(item);
        else if (doc.type === "Mixta") m.appendChild(item);
        else if (doc.type === "Pago") p.appendChild(item);
    });
}

// 2. Contenedor: Juegos (Gratis, Pago)
function renderizarJuegos() {
    const g = document.getElementById("juegos_gratis_items");
    const p = document.getElementById("juegos_pago_items");
    if (!g || !p) return;

    g.innerHTML = ""; p.innerHTML = "";

    cacheJuegos.forEach(doc => {
        const nombre = obtenerTextoTraducido(doc.nombre);
        const item = crearItemDOM(doc.img, nombre, doc, "Juegos");

        if (doc.type === "Gratis") g.appendChild(item);
        else if (doc.type === "Pago") p.appendChild(item);
    });
}

// 3. Contenedor: Películas y Series (Gratis, Pago)
function renderizarPeliculas() {
    const g = document.getElementById("peliculas_gratis_items");
    const p = document.getElementById("peliculas_pago_items");
    if (!g || !p) return;

    g.innerHTML = ""; p.innerHTML = "";

    cachePeliculas.forEach(doc => {
        const nombre = obtenerTextoTraducido(doc.nombre);
        const item = crearItemDOM(doc.imgCartelera, nombre, doc, "Peliculasyseries");

        if (doc.type === "Gratis") g.appendChild(item);
        else if (doc.type === "Pago") p.appendChild(item);
    });
}

// 4. Contenedor: Biblioteca (Gratis, Pago)
function renderizarBiblioteca() {
    const g = document.getElementById("biblioteca_gratis_items");
    const p = document.getElementById("biblioteca_pago_items");
    if (!g || !p) return;

    g.innerHTML = ""; p.innerHTML = "";

    cacheBiblioteca.forEach(doc => {
        const nombre = obtenerTextoTraducido(doc.nombre);
        const item = crearItemDOM(doc.portada, nombre, doc, "Biblioteca");

        if (doc.type === "Gratis") g.appendChild(item);
        else if (doc.type === "Pago") p.appendChild(item);
    });
}

// 5. Contenedor: Música (Gratis, Pago - Campos directos sin traducción)
function renderizarMusica() {
    const g = document.getElementById("musica_gratis_items");
    const p = document.getElementById("musica_pago_items");
    if (!g || !p) return;

    g.innerHTML = ""; p.innerHTML = "";

    cacheMusica.forEach(doc => {
        // En Música usamos directamente el campo sin procesar traducciones
        const titulo = doc.titulocancion || "";
        const item = crearItemDOM(doc.portada, titulo, doc, "Musica");

        if (doc.type === "Gratis") g.appendChild(item);
        else if (doc.type === "Pago") p.appendChild(item);
    });
}

// Lógica de apertura y mapeo dinámico de campos para el modal detallado
function abrirModalDetallado(doc, coleccion) {
    const modal = document.getElementById("modal_detalle");
    const lblNombre = document.getElementById("detalle_nombre");
    const lblEdad = document.getElementById("detalle_edad");
    const lblExtra1 = document.getElementById("detalle_extra_1");
    const lblExtra2 = document.getElementById("detalle_extra_2");
    const lblTexto = document.getElementById("detalle_texto");
    const boxSubs = document.getElementById("detalle_subs_container");

    if (!modal) return;

    // Reset de campos extras de información antes de rellenar
    lblExtra1.textContent = "";
    lblExtra2.textContent = "";
    lblTexto.textContent = "";

    const txtEdadMinima = diccionario["info_edad"] ? diccionario["info_edad"][currentLanguage] : "Edad mínima: ";
    const txtAutor = diccionario["info_autor"] ? diccionario["info_autor"][currentLanguage] : "Autor: ";
    const txtCantante = diccionario["info_cantante"] ? diccionario["info_cantante"][currentLanguage] : "Cantante(s): ";
    const txtSinopsis = diccionario["info_sinopsis"] ? diccionario["info_sinopsis"][currentLanguage] : "Sinopsis: ";
    const txtEstreno = diccionario["info_fecha_estreno"] ? diccionario["info_fecha_estreno"][currentLanguage] : "Fecha de estreno: ";

    // Rellenado condicional según las especificaciones de cada colección
    if (coleccion === "Secciones") {
        lblNombre.textContent = obtenerTextoTraducido(doc.nombre);
        lblEdad.textContent = `${txtEdadMinima}${doc.age || 0}+`;
        lblTexto.textContent = obtenerTextoTraducido(doc.texto);
    } 
    else if (coleccion === "Juegos") {
        lblNombre.textContent = obtenerTextoTraducido(doc.nombre);
        lblEdad.textContent = `${txtEdadMinima}${doc.age || 0}+`;
    } 
    else if (coleccion === "Peliculasyseries") {
        lblNombre.textContent = obtenerTextoTraducido(doc.nombre);
        lblEdad.textContent = `${txtEdadMinima}${doc.edadMinima || 0}+`;
        lblExtra1.textContent = `${txtEstreno}${doc.fechaestreno || ""}`;
        lblTexto.textContent = `${txtSinopsis}${obtenerTextoTraducido(doc.sinopsis)}`;
    } 
    else if (coleccion === "Biblioteca") {
        lblNombre.textContent = obtenerTextoTraducido(doc.nombre);
        lblEdad.textContent = `${txtEdadMinima}${doc.age || 0}+`;
        lblExtra1.textContent = `${txtAutor}${doc.autor || ""}`;
        lblTexto.textContent = `${txtSinopsis}${obtenerTextoTraducido(doc.sinopsis)}`;
    } 
    else if (coleccion === "Musica") {
        // Campos fijos sin mapas de idioma
        lblNombre.textContent = doc.titulocancion || "";
        lblEdad.textContent = `${txtEdadMinima}${doc.age || 0}+`;
        lblExtra1.textContent = `${txtCantante}${doc.cantante_s || ""}`;
    }

    // Comprobación y despliegue del array de suscripciones requeridas
    boxSubs.innerHTML = "";
    if (doc.type === "Pago" && doc.subs && Array.isArray(doc.subs) && doc.subs.length > 0) {
        boxSubs.style.display = "block";
        boxSubs.textContent = `Subs: ${doc.subs.join(", ")}`;
    } else {
        boxSubs.style.display = "none";
    }

    modal.classList.add("active");
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Synkroprueba", error);
    }

    currentLanguage = localStorage.getItem("idioma") || "es";
    
    const selectorIdioma = document.getElementById("idioma-selector");
    if (selectorIdioma) {
        selectorIdioma.value = currentLanguage;

        selectorIdioma.addEventListener("change", (e) => {
            currentLanguage = e.target.value;
            localStorage.removeItem("idioma");
            localStorage.setItem("idioma", currentLanguage);
            aplicarTraducciones(currentLanguage);
        });
    }

    const btnCerrar = document.getElementById("btn_cerrar_detalle");
    const modal = document.getElementById("modal_detalle");
    if (btnCerrar && modal) {
        btnCerrar.addEventListener("click", () => {
            modal.classList.remove("active");
        });
    }

    aplicarTraducciones(currentLanguage);
    
    // Ejecución de la carga de base de datos
    await cargarTodasLasColecciones();
});