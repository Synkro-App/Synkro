import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    setDoc,
    updateDoc, 
    deleteField,
    query,
    where,
    serverTimestamp 
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
let juegoTerminado = false;

// Emojis disponibles (al menos 10)
const iconosDisponibles = ["🍎", "🚗", "⭐", "🐶", "🐱", "🚀", "⚽", "🎵", "🎨", "🍕", "⚡", "🔥"];

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_facil_5m": { "es": "Fácil - 5 Minutos", "en": "Easy - 5 Minutes", "fr": "Facile - 5 Minutes", "ro": "Ușor - 5 Minute" },
    "btn_reiniciar": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" }
};

let primeraCarta = null;
let segundaCarta = null;
let bloqueoTablero = false;
let parejasEncontradas = 0;
const totalParejas = 10;
let tiempoRestante = 300; // 5 minutos en segundos
let temporizadorIntervalo = null;
let transaccionGuardada = false;

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
    
    const tituloFacil5m = document.getElementById("titulo-facil-5m");
    if (tituloFacil5m) tituloFacil5m.textContent = obtenerTextoTraduccion("titulo_facil_5m", "Fácil - 5 Minutos");

    const btnReiniciar = document.getElementById("btn-reiniciar");
    if (btnReiniciar) btnReiniciar.textContent = obtenerTextoTraduccion("btn_reiniciar", "Volver a jugar");
}

function iniciarJuegoMemoria() {
    const tablero = document.getElementById("memory-board");
    const mensajeDiv = document.getElementById("game-message");
    const btnReiniciar = document.getElementById("btn-reiniciar");
    
    tablero.innerHTML = "";
    mensajeDiv.classList.add("hidden");
    btnReiniciar.classList.add("hidden");
    parejasEncontradas = 0;
    primeraCarta = null;
    segundaCarta = null;
    bloqueoTablero = false;
    juegoTerminado = false;
    transaccionGuardada = false;
    tiempoRestante = 300;
    actualizarDisplayTiempo();

    if (temporizadorIntervalo) clearInterval(temporizadorIntervalo);
    temporizadorIntervalo = setInterval(() => {
        if (juegoTerminado) return;
        tiempoRestante--;
        actualizarDisplayTiempo();
        if (tiempoRestante <= 0) {
            clearInterval(temporizadorIntervalo);
            finalizarJuegoPorTiempo();
        }
    }, 1000);

    const iconosMezclados = [...iconosDisponibles].sort(() => 0.5 - Math.random());
    const seleccionados = iconosMezclados.slice(0, totalParejas);
    let cartasArray = [...seleccionados, ...seleccionados];

    cartasArray.sort(() => 0.5 - Math.random());

    cartasArray.forEach((icono) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("memory-card");
        tarjeta.dataset.icono = icono;
        tarjeta.addEventListener("click", voltearCarta);
        tablero.appendChild(tarjeta);
    });
}

function actualizarDisplayTiempo() {
    const timerDisplay = document.getElementById("timer-display");
    if (!timerDisplay) return;
    const minutos = Math.floor(tiempoRestante / 60);
    const segundos = tiempoRestante % 60;
    timerDisplay.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
}

function voltearCarta() {
    if (bloqueoTablero || juegoTerminado) return;
    if (this === primeraCarta) return;
    if (this.classList.contains("matched")) return;

    this.classList.add("flipped");
    this.textContent = this.dataset.icono;

    if (!primeraCarta) {
        primeraCarta = this;
        return;
    }

    segundaCarta = this;
    comprobarPareja();
}

function comprobarPareja() {
    const esCoincidencia = primeraCarta.dataset.icono === segundaCarta.dataset.icono;

    if (esCoincidencia) {
        deshabilitarCartas();
    } else {
        deseleccionarCartas();
    }
}

function deshabilitarCartas() {
    primeraCarta.classList.add("matched");
    segundaCarta.classList.add("matched");
    
    resetearTurno();
    parejasEncontradas++;

    if (parejasEncontradas === totalParejas) {
        juegoTerminado = true;
        if (temporizadorIntervalo) clearInterval(temporizadorIntervalo);
        finalizarJuegoExitoso();
    }
}

function deseleccionarCartas() {
    bloqueoTablero = true;
    setTimeout(() => {
        primeraCarta.classList.remove("flipped");
        primeraCarta.textContent = "";
        segundaCarta.classList.remove("flipped");
        segundaCarta.textContent = "";
        resetearTurno();
    }, 900);
}

function resetearTurno() {
    [primeraCarta, segundaCarta, bloqueoTablero] = [null, null, false];
}

async function finalizarJuegoExitoso() {
    if (transaccionGuardada) return;
    transaccionGuardada = true;

    const mensajeDiv = document.getElementById("game-message");
    const btnReiniciar = document.getElementById("btn-reiniciar");

    const novasGanadas = parejasEncontradas * 5; // 5 NovaPoints por cada pareja

    const msgTexto = currentLanguage === "en" 
        ? `Congratulations! You found all ${parejasEncontradas} pairs and won ${novasGanadas} NovaPoints.`
        : currentLanguage === "fr"
        ? `Félicitations! Vous avez trouvé ${parejasEncontradas} paires et gagné ${novasGanadas} NovaPoints.`
        : currentLanguage === "ro"
        ? `Felicitări! Ai găsit ${parejasEncontradas} perechi și ai câștigat ${novasGanadas} NovaPoints.`
        : `¡Felicidades! Has encontrado las ${parejasEncontradas} parejas y ganado ${novasGanadas} NovaPoints.`;

    mensajeDiv.textContent = msgTexto;
    mensajeDiv.classList.remove("hidden");
    btnReiniciar.classList.remove("hidden");

    novasActuales += novasGanadas;
    const txtNovas = document.getElementById("user-novas");
    if (txtNovas) txtNovas.textContent = novasActuales;

    await guardarTransaccionEnFirebase(novasGanadas, parejasEncontradas);
}

async function finalizarJuegoPorTiempo() {
    if (transaccionGuardada) return;
    transaccionGuardada = true;
    juegoTerminado = true;

    const mensajeDiv = document.getElementById("game-message");
    const btnReiniciar = document.getElementById("btn-reiniciar");

    const novasGanadas = parejasEncontradas * 5;

    const msgTexto = currentLanguage === "en"
        ? `Time's up! You found ${parejasEncontradas} pairs and won ${novasGanadas} NovaPoints.`
        : currentLanguage === "fr"
        ? `Temps écoulé! Vous avez trouvé ${parejasEncontradas} paires et gagné ${novasGanadas} NovaPoints.`
        : currentLanguage === "ro"
        ? `Timpul a expirat! Ai găsit ${parejasEncontradas} perechi și ai câștigat ${novasGanadas} NovaPoints.`
        : `¡Se acabó el tiempo! Has encontrado ${parejasEncontradas} parejas y ganado ${novasGanadas} NovaPoints.`;

    mensajeDiv.textContent = msgTexto;
    mensajeDiv.classList.remove("hidden");
    btnReiniciar.classList.remove("hidden");

    novasActuales += novasGanadas;
    const txtNovas = document.getElementById("user-novas");
    if (txtNovas) txtNovas.textContent = novasActuales;

    await guardarTransaccionEnFirebase(novasGanadas, parejasEncontradas);
}

async function guardarTransaccionEnFirebase(novasGanadas, encontradas) {
    if (!userDocIdGlobal) return;
    try {
        const usuarioRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(usuarioRef, { NovaPoints: novasActuales });

        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const querySnapshot = await getDocs(transaccionesRef);
        
        let contador = 1;
        querySnapshot.forEach((docSnap) => {
            if (docSnap.id.startsWith("memoria")) {
                const numeroStr = docSnap.id.replace("memoria", "");
                const num = parseInt(numeroStr, 10);
                if (!isNaN(num) && num >= contador) {
                    contador = num + 1;
                }
            }
        });

        const nuevoIdDoc = `memoria${contador}`;
        const nuevoDocRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdDoc);
        
        await setDoc(nuevoDocRef, {
            NovaPoints: novasGanadas,
            donde: "Memoria",
            fecha: serverTimestamp(),
            modo: "fácil - 5 minutos",
            parejasencontradas: encontradas,
            tipo: "suma"
        });

    } catch (error) {
        console.error("Error al actualizar los NovaPoints o registrar la transacción:", error);
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

    const btnReiniciar = document.getElementById("btn-reiniciar");
    if (btnReiniciar) {
        btnReiniciar.addEventListener("click", iniciarJuegoMemoria);
    }

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

    iniciarJuegoMemoria();

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