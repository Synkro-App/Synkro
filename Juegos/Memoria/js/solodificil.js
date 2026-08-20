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

// Emojis disponibles (al menos 20 para cubrir las 20 parejas del modo difícil)
const iconosDisponibles = ["🍎", "🚗", "⭐", "🐶", "🐱", "🚀", "⚽", "🎵", "🎨", "🍕", "⚡", "🔥", "🏀", "🌍", "💡", "🎯", "👑", "💎", "🎮", "📚"];

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_solo_dificil": { "es": "Memoria - Difícil", "en": "Memory - Hard", "fr": "Mémoire - Difficile", "ro": "Memorie - Dificil" },
    "btn_reiniciar": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" },
    "victoria_msg": { 
        "es": "¡Felicidades! Has completado el juego y ganado 100 NovaPoints.", 
        "en": "Congratulations! You completed the game and won 100 NovaPoints.", 
        "fr": "Félicitations! Vous avez gagné 100 NovaPoints.", 
        "ro": "Felicitări! Ai câștigat 100 NovaPoints." 
    }
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
    
    const tituloSoloDificil = document.getElementById("titulo-solo-dificil");
    if (tituloSoloDificil) tituloSoloDificil.textContent = obtenerTextoTraduccion("titulo_solo_dificil", "Memoria - Difícil");

    const btnReiniciar = document.getElementById("btn-reiniciar");
    if (btnReiniciar) btnReiniciar.textContent = obtenerTextoTraduccion("btn_reiniciar", "Volver a jugar");
}

// Lógica del juego de Memoria (20 parejas)
let primeraCarta = null;
let segundaCarta = null;
let bloqueoTablero = false;
let parejasEncontradas = 0;
const totalParejas = 20;

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
    const mensajeDiv = document.getElementById("game-message");
    const btnReiniciar = document.getElementById("btn-reiniciar");

    mensajeDiv.textContent = obtenerTextoTraduccion("victoria_msg", "¡Felicidades! Has completado el juego y ganado 100 NovaPoints.");
    mensajeDiv.classList.remove("hidden");
    btnReiniciar.classList.remove("hidden");

    novasActuales += 100;
    const txtNovas = document.getElementById("user-novas");
    if (txtNovas) txtNovas.textContent = novasActuales;

    if (userDocIdGlobal) {
        try {
            const usuarioRef = doc(db, "Usuarios", userDocIdGlobal);
            
            // Actualizar NovaPoints en el documento principal del usuario
            await updateDoc(usuarioRef, { NovaPoints: novasActuales });

            // Referencia a la subcolección "Transacciones de NovaPoints"
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
            
            // Guardar el documento de la transacción con modo solodificil y 100 NovaPoints
            await setDoc(nuevoDocRef, {
                NovaPoints: 100,
                donde: "Memoria",
                fecha: serverTimestamp(),
                modo: "solodificil",
                tipo: "suma"
            });

        } catch (error) {
            console.error("Error al actualizar los NovaPoints o registrar la transacción:", error);
        }
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