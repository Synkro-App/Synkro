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
    onSnapshot,
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
let nombreUsuarioLogueado = "";

let partidaIdGlobal = null;
let rolJugador = null; 
let datosPartidaGlobal = null;
let unsubPartida = null;

const iconosDisponibles = ["🍎", "🚗", "⭐", "🐶", "🐱", "🚀", "⚽", "🎵", "🎨", "🍕", "⚡", "🔥", "💎", "🌵", "🏀", "🎁", "💡", "🍀", "👑", "🎯", "🤖", "🦄", "🍦", "🎈", "🍔", "🎸", "📚", "🧸", "🔮", "🍉", "🐬", "🐢", "🍩", "🍿", "🧩", "🏆", "⚓", "🛸", "🐼", "🦊"];
const totalParejas = 40;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_ia1_dificil": { "es": "Memoria - Multijugador (5 Jugadores)", "en": "Memory - Multiplayer (5 Players)", "fr": "Mémoire - Multijoueur (5 Joueurs)", "ro": "Memorie - Multiplayer (5 Jucători)" },
    "esperando_oponentes": { "es": "Esperando oponentes...", "en": "Waiting for opponents...", "fr": "En attente d'adversaires...", "ro": "Se așteaptă oponenții..." },
    "tu_turno": { "es": "Tu turno", "en": "Your turn", "fr": "Votre tour", "ro": "Rândul tău" },
    "turno_de": { "es": "Turno de", "en": "Turn of", "fr": "Tour de", "ro": "Rândul lui" },
    "cerrar": { "es": "Cerrar", "en": "Close", "fr": "Fermer", "ro": "Închide" },
    "volver_a_jugar": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" },
    "esperando_respuesta": { "es": "Esperando respuesta de los demás...", "en": "Waiting for others' response...", "fr": "En attente de réponse des autres...", "ro": "Se așteaptă răspunsul celorlalți..." },
    "rechazar": { "es": "Rechazar", "en": "Reject", "fr": "Rejeter", "ro": "Respinge" },
    "aceptar": { "es": "Aceptar", "en": "Accept", "fr": "Accepter", "ro": "Acceptă" },
    "no_es_tu_turno": { "es": "No es tu turno", "en": "It's not your turn", "fr": "Ce n'est pas votre tour", "ro": "Nu este rândul tău" },
    "revancha_solicitud": { 
        "es": "Solicitud de revancha ({votos}/5 jugadores listos). ¿Deseas aceptar?", 
        "en": "Rematch request ({votos}/5 players ready). Do you want to accept?", 
        "fr": "Demande de revanche ({votos}/5 joueurs prêts). Voulez-vous accepter?", 
        "ro": "Cerere de revanșă ({votos}/5 jucători gata). Vrei să accepți?" 
    },
    "revancha_rechazada_msg": { 
        "es": "Uno de los jugadores ha decidido no continuar la partida.", 
        "en": "One of the players has decided not to continue the game.", 
        "fr": "L'un des joueurs a décidé de ne pas continuer la partie.", 
        "ro": "Unul dintre jucători a decis să nu continue jocul." 
    },
    "fin_partida_texto": { 
        "es": "Fin de partida - J1: {p1} | J2: {p2} | J3: {p3} | J4: {p4} | J5: {p5}", 
        "en": "Game over - P1: {p1} | P2: {p2} | P3: {p3} | P4: {p4} | P5: {p5}", 
        "fr": "Fin de partie - J1: {p1} | J2: {p2} | J3: {p3} | J4: {p4} | J5: {p5}", 
        "ro": "Joc terminat - J1: {p1} | J2: {p2} | J3: {p3} | J4: {p4} | J5: {p5}" 
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

function obtenerTextoTraduccion(clave, fallbackTexto, variables = {}) {
    let texto = fallbackTexto;
    if (diccionario[clave] && diccionario[clave][currentLanguage]) {
        texto = diccionario[clave][currentLanguage];
    } else if (traduccionesLocales[clave] && traduccionesLocales[clave][currentLanguage]) {
        texto = traduccionesLocales[clave][currentLanguage];
    }
    
    Object.keys(variables).forEach(key => {
        texto = texto.replace(new RegExp(`\\{${key}\\}`, 'g'), variables[key]);
    });
    return texto;
}

function aplicarTraduccionesEstaticas() {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs) lblSubs.textContent = obtenerTextoTraduccion("text_subscripcion", "Suscripción:");
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) btnVolver.textContent = obtenerTextoTraduccion("btn_volver", "Volver");
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "Cerrar sesión");
    const tituloIa1Dificil = document.getElementById("titulo-ia1-dificil");
    if (tituloIa1Dificil) tituloIa1Dificil.textContent = obtenerTextoTraduccion("titulo_ia1_dificil", "Memoria - Multijugador (5 Jugadores)");
}

function mostrarToast(mensaje) {
    const toast = document.getElementById("toast-popup");
    if (!toast) return;
    toast.textContent = mensaje;
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 2500);
}

async function obtenerAvatarYNombreUsuario(nombreUsuario) {
    if (!nombreUsuario) return { avatar: "../../default-profile.png", nombre: obtenerTextoTraduccion("esperando_oponentes", "Esperando oponentes...") };
    try {
        const usuariosRef = collection(db, "Usuarios");
        const q = query(usuariosRef, where("usuario", "==", nombreUsuario));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const data = snap.docs[0].data();
            return {
                avatar: normalizarSourceImagen(data.imgperfil),
                nombre: data.usuario || nombreUsuario
            };
        }
    } catch (e) {}
    return { avatar: "../../default-profile.png", nombre: nombreUsuario };
}

async function actualizarCabeceraJugadores(data) {
    const j1Name = data.jugador1 || "Jugador 1";
    const j2Name = data.jugador2 || "";
    const j3Name = data.jugador3 || "";
    const j4Name = data.jugador4 || "";
    const j5Name = data.jugador5 || "";

    const infoJ1 = await obtenerAvatarYNombreUsuario(j1Name);
    const infoJ2 = await obtenerAvatarYNombreUsuario(j2Name);
    const infoJ3 = await obtenerAvatarYNombreUsuario(j3Name);
    const infoJ4 = await obtenerAvatarYNombreUsuario(j4Name);
    const infoJ5 = await obtenerAvatarYNombreUsuario(j5Name);

    const imgJ1 = document.getElementById("avatar-j1");
    const txtJ1 = document.getElementById("name-j1");
    const imgJ2 = document.getElementById("avatar-j2");
    const txtJ2 = document.getElementById("name-j2");
    const imgJ3 = document.getElementById("avatar-j3");
    const txtJ3 = document.getElementById("name-j3");
    const imgJ4 = document.getElementById("avatar-j4");
    const txtJ4 = document.getElementById("name-j4");
    const imgJ5 = document.getElementById("avatar-j5");
    const txtJ5 = document.getElementById("name-j5");

    if (imgJ1) imgJ1.src = infoJ1.avatar;
    if (txtJ1) txtJ1.textContent = infoJ1.nombre;

    if (imgJ2) imgJ2.src = infoJ2.avatar;
    if (txtJ2) txtJ2.textContent = j2Name ? infoJ2.nombre : obtenerTextoTraduccion("esperando_oponentes", "Esperando oponentes...");

    if (imgJ3) imgJ3.src = infoJ3.avatar;
    if (txtJ3) txtJ3.textContent = j3Name ? infoJ3.nombre : obtenerTextoTraduccion("esperando_oponentes", "Esperando oponentes...");

    if (imgJ4) imgJ4.src = infoJ4.avatar;
    if (txtJ4) txtJ4.textContent = j4Name ? infoJ4.nombre : obtenerTextoTraduccion("esperando_oponentes", "Esperando oponentes...");

    if (imgJ5) imgJ5.src = infoJ5.avatar;
    if (txtJ5) txtJ5.textContent = j5Name ? infoJ5.nombre : obtenerTextoTraduccion("esperando_oponentes", "Esperando oponentes...");
}

async function gestionarMatchmaking() {
    const partidasRef = collection(db, "Partidas de Memoria");
    const snapshot = await getDocs(partidasRef);
    
    let docsValidos = [];
    snapshot.forEach(docSnap => {
        if (docSnap.id.startsWith("4aleatorios")) {
            docsValidos.push({ id: docSnap.id, data: docSnap.data() });
        }
    });

    docsValidos.sort((a, b) => {
        const numA = parseInt(a.id.replace("4aleatorios", ""), 10) || 0;
        const numB = parseInt(b.id.replace("4aleatorios", ""), 10) || 0;
        return numA - numB;
    });

    let salaEncontrada = null;
    for (let item of docsValidos) {
        const d = item.data;
        if (d.jugador1 !== nombreUsuarioLogueado && d.jugador2 !== nombreUsuarioLogueado && d.jugador3 !== nombreUsuarioLogueado && d.jugador4 !== nombreUsuarioLogueado && d.jugador5 !== nombreUsuarioLogueado) {
            if (!d.jugador2 || d.jugador2 === "") {
                salaEncontrada = { item, hueco: "jugador2" };
                break;
            } else if (!d.jugador3 || d.jugador3 === "") {
                salaEncontrada = { item, hueco: "jugador3" };
                break;
            } else if (!d.jugador4 || d.jugador4 === "") {
                salaEncontrada = { item, hueco: "jugador4" };
                break;
            } else if (!d.jugador5 || d.jugador5 === "") {
                salaEncontrada = { item, hueco: "jugador5" };
                break;
            }
        }
    }

    if (salaEncontrada) {
        partidaIdGlobal = salaEncontrada.item.id;
        rolJugador = salaEncontrada.hueco;
        await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
            [rolJugador]: nombreUsuarioLogueado
        });
    } else {
        const nuevoNsala = docsValidos.length + 1;
        partidaIdGlobal = `4aleatorios${nuevoNsala}`;
        rolJugador = "jugador1";
        
        const iconosMezclados = [...iconosDisponibles].sort(() => 0.5 - Math.random());
        const cartasArray = [...iconosMezclados.slice(0, totalParejas), ...iconosMezclados.slice(0, totalParejas)].sort(() => 0.5 - Math.random());

        await setDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
            jugador1: nombreUsuarioLogueado,
            jugador2: "",
            jugador3: "",
            jugador4: "",
            jugador5: "",
            nsala: nuevoNsala,
            partida: "espera",
            cartas: cartasArray,
            estadoTablero: {},
            turno: "jugador1",
            parejas1: 0,
            parejas2: 0,
            parejas3: 0,
            parejas4: 0,
            parejas5: 0,
            votosRevancha: []
        });
    }

    escucharPartida();
}

let primeraCarta = null;
let segundaCarta = null;
let bloqueoTablero = false;
let juegoTerminadoLocal = false;

function construirTablero(cartasArray, estadoTablero) {
    const tablero = document.getElementById("memory-board");
    tablero.innerHTML = "";

    cartasArray.forEach((icono, index) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("memory-card");
        tarjeta.dataset.indice = index;
        tarjeta.dataset.icono = icono;

        if (estadoTablero && estadoTablero[index]) {
            if (estadoTablero[index].matched) {
                tarjeta.classList.add("matched");
                tarjeta.textContent = icono;
            } else if (estadoTablero[index].flipped) {
                tarjeta.classList.add("flipped");
                tarjeta.textContent = icono;
            }
        }

        tarjeta.addEventListener("click", () => {
            if (bloqueoTablero || juegoTerminadoLocal) return;
            if (datosPartidaGlobal.turno !== rolJugador) {
                mostrarToast(obtenerTextoTraduccion("no_es_tu_turno", "No es tu turno"));
                return;
            }
            if (tarjeta.classList.contains("matched") || tarjeta.classList.contains("flipped")) return;
            voltearCarta(tarjeta);
        });

        tablero.appendChild(tarjeta);
    });
}

async function voltearCarta(carta) {
    if (carta === primeraCarta) return;
    carta.classList.add("flipped");
    carta.textContent = carta.dataset.icono;

    const index = carta.dataset.indice;
    let nuevoEstado = datosPartidaGlobal.estadoTablero || {};
    nuevoEstado[index] = { flipped: true, matched: false };

    await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
        estadoTablero: nuevoEstado
    });

    if (!primeraCarta) {
        primeraCarta = carta;
        return;
    }

    segundaCarta = carta;
    bloqueoTablero = true;

    setTimeout(comprobarParejaRed, 800);
}

async function comprobarParejaRed() {
    const esCoincidencia = primeraCarta.dataset.icono === segundaCarta.dataset.icono;
    let nuevoEstado = datosPartidaGlobal.estadoTablero;
    let p1 = datosPartidaGlobal.parejas1 || 0;
    let p2 = datosPartidaGlobal.parejas2 || 0;
    let p3 = datosPartidaGlobal.parejas3 || 0;
    let p4 = datosPartidaGlobal.parejas4 || 0;
    let p5 = datosPartidaGlobal.parejas5 || 0;
    let turnoActual = datosPartidaGlobal.turno;

    let siguienteTurno = turnoActual;
    if (turnoActual === "jugador1") siguienteTurno = "jugador2";
    else if (turnoActual === "jugador2") siguienteTurno = "jugador3";
    else if (turnoActual === "jugador3") siguienteTurno = "jugador4";
    else if (turnoActual === "jugador4") siguienteTurno = "jugador5";
    else if (turnoActual === "jugador5") siguienteTurno = "jugador1";

    let turnoParaGuardar = turnoActual;

    if (esCoincidencia) {
        nuevoEstado[primeraCarta.dataset.indice].matched = true;
        nuevoEstado[segundaCarta.dataset.indice].matched = true;
        if (rolJugador === "jugador1") p1++;
        else if (rolJugador === "jugador2") p2++;
        else if (rolJugador === "jugador3") p3++;
        else if (rolJugador === "jugador4") p4++;
        else if (rolJugador === "jugador5") p5++;

        primeraCarta.classList.add("matched");
        primeraCarta.textContent = primeraCarta.dataset.icono;
        segundaCarta.classList.add("matched");
        segundaCarta.textContent = segundaCarta.dataset.icono;
        
        resetearSeleccion();
        bloqueoTablero = false;

        const totalParejasEncontradas = p1 + p2 + p3 + p4 + p5;
        if (totalParejasEncontradas === totalParejas) {
            await actualizarFinPartidaDB(p1, p2, p3, p4, p5, nuevoEstado);
            return;
        }
        
        turnoParaGuardar = turnoActual;
    } else {
        nuevoEstado[primeraCarta.dataset.indice].flipped = false;
        nuevoEstado[segundaCarta.dataset.indice].flipped = false;

        primeraCarta.classList.remove("flipped");
        primeraCarta.textContent = "";
        segundaCarta.classList.remove("flipped");
        segundaCarta.textContent = "";

        resetearSeleccion();
        bloqueoTablero = false;

        turnoParaGuardar = siguienteTurno;
    }

    await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
        estadoTablero: nuevoEstado,
        parejas1: p1,
        parejas2: p2,
        parejas3: p3,
        parejas4: p4,
        parejas5: p5,
        turno: turnoParaGuardar
    });
}

function resetearSeleccion() {
    primeraCarta = null;
    segundaCarta = null;
}

async function actualizarFinPartidaDB(p1, p2, p3, p4, p5, estadoTablero) {
    juegoTerminadoLocal = true;
    await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
        partida: "terminada",
        parejas1: p1,
        parejas2: p2,
        parejas3: p3,
        parejas4: p4,
        parejas5: p5,
        estadoTablero: estadoTablero
    });
}

async function registrarTransaccionNova(parejasEncontradas) {
    if (parejasEncontradas <= 0) return;
    const totalNovaGanados = parejasEncontradas * 5;
    novasActuales += totalNovaGanados;

    const txtNovas = document.getElementById("user-novas");
    if (txtNovas) txtNovas.textContent = novasActuales;

    try {
        await updateDoc(doc(db, "Usuarios", userDocIdGlobal), { NovaPoints: novasActuales });

        const transRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const snap = await getDocs(transRef);
        let contador = 1;
        snap.forEach(d => {
            if (d.id.startsWith("memoria")) {
                const num = parseInt(d.id.replace("memoria", ""), 10);
                if (!isNaN(num) && num >= contador) contador = num + 1;
            }
        });

        await setDoc(doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", `memoria${contador}`), {
            NovaPoints: totalNovaGanados,
            donde: "Memoria",
            fecha: serverTimestamp(),
            modo: "4 aleatorios (5 jugadores)",
            parejasencontradas: parejasEncontradas,
            tipo: "suma"
        });
    } catch (e) {
        console.error("Error registrando Novas:", e);
    }
}

function escucharPartida() {
    unsubPartida = onSnapshot(doc(db, "Partidas de Memoria", partidaIdGlobal), async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        datosPartidaGlobal = data;

        await actualizarCabeceraJugadores(data);
        const indicador = document.getElementById("turn-indicator");

        const partidaCompleta = data.jugador1 && data.jugador2 && data.jugador3 && data.jugador4 && data.jugador5;

        if (data.partida === "espera") {
            if (!partidaCompleta) {
                if (indicador) indicador.textContent = obtenerTextoTraduccion("esperando_oponentes", "Esperando oponentes...");
            } else {
                if (indicador) {
                    if (data.turno === rolJugador) {
                        indicador.textContent = obtenerTextoTraduccion("tu_turno", "Tu turno");
                        indicador.style.backgroundColor = "rgba(0, 174, 255, 0.3)";
                    } else {
                        let oponenteNombre = data.jugador1;
                        if (data.turno === "jugador2") oponenteNombre = data.jugador2;
                        if (data.turno === "jugador3") oponenteNombre = data.jugador3;
                        if (data.turno === "jugador4") oponenteNombre = data.jugador4;
                        if (data.turno === "jugador5") oponenteNombre = data.jugador5;
                        
                        indicador.textContent = `${obtenerTextoTraduccion("turno_de", "Turno de")} ${oponenteNombre}`;
                        indicador.style.backgroundColor = "rgba(255, 100, 100, 0.3)";
                    }
                }
                if (data.cartas) {
                    construirTablero(data.cartas, data.estadoTablero);
                }
            }
        } else if (data.partida === "terminada" || ((data.parejas1 || 0) + (data.parejas2 || 0) + (data.parejas3 || 0) + (data.parejas4 || 0) + (data.parejas5 || 0) === totalParejas)) {
            juegoTerminadoLocal = true;
            const p1 = data.parejas1 || 0;
            const p2 = data.parejas2 || 0;
            const p3 = data.parejas3 || 0;
            const p4 = data.parejas4 || 0;
            const p5 = data.parejas5 || 0;
            
            let parejasMis = 0;
            if (rolJugador === "jugador1") parejasMis = p1;
            else if (rolJugador === "jugador2") parejasMis = p2;
            else if (rolJugador === "jugador3") parejasMis = p3;
            else if (rolJugador === "jugador4") parejasMis = p4;
            else if (rolJugador === "jugador5") parejasMis = p5;

            if (parejasMis > 0 && !window.transaccionRealizada) {
                window.transaccionRealizada = true;
                await registrarTransaccionNova(parejasMis);
            }

            let textoModal = obtenerTextoTraduccion("fin_partida_texto", `Fin de partida - J1: ${p1} | J2: ${p2} | J3: ${p3} | J4: ${p4} | J5: ${p5}`, { p1, p2, p3, p4, p5 });
            mostrarPopupFinPartida(textoModal, data);
        }

        const votos = data.votosRevancha || [];
        const haVotadoElUsuario = votos.includes(rolJugador);

        if (data.partida === "revancha_espera") {
            if (haVotadoElUsuario) {
                mostrarPopupEsperaRespuesta();
            } else {
                mostrarPopupSolicitudReinicio(votos.length);
            }
        } else if (data.partida === "revancha_rechazada") {
            mostrarPopupAvisoSalida(obtenerTextoTraduccion("revancha_rechazada_msg", "Uno de los jugadores ha decidido no continuar la partida."));
        } else if (data.partida === "espera" && juegoTerminadoLocal && votos.length === 0) {
            juegoTerminadoLocal = false;
            window.transaccionRealizada = false;
            const modal = document.getElementById("modal-popup");
            if (modal) modal.classList.add("hidden");
        }
    });
}

function mostrarPopupFinPartida(texto, data) {
    const modal = document.getElementById("modal-popup");
    const p = document.getElementById("modal-text");
    const btns = document.getElementById("modal-buttons");

    p.textContent = texto;
    btns.innerHTML = "";

    const btnCerrar = document.createElement("button");
    btnCerrar.textContent = obtenerTextoTraduccion("cerrar", "Cerrar");
    btnCerrar.className = "btn-default";
    btnCerrar.addEventListener("click", async () => {
        await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
            partida: "terminada"
        });
        window.location.replace("selectmode1jmultijugador.html");
    });

    const btnReintentar = document.createElement("button");
    btnReintentar.textContent = obtenerTextoTraduccion("volver_a_jugar", "Volver a jugar");
    btnReintentar.className = "btn-juego-custom";
    btnReintentar.style.width = "auto";
    btnReintentar.addEventListener("click", async () => {
        let votosActuales = data.votosRevancha || [];
        if (!votosActuales.includes(rolJugador)) {
            votosActuales.push(rolJugador);
        }
        await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
            partida: "revancha_espera",
            votosRevancha: votosActuales
        });
        mostrarPopupEsperaRespuesta();
    });

    btns.appendChild(btnCerrar);
    btns.appendChild(btnReintentar);
    modal.classList.remove("hidden");
}

function mostrarPopupEsperaRespuesta() {
    const modal = document.getElementById("modal-popup");
    const p = document.getElementById("modal-text");
    const btns = document.getElementById("modal-buttons");

    p.textContent = obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta de los demás...");
    btns.innerHTML = "";
    modal.classList.remove("hidden");
}

function mostrarPopupSolicitudReinicio(votosCount) {
    const modal = document.getElementById("modal-popup");
    const p = document.getElementById("modal-text");
    const btns = document.getElementById("modal-buttons");

    p.textContent = obtenerTextoTraduccion("revancha_solicitud", `Solicitud de revancha (${votosCount}/5 jugadores listos). ¿Deseas aceptar?`, { votos: votosCount });
    btns.innerHTML = "";

    const btnRechazar = document.createElement("button");
    btnRechazar.textContent = obtenerTextoTraduccion("rechazar", "Rechazar");
    btnRechazar.className = "btn-default";
    btnRechazar.addEventListener("click", async () => {
        await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
            partida: "revancha_rechazada"
        });
        window.location.replace("selectmode1jmultijugador.html");
    });

    const btnAceptar = document.createElement("button");
    btnAceptar.textContent = obtenerTextoTraduccion("aceptar", "Aceptar");
    btnAceptar.className = "btn-juego-custom";
    btnAceptar.style.width = "auto";
    btnAceptar.addEventListener("click", async () => {
        let votosActuales = datosPartidaGlobal.votosRevancha || [];
        if (!votosActuales.includes(rolJugador)) {
            votosActuales.push(rolJugador);
        }

        if (votosActuales.length >= 5) {
            const iconosMezclados = [...iconosDisponibles].sort(() => 0.5 - Math.random());
            const cartasArray = [...iconosMezclados.slice(0, totalParejas), ...iconosMezclados.slice(0, totalParejas)].sort(() => 0.5 - Math.random());
            
            await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
                partida: "espera",
                votosRevancha: [],
                cartas: cartasArray,
                estadoTablero: {},
                turno: "jugador1",
                parejas1: 0,
                parejas2: 0,
                parejas3: 0,
                parejas4: 0,
                parejas5: 0
            });
            window.transaccionRealizada = false;
            juegoTerminadoLocal = false;
            modal.classList.add("hidden");
        } else {
            await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
                partida: "revancha_espera",
                votosRevancha: votosActuales
            });
            mostrarPopupEsperaRespuesta();
        }
    });

    btns.appendChild(btnRechazar);
    btns.appendChild(btnAceptar);
    modal.classList.remove("hidden");
}

function mostrarPopupAvisoSalida(texto) {
    const modal = document.getElementById("modal-popup");
    const p = document.getElementById("modal-text");
    const btns = document.getElementById("modal-buttons");

    p.textContent = texto;
    btns.innerHTML = "";

    const btnCerrar = document.createElement("button");
    btnCerrar.textContent = obtenerTextoTraduccion("cerrar", "Cerrar");
    btnCerrar.className = "btn-default";
    btnCerrar.addEventListener("click", async () => {
        await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
            partida: "terminada"
        });
        window.location.replace("selectmode1jmultijugador.html");
    });

    btns.appendChild(btnCerrar);
    modal.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";
    nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "../../index.html";
        return;
    }

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

    await gestionarMatchmaking();

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