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
    arrayUnion 
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

let partidaIdActiva = null;
let unsubPartida = null;
let esJugador1 = false;
let codigoActualPartida = "";

// Estado de juego de memoria 1v1 sincronizado
let jugadorActualTurno = 1; 
let puntuaciones = { 1: 0, 2: 0 };
let cartasSeleccionadas = [];
let bloqueadoTablero = false;
let barajaPartida = [];
let timeoutAvisoTurno = null;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "btn_generar": { "es": "Generar un código", "en": "Generate a code", "fr": "Générer un code", "ro": "Generează cod" },
    "btn_tengo": { "es": "Tengo un código", "en": "I have a code", "fr": "J'ai un code", "ro": "Am un cod" },
    "titulo_sala": { "es": "Sala Amigo - Memoria 1v1", "en": "Friend Room - 1v1 Memory", "fr": "Salle Amie - Mémoire 1v1", "ro": "Cameră Prieten - Memorie 1v1" },
    "placeholder_codigo": { "es": "Introduce el código...", "en": "Enter the code...", "fr": "Entrez le code...", "ro": "Introduceți codul..." },
    "btn_unirse": { "es": "Unirse", "en": "Join", "fr": "Rejoindre", "ro": "Alătură-te" },
    "txt_codigo_generado": { "es": "Código generado:", "en": "Generated code:", "fr": "Code généré:", "ro": "Cod generat:" },
    "txt_esperando_jugador": { "es": "Esperando a que se una el Jugador 2...", "en": "Waiting for Player 2 to join...", "fr": "En attente que le Joueur 2 rejoigne...", "ro": "Se așteaptă ca Jucătorul 2 să se alăture..." },
    "preparando_partida": { "es": "Preparando partida...", "en": "Preparing match...", "fr": "Préparation du match...", "ro": "Pregătirea meciului..." },
    "aviso_titulo": { "es": "Aviso", "en": "Notice", "fr": "Avis", "ro": "Notificare" },
    "codigo_no_encontrado": { "es": "Código no encontrado o partida inexistente.", "en": "Code not found or non-existent match.", "fr": "Code introuvable ou match inexistant.", "ro": "Codul nu a fost găsit sau meciul nu există." },
    "tu_turno": { "es": "¡Es tu turno!", "en": "It's your turn!", "fr": "C'est votre tour !", "ro": "Este rândul tău!" },
    "turno_jugador": { "es": "Turno del Jugador", "en": "Player's turn", "fr": "Tour du Joueur", "ro": "Rândul Jucătorului" },
    "no_es_tu_turno": { "es": "No es tu turno", "en": "It's not your turn", "fr": "Ce n'est pas votre tour", "ro": "Nu este rândul tău" },
    "partida_empatada": { "es": "Partida empatada", "en": "Tied match", "fr": "Match nul", "ro": "Meci egal" },
    "ambos_encontraron": { "es": "Ambos encontraron", "en": "Both found", "fr": "Tous deux ont trouvé", "ro": "Amândoi au găsit" },
    "parejas_texto": { "es": "parejas.", "en": "pairs.", "fr": "paires.", "ro": "perechi." },
    "ganador_jugador": { "es": "Ganador Jugador", "en": "Winner Player", "fr": "Gagnant Joueur", "ro": "Câștigător Jucător" },
    "revancha_titulo": { "es": "Revancha", "en": "Rematch", "fr": "Revanche", "ro": "Revanșă" },
    "esperando_respuesta": { "es": "Esperando respuesta...", "en": "Waiting for response...", "fr": "En attente de réponse...", "ro": "Se așteaptă răspunsul..." },
    "solicitud_revancha": { "es": "Solicitud de revancha", "en": "Rematch request", "fr": "Demande de revanche", "ro": "Cerere de revanșă" },
    "quiere_volver_jugar": { "es": "quiere volver a jugar", "en": "wants to play again", "fr": "veut rejouer", "ro": "vrea să joace din nou" },
    "btn_aceptar": { "es": "Aceptar", "en": "Accept", "fr": "Accepter", "ro": "Acceptă" },
    "btn_rechazar": { "es": "Rechazar", "en": "Reject", "fr": "Rejeter", "ro": "Respinge" },
    "partida_finalizada": { "es": "Partida Finalizada", "en": "Match Ended", "fr": "Match Terminé", "ro": "Meci Încheiat" },
    "ya_no_quiere_jugar": { "es": "ya no quiere o puede volver a jugar", "en": "no longer wants or can play again", "fr": "ne veut plus ou ne peut plus rejouer", "ro": "nu mai vrea sau nu mai poate juca din nou" },
    "btn_cerrar": { "es": "Cerrar", "en": "Close", "fr": "Fermer", "ro": "Închide" },
    "modal_btn_revancha": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" },
    "usuario_no_quiere_jugar_mas": { "es": "ya no quiere o puede jugar más", "en": "no longer wants or can play more", "fr": "ne veut plus ou ne peut plus jouer", "ro": "nu mai vrea sau nu mai poate juca" }
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

    const btnGen = document.getElementById("btn-generar-codigo");
    if (btnGen) btnGen.textContent = obtenerTextoTraduccion("btn_generar", "Generar un código");

    const btnTeng = document.getElementById("btn-tengo-codigo");
    if (btnTeng) btnTeng.textContent = obtenerTextoTraduccion("btn_tengo", "Tengo un código");

    const tituloSala = document.getElementById("titulo-sala");
    if (tituloSala) tituloSala.textContent = obtenerTextoTraduccion("titulo_sala", "Sala Amigo - Memoria 1v1");

    const inputCodigo = document.getElementById("input-codigo-partida");
    if (inputCodigo) inputCodigo.placeholder = obtenerTextoTraduccion("placeholder_codigo", "Introduce el código...");

    const btnUnirse = document.getElementById("btn-unirse-partida");
    if (btnUnirse) btnUnirse.textContent = obtenerTextoTraduccion("btn_unirse", "Unirse");

    const txtGen = document.getElementById("txt-codigo-generado");
    if (txtGen) txtGen.textContent = obtenerTextoTraduccion("txt_codigo_generado", "Código generado:");

    const txtEsp = document.getElementById("txt-esperando-jugador");
    if (txtEsp) txtEsp.textContent = obtenerTextoTraduccion("txt_esperando_jugador", "Esperando a que se una el Jugador 2...");

    const infoTurno = document.getElementById("info-turno");
    if (infoTurno && infoTurno.textContent.includes("Preparando")) {
        infoTurno.textContent = obtenerTextoTraduccion("preparando_partida", "Preparando partida...");
    }
}

async function generarIdPartidaAmigo() {
    const ref = collection(db, "Partidas de Memoria");
    const snapshot = await getDocs(ref);
    let maxNum = 0;
    snapshot.forEach(docSnap => {
        const id = docSnap.id;
        if (id.startsWith("sala1amigo")) {
            const numStr = id.replace("sala1amigo", "");
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `sala1amigo${maxNum + 1}`;
}

async function generarCodigoIncremental() {
    const ref = collection(db, "Partidas de Memoria");
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
    return (maxCodigo + 1).toString();
}

async function generarIdTransaccionMemoria(userDocId) {
    const ref = collection(db, "Usuarios", userDocId, "Transacciones de NovaPoints");
    const snapshot = await getDocs(ref);
    let maxNum = 0;
    snapshot.forEach(docSnap => {
        const id = docSnap.id;
        if (id.startsWith("memoria")) {
            const numStr = id.replace("memoria", "");
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `memoria${maxNum + 1}`;
}

function volverAlMenuAmigo() {
    if (unsubPartida) {
        unsubPartida();
        unsubPartida = null;
    }
    partidaIdActiva = null;
    esJugador1 = false;
    codigoActualPartida = "";

    document.getElementById("menu-amigo").style.display = "flex";
    document.getElementById("btn-generar-codigo").style.display = "block";
    document.getElementById("btn-tengo-codigo").style.display = "block";
    document.getElementById("contenedor-juego").style.display = "none";
    document.getElementById("contenedor-input-codigo").style.display = "none";
    document.getElementById("info-espera-codigo").style.display = "none";
    cerrarModal();
}

function mostrarModal(titulo, mensaje, botonesHtml) {
    document.getElementById("modal-titulo").textContent = titulo;
    document.getElementById("modal-mensaje").textContent = mensaje;
    const contBotones = document.getElementById("modal-botones");
    contBotones.innerHTML = botonesHtml;
    document.getElementById("modal-pop-up").style.display = "flex";
}

function cerrarModal() {
    document.getElementById("modal-pop-up").style.display = "none";
}

function mostrarAvisoRapido(texto) {
    if (timeoutAvisoTurno) clearTimeout(timeoutAvisoTurno);
    let contenedorAviso = document.getElementById("aviso-rapido-flotante");
    if (!contenedorAviso) {
        contenedorAviso = document.createElement("div");
        contenedorAviso.id = "aviso-rapido-flotante";
        contenedorAviso.style.cssText = "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.85); color: #fff; padding: 10px 20px; border-radius: 8px; z-index: 9999; font-weight: bold; pointer-events: none; transition: opacity 0.3s ease;";
        document.body.appendChild(contenedorAviso);
    }
    contenedorAviso.textContent = texto;
    contenedorAviso.style.opacity = "1";
    timeoutAvisoTurno = setTimeout(() => {
        contenedorAviso.style.opacity = "0";
    }, 1500);
}

async function renderizarCabeceraJugadores(data) {
    let contenedorCabecera = document.getElementById("cabecera-jugadores-partida");
    if (!contenedorCabecera) {
        contenedorCabecera = document.createElement("div");
        contenedorCabecera.id = "cabecera-jugadores-partida";
        contenedorCabecera.style.cssText = "display: flex; justify-content: space-around; align-items: center; margin-bottom: 15px; width: 100%; max-width: 500px;";
        const infoTurno = document.getElementById("info-turno");
        if (infoTurno && infoTurno.parentNode) {
            infoTurno.parentNode.insertBefore(contenedorCabecera, infoTurno);
        }
    }

    let img1 = avatarUsuarioGlobal;
    let img2 = "../../default-profile.png";

    if (esJugador1) {
        img1 = avatarUsuarioGlobal;
        if (data.jugador2DocId) {
            try {
                const snapJ2 = await getDoc(doc(db, "Usuarios", data.jugador2DocId));
                if (snapJ2.exists()) {
                    img2 = normalizarSourceImagen(snapJ2.data().imgperfil);
                }
            } catch (e) {}
        }
    } else {
        img2 = avatarUsuarioGlobal;
        if (data.jugador1DocId) {
            try {
                const snapJ1 = await getDoc(doc(db, "Usuarios", data.jugador1DocId));
                if (snapJ1.exists()) {
                    img1 = normalizarSourceImagen(snapJ1.data().imgperfil);
                }
            } catch (e) {}
        }
    }

    const nom1 = data.jugador1 || "Jugador 1";
    const nom2 = data.jugador2 || "Jugador 2";

    contenedorCabecera.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${img1}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${jugadorActualTurno === 1 ? '#4e54c8' : 'transparent'};" />
            <span style="font-weight: bold;">Jugador 1: ${nom1}</span>
        </div>
        <div style="font-weight: bold; font-size: 1.2rem;">VS</div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${img2}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${jugadorActualTurno === 2 ? '#4e54c8' : 'transparent'};" />
            <span style="font-weight: bold;">Jugador 2: ${nom2}</span>
        </div>
    `;
}

function renderizarTablero() {
    const tablero = document.getElementById("tablero-parejas");
    const infoTurno = document.getElementById("info-turno");
    if (!tablero) return;
    tablero.innerHTML = "";

    const soyTurno = (esJugador1 && jugadorActualTurno === 1) || (!esJugador1 && jugadorActualTurno === 2);
    const textoTuTurno = obtenerTextoTraduccion("tu_turno", "¡Es tu turno!");
    const textoTurnoJugador = obtenerTextoTraduccion("turno_jugador", "Turno del Jugador");
    infoTurno.textContent = soyTurno ? textoTuTurno : `${textoTurnoJugador} ${jugadorActualTurno}`;

    barajaPartida.forEach((simbolo, index) => {
        const carta = document.createElement("div");
        carta.classList.add("carta-pareja");
        carta.dataset.simbolo = simbolo;
        carta.dataset.index = index;
        carta.textContent = simbolo;

        carta.addEventListener("click", () => seleccionarCartaRemota(index));
        tablero.appendChild(carta);
    });
}

async function seleccionarCartaRemota(index) {
    if (bloqueadoTablero) return;
    const soyTurno = (esJugador1 && jugadorActualTurno === 1) || (!esJugador1 && jugadorActualTurno === 2);
    if (!soyTurno) {
        mostrarAvisoRapido(obtenerTextoTraduccion("no_es_tu_turno", "No es tu turno"));
        return;
    }

    const partidaRef = doc(db, "Partidas de Memoria", partidaIdActiva);
    const snap = await getDoc(partidaRef);
    if (!snap.exists()) return;
    const data = snap.data();

    const seleccionadasActuales = data.cartasSeleccionadas || [];
    if (seleccionadasActuales.length >= 2) return;
    if (seleccionadasActuales.includes(index)) return;
    if ((data.cartasEncontradas || []).includes(index)) return;

    const nuevasSeleccionadas = [...seleccionadasActuales, index];
    await updateDoc(partidaRef, { cartasSeleccionadas: nuevasSeleccionadas });
}

async function procesarVerificacionParejaRemota(data) {
    const seleccionadas = data.cartasSeleccionadas || [];
    if (seleccionadas.length !== 2) return;

    bloqueadoTablero = true;
    const [idx1, idx2] = seleccionadas;
    const s1 = barajaPartida[idx1];
    const s2 = barajaPartida[idx2];
    const partidaRef = doc(db, "Partidas de Memoria", partidaIdActiva);

    if (s1 === s2) {
        const encontradasActuales = data.cartasEncontradas || [];
        const nuevasEncontradas = [...encontradasActuales, idx1, idx2];
        const puntKey = jugadorActualTurno === 1 ? "puntuacion1" : "puntuacion2";
        const puntActual = (data[puntKey] || 0) + 1;

        await updateDoc(partidaRef, {
            cartasEncontradas: nuevasEncontradas,
            [puntKey]: puntActual,
            cartasSeleccionadas: []
        });
        bloqueadoTablero = false;

        if (nuevasEncontradas.length === barajaPartida.length) {
            if (esJugador1) {
                await finalizarPartidaLogica();
            }
        }
    } else {
        setTimeout(async () => {
            const turnoNuevo = jugadorActualTurno === 1 ? 2 : 1;
            await updateDoc(partidaRef, {
                cartasSeleccionadas: [],
                jugadorActualTurno: turnoNuevo
            });
            bloqueadoTablero = false;
        }, 1200);
    }
}

async function actualizarVisualesTablero(data) {
    if (data.baraja && Array.isArray(data.baraja) && data.baraja.length > 0) {
        // Solo renderizamos de nuevo si la baraja física local difiere para evitar recrear el DOM constantemente, 
        // o si las cartas no coinciden con las actuales.
        let barajaDifiere = barajaPartida.length !== data.baraja.length || barajaPartida.some((val, i) => val !== data.baraja[i]);
        if (barajaDifiere) {
            barajaPartida = data.baraja;
            renderizarTablero();
        }
    }

    const seleccionadas = data.cartasSeleccionadas || [];
    const encontradas = data.cartasEncontradas || [];
    const cartasDOM = document.querySelectorAll(".carta-pareja");

    cartasDOM.forEach((carta, idx) => {
        carta.classList.remove("volteada", "encontrada");
        if (encontradas.includes(idx)) {
            carta.classList.add("encontrada");
        } else if (seleccionadas.includes(idx)) {
            carta.classList.add("volteada");
        }
    });

    puntuaciones[1] = data.puntuacion1 || 0;
    puntuaciones[2] = data.puntuacion2 || 0;
    jugadorActualTurno = data.jugadorActualTurno || 1;

    await renderizarCabeceraJugadores(data);

    const infoTurno = document.getElementById("info-turno");
    if (infoTurno) {
        const soyTurno = (esJugador1 && jugadorActualTurno === 1) || (!esJugador1 && jugadorActualTurno === 2);
        const textoTuTurno = obtenerTextoTraduccion("tu_turno", "¡Es tu turno!");
        const textoTurnoJugador = obtenerTextoTraduccion("turno_jugador", "Turno del Jugador");
        infoTurno.textContent = `${soyTurno ? textoTuTurno : textoTurnoJugador + ' ' + jugadorActualTurno} (P1: ${puntuaciones[1]} | P2: ${puntuaciones[2]})`;
    }

    if (seleccionadas.length === 2 && !bloqueadoTablero) {
        if (esJugador1) {
            procesarVerificacionParejaRemota(data);
        }
    }
}

async function finalizarPartidaLogica() {
    if (!partidaIdActiva) return;
    const partidaRef = doc(db, "Partidas de Memoria", partidaIdActiva);
    const snap = await getDoc(partidaRef);
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.partida === "espera") return;

    const p1 = data.puntuacion1 || 0;
    const p2 = data.puntuacion2 || 0;
    let ganadorStr = "";
    if (p1 > p2) ganadorStr = `Jugador 1: ${data.jugador1}`;
    else if (p2 > p1) ganadorStr = `Jugador 2: ${data.jugador2}`;
    else ganadorStr = "Partida empatada";

    const npJ1 = p1 * 5;
    const npJ2 = p2 * 5;

    if (data.jugador1DocId && npJ1 > 0) {
        const idTx1 = await generarIdTransaccionMemoria(data.jugador1DocId);
        await setDoc(doc(db, "Usuarios", data.jugador1DocId, "Transacciones de NovaPoints", idTx1), {
            NovaPoints: npJ1,
            Memoria: npJ1,
            fecha: serverTimestamp(),
            modo: "1 amigo",
            parejasencontradas: p1,
            tipo: "suma"
        });
        const userRef1 = doc(db, "Usuarios", data.jugador1DocId);
        const userSnap1 = await getDoc(userRef1);
        if (userSnap1.exists()) {
            await updateDoc(userRef1, { NovaPoints: (userSnap1.data().NovaPoints || 0) + npJ1 });
        }
    }

    if (data.jugador2DocId && npJ2 > 0) {
        const idTx2 = await generarIdTransaccionMemoria(data.jugador2DocId);
        await setDoc(doc(db, "Usuarios", data.jugador2DocId, "Transacciones de NovaPoints", idTx2), {
            NovaPoints: npJ2,
            Memoria: npJ2,
            fecha: serverTimestamp(),
            modo: "1 amigo",
            parejasencontradas: p2,
            tipo: "suma"
        });
        const userRef2 = doc(db, "Usuarios", data.jugador2DocId);
        const userSnap2 = await getDoc(userRef2);
        if (userSnap2.exists()) {
            await updateDoc(userRef2, { NovaPoints: (userSnap2.data().NovaPoints || 0) + npJ2 });
        }
    }

    await updateDoc(partidaRef, {
        partida: "espera",
        fecha: arrayUnion(new Date()),
        ganador: arrayUnion(ganadorStr),
        parejasencontradasjugador1: arrayUnion(p1),
        parejasencontradasjugador2: arrayUnion(p2)
    });
}

function escucharPartida(partidaId) {
    if (unsubPartida) unsubPartida();

    const partidaRef = doc(db, "Partidas de Memoria", partidaId);
    unsubPartida = onSnapshot(partidaRef, async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        const menuAmigoVisible = document.getElementById("menu-amigo").style.display !== "none";
        const contenedorJuegoOculto = document.getElementById("contenedor-juego").style.display === "none";

        if ((data.jugador2 && (menuAmigoVisible || contenedorJuegoOculto)) && data.partida !== "espera" && data.partida !== "terminada") {
            document.getElementById("menu-amigo").style.display = "none";
            document.getElementById("contenedor-juego").style.display = "flex";
            if (data.baraja && Array.isArray(data.baraja)) {
                barajaPartida = data.baraja;
            }
            renderizarTablero();
        }

        if (data.partida === "espera") {
            await actualizarVisualesTablero(data);
            const p1 = data.puntuacion1 || 0;
            const p2 = data.puntuacion2 || 0;
            let tituloResultado = "";
            let mensajeResultado = "";

            if (p1 === p2) {
                tituloResultado = obtenerTextoTraduccion("partida_empatada", "Partida empatada");
                mensajeResultado = `${obtenerTextoTraduccion("ambos_encontraron", "Ambos encontraron")} ${p1} ${obtenerTextoTraduccion("parejas_texto", "parejas.")}`;
            } else {
                const ganadorNum = p1 > p2 ? 1 : 2;
                const nombreGanador = ganadorNum === 1 ? data.jugador1 : data.jugador2;
                tituloResultado = `${obtenerTextoTraduccion("ganador_jugador", "Ganador Jugador")} ${ganadorNum}: ${nombreGanador}`;
                mensajeResultado = `${ganadorNum === 1 ? data.jugador1 : data.jugador2} (${p1} vs ${p2})`;
            }

            if (data.peticion === "espera") {
                const quienPidioRevancha = data.usuarioPeticion || "";
                const soyQuienPidio = quienPidioRevancha === nombreUsuarioLogueado;

                if (soyQuienPidio) {
                    mostrarModal(
                        obtenerTextoTraduccion("revancha_titulo", "Revancha"), 
                        obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta..."), 
                        ""
                    );
                } else {
                    const numJRevancha = esJugador1 ? 2 : 1;
                    const nombreRevancha = esJugador1 ? data.jugador2 : data.jugador1;
                    const textoRevancha = obtenerTextoTraduccion("solicitud_revancha", "Solicitud de revancha");
                    const txtTurnoJ = obtenerTextoTraduccion("turno_jugador", "Turno del Jugador");
                    const msgRevancha = `${txtTurnoJ} ${numJRevancha}: ${nombreRevancha} ${obtenerTextoTraduccion("quiere_volver_jugar", "quiere volver a jugar")}`;
                    
                    const btnAceptarTxt = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
                    const btnRechazarTxt = obtenerTextoTraduccion("btn_rechazar", "Rechazar");

                    mostrarModal(textoRevancha, msgRevancha, `
                        <button type="button" id="btn-aceptar-revancha" class="btn-juego-custom" style="background: #a8e6cf;">${btnAceptarTxt}</button>
                        <button type="button" id="btn-rechazar-revancha" class="btn-juego-custom" style="background: #ff6b6b;">${btnRechazarTxt}</button>
                    `);

                    document.getElementById("btn-aceptar-revancha").addEventListener("click", async () => {
                        cerrarModal();
                        const simbolosBase = ["🍎", "🚗", "⭐", "⚽", "🐱", "🚀", "🎸", "🍕", "⚡", "🎨"];
                        let nuevaBaraja = [...simbolosBase, ...simbolosBase];
                        nuevaBaraja.sort(() => Math.random() - 0.5);

                        // AQUÍ ESTABA EL FALLO: Limpiábamos campos pero la nueva baraja NO se guardaba en Firestore, 
                        // provocando que los jugadores jugasen con barajas distintas o desincronizadas.
                        await updateDoc(partidaRef, {
                            peticion: deleteField(),
                            partida: deleteField(),
                            usuarioPeticion: deleteField(),
                            cartasEncontradas: [],
                            cartasSeleccionadas: [],
                            puntuacion1: 0,
                            puntuacion2: 0,
                            jugadorActualTurno: 1,
                            baraja: nuevaBaraja
                        });
                    });

                    document.getElementById("btn-rechazar-revancha").addEventListener("click", async () => {
                        cerrarModal();
                        await updateDoc(partidaRef, {
                            partida: "terminada",
                            peticion: "rechazada"
                        });
                        volverAlMenuAmigo();
                    });
                }
            } else if (data.peticion === "rechazada") {
                const numJRechazo = esJugador1 ? 2 : 1;
                const nombreRechazo = esJugador1 ? data.jugador2 : data.jugador1;
                const txtTurnoJ = obtenerTextoTraduccion("turno_jugador", "Turno del Jugador");
                const msgFin = `${txtTurnoJ} ${numJRechazo}: ${nombreRechazo} ${obtenerTextoTraduccion("ya_no_quiere_jugar", "ya no quiere o puede volver a jugar")}`;
                const btnCerrarTxt = obtenerTextoTraduccion("btn_cerrar", "Cerrar");

                mostrarModal(
                    obtenerTextoTraduccion("partida_finalizada", "Partida Finalizada"), 
                    msgFin, 
                    `<button type="button" id="btn-cerrar-final" class="btn-juego-custom">${btnCerrarTxt}</button>`
                );
                document.getElementById("btn-cerrar-final").addEventListener("click", () => {
                    cerrarModal();
                    volverAlMenuAmigo();
                });
            } else if (!data.peticion && !data.partida) {
                cerrarModal();
                renderizarTablero();
            } else {
                const btnCerrarTxt = obtenerTextoTraduccion("btn_cerrar", "Cerrar");
                const btnRevanchaTxt = obtenerTextoTraduccion("modal_btn_revancha", "Volver a jugar");

                mostrarModal(tituloResultado, mensajeResultado, `
                    <button type="button" id="modal-btn-cerrar" class="btn-juego-custom" style="background: #ff6b6b;">${btnCerrarTxt}</button>
                    <button type="button" id="modal-btn-revancha" class="btn-juego-custom" style="background: #a8e6cf;">${btnRevanchaTxt}</button>
                `);

                document.getElementById("modal-btn-cerrar").addEventListener("click", async () => {
                    cerrarModal();
                    await updateDoc(partidaRef, { partida: "terminada" });
                    volverAlMenuAmigo();
                });

                document.getElementById("modal-btn-revancha").addEventListener("click", async () => {
                    cerrarModal();
                    await updateDoc(partidaRef, {
                        peticion: "espera",
                        usuarioPeticion: nombreUsuarioLogueado
                    });
                    mostrarModal(
                        obtenerTextoTraduccion("revancha_titulo", "Revancha"), 
                        obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta..."), 
                        ""
                    );
                });
            }
        } else if (data.partida === "terminada") {
            const numJOtro = esJugador1 ? 2 : 1;
            const nombreOtro = esJugador1 ? data.jugador2 : data.jugador1;
            if (nombreOtro) {
                const txtTurnoJ = obtenerTextoTraduccion("turno_jugador", "Turno del Jugador");
                const msgTerminada = `${txtTurnoJ} ${numJOtro}: ${nombreOtro} ${obtenerTextoTraduccion("usuario_no_quiere_jugar_mas", "ya no quiere o puede jugar más")}`;
                const btnCerrarTxt = obtenerTextoTraduccion("btn_cerrar", "Cerrar");

                mostrarModal(
                    obtenerTextoTraduccion("aviso_titulo", "Aviso"), 
                    msgTerminada, 
                    `<button type="button" id="btn-cerrar-terminada" class="btn-juego-custom">${btnCerrarTxt}</button>`
                );
                document.getElementById("btn-cerrar-terminada").addEventListener("click", () => {
                    cerrarModal();
                    volverAlMenuAmigo();
                });
            }
        } else {
            cerrarModal();
            await actualizarVisualesTablero(data);
        }
    });
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

    const btnGenerarCodigo = document.getElementById("btn-generar-codigo");
    const btnTengoCodigo = document.getElementById("btn-tengo-codigo");
    const contenedorInputCodigo = document.getElementById("contenedor-input-codigo");
    const infoEsperaCodigo = document.getElementById("info-espera-codigo");
    const spanCodigoActivo = document.getElementById("span-codigo-activo");
    const btnUnirsePartida = document.getElementById("btn-unirse-partida");
    const inputCodigoPartida = document.getElementById("input-codigo-partida");

    if (btnGenerarCodigo) {
        btnGenerarCodigo.addEventListener("click", async () => {
            const nuevoIdDoc = await generarIdPartidaAmigo();
            const codigoInc = await generarCodigoIncremental();

            esJugador1 = true;
            codigoActualPartida = codigoInc;
            partidaIdActiva = nuevoIdDoc;

            const simbolosBase = ["🍎", "🚗", "⭐", "⚽", "🐱", "🚀", "🎸", "🍕", "⚡", "🎨"];
            let baraja = [...simbolosBase, ...simbolosBase];
            baraja.sort(() => Math.random() - 0.5);

            barajaPartida = baraja;

            await setDoc(doc(db, "Partidas de Memoria", nuevoIdDoc), {
                codigo: codigoInc,
                jugador1: nombreUsuarioLogueado,
                jugador1DocId: userDocIdGlobal,
                jugador2: "",
                jugador2DocId: "",
                fecha: [],
                ganador: [],
                parejasencontradasjugador1: [],
                parejasencontradasjugador2: [],
                cartasSeleccionadas: [],
                cartasEncontradas: [],
                puntuacion1: 0,
                puntuacion2: 0,
                jugadorActualTurno: 1,
                baraja: baraja
            });

            btnGenerarCodigo.style.display = "none";
            btnTengoCodigo.style.display = "none";
            spanCodigoActivo.textContent = codigoInc;
            infoEsperaCodigo.style.display = "block";

            escucharPartida(nuevoIdDoc);
        });
    }

    if (btnTengoCodigo) {
        btnTengoCodigo.addEventListener("click", () => {
            btnGenerarCodigo.style.display = "none";
            btnTengoCodigo.style.display = "none";
            contenedorInputCodigo.style.display = "flex";
        });
    }

    if (btnUnirsePartida) {
        btnUnirsePartida.addEventListener("click", async () => {
            const codigoIntroducido = inputCodigoPartida.value.trim();
            if (!codigoIntroducido) return;

            const qPartidas = query(collection(db, "Partidas de Memoria"), where("codigo", "==", codigoIntroducido));
            const snap = await getDocs(qPartidas);

            if (snap.empty) {
                mostrarModal(
                    obtenerTextoTraduccion("aviso_titulo", "Aviso"), 
                    obtenerTextoTraduccion("codigo_no_encontrado", "Código no encontrado o partida inexistente."), 
                    `<button type="button" id="btn-cerrar-error" class="btn-juego-custom">${obtenerTextoTraduccion("btn_cerrar", "Cerrar")}</button>`
                );
                document.getElementById("btn-cerrar-error").addEventListener("click", cerrarModal);
                return;
            }

            const docPartida = snap.docs[0];
            partidaIdActiva = docPartida.id;
            esJugador1 = false;
            codigoActualPartida = codigoIntroducido;

            const dataPartidaSnap = docPartida.data();
            if (dataPartidaSnap.baraja && Array.isArray(dataPartidaSnap.baraja)) {
                barajaPartida = dataPartidaSnap.baraja;
            }

            await updateDoc(doc(db, "Partidas de Memoria", partidaIdActiva), {
                jugador2: nombreUsuarioLogueado,
                jugador2DocId: userDocIdGlobal
            });

            contenedorInputCodigo.style.display = "none";
            document.getElementById("menu-amigo").style.display = "none";
            document.getElementById("contenedor-juego").style.display = "flex";

            renderizarTablero();
            escucharPartida(partidaIdActiva);
        });
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