import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    setDoc,
    getDoc,
    updateDoc, 
    deleteField,
    query,
    where,
    onSnapshot,
    arrayUnion,
    increment,
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
let nombreUsuarioLogueado = null;
let avatarUsuarioLogueado = "../../default-profile.png";

let edadUsuarioGlobal = 0; 
let subsUsuarioGlobal = ""; 

// Variables de Estado de Partida
let salaIdActual = null;
let salaRefActual = null;
let unsubscribeSala = null;
let esJugador1 = false;
let partidaTerminadaProcesada = false;

// Diccionario local de fallback para traducciones
const traduccionesLocales = {
    "sala_aleatoria": {
        "es": "Sala Aleatoria",
        "en": "Random Room",
        "fr": "Salon Aléatoire",
        "ro": "Cameră Aleatorie"
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
    "buscando_sala": {
        "es": "Buscando sala disponible...",
        "en": "Searching for available room...",
        "fr": "Recherche d'une salle disponible...",
        "ro": "Se caută o cameră disponibilă..."
    },
    "esperando_rival": {
        "es": "Esperando a que se una otro jugador...",
        "en": "Waiting for another player to join...",
        "fr": "En attente d'un autre joueur...",
        "ro": "Se așteaptă un alt jucător..."
    },
    "turno_del_rival": {
        "es": "Turno del rival",
        "en": "Opponent's turn",
        "fr": "Tour de l'adversaire",
        "ro": "Rândul adversarului"
    },
    "tu_turno": {
        "es": "Tu turno",
        "en": "Your turn",
        "fr": "Votre tour",
        "ro": "Rândul tău"
    },
    "empate": {
        "es": "Partida empatada",
        "en": "Game tied",
        "fr": "Match nul",
        "ro": "Joc egal"
    },
    "ganador_jugador": {
        "es": "Ganador Jugador",
        "en": "Winner Player",
        "fr": "Joueur Gagnant",
        "ro": "Câștigător Jucător"
    },
    "cerrar": {
        "es": "Cerrar",
        "en": "Close",
        "fr": "Fermer",
        "ro": "Închide"
    },
    "volver_jugar": {
        "es": "Volver a jugar",
        "en": "Play again",
        "fr": "Rejouer",
        "ro": "Joacă din nou"
    },
    "esperando_respuesta": {
        "es": "Esperando respuesta...",
        "en": "Waiting for response...",
        "fr": "En attente de réponse...",
        "ro": "Se așteaptă răspunsul..."
    },
    "desea_volver_jugar": {
        "es": "desea volver a jugar",
        "en": "wants to play again",
        "fr": "veut rejouer",
        "ro": "vrea să joace din nou"
    },
    "no_quiere_jugar": {
        "es": "ya no quiere o puede jugar más",
        "en": "no longer wants or can play",
        "fr": "ne veut plus ou ne plus jouer",
        "ro": "nu mai vrea sau nu mai poate juca"
    },
    "no_es_tu_turno": {
        "es": "No es tu turno",
        "en": "It's not your turn",
        "fr": "Ce n'est pas votre tour",
        "ro": "Nu este rândul tău"
    },
    "aceptar": {
        "es": "Aceptar",
        "en": "Accept",
        "fr": "Accepter",
        "ro": "Acceptă"
    },
    "cancelar": {
        "es": "Cancelar",
        "en": "Cancel",
        "fr": "Annuler",
        "ro": "Anulează"
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

async function obtenerAvatarPorNombre(nombreUsuario) {
    if (!nombreUsuario) return "../../default-profile.png";
    try {
        const usuariosRef = collection(db, "Usuarios");
        const qUser = query(usuariosRef, where("usuario", "==", nombreUsuario));
        const snap = await getDocs(qUser);
        if (!snap.empty) {
            return normalizarSourceImagen(snap.docs[0].data().imgperfil);
        }
    } catch (e) {
        console.error("Error obteniendo avatar del usuario:", e);
    }
    return "../../default-profile.png";
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

    const lblTitulo = document.getElementById("titulo-catalogo-juego");
    if (lblTitulo) {
        lblTitulo.textContent = obtenerTextoTraduccion("sala_aleatoria", "Sala Aleatoria");
    }

    const estadoSalaTxt = document.getElementById("estado-sala-texto");
    if (estadoSalaTxt && estadoSalaTxt.dataset.estado === "buscando") {
        estadoSalaTxt.textContent = obtenerTextoTraduccion("buscando_sala", "Buscando sala disponible...");
    }
}

// --- GESTIÓN DE MODALES / POP-UPS ---
function mostrarPopUp(mensajeHTML, botonesConfig) {
    const overlay = document.getElementById("modal-popup-overlay");
    const msgEl = document.getElementById("modal-popup-mensaje");
    const botonesContainer = document.getElementById("modal-popup-botones");

    msgEl.innerHTML = mensajeHTML;
    botonesContainer.innerHTML = "";

    botonesConfig.forEach(btnInfo => {
        const btn = document.createElement("button");
        btn.className = `btn-modal-accion ${btnInfo.claseExtra || ""}`;
        btn.textContent = btnInfo.texto;
        btn.addEventListener("click", btnInfo.onClick);
        botonesContainer.appendChild(btn);
    });

    overlay.classList.add("activo");
}

function ocultarPopUp() {
    const overlay = document.getElementById("modal-popup-overlay");
    overlay.classList.remove("activo");
}

// --- LÓGICA DE EMPAREJAMIENTO DE SALAS ---
async function gestionarAsignacionSala() {
    const estadoSalaTxt = document.getElementById("estado-sala-texto");
    if (estadoSalaTxt) {
        estadoSalaTxt.dataset.estado = "buscando";
        estadoSalaTxt.textContent = obtenerTextoTraduccion("buscando_sala", "Buscando sala disponible...");
    }

    const salasRef = collection(db, "Partidas tres en raya");
    const querySalas = await getDocs(salasRef);

    let salaDisponibleDoc = null;
    let totalSalasAleatorias = 0;

    querySalas.forEach(d => {
        if (d.id.startsWith("aleatorioclasico")) {
            totalSalasAleatorias++;
            const data = d.data();
            if (!data.jugador2 || data.jugador2 === "") {
                if (!salaDisponibleDoc) {
                    salaDisponibleDoc = d;
                }
            }
        }
    });

    if (salaDisponibleDoc) {
        salaIdActual = salaDisponibleDoc.id;
        salaRefActual = doc(db, "Partidas tres en raya", salaIdActual);
        esJugador1 = false;

        await updateDoc(salaRefActual, {
            jugador2: nombreUsuarioLogueado
        });

        iniciarEscuchaSala();
    } else {
        totalSalasAleatorias++;
        salaIdActual = `aleatorioclasico${totalSalasAleatorias}`;
        salaRefActual = doc(db, "Partidas tres en raya", salaIdActual);
        esJugador1 = true;

        const nuevaSalaData = {
            jugador1: nombreUsuarioLogueado,
            jugador2: "",
            numerosala: totalSalasAleatorias,
            ganador: [],
            partidasjugadas: 0,
            tablero: ["", "", "", "", "", "", "", "", ""],
            turno: "jugador1",
            peticion: []
        };

        await setDoc(salaRefActual, nuevaSalaData);

        if (estadoSalaTxt) {
            estadoSalaTxt.dataset.estado = "esperando";
            estadoSalaTxt.textContent = obtenerTextoTraduccion("esperando_rival", "Esperando a que se una otro jugador...");
        }

        iniciarEscuchaSala();
    }
}

// --- ESCUCHAS EN TIEMPO REAL DE LA SALA ---
function iniciarEscuchaSala() {
    if (unsubscribeSala) unsubscribeSala();

    unsubscribeSala = onSnapshot(salaRefActual, async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        const estadoSalaTxt = document.getElementById("estado-sala-texto");
        const tableroDiv = document.getElementById("tablero-tresenraya");

        if (!data.partidaTerminada && data.tablero && data.tablero.every(c => c === "")) {
            partidaTerminadaProcesada = false;
            const overlay = document.getElementById("modal-popup-overlay");
            if (overlay.classList.contains("activo")) {
                ocultarPopUp();
            }
        }

        if (data.jugador1 && data.jugador2) {
            if (estadoSalaTxt) estadoSalaTxt.style.display = "none";
            if (tableroDiv) tableroDiv.classList.add("activo");

            const nombreJ1 = data.jugador1;
            const nombreJ2 = data.jugador2;
            const imgJ1 = await obtenerAvatarPorNombre(nombreJ1);
            const imgJ2 = await obtenerAvatarPorNombre(nombreJ2);

            document.getElementById("hud-nombre-j1").textContent = nombreJ1;
            document.getElementById("hud-img-j1").src = imgJ1;
            document.getElementById("hud-nombre-j2").textContent = nombreJ2;
            document.getElementById("hud-img-j2").src = imgJ2;

            actualizarInterfazTablero(data);
            revisarEstadoPartidaServidor(data);
        } else {
            if (estadoSalaTxt && !esJugador1) {
                estadoSalaTxt.textContent = obtenerTextoTraduccion("esperando_rival", "Esperando a que se una otro jugador...");
            }
        }

        revisarPeticionesYSalidasRemotas(data);
    });
}

function actualizarInterfazTablero(data) {
    const tablero = data.tablero || ["", "", "", "", "", "", "", "", ""];
    const celdas = document.querySelectorAll(".celda-tablero");
    const turnoInfo = document.getElementById("info-turno-jugador");

    celdas.forEach((celda, idx) => {
        celda.textContent = tablero[idx] || "";
    });

    const esMiTurno = (data.turno === "jugador1" && esJugador1) || (data.turno === "jugador2" && !esJugador1);
    const fichaMia = esJugador1 ? "X" : "O";

    if (turnoInfo) {
        const textoTuTurno = obtenerTextoTraduccion("tu_turno", "Tu turno");
        const textoTurnoRival = obtenerTextoTraduccion("turno_del_rival", "Turno del rival");
        const textoTurno = esMiTurno ? `${textoTuTurno} (${fichaMia})` : textoTurnoRival;
        turnoInfo.textContent = textoTurno;
    }
}

// --- INTERACCIÓN CON EL TABLERO ---
async function manejarClickCelda(index) {
    const docSnap = await getDoc(salaRefActual);
    if (!docSnap.exists()) return;
    const data = docSnap.data();

    if (data.partidaTerminada || data.partida === "terminada") return;

    const esMiTurno = (data.turno === "jugador1" && esJugador1) || (data.turno === "jugador2" && !esJugador1);
    
    if (!esMiTurno) {
        const msgNoTurno = obtenerTextoTraduccion("no_es_tu_turno", "No es tu turno");
        const textoCerrar = obtenerTextoTraduccion("cerrar", "Cerrar");
        mostrarPopUp(msgNoTurno, [
            {
                texto: textoCerrar,
                claseExtra: "",
                onClick: () => {
                    ocultarPopUp();
                }
            }
        ]);
        return;
    }

    const tablero = [...(data.tablero || ["", "", "", "", "", "", "", "", ""])];
    if (tablero[index] !== "") return;

    const fichaMia = esJugador1 ? "X" : "O";
    tablero[index] = fichaMia;

    const resultadoCheck = comprobarGanadorTablero(tablero);
    
    let nuevoTurno = data.turno === "jugador1" ? "jugador2" : "jugador1";
    let actualizacionBD = {
        tablero: tablero,
        turno: nuevoTurno
    };

    if (resultadoCheck) {
        actualizacionBD.partidaTerminada = true;
        actualizacionBD.resultadoFinal = resultadoCheck;
    }

    await updateDoc(salaRefActual, actualizacionBD);
}

function comprobarGanadorTablero(t) {
    const combinacionesGanadoras = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (let combo of combinacionesGanadoras) {
        const [a, b, c] = combo;
        if (t[a] && t[a] === t[b] && t[a] === t[c]) {
            return t[a] === "X" ? "jugador1" : "jugador2";
        }
    }

    if (t.every(celda => celda !== "")) {
        return "empate";
    }

    return null;
}

// --- EVALUACIÓN DE FIN DE PARTIDA Y TRANSACCIONES ---
async function revisarEstadoPartidaServidor(data) {
    if (data.partidaTerminada && !partidaTerminadaProcesada) {
        partidaTerminadaProcesada = true;

        const resultado = data.resultadoFinal;
        let mensajePopUp = "";
        let ganadorNombreStr = resultado === "jugador1" ? data.jugador1 : (resultado === "jugador2" ? data.jugador2 : "");

        if (resultado === "empate") {
            mensajePopUp = obtenerTextoTraduccion("empate", "Partida empatada");
        } else {
            const labelGanador = obtenerTextoTraduccion("ganador_jugador", "Ganador Jugador");
            const numJugadorStr = resultado === "jugador1" ? "X" : "O";
            mensajePopUp = `${labelGanador} ${numJugadorStr}: ${ganadorNombreStr}`;
        }

        if (esJugador1) {
            const arrGanador = data.ganador || [];
            arrGanador.push(resultado === "empate" ? "empate" : resultado);
            const nuevasPartidas = (data.partidasjugadas || 0) + 1;

            await updateDoc(salaRefActual, {
                ganador: arrGanador,
                partidasjugadas: nuevasPartidas
            });

            if (resultado !== "empate") {
                const idGanadorBD = resultado === "jugador1" ? data.jugador1 : data.jugador2;
                const idPerdedorBD = resultado === "jugador1" ? data.jugador2 : data.jugador1;

                await aplicarCambiosNovaPointsYTransaccion(idGanadorBD, 10, "suma");
                await aplicarCambiosNovaPointsYTransaccion(idPerdedorBD, -10, "resta");
            }
        }

        mostrarPopUpFinPartida(mensajePopUp);
    }
}

async function aplicarCambiosNovaPointsYTransaccion(nombreUsuario, cantidad, tipoOperacion) {
    try {
        const usuariosRef = collection(db, "Usuarios");
        const qUser = query(usuariosRef, where("usuario", "==", nombreUsuario));
        const snapUser = await getDocs(qUser);

        if (!snapUser.empty) {
            const userDocRef = snapUser.docs[0].ref;
            
            await updateDoc(userDocRef, {
                NovaPoints: increment(cantidad)
            });

            const transaccionesRef = collection(userDocRef, "Transacciones de NovaPoints");
            const snapTrans = await getDocs(transaccionesRef);
            
            let contadorTresEnRaya = 0;
            snapTrans.forEach(tr => {
                if (tr.id.startsWith("tresenraya")) {
                    contadorTresEnRaya++;
                }
            });
            contadorTresEnRaya++;

            const nuevaTransId = `tresenraya${contadorTresEnRaya}`;
            const transDocRef = doc(transaccionesRef, nuevaTransId);

            if (tipoOperacion === "resta") {
                await setDoc(transDocRef, {
                    NovaPoints: 10,
                    "donde": "tres en raya",
                    fecha: serverTimestamp(),
                    modo: "clásico",
                    tipo: "resta",
                    tipojuego: "aleatorio"
                });
            } else {
                await setDoc(transDocRef, {
                    NovaPoints: 10,
                    "donde": "tres en raya",
                    fecha: serverTimestamp(),
                    modo: "clásico",
                    tipo: "suma",
                    tipojuego: "aleatorio"
                });
            }
        }
    } catch (e) {
        console.error("Error aplicando NovaPoints y transacción:", e);
    }
}

// --- POP-UP FIN DE PARTIDA Y BOTONES DE ACCIÓN ---
async function mostrarPopUpFinPartida(mensajeTexto) {
    const textoCerrar = obtenerTextoTraduccion("cerrar", "Cerrar");
    const textoVolverJugar = obtenerTextoTraduccion("volver_jugar", "Volver a jugar");

    mostrarPopUp(mensajeTexto, [
        {
            texto: textoCerrar,
            claseExtra: "btn-modal-peligro",
            onClick: async () => {
                await updateDoc(salaRefActual, {
                    partida: "terminada",
                    salioJugador: nombreUsuarioLogueado
                });
                window.location.replace = "selectmodomulticlasico.html";
            }
        },
        {
            texto: textoVolverJugar,
            claseExtra: "",
            onClick: async () => {
                await updateDoc(salaRefActual, {
                    peticion: arrayUnion(nombreUsuarioLogueado)
                });
                
                const textoEsperando = obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta...");
                const textoCancelar = obtenerTextoTraduccion("cancelar", "Cancelar");

                mostrarPopUp(textoEsperando, [
                    {
                        texto: textoCancelar,
                        claseExtra: "btn-modal-peligro",
                        onClick: async () => {
                            await updateDoc(salaRefActual, {
                                partida: "terminada",
                                salioJugador: nombreUsuarioLogueado
                            });
                            window.location.href = "selectmodomulticlasico.html";
                        }
                    }
                ]);
            }
        }
    ]);
}

// --- ESCUCHA DE PETICIONES Y SALIDAS REMOTAS ---
function revisarPeticionesYSalidasRemotas(data) {
    if (data.partida === "terminada" && data.salioJugador && data.salioJugador !== nombreUsuarioLogueado) {
        const msgAviso = `<b>${data.salioJugador}</b> ${obtenerTextoTraduccion("no_quiere_jugar", "ya no quiere o puede jugar más")}`;
        const textoAceptar = obtenerTextoTraduccion("aceptar", "Aceptar");

        mostrarPopUp(msgAviso, [
            {
                texto: textoAceptar,
                claseExtra: "",
                onClick: () => {
                    window.location.href = "selectmodomulticlasico.html";
                }
            }
        ]);
        return;
    }

    if (data.peticion && data.peticion.length > 0) {
        const otroUsuario = esJugador1 ? data.jugador2 : data.jugador1;
        
        if (data.peticion.includes(otroUsuario) && !data.peticion.includes(nombreUsuarioLogueado)) {
            const msgPeticion = `<b>${otroUsuario}</b> ${obtenerTextoTraduccion("desea_volver_jugar", "desea volver a jugar")}`;
            const textoAceptar = obtenerTextoTraduccion("aceptar", "Aceptar");
            const textoCancelar = obtenerTextoTraduccion("cancelar", "Cancelar");

            mostrarPopUp(msgPeticion, [
                {
                    texto: textoAceptar,
                    claseExtra: "",
                    onClick: async () => {
                        await updateDoc(salaRefActual, {
                            tablero: ["", "", "", "", "", "", "", "", ""],
                            turno: "jugador1",
                            partidaTerminada: false,
                            resultadoFinal: null,
                            peticion: []
                        });
                        partidaTerminadaProcesada = false;
                        ocultarPopUp();
                    }
                },
                {
                    texto: textoCancelar,
                    claseExtra: "btn-modal-peligro",
                    onClick: async () => {
                        await updateDoc(salaRefActual, {
                            partida: "terminada",
                            salioJugador: nombreUsuarioLogueado
                        });
                        window.location.href = "selectmodomulticlasico.html";
                    }
                }
            ]);
        }
    }
}

// --- INICIALIZACIÓN GENERAL ---
document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Sala Aleatoria:", error);
    }

    aplicarTraduccionesEstaticas();

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");

    nombreUsuarioLogueado = localStorage.getItem("user");

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

    const celdas = document.querySelectorAll(".celda-tablero");
    celdas.forEach((celda, index) => {
        celda.addEventListener("click", () => {
            manejarClickCelda(index);
        });
    });

    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    try {
        const querySnapshot = await getDocs(qUsuario);
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            if (imgAvatar) {
                avatarUsuarioLogueado = normalizarSourceImagen(userData.imgperfil);
                imgAvatar.src = avatarUsuarioLogueado;
            }
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
        console.error("Error al obtener los datos del usuario en Sala Aleatoria:", error);
    }

    await gestionarAsignacionSala();

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.addEventListener("click", async () => {
            if (salaRefActual) {
                await updateDoc(salaRefActual, {
                    partida: "terminada",
                    salioJugador: nombreUsuarioLogueado
                });
            }
            window.location.href = "selectmodomulticlasico.html";
        });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (salaRefActual) {
                await updateDoc(salaRefActual, {
                    partida: "terminada",
                    salioJugador: nombreUsuarioLogueado
                });
            }
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