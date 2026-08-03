import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteField,
    query,
    where,
    setDoc,
    serverTimestamp 
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

// Variables de estado del juego
let tablero = ["", "", "", "", "", "", "", "", ""];
let juegoActivo = true;
let turnoUsuario = true; // true = Usuario (X), false = IA (O)

// Diccionario local de fallback para traducciones de esta vista
const traduccionesLocales = {
    "titulo_ia_dificil_clasico": {
        "es": "IA Difícil (Clásico)",
        "en": "Hard AI (Classic)",
        "fr": "IA Difficile (Classique)",
        "ro": "IA Dificil (Clasic)"
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
    "turno_usuario": {
        "es": "Tu turno (X)",
        "en": "Your turn (X)",
        "fr": "Votre tour (X)",
        "ro": "Rândul tău (X)"
    },
    "turno_ia": {
        "es": "Turno de la IA (O)...",
        "en": "AI's turn (O)...",
        "fr": "Tour de l'IA (O)...",
        "ro": "Rândul AI-ului (O)..."
    },
    "ganador_usuario": {
        "es": "¡Has ganado! (+20 NovaPoints)",
        "en": "You win! (+20 NovaPoints)",
        "fr": "Vous avez gagné ! (+20 NovaPoints)",
        "ro": "Ai câștigat! (+20 NovaPoints)"
    },
    "ganador_ia": {
        "es": "¡La IA ha ganado!",
        "en": "AI wins!",
        "fr": "L'IA a gagné !",
        "ro": "AI-ul a câștigat!"
    },
    "empate": {
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
        lblTitulo.textContent = obtenerTextoTraduccion("titulo_ia_dificil_clasico", "IA Difícil (Clásico)");
    }

    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) {
        btnReiniciar.textContent = obtenerTextoTraduccion("jugar_de_nuevo", "Jugar de nuevo");
    }
}

// --- LÓGICA DEL JUEGO: TRES EN RAYA ---
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

// Algoritmo Minimax para la IA en modo Difícil
function minimax(nuevoTablero, esOptimizing) {
    const resultado = verificarGanador(nuevoTablero);
    if (resultado === "O") return { score: 10 };
    if (resultado === "X") return { score: -10 };
    if (resultado === "EMPATE") return { score: 0 };

    const indicesVacios = [];
    nuevoTablero.forEach((val, idx) => {
        if (val === "") indicesVacios.push(idx);
    });

    if (esOptimizing) {
        let mejorScore = -Infinity;
        let mejorMovimiento = -1;
        for (let i = 0; i < indicesVacios.length; i++) {
            const index = indicesVacios[i];
            nuevoTablero[index] = "O";
            const currentScore = minimax(nuevoTablero, false).score;
            nuevoTablero[index] = "";
            if (currentScore > mejorScore) {
                mejorScore = currentScore;
                mejorMovimiento = index;
            }
        }
        return { score: mejorScore, index: mejorMovimiento };
    } else {
        let mejorScore = Infinity;
        let mejorMovimiento = -1;
        for (let i = 0; i < indicesVacios.length; i++) {
            const index = indicesVacios[i];
            nuevoTablero[index] = "X";
            const currentScore = minimax(nuevoTablero, true).score;
            nuevoTablero[index] = "";
            if (currentScore < mejorScore) {
                mejorScore = currentScore;
                mejorMovimiento = index;
            }
        }
        return { score: mejorScore, index: mejorMovimiento };
    }
}

function calcularMovimientoIA(tableroActual) {
    const mejorJugada = minimax(tableroActual, true);
    return mejorJugada.index;
}

function turnoIA() {
    if (!juegoActivo) return;

    const statusMsg = document.getElementById("status-message");
    if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("turno_ia", "Turno de la IA (O)...");

    setTimeout(() => {
        if (!juegoActivo) return;

        const randomIndex = calcularMovimientoIA(tablero);

        if (randomIndex !== -1) {
            tablero[randomIndex] = "O";

            const cellElement = document.querySelector(`.cell[data-index="${randomIndex}"]`);
            if (cellElement) {
                cellElement.textContent = "O";
                cellElement.classList.add("o");
            }

            const resultado = verificarGanador(tablero);
            if (resultado) {
                finalizarJuego(resultado);
            } else {
                turnoUsuario = true;
                if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("turno_usuario", "Tu turno (X)");
            }
        }
    }, 600);
}

async function finalizarJuego(resultado) {
    juegoActivo = false;
    const statusMsg = document.getElementById("status-message");
    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) btnReiniciar.style.display = "block";

    if (resultado === "X") {
        if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("ganador_usuario", "¡Has ganado! (+20 NovaPoints)");
        await otorgarRecompensaVictoria();
    } else if (resultado === "O") {
        if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("ganador_ia", "¡La IA ha ganado!");
    } else {
        if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("empate", "¡Empate!");
    }
}

async function otorgarRecompensaVictoria() {
    if (!userDocIdGlobal) return;

    try {
        const userRef = doc(db, "Usuarios", userDocIdGlobal);
        
        // 1. Obtener los NovaPoints actuales actualizados de la BD para sumar 20 con precisión
        const querySnapshot = await getDocs(query(collection(db, "Usuarios"), where("usuario", "==", localStorage.getItem("user"))));
        if (querySnapshot.empty) return;
        
        const userDocData = querySnapshot.docs[0].data();
        const novasActuales = userDocData.NovaPoints !== undefined ? Number(userDocData.NovaPoints) : 0;
        const nuevosNovas = novasActuales + 20;

        // Actualizar NovaPoints en el documento del usuario
        await updateDoc(userRef, { NovaPoints: nuevosNovas });

        const txtNovas = document.getElementById("user-novas");
        if (txtNovas) txtNovas.textContent = nuevosNovas;

        // 2. Gestionar subcolección de transacciones incrementales con prefijo fijo "tresenraya"
        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const transSnapshot = await getDocs(transaccionesRef);
        
        let maxIndex = 0;
        transSnapshot.forEach((documento) => {
            const docId = documento.id;
            if (docId.startsWith("tresenraya")) {
                const numStr = docId.replace("tresenraya", "");
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxIndex) {
                    maxIndex = num;
                }
            }
        });

        const nuevoIdTransaccion = `tresenraya${maxIndex + 1}`;
        const nuevaTransaccionRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdTransaccion);

        await setDoc(nuevaTransaccionRef, {
            NovaPoints: 20,
            fecha: serverTimestamp(),
            modo: "clasico",
            dificultad: "dificil",
            tipo: "suma"
        });

        console.log(`Transacción registrada correctamente como: ${nuevoIdTransaccion}`);
    } catch (error) {
        console.error("Error al otorgar recompensa y registrar transacción:", error);
    }
}

function reiniciarJuego() {
    tablero = ["", "", "", "", "", "", "", "", ""];
    juegoActivo = true;
    turnoUsuario = true;

    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove("x", "o");
    });

    const statusMsg = document.getElementById("status-message");
    if (statusMsg) statusMsg.textContent = obtenerTextoTraduccion("turno_usuario", "Tu turno (X)");

    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) btnReiniciar.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en IaDificilClasico:", error);
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
        console.error("Error al obtener los datos del usuario en IaDificilClasico:", error);
    }

    // --- EVENT LISTENERS DEL TABLERO DE TRES EN RAYA ---
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        cell.addEventListener("click", (e) => {
            if (!juegoActivo || !turnoUsuario) return;

            const index = parseInt(e.target.getAttribute("data-index"), 10);

            if (tablero[index] !== "") return; // Celda ocupada

            // Movimiento del usuario
            tablero[index] = "X";
            e.target.textContent = "X";
            e.target.classList.add("x");

            const resultado = verificarGanador(tablero);
            if (resultado) {
                finalizarJuego(resultado);
            } else {
                turnoUsuario = false;
                turnoIA();
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