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

// Se añaden más iconos para soportar 15 parejas (30 cartas en total)[cite: 23]
const iconosDisponibles = ["🍎", "🚗", "⭐", "🐶", "🐱", "🚀", "⚽", "🎵", "🎨", "🍕", "⚡", "🔥", "💎", "🌵", "🏀", "🎁", "💡", "🍀"];
const totalParejas = 15;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_ia1_dificil": { "es": "Memoria - Multijugador", "en": "Memory - Multiplayer", "fr": "Mémoire - Multijoueur", "ro": "Memorie - Multiplayer" },
    "esperando_oponentes": { "es": "Esperando oponentes...", "en": "Waiting for opponents...", "fr": "En attente d'adversaires...", "ro": "Se așteaptă oponenții..." },
    "tu_turno": { "es": "Tu turno", "en": "Your turn", "fr": "Votre tour", "ro": "Rândul tău" },
    "turno_de": { "es": "Turno de", "en": "Turn of", "fr": "Tour de", "ro": "Rândul lui" },
    "partida_empatada": { "es": "Partida empatada", "en": "Game tied", "fr": "Partie nulle", "ro": "Joc la egalitate" },
    "cerrar": { "es": "Cerrar", "en": "Close", "fr": "Fermer", "ro": "Închide" },
    "volver_a_jugar": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" },
    "esperando_respuesta": { "es": "Esperando respuesta de los demás...", "en": "Waiting for others' response...", "fr": "En attente de réponse des autres...", "ro": "Se așteaptă răspunsul celorlalți..." },
    "rechazar": { "es": "Rechazar", "en": "Reject", "fr": "Rejeter", "ro": "Respinge" },
    "aceptar": { "es": "Aceptar", "en": "Accept", "fr": "Accepter", "ro": "Acceptă" },
    "no_es_tu_turno": { "es": "No es tu turno", "en": "It's not your turn", "fr": "Ce n'est pas votre tour", "ro": "Nu este rândul tău" },
    "quiere_volver_a_jugar": { "es": "quiere volver a jugar", "en": "wants to play again", "fr": "veut rejouer", "ro": "vrea să joace din nou" },
    "ya_no_quiere_jugar": { "es": "ya no quiere o puede jugar más", "en": "no longer wants or can play", "fr": "ne veut plus ou ne peut plus jouer", "ro": "nu mai vrea sau nu mai poate juca" }
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
    const tituloIa1Dificil = document.getElementById("titulo-ia1-dificil");
    if (tituloIa1Dificil) tituloIa1Dificil.textContent = obtenerTextoTraduccion("titulo_ia1_dificil", "Memoria - Multijugador");
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
    if (!nombreUsuario) return { avatar: "../../default-profile.png", nombre: "Esperando..." };
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

    const infoJ1 = await obtenerAvatarYNombreUsuario(j1Name);
    const infoJ2 = await obtenerAvatarYNombreUsuario(j2Name);
    const infoJ3 = await obtenerAvatarYNombreUsuario(j3Name);

    const imgJ1 = document.getElementById("avatar-j1");
    const txtJ1 = document.getElementById("name-j1");
    const imgJ2 = document.getElementById("avatar-j2");
    const txtJ2 = document.getElementById("name-j2");
    const imgJ3 = document.getElementById("avatar-j3");
    const txtJ3 = document.getElementById("name-j3");

    if (imgJ1) imgJ1.src = infoJ1.avatar;
    if (txtJ1) txtJ1.textContent = `J1: ${infoJ1.nombre}`;

    if (imgJ2) imgJ2.src = infoJ2.avatar;
    if (txtJ2) txtJ2.textContent = j2Name ? `J2: ${infoJ2.nombre}` : "Esperando...";

    if (imgJ3) imgJ3.src = infoJ3.avatar;
    if (txtJ3) txtJ3.textContent = j3Name ? `J3: ${infoJ3.nombre}` : obtenerTextoTraduccion("esperando_oponentes", "Esperando oponentes...");
}

async function gestionarMatchmaking() {
    const partidasRef = collection(db, "Partidas de Memoria");
    const snapshot = await getDocs(partidasRef);
    
    let docsValidos = [];
    snapshot.forEach(docSnap => {
        if (docSnap.id.startsWith("2aleatorios")) {
            docsValidos.push({ id: docSnap.id, data: docSnap.data() });
        }
    });

    docsValidos.sort((a, b) => {
        const numA = parseInt(a.id.replace("2aleatorios", ""), 10) || 0;
        const numB = parseInt(b.id.replace("2aleatorios", ""), 10) || 0;
        return numA - numB;
    });

    let salaEncontrada = null;
    for (let item of docsValidos) {
        const d = item.data;
        if (d.jugador1 !== nombreUsuarioLogueado && d.jugador2 !== nombreUsuarioLogueado && d.jugador3 !== nombreUsuarioLogueado) {
            if (!d.jugador2 || d.jugador2 === "") {
                salaEncontrada = { item, hueco: "jugador2" };
                break;
            } else if (!d.jugador3 || d.jugador3 === "") {
                salaEncontrada = { item, hueco: "jugador3" };
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
        partidaIdGlobal = `2aleatorios${nuevoNsala}`;
        rolJugador = "jugador1";
        
        const iconosMezclados = [...iconosDisponibles].sort(() => 0.5 - Math.random());
        const cartasArray = [...iconosMezclados.slice(0, totalParejas), ...iconosMezclados.slice(0, totalParejas)].sort(() => 0.5 - Math.random());

        await setDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
            jugador1: nombreUsuarioLogueado,
            jugador2: "",
            jugador3: "",
            nsala: nuevoNsala,
            partida: "espera",
            cartas: cartasArray,
            estadoTablero: {},
            turno: "jugador1",
            parejas1: 0,
            parejas2: 0,
            parejas3: 0,
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
    let turnoActual = datosPartidaGlobal.turno;

    // Determinación del orden de turnos cíclico: jugador1 -> jugador2 -> jugador3 -> jugador1...
    let siguienteTurno = turnoActual;
    if (turnoActual === "jugador1") siguienteTurno = "jugador2";
    else if (turnoActual === "jugador2") siguienteTurno = "jugador3";
    else if (turnoActual === "jugador3") siguienteTurno = "jugador1";

    let turnoParaGuardar = turnoActual; // Por defecto se queda el mismo si acierta

    if (esCoincidencia) {
        nuevoEstado[primeraCarta.dataset.indice].matched = true;
        nuevoEstado[segundaCarta.dataset.indice].matched = true;
        if (rolJugador === "jugador1") p1++;
        else if (rolJugador === "jugador2") p2++;
        else if (rolJugador === "jugador3") p3++;

        primeraCarta.classList.add("matched");
        primeraCarta.textContent = primeraCarta.dataset.icono;
        segundaCarta.classList.add("matched");
        segundaCarta.textContent = segundaCarta.dataset.icono;
        
        resetearSeleccion();
        bloqueoTablero = false;

        if (p1 + p2 + p3 === totalParejas) {
            await actualizarFinPartidaDB(p1, p2, p3, nuevoEstado);
            return;
        }
        
        // Si acierta, EL TURNO SE MANTIENE igual (no cambia a `siguienteTurno`)
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

        // Si falla, EL TURNO CAMBIA al siguiente jugador
        turnoParaGuardar = siguienteTurno;
    }

    await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
        estadoTablero: nuevoEstado,
        parejas1: p1,
        parejas2: p2,
        parejas3: p3,
        turno: turnoParaGuardar
    });
}

function resetearSeleccion() {
    primeraCarta = null;
    segundaCarta = null;
}

async function actualizarFinPartidaDB(p1, p2, p3, estadoTablero) {
    juegoTerminadoLocal = true;
    await updateDoc(doc(db, "Partidas de Memoria", partidaIdGlobal), {
        partida: "terminada",
        parejas1: p1,
        parejas2: p2,
        parejas3: p3,
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
            modo: "2 aleatorios",
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

        const partidaCompleta = data.jugador1 && data.jugador2 && data.jugador3;

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
                        
                        indicador.textContent = `${obtenerTextoTraduccion("turno_de", "Turno de")} ${oponenteNombre}`;
                        indicador.style.backgroundColor = "rgba(255, 100, 100, 0.3)";
                    }
                }
                if (data.cartas) {
                    construirTablero(data.cartas, data.estadoTablero);
                }
            }
        } else if (data.partida === "terminada" || ((data.parejas1 || 0) + (data.parejas2 || 0) + (data.parejas3 || 0) === totalParejas)) {
            juegoTerminadoLocal = true;
            const p1 = data.parejas1 || 0;
            const p2 = data.parejas2 || 0;
            const p3 = data.parejas3 || 0;
            
            let parejasMis = 0;
            if (rolJugador === "jugador1") parejasMis = p1;
            else if (rolJugador === "jugador2") parejasMis = p2;
            else if (rolJugador === "jugador3") parejasMis = p3;

            if (parejasMis > 0 && !window.transaccionRealizada) {
                window.transaccionRealizada = true;
                await registrarTransaccionNova(parejasMis);
            }

            let textoModal = `Fin de partida - J1: ${p1} | J2: ${p2} | J3: ${p3}`;
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
            mostrarPopupAvisoSalida("Uno de los jugadores ha decidido no continuar la partida.");
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

    p.textContent = `Solicitud de revancha (${votosCount}/3 jugadores listos). ¿Deseas aceptar?`;
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

        if (votosActuales.length >= 3) {
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
                parejas3: 0
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