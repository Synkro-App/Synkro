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
let numeroJugadorAsignado = 0; // 1, 2, 3, 4 o 5
let codigoActualPartida = "";

let jugadorActualTurno = 1; 
let puntuaciones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
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
    "titulo_sala": { "es": "Sala Amigo - Memoria 5 Jugadores", "en": "Friend Room - 5 Players Memory", "fr": "Salle Amie - Mémoire 5 Joueurs", "ro": "Cameră Prieten - Memorie 5 Jucători" },
    "placeholder_codigo": { "es": "Introduce el código...", "en": "Enter the code...", "fr": "Entrez le code...", "ro": "Introduceți codul..." },
    "btn_unirse": { "es": "Unirse", "en": "Join", "fr": "Rejoindre", "ro": "Alătură-te" },
    "txt_codigo_generado": { "es": "Código generado:", "en": "Generated code:", "fr": "Code généré:", "ro": "Cod generat:" },
    "txt_esperando_jugadores": { "es": "Esperando jugadores", "en": "Waiting for players", "fr": "En attente de joueurs", "ro": "Se așteaptă jucători" },
    "preparando_partida": { "es": "Preparando partida...", "en": "Preparing match...", "fr": "Préparation du match...", "ro": "Pregătirea meciului..." },
    "aviso_titulo": { "es": "Aviso", "en": "Notice", "fr": "Avis", "ro": "Notificare" },
    "codigo_no_encontrado": { "es": "Código no encontrado o partida inexistente.", "en": "Code not found or non-existent match.", "fr": "Code introuvable ou match inexistant.", "ro": "Codul nu a fost găsit sau meciul nu există." },
    "sala_llena": { "es": "La sala ya está completa.", "en": "The room is already full.", "fr": "La salle est déjà pleine.", "ro": "Camera este deja plină." },
    "tu_turno": { "es": "¡Es tu turno!", "en": "It's your turn!", "fr": "C'est votre tour !", "ro": "Este rândul tău!" },
    "turno_jugador": { "es": "Turno del Jugador", "en": "Player's turn", "fr": "Tour du Joueur", "ro": "Rândul Jucătorului" },
    "no_es_tu_turno": { "es": "No es tu turno", "en": "It's not your turn", "fr": "Ce n'est pas votre tour", "ro": "Nu este rândul tău" },
    "revancha_titulo": { "es": "Revancha", "en": "Rematch", "fr": "Revanche", "ro": "Revanșă" },
    "esperando_respuesta": { "es": "Esperando respuesta...", "en": "Waiting for response...", "fr": "En attente de réponse...", "ro": "Se așteaptă răspunsul..." },
    "solicitud_revancha": { "es": "Solicitud de revancha", "en": "Rematch request", "fr": "Demande de revanche", "ro": "Cerere de revanșă" },
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
    if (tituloSala) tituloSala.textContent = obtenerTextoTraduccion("titulo_sala", "Sala Amigo - Memoria 5 Jugadores");

    const inputCodigo = document.getElementById("input-codigo-partida");
    if (inputCodigo) inputCodigo.placeholder = obtenerTextoTraduccion("placeholder_codigo", "Introduce el código...");

    const btnUnirse = document.getElementById("btn-unirse-partida");
    if (btnUnirse) btnUnirse.textContent = obtenerTextoTraduccion("btn_unirse", "Unirse");

    const txtGen = document.getElementById("txt-codigo-generado");
    if (txtGen) txtGen.textContent = obtenerTextoTraduccion("txt_codigo_generado", "Código generado:");

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
        if (id.startsWith("sala4amigos")) { // Conservamos nomenclatura o extendemos
            const numStr = id.replace("sala4amigos", "");
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `sala4amigos${maxNum + 1}`;
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
    numeroJugadorAsignado = 0;
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
        contenedorCabecera.style.cssText = "display: flex; justify-content: space-around; align-items: center; margin-bottom: 15px; width: 100%; max-width: 650px; flex-wrap: wrap; gap: 8px;";
        const infoTurno = document.getElementById("info-turno");
        if (infoTurno && infoTurno.parentNode) {
            infoTurno.parentNode.insertBefore(contenedorCabecera, infoTurno);
        }
    }

    let imgs = ["../../default-profile.png", "../../default-profile.png", "../../default-profile.png", "../../default-profile.png", "../../default-profile.png"];
    let docIds = [data.jugador1DocId, data.jugador2DocId, data.jugador3DocId, data.jugador4DocId, data.jugador5DocId];

    for (let i = 0; i < 5; i++) {
        if (docIds[i]) {
            if (docIds[i] === userDocIdGlobal) {
                imgs[i] = avatarUsuarioGlobal;
            } else {
                try {
                    const snap = await getDoc(doc(db, "Usuarios", docIds[i]));
                    if (snap.exists()) imgs[i] = normalizarSourceImagen(snap.data().imgperfil);
                } catch (e) {}
            }
        }
    }

    const noms = [
        data.jugador1 || "J1",
        data.jugador2 || "J2",
        data.jugador3 || "J3",
        data.jugador4 || "J4",
        data.jugador5 || "J5"
    ];

    contenedorCabecera.innerHTML = `
        <div style="display: flex; align-items: center; gap: 3px;">
            <img src="${imgs[0]}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid ${jugadorActualTurno === 1 ? '#4e54c8' : 'transparent'};" />
            <span style="font-size: 0.7rem; font-weight: bold;">J1: ${noms[0]}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 3px;">
            <img src="${imgs[1]}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid ${jugadorActualTurno === 2 ? '#4e54c8' : 'transparent'};" />
            <span style="font-size: 0.7rem; font-weight: bold;">J2: ${noms[1]}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 3px;">
            <img src="${imgs[2]}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid ${jugadorActualTurno === 3 ? '#4e54c8' : 'transparent'};" />
            <span style="font-size: 0.7rem; font-weight: bold;">J3: ${noms[2]}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 3px;">
            <img src="${imgs[3]}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid ${jugadorActualTurno === 4 ? '#4e54c8' : 'transparent'};" />
            <span style="font-size: 0.7rem; font-weight: bold;">J4: ${noms[3]}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 3px;">
            <img src="${imgs[4]}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover; border: 2px solid ${jugadorActualTurno === 5 ? '#4e54c8' : 'transparent'};" />
            <span style="font-size: 0.7rem; font-weight: bold;">J5: ${noms[4]}</span>
        </div>
    `;
}

function renderizarTablero() {
    const tablero = document.getElementById("tablero-parejas");
    const infoTurno = document.getElementById("info-turno");
    if (!tablero) return;
    tablero.innerHTML = "";

    const soyTurno = numeroJugadorAsignado === jugadorActualTurno;
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
    const soyTurno = numeroJugadorAsignado === jugadorActualTurno;
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
        const puntKey = `puntuacion${jugadorActualTurno}`;
        const puntActual = (data[puntKey] || 0) + 1;

        await updateDoc(partidaRef, {
            cartasEncontradas: nuevasEncontradas,
            [puntKey]: puntActual,
            cartasSeleccionadas: []
        });
        bloqueadoTablero = false;

        if (nuevasEncontradas.length === barajaPartida.length) {
            if (numeroJugadorAsignado === 1) {
                await finalizarPartidaLogica();
            }
        }
    } else {
        setTimeout(async () => {
            let turnoNuevo = jugadorActualTurno + 1;
            if (turnoNuevo > 5) turnoNuevo = 1;
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
    puntuaciones[3] = data.puntuacion3 || 0;
    puntuaciones[4] = data.puntuacion4 || 0;
    puntuaciones[5] = data.puntuacion5 || 0;
    jugadorActualTurno = data.jugadorActualTurno || 1;

    await renderizarCabeceraJugadores(data);

    const infoTurno = document.getElementById("info-turno");
    if (infoTurno) {
        const soyTurno = numeroJugadorAsignado === jugadorActualTurno;
        const textoTuTurno = obtenerTextoTraduccion("tu_turno", "¡Es tu turno!");
        const textoTurnoJugador = obtenerTextoTraduccion("turno_jugador", "Turno del Jugador");
        infoTurno.textContent = `${soyTurno ? textoTuTurno : textoTurnoJugador + ' ' + jugadorActualTurno} (P1: ${puntuaciones[1]} | P2: ${puntuaciones[2]} | P3: ${puntuaciones[3]} | P4: ${puntuaciones[4]} | P5: ${puntuaciones[5]})`;
    }

    if (seleccionadas.length === 2 && !bloqueadoTablero) {
        if (numeroJugadorAsignado === 1) {
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
    if (data.partida === "espera" || data.partida === "fin") return;

    const p1 = data.puntuacion1 || 0;
    const p2 = data.puntuacion2 || 0;
    const p3 = data.puntuacion3 || 0;
    const p4 = data.puntuacion4 || 0;
    const p5 = data.puntuacion5 || 0;

    let maxP = Math.max(p1, p2, p3, p4, p5);
    let ganadores = [];
    if (p1 === maxP) ganadores.push(`Jugador 1: ${data.jugador1}`);
    if (p2 === maxP) ganadores.push(`Jugador 2: ${data.jugador2}`);
    if (p3 === maxP) ganadores.push(`Jugador 3: ${data.jugador3}`);
    if (p4 === maxP) ganadores.push(`Jugador 4: ${data.jugador4}`);
    if (p5 === maxP) ganadores.push(`Jugador 5: ${data.jugador5}`);

    let ganadorStr = ganadores.length > 1 ? `Empate entre: ${ganadores.join(", ")}` : `Ganador: ${ganadores[0]}`;

    const npJ1 = p1 * 5;
    const npJ2 = p2 * 5;
    const npJ3 = p3 * 5;
    const npJ4 = p4 * 5;
    const npJ5 = p5 * 5;

    const actualizarJugadorRewards = async (docId, npVal, pVal) => {
        if (!docId || npVal <= 0) return;
        const idTx = await generarIdTransaccionMemoria(docId);
        await setDoc(doc(db, "Usuarios", docId, "Transacciones de NovaPoints", idTx), {
            NovaPoints: npVal,
            Memoria: npVal,
            fecha: serverTimestamp(),
            modo: "con 4 amigos",
            parejasencontradas: pVal,
            tipo: "suma"
        });
        const userRef = doc(db, "Usuarios", docId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            await updateDoc(userRef, { NovaPoints: (userSnap.data().NovaPoints || 0) + npVal });
        }
    };

    await actualizarJugadorRewards(data.jugador1DocId, npJ1, p1);
    await actualizarJugadorRewards(data.jugador2DocId, npJ2, p2);
    await actualizarJugadorRewards(data.jugador3DocId, npJ3, p3);
    await actualizarJugadorRewards(data.jugador4DocId, npJ4, p4);
    await actualizarJugadorRewards(data.jugador5DocId, npJ5, p5);

    await updateDoc(partidaRef, {
        partida: "fin",
        fecha: arrayUnion(new Date()),
        ganador: arrayUnion(ganadorStr),
        parejasencontradasjugador1: arrayUnion(p1),
        parejasencontradasjugador2: arrayUnion(p2),
        parejasencontradasjugador3: arrayUnion(p3),
        parejasencontradasjugador4: arrayUnion(p4),
        parejasencontradasjugador5: arrayUnion(p5),
        ganadorTextoUltimo: ganadorStr
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

        const salaCompleta = data.jugador1 && data.jugador2 && data.jugador3 && data.jugador4 && data.jugador5;

        if ((salaCompleta && (menuAmigoVisible || contenedorJuegoOculto)) && data.partida !== "fin" && data.partida !== "espera" && data.partida !== "terminada") {
            document.getElementById("menu-amigo").style.display = "none";
            document.getElementById("contenedor-juego").style.display = "flex";
            if (data.baraja && Array.isArray(data.baraja)) {
                barajaPartida = data.baraja;
            }
            renderizarTablero();
        } else if (menuAmigoVisible && numeroJugadorAsignado === 1) {
            const txtEsp = document.getElementById("txt-esperando-jugador");
            if (txtEsp) {
                let count = 1;
                if (data.jugador2) count++;
                if (data.jugador3) count++;
                if (data.jugador4) count++;
                if (data.jugador5) count++;
                txtEsp.textContent = `Esperando jugadores (${count}/5)...`;
            }
        }

        if (data.partida === "fin") {
            await actualizarVisualesTablero(data);
            const p1 = data.puntuacion1 || 0;
            const p2 = data.puntuacion2 || 0;
            const p3 = data.puntuacion3 || 0;
            const p4 = data.puntuacion4 || 0;
            const p5 = data.puntuacion5 || 0;
            
            let tituloResultado = "Resultado de la Partida";
            let mensajeResultado = `${data.ganadorTextoUltimo || "Partida finalizada"} (P1: ${p1} | P2: ${p2} | P3: ${p3} | P4: ${p4} | P5: ${p5})`;

            const btnCerrarTxt = obtenerTextoTraduccion("btn_cerrar", "Cerrar");
            const btnRevanchaTxt = obtenerTextoTraduccion("modal_btn_revancha", "Volver a jugar");

            mostrarModal(tituloResultado, mensajeResultado, `
                <button type="button" id="modal-btn-cerrar" class="btn-juego-custom" style="background: #ff6b6b;">${btnCerrarTxt}</button>
                <button type="button" id="modal-btn-revancha" class="btn-juego-custom" style="background: #a8e6cf;">${btnRevanchaTxt}</button>
            `);

            const btnModalCerrar = document.getElementById("modal-btn-cerrar");
            if (btnModalCerrar) {
                btnModalCerrar.onclick = async () => {
                    cerrarModal();
                    await updateDoc(partidaRef, { partida: "terminada" });
                    volverAlMenuAmigo();
                };
            }

            const btnModalRevancha = document.getElementById("modal-btn-revancha");
            if (btnModalRevancha) {
                btnModalRevancha.onclick = async () => {
                    cerrarModal();
                    const nuevaListaAceptados = [nombreUsuarioLogueado];
                    await updateDoc(partidaRef, {
                        partida: "espera",
                        peticion: "espera",
                        revanchaAceptada: nuevaListaAceptados,
                        revanchaRechazada: []
                    });
                    mostrarModal(
                        obtenerTextoTraduccion("revancha_titulo", "Revancha"), 
                        obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta..."), 
                        ""
                    );
                };
            }
        } else if (data.partida === "espera") {
            await actualizarVisualesTablero(data);
            const listaAceptados = data.revanchaAceptada || [];
            const listaRechazados = data.revanchaRechazada || [];
            const yaAcepteYo = listaAceptados.includes(nombreUsuarioLogueado);
            const yaRechaceYo = listaRechazados.includes(nombreUsuarioLogueado);

            if (yaAcepteYo || yaRechaceYo) {
                mostrarModal(
                    obtenerTextoTraduccion("revancha_titulo", "Revancha"), 
                    obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta..."), 
                    ""
                );
            } else {
                const textoRevancha = obtenerTextoTraduccion("solicitud_revancha", "Solicitud de revancha");
                const msgRevancha = `¡Alguien quiere revancha! ¿Aceptas volver a jugar?`;
                
                const btnAceptarTxt = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
                const btnRechazarTxt = obtenerTextoTraduccion("btn_rechazar", "Rechazar");

                mostrarModal(textoRevancha, msgRevancha, `
                    <button type="button" id="btn-aceptar-revancha" class="btn-juego-custom" style="background: #a8e6cf;">${btnAceptarTxt}</button>
                    <button type="button" id="btn-rechazar-revancha" class="btn-juego-custom" style="background: #ff6b6b;">${btnRechazarTxt}</button>
                `);

                const btnAceptarRev = document.getElementById("btn-aceptar-revancha");
                if (btnAceptarRev) {
                    btnAceptarRev.onclick = async () => {
                        cerrarModal();
                        
                        const docActualizado = await getDoc(partidaRef);
                        const dataActual = docActualizado.data();
                        const aceptadosActuales = dataActual.revanchaAceptada || [];

                        if (!aceptadosActuales.includes(nombreUsuarioLogueado)) {
                            aceptadosActuales.push(nombreUsuarioLogueado);
                        }

                        // ¡Exigencia de los 5 en total! Deben aceptar los 5 jugadores obligatoriamente para reiniciar.
                        if (aceptadosActuales.length >= 5) {
                            const listaEmojisBase = ["🍎", "🚗", "⭐", "⚽", "🐱", "🚀", "🎸", "🍕", "⚡", "🎨", "🧸", "🎈", "🏀", "🍪", "☁️", "☀️", "🌕", "💎", "🔥", "🍀", "🍓", "🍉", "🍒", "🍍", "🥝", "🥑", "🥕", "🌽", "🍔", "🍿", "🍩", "🧁", "🎂", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉"];
                            let emojisMezclados = [...listaEmojisBase].sort(() => Math.random() - 0.5);
                            let simbolosSeleccionados = emojisMezclados.slice(0, 40); // 40 parejas
                            let nuevaBaraja = [...simbolosSeleccionados, ...simbolosSeleccionados];
                            nuevaBaraja.sort(() => Math.random() - 0.5);

                            await updateDoc(partidaRef, {
                                peticion: deleteField(),
                                partida: deleteField(),
                                revanchaAceptada: [],
                                revanchaRechazada: [],
                                cartasEncontradas: [],
                                cartasSeleccionadas: [],
                                puntuacion1: 0,
                                puntuacion2: 0,
                                puntuacion3: 0,
                                puntuacion4: 0,
                                puntuacion5: 0,
                                jugadorActualTurno: 1,
                                baraja: nuevaBaraja,
                                ganadorTextoUltimo: deleteField()
                            });
                        } else {
                            await updateDoc(partidaRef, {
                                revanchaAceptada: aceptadosActuales
                            });
                            mostrarModal(
                                obtenerTextoTraduccion("revancha_titulo", "Revancha"), 
                                obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta..."), 
                                ""
                            );
                        }
                    };
                }

                const btnRechazarRev = document.getElementById("btn-rechazar-revancha");
                if (btnRechazarRev) {
                    btnRechazarRev.onclick = async () => {
                        cerrarModal();
                        
                        const docActualizado = await getDoc(partidaRef);
                        const dataActual = docActualizado.data();
                        const rechazadosActuales = dataActual.revanchaRechazada || [];

                        if (!rechazadosActuales.includes(nombreUsuarioLogueado)) {
                            rechazadosActuales.push(nombreUsuarioLogueado);
                        }

                        // Con que uno solo rechace, se termina de inmediato para todos
                        await updateDoc(partidaRef, {
                            partida: "terminada",
                            peticion: "rechazada",
                            revanchaRechazada: rechazadosActuales
                        });
                        volverAlMenuAmigo();
                    };
                }
            }
        } else if (data.peticion === "rechazada") {
            const msgFin = obtenerTextoTraduccion("ya_no_quiere_jugar", "ya no quiere o puede volver a jugar");
            const btnCerrarTxt = obtenerTextoTraduccion("btn_cerrar", "Cerrar");

            mostrarModal(
                obtenerTextoTraduccion("partida_finalizada", "Partida Finalizada"), 
                msgFin, 
                `<button type="button" id="btn-cerrar-final" class="btn-juego-custom">${btnCerrarTxt}</button>`
            );
            const btnCerrarFinal = document.getElementById("btn-cerrar-final");
            if (btnCerrarFinal) {
                btnCerrarFinal.onclick = () => {
                    cerrarModal();
                    volverAlMenuAmigo();
                };
            }
        } else if (data.partida === "terminada") {
            const msgTerminada = obtenerTextoTraduccion("usuario_no_quiere_jugar_mas", "ya no quiere o puede jugar más");
            const btnCerrarTxt = obtenerTextoTraduccion("btn_cerrar", "Cerrar");

            mostrarModal(
                obtenerTextoTraduccion("aviso_titulo", "Aviso"), 
                msgTerminada, 
                `<button type="button" id="btn-cerrar-terminada" class="btn-juego-custom">${btnCerrarTxt}</button>`
            );
            const btnCerrarTerminada = document.getElementById("btn-cerrar-terminada");
            if (btnCerrarTerminada) {
                btnCerrarTerminada.onclick = () => {
                    cerrarModal();
                    volverAlMenuAmigo();
                };
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

            numeroJugadorAsignado = 1;
            codigoActualPartida = codigoInc;
            partidaIdActiva = nuevoIdDoc;

            const listaEmojisBase = ["🍎", "🚗", "⭐", "⚽", "🐱", "🚀", "🎸", "🍕", "⚡", "🎨", "🧸", "🎈", "🏀", "🍪", "☁️", "☀️", "🌕", "💎", "🔥", "🍀", "🍓", "🍉", "🍒", "🍍", "🥝", "🥑", "🥕", "🌽", "🍔", "🍿", "🍩", "🧁", "🎂", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉"];
            let emojisMezclados = [...listaEmojisBase].sort(() => Math.random() - 0.5);
            let simbolosSeleccionados = emojisMezclados.slice(0, 40); // 40 parejas
            let baraja = [...simbolosSeleccionados, ...simbolosSeleccionados];
            baraja.sort(() => Math.random() - 0.5);

            barajaPartida = baraja;

            await setDoc(doc(db, "Partidas de Memoria", nuevoIdDoc), {
                codigo: codigoInc,
                modo: "5 amigos",
                jugador1: nombreUsuarioLogueado,
                jugador1DocId: userDocIdGlobal,
                jugador2: "",
                jugador2DocId: "",
                jugador3: "",
                jugador3DocId: "",
                jugador4: "",
                jugador4DocId: "",
                jugador5: "",
                jugador5DocId: "",
                fecha: [],
                ganador: [],
                parejasencontradasjugador1: [],
                parejasencontradasjugador2: [],
                parejasencontradasjugador3: [],
                parejasencontradasjugador4: [],
                parejasencontradasjugador5: [],
                cartasSeleccionadas: [],
                cartasEncontradas: [],
                puntuacion1: 0,
                puntuacion2: 0,
                puntuacion3: 0,
                puntuacion4: 0,
                puntuacion5: 0,
                jugadorActualTurno: 1,
                baraja: baraja,
                revanchaAceptada: [],
                revanchaRechazada: []
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
                const btnCerrarError = document.getElementById("btn-cerrar-error");
                if (btnCerrarError) btnCerrarError.onclick = cerrarModal;
                return;
            }

            const docPartida = snap.docs[0];
            partidaIdActiva = docPartida.id;
            codigoActualPartida = codigoIntroducido;

            const dataPartidaSnap = docPartida.data();

            let camposActualizar = {};
            if (!dataPartidaSnap.jugador2) {
                numeroJugadorAsignado = 2;
                camposActualizar = {
                    jugador2: nombreUsuarioLogueado,
                    jugador2DocId: userDocIdGlobal
                };
            } else if (!dataPartidaSnap.jugador3) {
                numeroJugadorAsignado = 3;
                camposActualizar = {
                    jugador3: nombreUsuarioLogueado,
                    jugador3DocId: userDocIdGlobal
                };
            } else if (!dataPartidaSnap.jugador4) {
                numeroJugadorAsignado = 4;
                camposActualizar = {
                    jugador4: nombreUsuarioLogueado,
                    jugador4DocId: userDocIdGlobal
                };
            } else if (!dataPartidaSnap.jugador5) {
                numeroJugadorAsignado = 5;
                camposActualizar = {
                    jugador5: nombreUsuarioLogueado,
                    jugador5DocId: userDocIdGlobal
                };
            } else {
                mostrarModal(
                    obtenerTextoTraduccion("aviso_titulo", "Aviso"), 
                    obtenerTextoTraduccion("sala_llena", "La sala ya está completa."), 
                    `<button type="button" id="btn-cerrar-llena" class="btn-juego-custom">${obtenerTextoTraduccion("btn_cerrar", "Cerrar")}</button>`
                );
                const btnCerrarLlena = document.getElementById("btn-cerrar-llena");
                if (btnCerrarLlena) btnCerrarLlena.onclick = cerrarModal;
                return;
            }

            if (dataPartidaSnap.baraja && Array.isArray(dataPartidaSnap.baraja)) {
                barajaPartida = dataPartidaSnap.baraja;
            }

            await updateDoc(doc(db, "Partidas de Memoria", partidaIdActiva), camposActualizar);

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