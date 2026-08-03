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

// Variables de estado del juego clásico (Mismo Dispositivo)
let tablero = ["", "", "", "", "", "", "", "", ""];
let juegoActivo = true;
let turnoJugador1 = true; // true = Jugador 1 (X), false = Jugador 2 (O)

// Diccionario local de fallback para traducciones de esta vista
const traduccionesLocales = {
    "titulo_clasico_dispositivo": {
        "es": "Clásico (Mismo Dispositivo)",
        "en": "Classic (Same Device)",
        "fr": "Classique (Même Appareil)",
        "ro": "Clasic (Același Dispozitiv)"
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
    "turno_jugador_1": {
        "es": "Turno del Jugador 1 (X) - Pásale el dispositivo",
        "en": "Player 1's turn (X) - Pass the device",
        "fr": "Tour du Joueur 1 (X) - Passez l'appareil",
        "ro": "Rândul Jucătorului 1 (X) - Dă dispozitivul mai departe"
    },
    "turno_jugador_2": {
        "es": "Turno del Jugador 2 (O) - Pásale el dispositivo",
        "en": "Player 2's turn (O) - Pass the device",
        "fr": "Tour du Joueur 2 (O) - Passez l'appareil",
        "ro": "Rândul Jucătorului 2 (O) - Dă dispozitivul mai departe"
    },
    "ganador_jugador_1": {
        "es": "¡Ha ganado el Jugador 1 (X)!",
        "en": "Player 1 (X) wins!",
        "fr": "Le Joueur 1 (X) a gagné !",
        "ro": "Jucătorul 1 (X) a câștigat!"
    },
    "ganador_jugador_2": {
        "es": "¡Ha ganado el Jugador 2 (O)!",
        "en": "Player 2 (O) wins!",
        "fr": "Le Joueur 2 (O) a gagné !",
        "ro": "Jucătorul 2 (O) a câștigat!"
    },
    "empate_juego": {
        "es": "¡Empate!",
        "en": "It's a draw!",
        "fr": "Match nul !",
        "ro": "Egalitate!"
    },
    "jugar_de_nuevo": {
        "es": "Jugar de nuevo",
        "en": "Play again",
        "fr": "Rejouer",
        "ro": "Joacă din nou"
    }
};

// --- FUNCIÓN PARA FORMATEAR IMÁGENES BASE64 O URL ---
function normalizarSourceImagen(cadenaImagen) {
    if (!cadenaImagen) return "../../default-profile.png";
    
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
        lblSubs.textContent = obtenerTextoTraduccion("text_subscripcion", "Suscripción:");
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.textContent = obtenerTextoTraduccion("btn_volver", "Volver");
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "Cerrar sesión");
    }

    const lblTitulo = document.getElementById("titulo-catalogo-juego");
    if (lblTitulo) {
        lblTitulo.textContent = obtenerTextoTraduccion("titulo_clasico_dispositivo", "Clásico (Mismo Dispositivo)");
    }

    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) {
        btnReiniciar.textContent = obtenerTextoTraduccion("jugar_de_nuevo", "Jugar de nuevo");
    }
}

// --- LÓGICA DEL JUEGO CLÁSICO ---
const combinacionesGanadoras = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
    [0, 4, 8], [2, 4, 6]            // Diagonales
];

function verificarGanador(tableroActual) {
    for (let combo of combinacionesGanadoras) {
        const [a, b, c] = combo;
        if (tableroActual[a] && tableroActual[a] === tableroActual[b] && tableroActual[a] === tableroActual[c]) {
            return tableroActual[a]; // Retorna 'X' o 'O'
        }
    }
    if (!tableroActual.includes("")) {
        return "EMPATE";
    }
    return null;
}

function actualizarMensajeEstado() {
    const statusMsg = document.getElementById("status-message");
    if (!statusMsg) return;

    if (turnoJugador1) {
        statusMsg.textContent = obtenerTextoTraduccion("turno_jugador_1", "Turno del Jugador 1 (X) - Pásale el dispositivo");
    } else {
        statusMsg.textContent = obtenerTextoTraduccion("turno_jugador_2", "Turno del Jugador 2 (O) - Pásale el dispositivo");
    }
}

function finalizarJuego(resultado) {
    juegoActivo = false;
    const statusMsg = document.getElementById("status-message");
    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) btnReiniciar.style.display = "block";

    if (resultado === "X") {
        if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("ganador_jugador_1", "¡Ha ganado el Jugador 1 (X)!");
    } else if (resultado === "O") {
        if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("ganador_jugador_2", "¡Ha ganado el Jugador 2 (O)!");
    } else if (resultado === "EMPATE") {
        if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("empate_juego", "¡Empate!");
    }
}

function reiniciarJuego() {
    tablero = ["", "", "", "", "", "", "", "", ""];
    juegoActivo = true;
    turnoJugador1 = true;

    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove("x", "o");
    });

    actualizarMensajeEstado();

    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) btnReiniciar.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en SalaPasarClasico:", error);
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

    // Redirecciones de cabecera
    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) {
        filaPerfil.addEventListener("click", () => {
            window.location.href = "../../Perfil.html";
        });
    }

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) {
        filaNovas.addEventListener("click", () => {
            window.location.href = "../../NovaPoints.html";
        });
    }

    // --- CONSULTA Y VALIDACIÓN EN TIEMPO REAL DEL USUARIO ---
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

            // --- CÁLCULO EN TIEMPO REAL DE EDAD ---
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

            // --- PROCESADO Y CÁLCULO EN TIEMPO REAL DE SUSCRIPCIÓN ---
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
    } catch (error) {
        console.error("Error al obtener los datos del usuario en SalaPasarClasico:", error);
    }

    actualizarMensajeEstado();

    // --- EVENT LISTENERS DEL TABLERO CLÁSICO (MISMO DISPOSITIVO) ---
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        cell.addEventListener("click", (e) => {
            if (!juegoActivo) return;

            const index = parseInt(e.target.getAttribute("data-index"), 10);
            if (tablero[index] !== "") return; // Celda ya ocupada

            if (turnoJugador1) {
                tablero[index] = "X";
                e.target.textContent = "X";
                e.target.classList.add("x");
            } else {
                tablero[index] = "O";
                e.target.textContent = "O";
                e.target.classList.add("o");
            }

            const resultado = verificarGanador(tablero);
            if (resultado) {
                finalizarJuego(resultado);
            } else {
                turnoJugador1 = !turnoJugador1;
                actualizarMensajeEstado();
            }
        });
    });

    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) {
        btnReiniciar.addEventListener("click", reiniciarJuego);
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
            window.location.href = "../../index.html";
        });
    }
});