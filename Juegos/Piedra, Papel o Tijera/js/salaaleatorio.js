import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    setDoc,
    updateDoc, 
    increment,
    deleteField,
    onSnapshot,
    serverTimestamp,
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
let nombreUsuarioLogueado = "";

let partidaIdGlobal = null;
let unsubscribePartida = null;
let esJugador1 = false;
let rondaProcesadaUltima = null;
let miEleccionEnviadaRonda = false;

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
    "text_subscripcion": {
        "es": "Suscripción:",
        "en": "Subscription:",
        "fr": "Abonnement:",
        "ro": "Abonament:"
    },
    "btn_volver": {
        "es": "Volver",
        "en": "Back",
        "fr": "Retour",
        "ro": "Înapoi"
    },
    "salaaleatorio_titulo": {
        "es": "Sala Aleatoria",
        "en": "Random Room",
        "fr": "Salon Aléatoire",
        "ro": "Cameră Aleatorie"
    },
    "piedra": {
        "es": "Piedra 🪨",
        "en": "Rock 🪨",
        "fr": "Pierre 🪨",
        "ro": "Piatră 🪨"
    },
    "papel": {
        "es": "Papel 📋",
        "en": "Paper 📋",
        "fr": "Papier 📋",
        "ro": "Hârtie 📋"
    },
    "tijera": {
        "es": "Tijera ✂️",
        "en": "Scissors ✂️",
        "fr": "Ciseaux ✂️",
        "ro": "Foarfece ✂️"
    },
    "buscando_partida": {
        "es": "Buscando partida o esperando segundo jugador...",
        "en": "Searching for game or waiting for second player...",
        "fr": "Recherche de partie ou en attente du deuxième joueur...",
        "ro": "Se caută joc sau se așteaptă al doilea jucător..."
    },
    "turno_elige": {
        "es": "Elige tu opción:",
        "en": "Choose your option:",
        "fr": "Choisissez votre option:",
        "ro": "Alegeți opțiunea:"
    },
    "btn_cerrar": {
        "es": "Cerrar",
        "en": "Close",
        "fr": "Fermer",
        "ro": "Închide"
    },
    "btn_volverjugar": {
        "es": "Volver a jugar",
        "en": "Play again",
        "fr": "Rejouer",
        "ro": "Joacă din nou"
    },
    "esperando_respuesta": {
        "es": "Esperando respuesta",
        "en": "Waiting for response",
        "fr": "En attente de réponse",
        "ro": "Se așteaptă răspuns"
    },
    "btn_rechazar": {
        "es": "Rechazar",
        "en": "Reject",
        "fr": "Rejeter",
        "ro": "Respinge"
    },
    "btn_aceptar": {
        "es": "Aceptar",
        "en": "Accept",
        "fr": "Accepter",
        "ro": "Acceptă"
    },
    "empate_texto": {
        "es": "Partida empatada",
        "en": "Game tied",
        "fr": "Partie nulle",
        "ro": "Joc la egalitate"
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
    
    const tituloSala = document.getElementById("titulo-salaaleatorio");
    if (tituloSala) tituloSala.textContent = obtenerTextoTraduccion("salaaleatorio_titulo", "Sala Aleatoria");
    
    const textoEstado = document.getElementById("texto-estado-sala");
    if (textoEstado) textoEstado.textContent = obtenerTextoTraduccion("buscando_partida", "Buscando partida o esperando segundo jugador...");

    const turnoInd = document.getElementById("turno-indicator-aleatorio");
    if (turnoInd) turnoInd.textContent = obtenerTextoTraduccion("turno_elige", "Elige tu opción:");

    const btnPiedra = document.getElementById("btn-aleatorio-piedra");
    if (btnPiedra) btnPiedra.textContent = obtenerTextoTraduccion("piedra", "Piedra 🪨");
    
    const btnPapel = document.getElementById("btn-aleatorio-papel");
    if (btnPapel) btnPapel.textContent = obtenerTextoTraduccion("papel", "Papel 📋");
    
    const btnTijera = document.getElementById("btn-aleatorio-tijera");
    if (btnTijera) btnTijera.textContent = obtenerTextoTraduccion("tijera", "Tijera ✂️");

    // Pop-up 1 buttons & text
    const btnResCerrar = document.getElementById("btn-res-cerrar");
    if (btnResCerrar) btnResCerrar.textContent = obtenerTextoTraduccion("btn_cerrar", "Cerrar");
    
    const btnResVolver = document.getElementById("btn-res-volverjugar");
    if (btnResVolver) btnResVolver.textContent = obtenerTextoTraduccion("btn_volverjugar", "Volver a jugar");

    // Pop-up 2 buttons
    const btnAbandonoCerrar = document.getElementById("btn-abandono-cerrar");
    if (btnAbandonoCerrar) btnAbandonoCerrar.textContent = obtenerTextoTraduccion("btn_cerrar", "Cerrar");

    // Pop-up 3 text
    const txtEspRes = document.getElementById("texto-popup-esperandorespuesta");
    if (txtEspRes) txtEspRes.textContent = obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta");

    // Pop-up 4 buttons
    const btnPeticionRechazar = document.getElementById("btn-peticion-rechazar");
    if (btnPeticionRechazar) btnPeticionRechazar.textContent = obtenerTextoTraduccion("btn_rechazar", "Rechazar");

    const btnPeticionAceptar = document.getElementById("btn-peticion-aceptar");
    if (btnPeticionAceptar) btnPeticionAceptar.textContent = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
}

function cerrarTodosLosPopups() {
    document.getElementById("modal-popup-resultado").style.display = "none";
    document.getElementById("modal-popup-abandono").style.display = "none";
    document.getElementById("modal-popup-esperandorespuesta").style.display = "none";
    document.getElementById("modal-popup-peticionsaltante").style.display = "none";
}

async function registrarNovaPointsAleatorio(esGanador) {
    if (!userDocIdGlobal) return;
    try {
        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const querySnapshot = await getDocs(transaccionesRef);
        
        let contador = 1;
        querySnapshot.forEach((docSnap) => {
            if (docSnap.id.startsWith("piedrapapelotijera")) {
                const numeroStr = docSnap.id.replace("piedrapapelotijera", "");
                const num = parseInt(numeroStr, 10);
                if (!isNaN(num) && num >= contador) {
                    contador = num + 1;
                }
            }
        });

        const nuevoIdDoc = `piedrapapelotijera${contador}`;
        const nuevoDocRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdDoc);
        
        const tipoTransaccion = esGanador ? "suma" : "resta";
        const valorPuntos = esGanador ? 10 : -10;

        await setDoc(nuevoDocRef, {
            NovaPoints: 10,
            "donde": "Piedra, Papel o Tijera",
            fecha: serverTimestamp(),
            modo: "aleatorio",
            tipo: tipoTransaccion
        });

        const userDocRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userDocRef, {
            NovaPoints: increment(valorPuntos)
        });

        const txtNovas = document.getElementById("user-novas");
        if (txtNovas) {
            const actual = parseInt(txtNovas.textContent, 10) || 0;
            txtNovas.textContent = actual + valorPuntos;
        }
    } catch (error) {
        console.error("Error al registrar NovaPoints aleatorio:", error);
    }
}

async function buscarOCrearPartidaAleatoria() {
    try {
        const partidasRef = collection(db, "Partidas de piedra papel o tijera");
        const querySnapshot = await getDocs(partidasRef);
        
        let partidaDisponibleId = null;
        let contadorAleatorio = 1;
        let codigosExistentesAleatorio = new Set();

        querySnapshot.forEach((docSnap) => {
            const idDoc = docSnap.id;
            const data = docSnap.data();

            if (idDoc.startsWith("aleatorio")) {
                const numeroStr = idDoc.replace("aleatorio", "");
                const num = parseInt(numeroStr, 10);
                if (!isNaN(num)) {
                    codigosExistentesAleatorio.add(num);
                    if (num >= contadorAleatorio) {
                        contadorAleatorio = num + 1;
                    }
                }
                if ((!data["Jugador 2"] || data["Jugador 2"] === "") && data["Jugador 1"] !== nombreUsuarioLogueado) {
                    partidaDisponibleId = idDoc;
                }
            }
        });

        if (partidaDisponibleId) {
            partidaIdGlobal = partidaDisponibleId;
            esJugador1 = false;
            const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
            await updateDoc(partidaRef, {
                "Jugador 2": nombreUsuarioLogueado
            });
        } else {
            while (codigosExistentesAleatorio.has(contadorAleatorio)) {
                contadorAleatorio++;
            }
            partidaIdGlobal = `aleatorio${contadorAleatorio}`;
            esJugador1 = true;
            const nuevaPartidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
            await setDoc(nuevaPartidaRef, {
                "Jugador 1": nombreUsuarioLogueado,
                "Jugador 2": "",
                fecha: [],
                ganador: [],
                partidasjugadas: 0
            });
        }

        escucharPartida(partidaIdGlobal);

    } catch (error) {
        console.error("Error gestionando sala aleatoria:", error);
    }
}

function escucharPartida(idPartida) {
    const partidaRef = doc(db, "Partidas de piedra papel o tijera", idPartida);
    
    unsubscribePartida = onSnapshot(partidaRef, async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        // 1. Partida terminada o rechazada globalmente -> POP-UP 2
        if (data.partida === "terminada" || data.partida === "rechazada") {
            cerrarTodosLosPopups();
            const nombreSolicitante = data.ultimoSolicitante || (esJugador1 ? data["Jugador 2"] : data["Jugador 1"]) || "El otro jugador";
            const msgAbandono = currentLanguage === "en" ? `Player: ${nombreSolicitante} no longer wants or can play` :
                                currentLanguage === "fr" ? `Joueur : ${nombreSolicitante} ne veut plus ou ne peut plus jouer` :
                                currentLanguage === "ro" ? `Jucătorul: ${nombreSolicitante} nu mai vrea sau nu mai poate juca` :
                                `Jugador: ${nombreSolicitante} ya no quiere o puede jugar más`;
            document.getElementById("texto-popup-abandono").textContent = msgAbandono;
            document.getElementById("modal-popup-abandono").style.display = "flex";
            return;
        }

        // 2. Si el otro jugador canceló estando en espera de revancha -> POP-UP 2
        if (data.peticion === "esperando" && data.ultimoSolicitante && data.ultimoSolicitante !== nombreUsuarioLogueado) {
            cerrarTodosLosPopups();
            const nombreSolicitante = data.ultimoSolicitante;
            const msgAbandono = currentLanguage === "en" ? `Player: ${nombreSolicitante} no longer wants or can play` :
                                currentLanguage === "fr" ? `Joueur : ${nombreSolicitante} ne veut plus ou ne peut plus jouer` :
                                currentLanguage === "ro" ? `Jucătorul: ${nombreSolicitante} nu mai vrea sau nu mai poate juca` :
                                `Jugador: ${nombreSolicitante} ya no quiere o puede jugar más`;
            document.getElementById("texto-popup-abandono").textContent = msgAbandono;
            document.getElementById("modal-popup-abandono").style.display = "flex";
            return;
        }

        // 3. Petición de revancha entrante -> POP-UP 4
        if (data.peticion === "espera" && data.ultimoSolicitante && data.ultimoSolicitante !== nombreUsuarioLogueado) {
            cerrarTodosLosPopups();
            const nombreSolicitante = data.ultimoSolicitante;
            const numSolicitante = nombreSolicitante === data["Jugador 1"] ? "1" : "2";
            const msgPeticion = currentLanguage === "en" ? `Player ${numSolicitante}: ${nombreSolicitante} wants to play again` :
                                currentLanguage === "fr" ? `Joueur ${numSolicitante} : ${nombreSolicitante} veut rejouer` :
                                currentLanguage === "ro" ? `Jucătorul ${numSolicitante}: ${nombreSolicitante} vrea să joace din nou` :
                                `Jugador ${numSolicitante}: ${nombreSolicitante} quiere volver a jugar`;
            document.getElementById("texto-popup-peticionsaltante").textContent = msgPeticion;
            document.getElementById("modal-popup-peticionsaltante").style.display = "flex";
            return;
        }

        // 4. Petición aceptada -> Reiniciar juego limpio de inmediato
        if (data.peticion === "aceptada" || (!data.partida && data.eleccionJ1 === undefined && data.eleccionJ2 === undefined)) {
            cerrarTodosLosPopups();
            miEleccionEnviadaRonda = false;
            rondaProcesadaUltima = null;
            document.getElementById("panel-juego-aleatorio").style.display = "flex";
            document.getElementById("botones-eleccion-aleatorio").style.display = "flex";
            document.getElementById("turno-indicator-aleatorio").textContent = obtenerTextoTraduccion("turno_elige", "Elige tu opción:");
            
            // Si las elecciones ya están limpias en firestore y no hay popup activo, aseguramos estado normal
            if (!data.partida && data.eleccionJ1 === undefined && data.eleccionJ2 === undefined) {
                return;
            }
        }

        // 5. Partida en estado espera (Fin de ronda, mostrar POP-UP 1 a ambos)
        if (data.partida === "espera" && data.eleccionJ1 !== undefined && data.eleccionJ2 !== undefined) {
            const e1 = data.eleccionJ1;
            const e2 = data.eleccionJ2;
            let resultadoTexto = "";

            if (e1 === e2) {
                resultadoTexto = obtenerTextoTraduccion("empate_texto", "Partida empatada");
            } else if (
                (e1 === "piedra" && e2 === "tijera") ||
                (e1 === "papel" && e2 === "piedra") ||
                (e1 === "tijera" && e2 === "papel")
            ) {
                const nombreJ1 = data["Jugador 1"] || "Jugador 1";
                resultadoTexto = currentLanguage === "en" ? `Winner Player 1: ${nombreJ1}` :
                                 currentLanguage === "fr" ? `Gagnant Joueur 1 : ${nombreJ1}` :
                                 currentLanguage === "ro" ? `Câștigător Jucătorul 1: ${nombreJ1}` :
                                 `Ganador Jugador 1: ${nombreJ1}`;
            } else {
                const nombreJ2 = data["Jugador 2"] || "Jugador 2";
                resultadoTexto = currentLanguage === "en" ? `Winner Player 2: ${nombreJ2}` :
                                 currentLanguage === "fr" ? `Gagnant Joueur 2 : ${nombreJ2}` :
                                 currentLanguage === "ro" ? `Câștigător Jucătorul 2: ${nombreJ2}` :
                                 `Ganador Jugador 2: ${nombreJ2}`;
            }

            const popEsperandoVisible = document.getElementById("modal-popup-esperandorespuesta").style.display === "flex";
            const popPeticionVisible = document.getElementById("modal-popup-peticionsaltante").style.display === "flex";
            
            if (!popEsperandoVisible && !popPeticionVisible) {
                document.getElementById("texto-popup-resultado").textContent = resultadoTexto;
                document.getElementById("modal-popup-resultado").style.display = "flex";
            }
            return;
        }

        // 6. Flujo normal de partida activa con ambos jugadores
        if (data["Jugador 1"] && data["Jugador 2"]) {
            document.getElementById("panel-espera-jugador2").style.display = "none";
            document.getElementById("panel-juego-aleatorio").style.display = "flex";

            const ganadores = data.ganador || [];
            let score1 = 0;
            let score2 = 0;
            ganadores.forEach(g => {
                if (g === data["Jugador 1"]) score1++;
                if (g === data["Jugador 2"]) score2++;
            });

            document.getElementById("score-aleatorio-j1").textContent = score1;
            document.getElementById("score-aleatorio-j2").textContent = score2;
            document.getElementById("text-jugador1-aleatorio").innerHTML = `${data["Jugador 1"]}: <strong id="score-aleatorio-j1">${score1}</strong>`;
            document.getElementById("text-jugador2-aleatorio").innerHTML = `${data["Jugador 2"]}: <strong id="score-aleatorio-j2">${score2}</strong>`;

            const campoEleccionPropio = esJugador1 ? "eleccionJ1" : "eleccionJ2";
            const campoEleccionContrario = esJugador1 ? "eleccionJ2" : "eleccionJ1";

            if (data[campoEleccionPropio] && !data[campoEleccionContrario]) {
                const msgEsperandoEleccion = currentLanguage === "en" ? "Choice saved. Waiting for other player..." :
                                             currentLanguage === "fr" ? "Choix enregistré. En attente de l'autre joueur..." :
                                             currentLanguage === "ro" ? "Alegere salvată. Se așteaptă celălalt jucător..." :
                                             "Elección guardada. Esperando al otro jugador...";
                document.getElementById("turno-indicator-aleatorio").textContent = msgEsperandoEleccion;
                document.getElementById("botones-eleccion-aleatorio").style.display = "none";
            } else if (data[campoEleccionPropio] && data[campoEleccionContrario]) {
                const idRondaActual = `${data.partidasjugadas}-${data.eleccionJ1}-${data.eleccionJ2}`;
                if (rondaProcesadaUltima !== idRondaActual) {
                    rondaProcesadaUltima = idRondaActual;
                    await procesarFinRondaAleatorio(data);
                }
            } else {
                // Si no hay elección propia guardada en esta ronda, permitimos interactuar de nuevo
                if (!data[campoEleccionPropio]) {
                    miEleccionEnviadaRonda = false;
                }
                document.getElementById("turno-indicator-aleatorio").textContent = obtenerTextoTraduccion("turno_elige", "Elige tu opción:");
                document.getElementById("botones-eleccion-aleatorio").style.display = "flex";
            }
        }
    });
}

async function realizarEleccionAleatorio(eleccion) {
    if (!partidaIdGlobal || miEleccionEnviadaRonda) return;
    miEleccionEnviadaRonda = true;
    const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
    const campoEleccion = esJugador1 ? "eleccionJ1" : "eleccionJ2";

    await updateDoc(partidaRef, {
        [campoEleccion]: eleccion
    });
}

async function procesarFinRondaAleatorio(data) {
    const e1 = data.eleccionJ1;
    const e2 = data.eleccionJ2;
    let ganadorRonda = "empate";

    if (e1 !== e2) {
        if (
            (e1 === "piedra" && e2 === "tijera") ||
            (e1 === "papel" && e2 === "piedra") ||
            (e1 === "tijera" && e2 === "papel")
        ) {
            ganadorRonda = data["Jugador 1"];
        } else {
            ganadorRonda = data["Jugador 2"];
        }
    }

    if (ganadorRonda !== "empate") {
        if (ganadorRonda === nombreUsuarioLogueado) {
            await registrarNovaPointsAleatorio(true);
        } else {
            await registrarNovaPointsAleatorio(false);
        }
    }

    if (esJugador1) {
        const fechasActuales = data.fecha || [];
        const ganadoresActuales = data.ganador || [];
        const totalPartidas = (data.partidasjugadas || 0) + 1;

        fechasActuales.push(new Date().toISOString());
        ganadoresActuales.push(ganadorRonda);

        const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
        await updateDoc(partidaRef, {
            fecha: fechasActuales,
            ganador: ganadoresActuales,
            partidasjugadas: totalPartidas,
            partida: "espera"
        });
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
    nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "../../index.html";
        return;
    }

    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) filaPerfil.addEventListener("click", () => { window.location.href = "../../Perfil.html"; });

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) filaNovas.addEventListener("click", () => { window.location.href = "../../NovaPoints.html"; });

    document.getElementById("btn-aleatorio-piedra").addEventListener("click", () => realizarEleccionAleatorio("piedra"));
    document.getElementById("btn-aleatorio-papel").addEventListener("click", () => realizarEleccionAleatorio("papel"));
    document.getElementById("btn-aleatorio-tijera").addEventListener("click", () => realizarEleccionAleatorio("tijera"));

    document.getElementById("btn-res-cerrar").addEventListener("click", async () => {
        if (partidaIdGlobal) {
            const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
            await updateDoc(partidaRef, {
                partida: "terminada",
                ultimoSolicitante: nombreUsuarioLogueado
            });
        }
        window.location.replace("selectmode.html");
    });

    document.getElementById("btn-res-volverjugar").addEventListener("click", async () => {
        cerrarTodosLosPopups();
        document.getElementById("modal-popup-esperandorespuesta").style.display = "flex";

        if (partidaIdGlobal) {
            const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
            await updateDoc(partidaRef, {
                peticion: "espera",
                ultimoSolicitante: nombreUsuarioLogueado
            });
        }
    });

    document.getElementById("btn-abandono-cerrar").addEventListener("click", () => {
        window.location.replace("selectmode.html");
    });

    document.getElementById("btn-peticion-rechazar").addEventListener("click", async () => {
        if (partidaIdGlobal) {
            const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
            await updateDoc(partidaRef, {
                peticion: "rechazada",
                partida: "terminada",
                ultimoSolicitante: nombreUsuarioLogueado
            });
        }
        window.location.replace("selectmode.html");
    });

    document.getElementById("btn-peticion-aceptar").addEventListener("click", async () => {
        cerrarTodosLosPopups();
        miEleccionEnviadaRonda = false;
        rondaProcesadaUltima = null;
        if (partidaIdGlobal) {
            const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
            await updateDoc(partidaRef, {
                peticion: "aceptada",
                partida: deleteField(),
                ultimoSolicitante: deleteField(),
                eleccionJ1: deleteField(),
                eleccionJ2: deleteField()
            });
        }
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

    await buscarOCrearPartidaAleatoria();

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) btnVolver.addEventListener("click", () => { window.location.replace("selectmode.html"); });

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