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

let scoreJ1 = 0;
let scoreJ2 = 0;
let eleccionJugador1 = null;
let eleccionJugador2 = null;
let turnoActual = 1; // 1 para Jugador 1, 2 para Jugador 2

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "salapasar_titulo": { "es": "Jugar y Pasar", "en": "Play and Pass", "fr": "Jouer et Passer", "ro": "Joacă și Treci" },
    "piedra": { "es": "Piedra 🪨", "en": "Rock 🪨", "fr": "Pierre 🪨", "ro": "Piatră 🪨" },
    "papel": { "es": "Papel 📋", "en": "Paper 📋", "fr": "Papier 📋", "ro": "Hârtie 📋" },
    "tijera": { "es": "Tijera ✂️", "en": "Scissors ✂️", "fr": "Ciseaux ✂️", "ro": "Foarfece ✂️" },
    "turno_j1": { "es": "Turno del Jugador 1: Elige tu opción", "en": "Player 1's turn: Choose your option", "fr": "Tour du Joueur 1 : Choisissez votre option", "ro": "Rândul Jucătorului 1: Alege opțiunea ta" },
    "turno_j2": { "es": "Turno del Jugador 2: Elige tu opción", "en": "Player 2's turn: Choose your option", "fr": "Tour du Joueur 2 : Choisissez votre option", "ro": "Rândul Jucătorului 2: Alege opțiunea ta" },
    "haz_eleccion": { "es": "Haz tu elección en secreto", "en": "Make your choice in secret", "fr": "Faites votre choix en secret", "ro": "Fă-ți alegerea în secret" },
    "pasale_dispositivo": { "es": "¡Elección guardada! Pásale el dispositivo al Jugador 2.", "en": "Choice saved! Pass the device to Player 2.", "fr": "Choix enregistré ! Passez l'appareil au Joueur 2.", "ro": "Alegere salvată! Dă dispozitivul Jucătorului 2." },
    "btn_listo_j2": { "es": "Listo, soy el Jugador 2", "en": "Ready, I'm Player 2", "fr": "Prêt, je suis le Joueur 2", "ro": "Gata, sunt Jucătorul 2" },
    "empate": { "es": "¡Empate en esta ronda!", "en": "It's a tie in this round!", "fr": "Égalité dans cette manche !", "ro": "Egalitate în această rundă!" },
    "ganaj1": { "es": "¡Gana el Jugador 1 la ronda!", "en": "Player 1 wins the round!", "fr": "Le Joueur 1 remporte la manche !", "ro": "Jucătorul 1 câștigă runda!" },
    "ganaj2": { "es": "¡Gana el Jugador 2 la ronda!", "en": "Player 2 wins the round!", "fr": "Le Joueur 2 remporte la manche !", "ro": "Jucătorul 2 câștigă runda!" },
    "btn_siguiente": { "es": "Siguiente Ronda", "en": "Next Round", "fr": "Manche suivante", "ro": "Runda următoare" }
};

const emojisOpciones = {
    "piedra": "🪨",
    "papel": "📋",
    "tijera": "✂️"
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
    
    const tituloSalaPasar = document.getElementById("titulo-salapasar");
    if (tituloSalaPasar) tituloSalaPasar.textContent = obtenerTextoTraduccion("salapasar_titulo", "Jugar y Pasar");
    
    const btnPiedra = document.getElementById("btn-piedra");
    if (btnPiedra) btnPiedra.textContent = obtenerTextoTraduccion("piedra", "Piedra 🪨");
    
    const btnPapel = document.getElementById("btn-papel");
    if (btnPapel) btnPapel.textContent = obtenerTextoTraduccion("papel", "Papel 📋");
    
    const btnTijera = document.getElementById("btn-tijera");
    if (btnTijera) btnTijera.textContent = obtenerTextoTraduccion("tijera", "Tijera ✂️");

    const lblHazEleccion = document.getElementById("label-haz-eleccion");
    if (lblHazEleccion) lblHazEleccion.textContent = obtenerTextoTraduccion("haz_eleccion", "Haz tu elección en secreto");

    const turnoInd = document.getElementById("turno-indicator");
    if (turnoInd && turnoActual === 1) turnoInd.textContent = obtenerTextoTraduccion("turno_j1", "Turno del Jugador 1: Elige tu opción");

    const txtPasale = document.getElementById("text-pasale-dispositivo");
    if (txtPasale) txtPasale.textContent = obtenerTextoTraduccion("pasale_dispositivo", "¡Elección guardada! Pásale el dispositivo al Jugador 2.");

    const btnListoJ2 = document.getElementById("btn-listo-j2");
    if (btnListoJ2) btnListoJ2.textContent = obtenerTextoTraduccion("btn_listo_j2", "Listo, soy el Jugador 2");

    const btnSiguiente = document.getElementById("btn-siguiente-ronda");
    if (btnSiguiente) btnSiguiente.textContent = obtenerTextoTraduccion("btn_siguiente", "Siguiente Ronda");
}

function manejarEleccion(eleccion) {
    if (turnoActual === 1) {
        eleccionJugador1 = eleccion;
        turnoActual = 2;
        
        // Ocultar panel de selección y botones, mostrar mensaje para pasar dispositivo
        document.getElementById("panel-eleccion").style.display = "none";
        document.querySelector(".sections-grid").style.display = "none";
        document.getElementById("turno-indicator").style.display = "none";
        document.getElementById("panel-espera-pasar").style.display = "flex";
    } else if (turnoActual === 2) {
        eleccionJugador2 = eleccion;
        
        // Ocultar panel de espera J2 y mostrar resultados
        document.getElementById("panel-espera-pasar").style.display = "none";
        
        const resJ1 = document.getElementById("res-j1");
        const resJ2 = document.getElementById("res-j2");
        const textoGanador = document.getElementById("texto-ganador-ronda");
        const scoreJ1Elem = document.getElementById("score-j1");
        const scoreJ2Elem = document.getElementById("score-j2");

        if (resJ1) resJ1.textContent = emojisOpciones[eleccionJugador1];
        if (resJ2) resJ2.textContent = emojisOpciones[eleccionJugador2];

        if (eleccionJugador1 === eleccionJugador2) {
            if (textoGanador) textoGanador.textContent = obtenerTextoTraduccion("empate", "¡Empate en esta ronda!");
        } else if (
            (eleccionJugador1 === "piedra" && eleccionJugador2 === "tijera") ||
            (eleccionJugador1 === "papel" && eleccionJugador2 === "piedra") ||
            (eleccionJugador1 === "tijera" && eleccionJugador2 === "papel")
        ) {
            if (textoGanador) textoGanador.textContent = obtenerTextoTraduccion("ganaj1", "¡Gana el Jugador 1 la ronda!");
            scoreJ1++;
            if (scoreJ1Elem) scoreJ1Elem.textContent = scoreJ1;
        } else {
            if (textoGanador) textoGanador.textContent = obtenerTextoTraduccion("ganaj2", "¡Gana el Jugador 2 la ronda!");
            scoreJ2++;
            if (scoreJ2Elem) scoreJ2Elem.textContent = scoreJ2;
        }

        document.getElementById("panel-resultado-ronda").style.display = "flex";
    }
}

function reiniciarRonda() {
    turnoActual = 1;
    eleccionJugador1 = null;
    eleccionJugador2 = null;

    document.getElementById("panel-resultado-ronda").style.display = "none";
    document.getElementById("panel-eleccion").style.display = "flex";
    document.querySelector(".sections-grid").style.display = "flex";
    
    const turnoInd = document.getElementById("turno-indicator");
    if (turnoInd) {
        turnoInd.style.display = "flex";
        turnoInd.textContent = obtenerTextoTraduccion("turno_j1", "Turno del Jugador 1: Elige tu opción");
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

    const btnPiedra = document.getElementById("btn-piedra");
    if (btnPiedra) btnPiedra.addEventListener("click", () => manejarEleccion("piedra"));

    const btnPapel = document.getElementById("btn-papel");
    if (btnPapel) btnPapel.addEventListener("click", () => manejarEleccion("papel"));

    const btnTijera = document.getElementById("btn-tijera");
    if (btnTijera) btnTijera.addEventListener("click", () => manejarEleccion("tijera"));

    const btnListoJ2 = document.getElementById("btn-listo-j2");
    if (btnListoJ2) {
        btnListoJ2.addEventListener("click", () => {
            document.getElementById("panel-espera-pasar").style.display = "none";
            document.getElementById("panel-eleccion").style.display = "flex";
            document.querySelector(".sections-grid").style.display = "flex";
            
            const turnoInd = document.getElementById("turno-indicator");
            if (turnoInd) {
                turnoInd.style.display = "flex";
                turnoInd.textContent = obtenerTextoTraduccion("turno_j2", "Turno del Jugador 2: Elige tu opción");
            }
        });
    }

    const btnSiguiente = document.getElementById("btn-siguiente-ronda");
    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", () => {
            reiniciarRonda();
        });
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
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;

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