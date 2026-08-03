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

// Variables del juego
let tablero = ["", "", "", "", "", "", "", "", ""];
let juegoActivo = true;
let turnoJugador1 = true; // true = Jugador 1 (X), false = Jugador 2 (O)
let fichasColocadasX = 0;
let fichasColocadasO = 0;
let casillaSeleccionada = null; // Índice de la ficha seleccionada para mover

const combinacionesGanadoras = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

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
    return fallbackTexto;
}

function aplicarTraduccionesEstaticas() {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs) lblSubs.textContent = obtenerTextoTraduccion("text_subscripcion", "Suscripción:");

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) btnVolver.textContent = obtenerTextoTraduccion("btn_volver", "Volver");

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "Cerrar sesión");

    const lblTitulo = document.getElementById("titulo-catalogo-juego");
    if (lblTitulo) lblTitulo.textContent = obtenerTextoTraduccion("titulo_tres_movimiento", "3 en Raya con Movimiento (Mismo Dispositivo)");

    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) btnReiniciar.textContent = obtenerTextoTraduccion("jugar_de_nuevo", "Jugar de nuevo");
}

function verificarGanador(tableroActual) {
    for (let combo of combinacionesGanadoras) {
        const [a, b, c] = combo;
        if (tableroActual[a] && tableroActual[a] === tableroActual[b] && tableroActual[a] === tableroActual[c]) {
            return tableroActual[a];
        }
    }
    return null;
}

function actualizarMensajeEstado() {
    const statusMsg = document.getElementById("status-message");
    if (!statusMsg) return;

    const faseColocacionTerminada = (fichasColocadasX === 3 && fichasColocadasO === 3);

    if (!faseColocacionTerminada) {
        if (turnoJugador1) {
            const restantes = 3 - fichasColocadasX;
            statusMsg.textContent = `Jugador 1 (X): Coloca tu ficha (${restantes} restantes)`;
        } else {
            const restantes = 3 - fichasColocadasO;
            statusMsg.textContent = `Jugador 2 (O): Coloca tu ficha (${restantes} restantes)`;
        }
    } else {
        if (turnoJugador1) {
            if (casillaSeleccionada === null) {
                statusMsg.textContent = `Jugador 1 (X): Selecciona una de tus fichas para mover`;
            } else {
                statusMsg.textContent = `Jugador 1 (X): Selecciona un espacio libre (adyacente o cualquiera) para moverla`;
            }
        } else {
            if (casillaSeleccionada === null) {
                statusMsg.textContent = `Jugador 2 (O): Selecciona una de tus fichas para mover`;
            } else {
                statusMsg.textContent = `Jugador 2 (O): Selecciona un espacio libre (adyacente o cualquiera) para moverla`;
            }
        }
    }
}

function finalizarJuego(resultado) {
    juegoActivo = false;
    casillaSeleccionada = null;
    const statusMsg = document.getElementById("status-message");
    const btnReiniciar = document.getElementById("btn-reiniciar-juego");
    if (btnReiniciar) btnReiniciar.style.display = "block";

    if (resultado === "X") {
        if (statusMsg) statusMsg.textContent = "¡Ha ganado el Jugador 1 (X)!";
    } else if (resultado === "O") {
        if (statusMsg) statusMsg.textContent = "¡Ha ganado el Jugador 2 (O)!";
    }
}

function reiniciarJuego() {
    tablero = ["", "", "", "", "", "", "", "", ""];
    juegoActivo = true;
    turnoJugador1 = true;
    fichasColocadasX = 0;
    fichasColocadasO = 0;
    casillaSeleccionada = null;

    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove("x", "o", "selected");
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
        console.error("Error cargando idiomas.json en SalaPasarTres:", error);
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
        console.error("Error al obtener los datos del usuario en SalaPasarTres:", error);
    }

    actualizarMensajeEstado();

    // Lógica del juego de celdas
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        cell.addEventListener("click", (e) => {
            if (!juegoActivo) return;

            const index = parseInt(e.target.getAttribute("data-index"), 10);
            const fichaActualTurno = turnoJugador1 ? "X" : "O";
            const faseColocacionTerminada = (fichasColocadasX === 3 && fichasColocadasO === 3);

            if (!faseColocacionTerminada) {
                // --- FASE DE COLOCACIÓN ---
                if (tablero[index] !== "") return; // Celda ocupada

                tablero[index] = fichaActualTurno;
                e.target.textContent = fichaActualTurno;
                e.target.classList.add(fichaActualTurno.toLowerCase());

                if (turnoJugador1) {
                    fichasColocadasX++;
                } else {
                    fichasColocadasO++;
                }

                // Comprobar si al colocar hace 3 en raya
                const ganador = verificarGanador(tablero);
                if (ganador) {
                    finalizarJuego(ganador);
                } else {
                    turnoJugador1 = !turnoJugador1;
                    actualizarMensajeEstado();
                }

            } else {
                // --- FASE DE MOVIMIENTO ---
                if (casillaSeleccionada === null) {
                    // El jugador selecciona una de sus fichas en el tablero
                    if (tablero[index] === fichaActualTurno) {
                        casillaSeleccionada = index;
                        cells.forEach(c => c.classList.remove("selected"));
                        e.target.classList.add("selected");
                        actualizarMensajeEstado();
                    }
                } else {
                    // Si vuelve a hacer clic en su misma ficha seleccionada, se deselecciona
                    if (index === casillaSeleccionada) {
                        cells[casillaSeleccionada].classList.remove("selected");
                        casillaSeleccionada = null;
                        actualizarMensajeEstado();
                        return;
                    }

                    // Si hace clic en un espacio libre, mueve la ficha seleccionada (a cualquiera de los espacios libres)
                    if (tablero[index] === "") {
                        tablero[casillaSeleccionada] = "";
                        cells[casillaSeleccionada].textContent = "";
                        cells[casillaSeleccionada].classList.remove("x", "o", "selected");

                        tablero[index] = fichaActualTurno;
                        cells[index].textContent = fichaActualTurno;
                        cells[index].classList.add(fichaActualTurno.toLowerCase());

                        casillaSeleccionada = null;

                        // Comprobar si al mover hace 3 en raya
                        const ganador = verificarGanador(tablero);
                        if (ganador) {
                            finalizarJuego(ganador);
                        } else {
                            turnoJugador1 = !turnoJugador1;
                            actualizarMensajeEstado();
                        }
                    } else if (tablero[index] === fichaActualTurno) {
                        // Cambiar de ficha seleccionada del mismo jugador
                        cells[casillaSeleccionada].classList.remove("selected");
                        casillaSeleccionada = index;
                        cells.forEach(c => c.classList.remove("selected"));
                        e.target.classList.add("selected");
                        actualizarMensajeEstado();
                    }
                }
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