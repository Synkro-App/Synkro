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
    serverTimestamp,
    increment
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

const traduccionesLocales = {
    "sala_aleatoria": { "es": "Sala Aleatoria", "en": "Random Room", "fr": "Salon Aléatoire", "ro": "Cameră Aleatorie" },
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "buscando_sala": { "es": "Buscando sala disponible...", "en": "Searching for available room...", "fr": "Recherche d'un salon disponible...", "ro": "Se caută o cameră disponibilă..." },
    "esperando_jugador": { "es": "Esperando a que se una otro jugador...", "en": "Waiting for another player to join...", "fr": "En attendant qu'un autre joueur rejoigne...", "ro": "Se așteaptă un alt jucător..." },
    "tu_turno": { "es": "Tu turno", "en": "Your turn", "fr": "Votre tour", "ro": "Rândul tău" },
    "turno_rival": { "es": "Turno del rival", "en": "Opponent's turn", "fr": "Tour de l'adversaire", "ro": "Rândul adversarului" },
    "no_es_tu_turno": { "es": "No es tu turno", "en": "It's not your turn", "fr": "Ce n'est pas votre tour", "ro": "Nu este rândul tău" },
    "ganador_jugador_1": { "es": "Ganador Jugador 1 (X): ", "en": "Winner Player 1 (X): ", "fr": "Gagnant Joueur 1 (X) : ", "ro": "Câștigător Jucător 1 (X): " },
    "ganador_jugador_2": { "es": "Ganador Jugador 2 (O): ", "en": "Winner Player 2 (O): ", "fr": "Gagnant Joueur 2 (O) : ", "ro": "Câștigător Jucător 2 (O): " },
    "empate": { "es": "¡Empate!", "en": "Draw!", "fr": "Match nul !", "ro": "Egalitate!" },
    "cerrar": { "es": "Cerrar", "en": "Close", "fr": "Fermer", "ro": "Închide" },
    "volver_a_jugar": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" },
    "esperando_respuesta": { "es": "Esperando respuesta...", "en": "Waiting for response...", "fr": "En attente d'une réponse...", "ro": "Se așteptă răspunsul..." },
    "desea_volver_a_jugar": { "es": " quiere volver a jugar", "en": " wants to play again", "fr": " veut rejouer", "ro": " vrea să joace din nou" },
    "aceptar": { "es": "Aceptar", "en": "Accept", "fr": "Accepter", "ro": "Acceptă" },
    "cancelar": { "es": "Cancelar", "en": "Cancel", "fr": "Annuler", "ro": "Anulează" },
    "no_quiere_jugar_mas": { "es": " no puede o quiere jugar más", "en": " no longer wants or can play", "fr": " ne veut plus ou ne peut plus jouer", "ro": " nu mai vrea sau nu poate juca" }
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
    const lblTitulo = document.getElementById("titulo-catalogo-juego");
    if (lblTitulo) lblTitulo.textContent = obtenerTextoTraduccion("sala_aleatoria", "Sala Aleatoria");
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
        window.location.replace("../../index.html");
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
            window.location.replace("../../index.html");
        });
    }

    await gestionarEntradaSala(nombreUsuarioLogueado);
});

async function obtenerAvatarUsuario(nombreUsuario) {
    if (!nombreUsuario) return "../../default-profile.png";
    try {
        const qUser = query(collection(db, "Usuarios"), where("usuario", "==", nombreUsuario));
        const snap = await getDocs(qUser);
        if (!snap.empty) {
            return normalizarSourceImagen(snap.docs[0].data().imgperfil);
        }
    } catch (e) {}
    return "../../default-profile.png";
}

async function gestionarEntradaSala(nombreUsuario) {
    const contenedorEstado = document.getElementById("estado-sala-texto");
    contenedorEstado.textContent = obtenerTextoTraduccion("buscando_sala", "Buscando sala disponible...");

    const salasSnapshot = await getDocs(collection(db, "Partidas tres en raya"));
    let salaEncontradaDoc = null;
    let totalSalasAleatorias = 0;

    salasSnapshot.forEach((d) => {
        const id = d.id;
        if (id.startsWith("aleatoriotres")) {
            totalSalasAleatorias++;
            const data = d.data();
            if ((!data.jugaro2 || data.jugaro2 === "") && data.jugador1 !== nombreUsuario && (!data.partida || data.partida !== "terminada")) {
                if (!salaEncontradaDoc) {
                    salaEncontradaDoc = { id, data };
                }
            }
        }
    });

    let idSalaActual = "";
    let refSalaDoc = null;

    if (salaEncontradaDoc) {
        idSalaActual = salaEncontradaDoc.id;
        refSalaDoc = doc(db, "Partidas tres en raya", idSalaActual);
        await updateDoc(refSalaDoc, { jugaro2: nombreUsuario });
    } else {
        totalSalasAleatorias++;
        idSalaActual = `aleatoriotres${totalSalasAleatorias}`;
        refSalaDoc = doc(db, "Partidas tres en raya", idSalaActual);
        await setDoc(refSalaDoc, {
            jugador1: nombreUsuario,
            jugaro2: "",
            numerosala: totalSalasAleatorias,
            ganador: [],
            partidasjugadas: 0,
            tablero: ["", "", "", "", "", "", "", "", ""],
            turno: nombreUsuario,
            fichasColocadas: { [nombreUsuario]: 0 },
            fichaSeleccionadaParaMover: {}
        });
    }

    iniciarEscuchadorPartida(refSalaDoc, nombreUsuario);
}

function iniciarEscuchadorPartida(refSalaDoc, nombreUsuario) {
    const contenedorJuego = document.getElementById("contenedor-juego");

    onSnapshot(refSalaDoc, async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        if (!data.jugaro2 || data.jugaro2 === "") {
            contenedorJuego.innerHTML = `<p style="font-size: 1.2rem; font-weight: bold;">${obtenerTextoTraduccion("esperando_jugador", "Esperando a que se una otro jugador...")}</p>`;
            return;
        }

        const ganadoresArray = data.ganador || [];
        const rondaTerminada = ganadoresArray.length > 0;
        const ultimaPartidaGanador = rondaTerminada ? ganadoresArray[ganadoresArray.length - 1] : null;

        await renderizarTableroYJuego(refSalaDoc, data, nombreUsuario, rondaTerminada);

        if (rondaTerminada) {
            gestionarModalesFinPartida(refSalaDoc, data, ultimaPartidaGanador, nombreUsuario);
        } else {
            limpiarModalesPrevios();
        }
    });
}

async function renderizarTableroYJuego(refSalaDoc, data, nombreUsuario, juegoBloqueado = false) {
    const contenedorJuego = document.getElementById("contenedor-juego");
    const esJugador1 = data.jugador1 === nombreUsuario;
    const miSimbolo = esJugador1 ? "X" : "O";
    const turnoActual = data.turno;
    const esMiTurno = turnoActual === nombreUsuario;

    const avatarJ1 = await obtenerAvatarUsuario(data.jugador1);
    const avatarJ2 = await obtenerAvatarUsuario(data.jugaro2);

    const textoTurnoEstado = esMiTurno 
        ? obtenerTextoTraduccion("tu_turno", "Tu turno") 
        : obtenerTextoTraduccion("turno_rival", "Turno del rival");

    contenedorJuego.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%;">
            <div style="display: flex; justify-content: space-around; width: 100%; align-items: center; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${avatarJ1}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #000;" />
                    <span style="font-weight: bold;">Jugador 1: ${data.jugador1} (X)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${avatarJ2}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #000;" />
                    <span style="font-weight: bold;">Jugador 2: ${data.jugaro2} (O)</span>
                </div>
            </div>
            <div style="font-size: 1.1rem; font-weight: bold; color: #222;" id="texto-estado-turno">
                ${textoTurnoEstado}
            </div>
            <div id="tablero-grid" style="display: grid; grid-template-columns: repeat(3, 80px); grid-template-rows: repeat(3, 80px); gap: 5px; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 8px;">
                ${data.tablero.map((val, idx) => {
                    const seleccionadasMap = data.fichaSeleccionadaParaMover || {};
                    const seleccionada = seleccionadasMap[nombreUsuario] === idx;
                    const estiloExtra = seleccionada ? "border: 3px solid #ff0000;" : "border: 1px solid #ccc;";
                    return `
                        <div class="celda-juego" data-index="${idx}" style="background: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; cursor: pointer; border-radius: 4px; ${estiloExtra}">
                            ${val}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    const celdas = document.querySelectorAll(".celda-juego");
    celdas.forEach(celda => {
        celda.addEventListener("click", async () => {
            if (juegoBloqueado) return;
            
            if (!esMiTurno) {
                mostrarAvisoNoEsTuTurno();
                return;
            }

            const index = parseInt(celda.getAttribute("data-index"));
            const tablero = [...data.tablero];
            const fichasColocadas = data.fichasColocadas || {};
            const misFichasColocadas = fichasColocadas[nombreUsuario] || 0;

            if (misFichasColocadas < 3) {
                if (tablero[index] !== "") return;
                tablero[index] = miSimbolo;
                fichasColocadas[nombreUsuario] = misFichasColocadas + 1;

                const siguienteTurno = data.jugador1 === nombreUsuario ? data.jugaro2 : data.jugador1;
                let ganadorPartida = comprobarGanador(tablero);

                if (ganadorPartida) {
                    await finalizarPartida(refSalaDoc, data, ganadorPartida, tablero);
                } else {
                    await updateDoc(refSalaDoc, {
                        tablero: tablero,
                        fichasColocadas: fichasColocadas,
                        turno: siguienteTurno
                    });
                }
            } else {
                const fichasSeleccionadasMap = { ...(data.fichaSeleccionadaParaMover || {}) };
                const seleccionActual = fichasSeleccionadasMap[nombreUsuario];
                
                if (seleccionActual === undefined || seleccionActual === null) {
                    if (tablero[index] === miSimbolo) {
                        fichasSeleccionadasMap[nombreUsuario] = index;
                        await updateDoc(refSalaDoc, { fichaSeleccionadaParaMover: fichasSeleccionadasMap });
                    }
                } else {
                    if (tablero[index] === "") {
                        tablero[seleccionActual] = "";
                        tablero[index] = miSimbolo;
                        delete fichasSeleccionadasMap[nombreUsuario];

                        const siguienteTurno = data.jugador1 === nombreUsuario ? data.jugaro2 : data.jugador1;
                        let ganadorPartida = comprobarGanador(tablero);

                        if (ganadorPartida) {
                            await finalizarPartida(refSalaDoc, data, ganadorPartida, tablero);
                        } else {
                            await updateDoc(refSalaDoc, {
                                tablero: tablero,
                                fichaSeleccionadaParaMover: fichasSeleccionadasMap,
                                turno: siguienteTurno
                            });
                        }
                    } else if (tablero[index] === miSimbolo) {
                        fichasSeleccionadasMap[nombreUsuario] = index;
                        await updateDoc(refSalaDoc, { fichaSeleccionadaParaMover: fichasSeleccionadasMap });
                    }
                }
            }
        });
    });
}

function mostrarAvisoNoEsTuTurno() {
    const existing = document.getElementById("aviso-no-turno");
    if (existing) existing.remove();

    const aviso = document.createElement("div");
    aviso.id = "aviso-no-turno";
    aviso.style.cssText = "position: fixed; bottom: 30px; background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold; z-index: 2000;";
    aviso.textContent = obtenerTextoTraduccion("no_es_tu_turno", "No es tu turno");

    document.body.appendChild(aviso);
    setTimeout(() => {
        aviso.remove();
    }, 2000);
}

function comprobarGanador(tablero) {
    const lineas = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];
    for (let l of lineas) {
        const [a, b, c] = l;
        if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
            return tablero[a];
        }
    }
    if (!tablero.includes("")) return "empate";
    return null;
}

async function finalizarPartida(refSalaDoc, data, simboloGanador, tableroFinal) {
    let nombreGanador = "";
    if (simboloGanador === "X") nombreGanador = data.jugador1;
    else if (simboloGanador === "O") nombreGanador = data.jugaro2;
    else nombreGanador = "empate";

    const ganadoresArray = [...(data.ganador || [])];
    ganadoresArray.push(nombreGanador);
    
    const partidasJugadas = (data.partidasjugadas || 0) + 1;

    await updateDoc(refSalaDoc, {
        tablero: tableroFinal,
        ganador: ganadoresArray,
        partidasjugadas: partidasJugadas,
        fichaSeleccionadaParaMover: {}
    });

    if (nombreGanador !== "empate") {
        const perdedor = nombreGanador === data.jugador1 ? data.jugaro2 : data.jugador1;
        await otorgarNovaPointsYTransaccion(nombreGanador, 10, "suma");
        await otorgarNovaPointsYTransaccion(perdedor, -10, "resta");
    }
}

async function otorgarNovaPointsYTransaccion(nombreUsuario, cantidad, tipo) {
    try {
        const qUser = query(collection(db, "Usuarios"), where("usuario", "==", nombreUsuario));
        const snapUser = await getDocs(qUser);
        
        if (!snapUser.empty) {
            const userDocRef = snapUser.docs[0].ref;
            await updateDoc(userDocRef, {
                NovaPoints: increment(cantidad)
            });

            const txRef = collection(userDocRef, "Transacciones de NovaPoints");
            const txSnap = await getDocs(txRef);
            let countTx = 0;
            txSnap.forEach(t => {
                if (t.id.startsWith("tresenraya")) countTx++;
            });
            countTx++;

            await setDoc(doc(txRef, `tresenraya${countTx}`), {
                NovaPoints: Math.abs(cantidad),
                donde: "tres en raya",
                fecha: serverTimestamp(),
                modo: "tres en movimiento",
                tipo: tipo,
                tipojuego: "aleatorio"
            });
        }
    } catch (error) {
        console.error("Error gestionando NovaPoints:", error);
    }
}

function limpiarModalesPrevios() {
    ["modal-fin-partida", "modal-revancha", "modal-esperando", "modal-abandono"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
}

function gestionarModalesFinPartida(refSalaDoc, data, nombreGanador, nombreUsuarioActual) {
    limpiarModalesPrevios();

    const abandonoUsuario = data.abandonoPor;
    if (abandonoUsuario) {
        if (abandonoUsuario !== nombreUsuarioActual) {
            mostrarPopupAbandonoRival(refSalaDoc, abandonoUsuario);
        }
        return;
    }

    const volverArray = data.volver || [];
    const peticionArray = data.peticion || [];

    if (volverArray.length === 1) {
        const usuarioQuePidio = peticionArray[0];
        if (usuarioQuePidio === nombreUsuarioActual) {
            mostrarPopupEsperandoRespuesta();
        } else {
            mostrarPopupPeticionRevancha(refSalaDoc, data, nombreUsuarioActual, usuarioQuePidio);
        }
        return;
    }

    let textoResultado = "";
    if (nombreGanador === "empate") {
        textoResultado = obtenerTextoTraduccion("empate", "¡Empate!");
    } else if (nombreGanador === data.jugador1) {
        textoResultado = `${obtenerTextoTraduccion("ganador_jugador_1", "Ganador Jugador 1 (X): ")}${data.jugador1}`;
    } else {
        textoResultado = `${obtenerTextoTraduccion("ganador_jugador_2", "Ganador Jugador 2 (O): ")}${data.jugaro2}`;
    }

    const modal = document.createElement("div");
    modal.id = "modal-fin-partida";
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 400px; text-align: center;">
            <h2 style="font-size: 1.5rem;">${textoResultado}</h2>
            <div style="display: flex; gap: 10px; width: 100%;">
                <button id="btn-modal-cerrar" style="flex: 1; padding: 10px; background: #ff0000; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">${obtenerTextoTraduccion("cerrar", "Cerrar")}</button>
                <button id="btn-modal-volver" style="flex: 1; padding: 10px; background: #4682b4; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">${obtenerTextoTraduccion("volver_a_jugar", "Volver a jugar")}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("btn-modal-cerrar").addEventListener("click", async () => {
        await updateDoc(refSalaDoc, { 
            partida: "terminada",
            abandonoPor: nombreUsuarioActual
        });
        window.location.replace("selectmodotres.html");
    });

    document.getElementById("btn-modal-volver").addEventListener("click", async () => {
        const docSnap = await getDoc(refSalaDoc);
        const currentData = docSnap.data();
        const volArr = currentData.volver || [];
        const petArr = currentData.peticion || [];
        
        if (!volArr.includes("SI")) {
            volArr.push("SI");
        }
        if (!petArr.includes(nombreUsuarioActual)) {
            petArr.push(nombreUsuarioActual);
        }

        if (volArr.length >= 2) {
            await updateDoc(refSalaDoc, {
                tablero: ["", "", "", "", "", "", "", "", ""],
                peticion: [],
                volver: [],
                ganador: [],
                fichasColocadas: { [currentData.jugador1]: 0, [currentData.jugaro2]: 0 },
                fichaSeleccionadaParaMover: {}
            });
        } else {
            await updateDoc(refSalaDoc, {
                volver: volArr,
                peticion: petArr
            });
        }
    });
}

function mostrarPopupEsperandoRespuesta() {
    if (document.getElementById("modal-esperando")) return;
    limpiarModalesPrevios();

    const modal = document.createElement("div");
    modal.id = "modal-esperando";
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 400px; text-align: center;">
            <h2 style="font-size: 1.3rem;">${obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta...")}</h2>
        </div>
    `;

    document.body.appendChild(modal);
}

function mostrarPopupPeticionRevancha(refSalaDoc, data, nombreUsuarioActual, usuarioSolicitante) {
    if (document.getElementById("modal-revancha")) return;
    limpiarModalesPrevios();

    const modal = document.createElement("div");
    modal.id = "modal-revancha";
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 400px; text-align: center;">
            <h2 style="font-size: 1.3rem;">${usuarioSolicitante}${obtenerTextoTraduccion("desea_volver_a_jugar", " quiere volver a jugar")}</h2>
            <div style="display: flex; gap: 10px; width: 100%;">
                <button id="btn-aceptar-revancha" style="flex: 1; padding: 10px; background: #4682b4; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">${obtenerTextoTraduccion("aceptar", "Aceptar")}</button>
                <button id="btn-cancelar-revancha" style="flex: 1; padding: 10px; background: #ff0000; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">${obtenerTextoTraduccion("cancelar", "Cancelar")}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("btn-aceptar-revancha").addEventListener("click", async () => {
        modal.remove();
        await updateDoc(refSalaDoc, {
            tablero: ["", "", "", "", "", "", "", "", ""],
            peticion: [],
            volver: [],
            ganador: [],
            fichasColocadas: { [data.jugador1]: 0, [data.jugaro2]: 0 },
            fichaSeleccionadaParaMover: {}
        });
    });

    document.getElementById("btn-cancelar-revancha").addEventListener("click", async () => {
        modal.remove();
        await updateDoc(refSalaDoc, { 
            partida: "terminada",
            abandonoPor: nombreUsuarioActual
        });
        window.location.replace("selectmodotres.html");
    });
}

function mostrarPopupAbandonoRival(refSalaDoc, nombreRivalAbandono) {
    if (document.getElementById("modal-abandono")) return;
    limpiarModalesPrevios();

    const modal = document.createElement("div");
    modal.id = "modal-abandono";
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; gap: 20px; max-width: 400px; text-align: center;">
            <h2 style="font-size: 1.3rem;">${nombreRivalAbandono}${obtenerTextoTraduccion("no_quiere_jugar_mas", " no puede o quiere jugar más")}</h2>
            <button id="btn-aceptar-abandono" style="padding: 10px 20px; background: #4682b4; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; width: 100%;">${obtenerTextoTraduccion("aceptar", "Aceptar")}</button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("btn-aceptar-abandono").addEventListener("click", () => {
        window.location.replace("selectmodotres.html");
    });
}