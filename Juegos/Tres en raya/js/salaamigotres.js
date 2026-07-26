import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    setDoc,
    updateDoc, 
    deleteField,
    query,
    where,
    serverTimestamp,
    onSnapshot 
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

let codigoPartidaActual = null;
let idDocumentoPartida = null;
let esJugador1 = false;
let unsubscribePartida = null;
let partidaActiva = false;

// Estado del juego de tres en movimiento con amigo
let tableroMovimiento = ["", "", "", "", "", "", "", "", ""];
let fichaSeleccionadaIndice = null;

const traduccionesLocales = {
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
    "titulo_tres_en_raya_amigo": {
        "es": "Tres en Raya con Amigo",
        "en": "Tic-Tac-Toe with Friend",
        "fr": "Morpion avec un ami",
        "ro": "X și O cu un prieten"
    },
    "pregunta_deseas_hacer": {
        "es": "¿Qué deseas hacer?",
        "en": "What would you like to do?",
        "fr": "Que voulez-vous faire ?",
        "ro": "Ce ai vrea să faci?"
    },
    "btn_generar_codigo": {
        "es": "Generar Código",
        "en": "Generate Code",
        "fr": "Générer un code",
        "ro": "Generează cod"
    },
    "btn_tengo_codigo": {
        "es": "Tengo un Código",
        "en": "I have a Code",
        "fr": "J'ai un code",
        "ro": "Am un cod"
    },
    "texto_codigo_generado": {
        "es": "Código generado:",
        "en": "Generated code:",
        "fr": "Code généré :",
        "ro": "Cod generat:"
    },
    "esperando_jugador_2": {
        "es": "Esperando a que se una el jugador 2...",
        "en": "Waiting for player 2 to join...",
        "fr": "En attente que le joueur 2 rejoigne...",
        "ro": "Se așteaptă ca jucătorul 2 să se alăture..."
    },
    "placeholder_introduce_codigo": {
        "es": "Introduce el código...",
        "en": "Enter the code...",
        "fr": "Entrez le code...",
        "ro": "Introdu codul..."
    },
    "btn_unirse": {
        "es": "Unirse",
        "en": "Join",
        "fr": "Rejoindre",
        "ro": "Alătură-te"
    },
    "fase_colocacion": {
        "es": "Fase: Colocación de fichas",
        "en": "Phase: Placing pieces",
        "fr": "Phase : Placement des pièces",
        "ro": "Fază: Plasarea pieselor"
    },
    "fase_movimiento": {
        "es": "Fase: Movimiento de fichas",
        "en": "Phase: Moving pieces",
        "fr": "Phase : Déplacement des pièces",
        "ro": "Fază: Mutarea pieselor"
    },
    "turno_de": {
        "es": "Turno de:",
        "en": "Turn of:",
        "fr": "Tour de :",
        "ro": "Rândul lui:"
    },
    "no_es_tu_turno": {
        "es": "No es tu turno.",
        "en": "It is not your turn.",
        "fr": "Ce n'est pas votre tour.",
        "ro": "Nu este rândul tău."
    },
    "jugador_label": {
        "es": "Jugador",
        "en": "Player",
        "fr": "Joueur",
        "ro": "Jucător"
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

    const lblTituloModal = document.getElementById("lbl-titulo-modal");
    if (lblTituloModal) {
        lblTituloModal.textContent = obtenerTextoTraduccion("titulo_tres_en_raya_amigo", "Tres en Raya con Amigo");
    }

    const lblPregunta = document.getElementById("lbl-pregunta-accion");
    if (lblPregunta) {
        lblPregunta.textContent = obtenerTextoTraduccion("pregunta_deseas_hacer", "¿Qué deseas hacer?");
    }

    const btnGen = document.getElementById("btn-generar-codigo");
    if (btnGen) {
        btnGen.textContent = obtenerTextoTraduccion("btn_generar_codigo", "Generar Código");
    }

    const btnInt = document.getElementById("btn-introducir-codigo");
    if (btnInt) {
        btnInt.textContent = obtenerTextoTraduccion("btn_tengo_codigo", "Tengo un Código");
    }

    const lblGenText = document.getElementById("lbl-texto-codigo-gen");
    if (lblGenText) {
        lblGenText.textContent = obtenerTextoTraduccion("texto_codigo_generado", "Código generado:");
    }

    const lblEsp = document.getElementById("lbl-esperando-jugador");
    if (lblEsp) {
        lblEsp.textContent = obtenerTextoTraduccion("esperando_jugador_2", "Esperando a que se una el jugador 2...");
    }

    const inputSala = document.getElementById("input-codigo-sala");
    if (inputSala) {
        inputSala.placeholder = obtenerTextoTraduccion("placeholder_introduce_codigo", "Introduce el código...");
    }

    const btnUnirse = document.getElementById("btn-unirse-sala");
    if (btnUnirse) {
        btnUnirse.textContent = obtenerTextoTraduccion("btn_unirse", "Unirse");
    }
}

async function obtenerSiguienteIdPartida() {
    const ref = collection(db, "Partidas tres en raya");
    const snapshot = await getDocs(ref);
    let maxNum = 0;
    snapshot.forEach(docSnap => {
        if (docSnap.id.startsWith("amigotres")) {
            const numStr = docSnap.id.replace("amigotres", "");
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `amigotres${maxNum + 1}`;
}

async function obtenerSiguienteIdTransaccion() {
    const ref = collection(db, "Transacciones de NovaPoints");
    const snapshot = await getDocs(ref);
    let maxNum = 0;
    snapshot.forEach(docSnap => {
        if (docSnap.id.startsWith("tresenraya")) {
            const numStr = docSnap.id.replace("tresenraya", "");
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `tresenraya${maxNum + 1}`;
}

async function obtenerSiguienteCodigo() {
    const ref = collection(db, "Partidas tres en raya");
    const snapshot = await getDocs(ref);
    let maxCodigo = -1;
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.codigo !== undefined) {
            const codigoNum = parseInt(data.codigo, 10);
            if (!isNaN(codigoNum) && codigoNum > maxCodigo) {
                maxCodigo = codigoNum;
            }
        }
    });
    
    let siguienteNum = maxCodigo + 1;
    if (siguienteNum > 999999999) {
        siguienteNum = 0;
    }
    return String(siguienteNum).padStart(10, '0');
}

async function obtenerAvatarUsuario(nombreUsuario) {
    try {
        const usuariosRef = collection(db, "Usuarios");
        const qUser = query(usuariosRef, where("usuario", "==", nombreUsuario));
        const snap = await getDocs(qUser);
        if (!snap.empty) {
            const dataUser = snap.docs[0].data();
            return normalizarSourceImagen(dataUser.imgperfil);
        }
    } catch (e) {
        console.error("Error obteniendo avatar:", e);
    }
    return "../../default-profile.png";
}

const combinacionesGanadoras = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function verificarGanador(tablero) {
    for (let combo of combinacionesGanadoras) {
        const [a, b, c] = combo;
        if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
            return tablero[a];
        }
    }
    return null;
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
        console.error("Error al obtener los datos del usuario:", error);
    }

    // --- LÓGICA DE INTERACCIÓN DE CÓDIGOS Y JUEGO ---
    const btnGenerarCodigo = document.getElementById("btn-generar-codigo");
    const btnIntroducirCodigo = document.getElementById("btn-introducir-codigo");
    const contenedorInputCodigo = document.getElementById("contenedor-input-codigo");
    const contenedorEsperaCodigo = document.getElementById("contenedor-espera-codigo");
    const lblCodigoGenerado = document.getElementById("lbl-codigo-generado");
    const btnUnirseSala = document.getElementById("btn-unirse-sala");
    const inputCodigoSala = document.getElementById("input-codigo-sala");
    const modalCodigo = document.getElementById("modal-codigo");
    const tableroTresenraya = document.getElementById("tablero-tresenraya");
    const mensajeTurno = document.getElementById("mensaje-turno");
    const infoPartidaTxt = document.getElementById("info-partida-txt");
    const avatarJ1Top = document.getElementById("avatar-j1-top");
    const avatarJ2Top = document.getElementById("avatar-j2-top");
    const lblInfoJ1 = document.getElementById("lbl-info-j1");
    const lblInfoJ2 = document.getElementById("lbl-info-j2");

    btnGenerarCodigo.addEventListener("click", async () => {
        const nuevoCodigo = await obtenerSiguienteCodigo();
        const nuevoId = await obtenerSiguienteIdPartida();
        
        idDocumentoPartida = nuevoId;
        codigoPartidaActual = nuevoCodigo;
        esJugador1 = true;

        const partidaData = {
            codigo: nuevoCodigo,
            enuso: true,
            jugador1: nombreUsuarioLogueado,
            jugador2: "",
            partidasjugas: 0,
            ganador: [],
            fecha: {},
            vecesusado: 0,
            tablero: ["", "", "", "", "", "", "", "", ""]
        };

        await setDoc(doc(db, "Partidas tres en raya", nuevoId), partidaData);

        lblCodigoGenerado.textContent = nuevoCodigo;
        btnGenerarCodigo.style.display = "none";
        btnIntroducirCodigo.style.display = "none";
        contenedorEsperaCodigo.style.display = "block";

        iniciarEscuchaPartida(nuevoId);
    });

    btnIntroducirCodigo.addEventListener("click", () => {
        btnGenerarCodigo.style.display = "none";
        btnIntroducirCodigo.style.display = "none";
        contenedorInputCodigo.style.display = "block";
    });

    btnUnirseSala.addEventListener("click", async () => {
        const codigoIngresado = inputCodigoSala.value.trim();
        if (!codigoIngresado) return;

        const refPartidas = collection(db, "Partidas tres en raya");
        const q = query(refPartidas, where("codigo", "==", codigoIngresado), where("enuso", "==", true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Código no válido o sala no disponible.");
            return;
        }

        const docPartida = querySnapshot.docs[0];
        idDocumentoPartida = docPartida.id;
        codigoPartidaActual = codigoIngresado;
        esJugador1 = false;

        const dataPartida = docPartida.data();
        const nuevoVecesUsado = (dataPartida.vecesusado || 0) + 1;

        let nuevoEnUso = true;
        if (nuevoVecesUsado >= 999999999) {
            nuevoEnUso = false;
        }

        await updateDoc(doc(db, "Partidas tres en raya", idDocumentoPartida), {
            jugador2: nombreUsuarioLogueado,
            vecesusado: nuevoVecesUsado,
            enuso: nuevoEnUso
        });

        modalCodigo.style.display = "none";
        tableroTresenraya.style.display = "block";
        iniciarEscuchaPartida(idDocumentoPartida);
    });

    async function iniciarEscuchaPartida(idDoc) {
        unsubscribePartida = onSnapshot(doc(db, "Partidas tres en raya", idDoc), async (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();

            if (esJugador1 && data.jugador2) {
                modalCodigo.style.display = "none";
                tableroTresenraya.style.display = "block";
            }

            if (data.jugador1 && data.jugador2) {
                partidaActiva = true;
                tableroMovimiento = data.tablero || ["", "", "", "", "", "", "", "", ""];

                const avatar1 = await obtenerAvatarUsuario(data.jugador1);
                const avatar2 = await obtenerAvatarUsuario(data.jugador2);
                avatarJ1Top.src = avatar1;
                avatarJ2Top.src = avatar2;

                const txtJ1Lbl = obtenerTextoTraduccion("jugador_label", "Jugador");
                const txtJ2Lbl = obtenerTextoTraduccion("jugador_label", "Jugador");
                lblInfoJ1.textContent = `${txtJ1Lbl} 1 (X): ${data.jugador1}`;
                lblInfoJ2.textContent = `${txtJ2Lbl} 2 (O): ${data.jugador2}`;

                actualizarVisualTablero(data.jugador1, data.jugador2);
            }
        });
    }

    function actualizarVisualTablero(j1, j2) {
        const celdas = document.querySelectorAll(".celda-tres");
        celdas.forEach((celda, idx) => {
            celda.textContent = tableroMovimiento[idx] || "";
            celda.classList.remove("seleccionada");
        });

        if (fichaSeleccionadaIndice !== null) {
            const celdaSel = document.querySelector(`.celda-tres[data-index="${fichaSeleccionadaIndice}"]`);
            if (celdaSel) celdaSel.classList.add("seleccionada");
        }

        const fichasX = tableroMovimiento.filter(v => v === "X").length;
        const fichasO = tableroMovimiento.filter(v => v === "O").length;
        const totalPuestas = fichasX + fichasO;

        let faseActual = "";
        let turnoSimbolo = "";

        if (totalPuestas < 6) {
            faseActual = obtenerTextoTraduccion("fase_colocacion", "Fase: Colocación de fichas");
            turnoSimbolo = (fichasX <= fichasO) ? "X" : "O";
        } else {
            faseActual = obtenerTextoTraduccion("fase_movimiento", "Fase: Movimiento de fichas");
            turnoSimbolo = (fichasX === fichasO) ? "X" : "O";
        }

        infoPartidaTxt.textContent = faseActual;
        const nombreTurno = (turnoSimbolo === "X") ? j1 : j2;
        const txtTurnoDe = obtenerTextoTraduccion("turno_de", "Turno de:");
        mensajeTurno.textContent = `${txtTurnoDe} ${nombreTurno} (${turnoSimbolo})`;
    }

    // Lógica de clics en las celdas del tablero
    const celdasTablero = document.querySelectorAll(".celda-tres");
    celdasTablero.forEach(celda => {
        celda.addEventListener("click", async () => {
            if (!partidaActiva) return;

            const index = parseInt(celda.getAttribute("data-index"), 10);
            const nombreUsuarioLogueado = localStorage.getItem("user");

            // Obtener datos actuales de la partida desde Firestore para verificar turno real
            const partidaRef = doc(db, "Partidas tres en raya", idDocumentoPartida);
            const partidaSnap = await getDoc(partidaRef);
            if (!partidaSnap.exists()) return;
            const dataPartida = partidaSnap.data();

            const j1 = dataPartida.jugador1;
            const j2 = dataPartida.jugador2;
            tableroMovimiento = dataPartida.tablero || ["", "", "", "", "", "", "", "", ""];

            const fichasX = tableroMovimiento.filter(v => v === "X").length;
            const fichasO = tableroMovimiento.filter(v => v === "O").length;
            const totalPuestas = fichasX + fichasO;

            let turnoSimbolo = "";
            if (totalPuestas < 6) {
                turnoSimbolo = (fichasX <= fichasO) ? "X" : "O";
            } else {
                turnoSimbolo = (fichasX === fichasO) ? "X" : "O";
            }

            const esMiTurno = (turnoSimbolo === "X" && nombreUsuarioLogueado === j1) || (turnoSimbolo === "O" && nombreUsuarioLogueado === j2);
            if (!esMiTurno) {
                alert(obtenerTextoTraduccion("no_es_tu_turno", "No es tu turno."));
                return;
            }

            if (totalPuestas < 6) {
                // Fase de colocación
                if (tableroMovimiento[index] !== "") return;
                tableroMovimiento[index] = turnoSimbolo;
            } else {
                // Fase de movimiento
                if (fichaSeleccionadaIndice === null) {
                    if (tableroMovimiento[index] === turnoSimbolo) {
                        fichaSeleccionadaIndice = index;
                        actualizarVisualTablero(j1, j2);
                    }
                    return;
                } else {
                    if (index === fichaSeleccionadaIndice) {
                        fichaSeleccionadaIndice = null;
                        actualizarVisualTablero(j1, j2);
                        return;
                    }

                    // Verificar adyacencia simple o movimiento válido
                    const adyacentes = {
                        0: [1, 3, 4], 1: [0, 2, 4], 2: [1, 4, 5],
                        3: [0, 4, 6], 4: [0, 1, 2, 3, 5, 6, 7, 8], 5: [2, 4, 8],
                        6: [3, 4, 7], 7: [4, 6, 8], 8: [4, 5, 7]
                    };

                    if (tableroMovimiento[index] === "" && adyacentes[fichaSeleccionadaIndice].includes(index)) {
                        tableroMovimiento[index] = turnoSimbolo;
                        tableroMovimiento[fichaSeleccionadaIndice] = "";
                        fichaSeleccionadaIndice = null;
                    } else {
                        if (tableroMovimiento[index] === turnoSimbolo) {
                            fichaSeleccionadaIndice = index;
                            actualizarVisualTablero(j1, j2);
                        }
                        return;
                    }
                }
            }

            // Actualizar tablero en Firestore
            await updateDoc(partidaRef, { tablero: tableroMovimiento });

            const ganador = verificarGanador(tableroMovimiento);
            if (ganador) {
                partidaActiva = false;
                await registrarFinPartida(ganador, j1, j2);
            } else {
                actualizarVisualTablero(j1, j2);
            }
        });
    });

    async function registrarFinPartida(ganadorSimbolo, j1, j2) {
        const ganadorNombre = (ganadorSimbolo === "X") ? j1 : j2;
        mensajeTurno.textContent = `¡Ha ganado ${ganadorNombre} (${ganadorSimbolo})! (+10 NovaPoints)`;

        const btnReiniciarRonda = document.getElementById("btn-reiniciar-partida-amigo");
        if (btnReiniciarRonda) btnReiniciarRonda.style.display = "block";

        try {
            const partidaRef = doc(db, "Partidas tres en raya", idDocumentoPartida);
            const partidaSnap = await getDoc(partidaRef);
            if (!partidaSnap.exists()) return;

            const data = partidaSnap.data();
            const nuevasPartidas = (data.partidasjugas || 0) + 1;
            const nuevoGanadores = data.ganador || [];
            nuevoGanadores.push(ganadorSimbolo === "X" ? "jugador1" : "jugador2");

            const nuevoFechas = data.fecha || {};
            nuevoFechas[`fecha${nuevasPartidas}`] = serverTimestamp();

            await updateDoc(partidaRef, {
                partidasjugas: nuevasPartidas,
                ganador: nuevoGanadores,
                fecha: nuevoFechas
            });

            const nombreUsuarioLogueado = localStorage.getItem("user");
            if (ganadorNombre === nombreUsuarioLogueado && userDocIdGlobal) {
                await otorgarNovaPoints();
            }
        } catch (e) {
            console.error("Error registrando fin de partida:", e);
        }
    }

    async function otorgarNovaPoints() {
        try {
            const userRef = doc(db, "Usuarios", userDocIdGlobal);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) return;

            const userData = userSnap.data();
            const novasActuales = userData.NovaPoints !== undefined ? Number(userData.NovaPoints) : 0;
            const nuevosNovas = novasActuales + 10;

            await updateDoc(userRef, { NovaPoints: nuevosNovas });
            const txtNovas = document.getElementById("user-novas");
            if (txtNovas) txtNovas.textContent = nuevosNovas;

            const nuevoIdTrans = await obtenerSiguienteIdTransaccion();
            const transRef = doc(db, "Transacciones de NovaPoints", nuevoIdTrans);

            await setDoc(transRef, {
                NovaPoints: 10,
                fecha: serverTimestamp(),
                modo: "tres en movimiento",
                donde: "tres en raya",
                tipojuego: "con amigo",
                tipo: "suma"
            });
        } catch (e) {
            console.error("Error otorgando NovaPoints:", e);
        }
    }

    const btnReiniciarRonda = document.getElementById("btn-reiniciar-partida-amigo");
    if (btnReiniciarRonda) {
        btnReiniciarRonda.addEventListener("click", async () => {
            tableroMovimiento = ["", "", "", "", "", "", "", "", ""];
            fichaSeleccionadaIndice = null;
            partidaActiva = true;
            btnReiniciarRonda.style.display = "none";

            try {
                await updateDoc(doc(db, "Partidas tres en raya", idDocumentoPartida), {
                    tablero: tableroMovimiento
                });
            } catch (e) {
                console.error("Error reiniciando ronda:", e);
            }
        });
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            if (unsubscribePartida) unsubscribePartida();
            window.history.back();
        });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (unsubscribePartida) unsubscribePartida();
            if (userDocIdGlobal) {
                try {
                    const userRef = doc(db, "Usuarios", userDocIdGlobal);
                    await updateDoc(userRef, { line: false });
                } catch (err) {
                    console.error("Error al actualizar estado 'line':", err);
                }
            }
            localStorage.clear();
            window.location.href = "../../index.html";
        });
    }
});
