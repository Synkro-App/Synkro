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
let avatarUsuarioGlobal = "../../default-profile.png";
let novasActuales = 0;

// Variables del juego de memoria (10 parejas = 20 cartas)
let jugadorActual = 1;
let puntuaciones = { 1: 0, 2: 0 };
let cartasSeleccionadas = [];
let bloqueadoTablero = false;
let parejasEncontradasTotal = 0;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_juego": { "es": "Jugar y Pasar - 10 Parejas", "en": "Play and Pass - 10 Pairs", "fr": "Jouer et Passer - 10 Paires", "ro": "Joacă și Predă - 10 Perechi" }
};

function normalizarSourceImagen(cadenaImagen) {
    if (!cadenaImagen) return "../../default-profile.png";
    const str = cadenaImagen.trim();
    if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:") || str.startsWith("../") || str.startsWith("./")) {
        return str;
    }
    return `data:image/jpeg;base64,${str}`;
}

function calcularEdadCompleta(fechaNacimientoStr) {
    if (!fechaNacimientoStr) return 0;
    let ano, mes, dia;
    if (fechaNacimientoStr.includes("-")) {
        const partes = fechaNacimientoStr.split("-");
        if (partes[0].length === 4) {
            ano = parseInt(partes[0], 10);
            mes = parseInt(partes[1], 10) - 1;
            dia = parseInt(partes[2], 10);
        } else {
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
    if (lblSubs) lblSubs.textContent = obtenerTextoTraduccion("text_subscripcion", "Suscripción:");
    
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) btnVolver.textContent = obtenerTextoTraduccion("btn_volver", "Volver");
    
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "Cerrar sesión");
    
    const tituloJuego = document.getElementById("titulo-juego");
    if (tituloJuego) tituloJuego.textContent = obtenerTextoTraduccion("titulo_juego", "Jugar y Pasar - 10 Parejas");

    const btnReiniciar = document.getElementById("btn-reiniciar");
    if (btnReiniciar) btnReiniciar.textContent = obtenerTextoTraduccion("btn_reiniciar", "Jugar de nuevo");
}

function inicializarJuego() {
    const tablero = document.getElementById("tablero-parejas");
    const infoTurno = document.getElementById("info-turno");
    const contenedorResultado = document.getElementById("resultado-partida");
    
    if (!tablero) return;

    tablero.innerHTML = "";
    contenedorResultado.style.display = "none";
    tablero.style.display = "grid";
    
    jugadorActual = 1;
    puntuaciones = { 1: 0, 2: 0 };
    cartasSeleccionadas = [];
    bloqueadoTablero = false;
    parejasEncontradasTotal = 0;

    infoTurno.textContent = `Turno del Jugador ${jugadorActual} (P1: ${puntuaciones[1]} | P2: ${puntuaciones[2]})`;

    const simbolosBase = ["🍎", "🚗", "⭐", "⚽", "🐱", "🚀", "🎸", "🍕", "⚡", "🎨"];
    let baraja = [...simbolosBase, ...simbolosBase];
    
    baraja.sort(() => Math.random() - 0.5);

    baraja.forEach((simbolo, index) => {
        const carta = document.createElement("div");
        carta.classList.add("carta-pareja");
        carta.dataset.simbolo = simbolo;
        carta.dataset.index = index;
        carta.textContent = simbolo;

        carta.addEventListener("click", () => manejarVolteoCarta(carta));
        tablero.appendChild(carta);
    });
}

function manejarVolteoCarta(carta) {
    if (bloqueadoTablero) return;
    if (carta.classList.contains("volteada") || carta.classList.contains("encontrada")) return;

    carta.classList.add("volteada");
    cartasSeleccionadas.push(carta);

    if (cartasSeleccionadas.length === 2) {
        verificarPareja();
    }
}

function verificarPareja() {
    const [carta1, carta2] = cartasSeleccionadas;
    const esPareja = carta1.dataset.simbolo === carta2.dataset.simbolo;

    if (esPareja) {
        carta1.classList.add("encontrada");
        carta2.classList.add("encontrada");
        puntuaciones[jugadorActual]++;
        parejasEncontradasTotal++;
        cartasSeleccionadas = [];

        const infoTurno = document.getElementById("info-turno");
        infoTurno.textContent = `¡Acertó J${jugadorActual}! Sigue su turno (P1: ${puntuaciones[1]} | P2: ${puntuaciones[2]})`;

        if (parejasEncontradasTotal === 10) {
            finalizarPartida();
        }
    } else {
        bloqueadoTablero = true;
        setTimeout(() => {
            carta1.classList.remove("volteada");
            carta2.classList.remove("volteada");
            cartasSeleccionadas = [];
            
            jugadorActual = jugadorActual === 1 ? 2 : 1;
            const infoTurno = document.getElementById("info-turno");
            infoTurno.textContent = `¡Pasa el dispositivo! Turno del Jugador ${jugadorActual} (P1: ${puntuaciones[1]} | P2: ${puntuaciones[2]})`;
            
            bloqueadoTablero = false;
        }, 1000);
    }
}

function finalizarPartida() {
    const tablero = document.getElementById("tablero-parejas");
    const infoTurno = document.getElementById("info-turno");
    const contenedorResultado = document.getElementById("resultado-partida");
    const textoGanador = document.getElementById("texto-ganador");

    tablero.style.display = "none";
    infoTurno.textContent = "¡Partida Finalizada!";
    contenedorResultado.style.display = "flex";

    if (puntuaciones[1] > puntuaciones[2]) {
        textoGanador.textContent = `¡Gana el Jugador 1! (${puntuaciones[1]} vs ${puntuaciones[2]})`;
    } else if (puntuaciones[2] > puntuaciones[1]) {
        textoGanador.textContent = `¡Gana el Jugador 2! (${puntuaciones[2]} vs ${puntuaciones[1]})`;
    } else {
        textoGanador.textContent = `¡Empate! (${puntuaciones[1]} - ${puntuaciones[2]})`;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json:", error);
    }

    aplicarTraduccionesEstaticas();
    inicializarJuego();

    const btnReiniciar = document.getElementById("btn-reiniciar");
    if (btnReiniciar) {
        btnReiniciar.addEventListener("click", inicializarJuego);
    }

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");
    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "../../index.html";
        return;
    }

    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) filaPerfil.addEventListener("click", () => { window.location.href = "../../Perfil.html"; });

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) filaNovas.addEventListener("click", () => { window.location.href = "../../NovaPoints.html"; });

    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    try {
        const querySnapshot = await getDocs(qUsuario);
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            avatarUsuarioGlobal = normalizarSourceImagen(userData.imgperfil);
            if (imgAvatar) imgAvatar.src = avatarUsuarioGlobal;
            
            novasActuales = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;
            if (txtNovas) txtNovas.textContent = novasActuales;

            if (userData.fechanacimiento) {
                const edadCalculada = calcularEdadCompleta(userData.fechanacimiento);
                if (userData.Edad === undefined || Number(userData.Edad) !== edadCalculada) {
                    edadUsuarioGlobal = edadCalculada;
                    await updateDoc(doc(db, "Usuarios", userDocIdGlobal), { Edad: edadCalculada });
                } else {
                    edadUsuarioGlobal = Number(userData.Edad);
                }
            } else {
                edadUsuarioGlobal = userData.Edad !== undefined ? Number(userData.Edad) : 0;
            }

            if (userData.subs && typeof userData.subs === "object") {
                subsUsuarioGlobal = userData.subs.subs || ""; 
                if (userData.subs.fechaExpiracion) {
                    const timestampExpiracion = userData.subs.fechaExpiracion.toDate ? userData.subs.fechaExpiracion.toDate() : new Date(userData.subs.fechaExpiracion);
                    const hoy = new Date();
                    const diasCalculados = Math.ceil((timestampExpiracion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    if (diasCalculados <= 0) {
                        subsUsuarioGlobal = "";
                        if (valSubs) valSubs.textContent = obtenerTextoTraduccion("text_ninguna", "Ninguna");
                        await updateDoc(doc(db, "Usuarios", userDocIdGlobal), { subs: deleteField() });
                    } else {
                        await updateDoc(doc(db, "Usuarios", userDocIdGlobal), { "subs.diasrestantes": diasCalculados });
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
    } catch (error) {
        console.error("Error al obtener los datos del usuario:", error);
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) btnVolver.addEventListener("click", () => { window.history.back(); });

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (userDocIdGlobal) {
                try {
                    await updateDoc(doc(db, "Usuarios", userDocIdGlobal), { line: false });
                } catch (err) {}
            }
            localStorage.clear();
            window.location.href = "../../index.html";
        });
    }
});