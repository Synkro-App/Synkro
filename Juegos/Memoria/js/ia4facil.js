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
let juegoTerminado = false;

const iconosDisponibles = [
    "🍎", "🚗", "⭐", "🐶", "🐱", "🚀", "⚽", "🎵", "🎨", "🍕", 
    "⚡", "🔥", "🌟", "🧸", "🎈", "📚", "💡", "🌵", "⏰", "💎",
    "🌍", "👑", "🎯", "🎲", "🧩", "🔮", "🎧", "📷", "💻", "📚",
    "🌻", "🍀", "🍉", "🍓", "🍦", "🍪", "🍩", "🦄", "🐼", "🦊"
];

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_ia4_facil": { "es": "Memoria - Contra 4 IAs (Fácil)", "en": "Memory - Against 4 AIs (Easy)", "fr": "Mémoire - Contre 4 IAs (Facile)", "ro": "Memorie - Contra 4 IA (Ușor)" },
    "btn_reiniciar": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" },
    "turno_usuario": { "es": "Tu turno", "en": "Your turn", "fr": "Votre tour", "ro": "Rândul tău" },
    "turno_ia1": { "es": "Turno de la IA 1...", "en": "AI 1's turn...", "fr": "Tour de l'IA 1...", "ro": "Rândul IA 1..." },
    "turno_ia2": { "es": "Turno de la IA 2...", "en": "AI 2's turn...", "fr": "Tour de l'IA 2...", "ro": "Rândul IA 2..." },
    "turno_ia3": { "es": "Turno de la IA 3...", "en": "AI 3's turn...", "fr": "Tour de l'IA 3...", "ro": "Rândul IA 3..." },
    "turno_ia4": { "es": "Turno de la IA 4...", "en": "AI 4's turn...", "fr": "Tour de l'IA 4...", "ro": "Rândul IA 4..." }
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
    
    const tituloIa4Facil = document.getElementById("titulo-ia4-facil");
    if (tituloIa4Facil) tituloIa4Facil.textContent = obtenerTextoTraduccion("titulo_ia4_facil", "Memoria - Contra 4 IAs (Fácil)");

    const btnReiniciar = document.getElementById("btn-reiniciar");
    if (btnReiniciar) btnReiniciar.textContent = obtenerTextoTraduccion("btn_reiniciar", "Volver a jugar");

    actualizarIndicadorTurno();
}

let primeraCarta = null;
let segundaCarta = null;
let bloqueoTablero = false;
let parejasUsuario = 0;
let parejasIA1 = 0;
let parejasIA2 = 0;
let parejasIA3 = 0;
let parejasIA4 = 0;
const totalParejas = 40;
let turnoActual = "usuario";

function actualizarIndicadorTurno() {
    const indicador = document.getElementById("turn-indicator");
    if (!indicador || juegoTerminado) return;
    
    if (turnoActual === "usuario") {
        indicador.textContent = obtenerTextoTraduccion("turno_usuario", "Tu turno");
        indicador.style.backgroundColor = "rgba(0, 174, 255, 0.3)";
    } else if (turnoActual === "ia1") {
        indicador.textContent = obtenerTextoTraduccion("turno_ia1", "Turno de la IA 1...");
        indicador.style.backgroundColor = "rgba(255, 100, 100, 0.3)";
    } else if (turnoActual === "ia2") {
        indicador.textContent = obtenerTextoTraduccion("turno_ia2", "Turno de la IA 2...");
        indicador.style.backgroundColor = "rgba(255, 150, 50, 0.3)";
    } else if (turnoActual === "ia3") {
        indicador.textContent = obtenerTextoTraduccion("turno_ia3", "Turno de la IA 3...");
        indicador.style.backgroundColor = "rgba(200, 100, 255, 0.3)";
    } else if (turnoActual === "ia4") {
        indicador.textContent = obtenerTextoTraduccion("turno_ia4", "Turno de la IA 4...");
        indicador.style.backgroundColor = "rgba(100, 255, 150, 0.3)";
    }
}

function iniciarJuegoMemoria() {
    const tablero = document.getElementById("memory-board");
    const mensajeDiv = document.getElementById("game-message");
    const btnReiniciar = document.getElementById("btn-reiniciar");
    
    tablero.innerHTML = "";
    mensajeDiv.classList.add("hidden");
    btnReiniciar.classList.add("hidden");
    
    parejasUsuario = 0;
    parejasIA1 = 0;
    parejasIA2 = 0;
    parejasIA3 = 0;
    parejasIA4 = 0;
    
    primeraCarta = null;
    segundaCarta = null;
    bloqueoTablero = false;
    juegoTerminado = false;
    turnoActual = "usuario";

    actualizarIndicadorTurno();

    const iconosMezclados = [...iconosDisponibles].sort(() => 0.5 - Math.random());
    const seleccionados = iconosMezclados.slice(0, totalParejas);
    let cartasArray = [...seleccionados, ...seleccionados];

    cartasArray.sort(() => 0.5 - Math.random());

    cartasArray.forEach((icono) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("memory-card");
        tarjeta.dataset.icono = icono;
        tarjeta.addEventListener("click", () => {
            if (turnoActual === "usuario") {
                voltearCartaUsuario(tarjeta);
            }
        });
        tablero.appendChild(tarjeta);
    });
}

function voltearCartaUsuario(carta) {
    if (bloqueoTablero || juegoTerminado) return;
    if (carta === primeraCarta) return;
    if (carta.classList.contains("matched")) return;

    carta.classList.add("flipped");
    carta.textContent = carta.dataset.icono;

    if (!primeraCarta) {
        primeraCarta = carta;
        return;
    }

    segundaCarta = carta;
    comprobarParejaUsuario();
}

function comprobarParejaUsuario() {
    const esCoincidencia = primeraCarta.dataset.icono === segundaCarta.dataset.icono;

    if (esCoincidencia) {
        primeraCarta.classList.add("matched");
        segundaCarta.classList.add("matched");
        resetearSeleccionCartas();
        parejasUsuario++;

        if (totalParejasEncontradas() === totalParejas) {
            finalizarPartida();
        } else {
            actualizarIndicadorTurno();
        }
    } else {
        bloqueoTablero = true;
        setTimeout(() => {
            primeraCarta.classList.remove("flipped");
            primeraCarta.textContent = "";
            segundaCarta.classList.remove("flipped");
            segundaCarta.textContent = "";
            resetearSeleccionCartas();
            bloqueoTablero = false;

            turnoActual = "ia1";
            actualizarIndicadorTurno();
            setTimeout(ejecutarTurnoIA, 1000);
        }, 900);
    }
}

function resetearSeleccionCartas() {
    primeraCarta = null;
    segundaCarta = null;
}

function totalParejasEncontradas() {
    return parejasUsuario + parejasIA1 + parejasIA2 + parejasIA3 + parejasIA4;
}

function ejecutarTurnoIA() {
    if (juegoTerminado) return;

    const tablero = document.getElementById("memory-board");
    const cartasDisponibles = Array.from(tablero.children).filter(c => !c.classList.contains("matched") && !c.classList.contains("flipped"));

    if (cartasDisponibles.length < 2) {
        if (totalParejasEncontradas() < totalParejas) {
            turnoActual = "usuario";
            actualizarIndicadorTurno();
        }
        return;
    }

    cartasDisponibles.sort(() => 0.5 - Math.random());
    const carta1 = cartasDisponibles[0];
    const carta2 = cartasDisponibles[1];

    carta1.classList.add("flipped");
    carta1.textContent = carta1.dataset.icono;

    setTimeout(() => {
        if (juegoTerminado) return;
        carta2.classList.add("flipped");
        carta2.textContent = carta2.dataset.icono;

        setTimeout(() => {
            if (juegoTerminado) return;
            const esCoincidencia = carta1.dataset.icono === carta2.dataset.icono;
            const iaActual = turnoActual;

            if (esCoincidencia) {
                carta1.classList.add("matched");
                carta2.classList.add("matched");
                
                if (iaActual === "ia1") parejasIA1++;
                else if (iaActual === "ia2") parejasIA2++;
                else if (iaActual === "ia3") parejasIA3++;
                else if (iaActual === "ia4") parejasIA4++;

                if (totalParejasEncontradas() === totalParejas) {
                    finalizarPartida();
                } else {
                    setTimeout(ejecutarTurnoIA, 1000);
                }
            } else {
                carta1.classList.remove("flipped");
                carta1.textContent = "";
                carta2.classList.remove("flipped");
                carta2.textContent = "";

                if (iaActual === "ia1") {
                    turnoActual = "ia2";
                } else if (iaActual === "ia2") {
                    turnoActual = "ia3";
                } else if (iaActual === "ia3") {
                    turnoActual = "ia4";
                } else {
                    turnoActual = "usuario";
                }
                
                actualizarIndicadorTurno();
                if (turnoActual !== "usuario") {
                    setTimeout(ejecutarTurnoIA, 1000);
                }
            }
        }, 1000);
    }, 800);
}

async function finalizarPartida() {
    juegoTerminado = true;
    const mensajeDiv = document.getElementById("game-message");
    const btnReiniciar = document.getElementById("btn-reiniciar");
    const indicador = document.getElementById("turn-indicator");

    if (indicador) indicador.classList.add("hidden");

    const totalNovaPointsGanados = parejasUsuario * 5;
    if (totalNovaPointsGanados > 0) {
        novasActuales += totalNovaPointsGanados;
        const txtNovas = document.getElementById("user-novas");
        if (txtNovas) txtNovas.textContent = novasActuales;
    }

    let textoResultado = "";
    if (currentLanguage === "en") {
        textoResultado = `Game over! You: ${parejasUsuario} | IA 1: ${parejasIA1} | IA 2: ${parejasIA2} | IA 3: ${parejasIA3} | IA 4: ${parejasIA4}`;
    } else {
        textoResultado = `¡Partida finalizada! Usuario: ${parejasUsuario} - IA 1: ${parejasIA1} - IA 2: ${parejasIA2} - IA 3: ${parejasIA3} - IA 4: ${parejasIA4}`;
    }

    mensajeDiv.textContent = textoResultado;
    mensajeDiv.classList.remove("hidden");
    btnReiniciar.classList.remove("hidden");

    if (userDocIdGlobal) {
        try {
            const usuarioRef = doc(db, "Usuarios", userDocIdGlobal);
            await updateDoc(usuarioRef, { NovaPoints: novasActuales });

            const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
            const querySnapshot = await getDocs(transaccionesRef);
            
            let contador = 1;
            querySnapshot.forEach((docSnap) => {
                if (docSnap.id.startsWith("memoria")) {
                    const numeroStr = docSnap.id.replace("memoria", "");
                    const num = parseInt(numeroStr, 10);
                    if (!isNaN(num) && num >= contador) {
                        contador = num + 1;
                    }
                }
            });

            const nuevoIdDoc = `memoria${contador}`;
            const nuevoDocRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdDoc);
            
            await setDoc(nuevoDocRef, {
                NovaPoints: totalNovaPointsGanados,
                donde: "Memoria",
                fecha: serverTimestamp(),
                modo: "ia 4 jugadores fácil",
                parejasencontradas: parejasUsuario,
                tipo: "suma"
            });
        } catch (error) {
            console.error("Error al registrar los NovaPoints finales:", error);
        }
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
    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "../../index.html";
        return;
    }

    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) filaPerfil.addEventListener("click", () => { window.location.href = "../../Perfil.html"; });

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) filaNovas.addEventListener("click", () => { window.location.href = "../../NovaPoints.html"; });

    const btnReiniciar = document.getElementById("btn-reiniciar");
    if (btnReiniciar) {
        btnReiniciar.addEventListener("click", iniciarJuegoMemoria);
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

    iniciarJuegoMemoria();

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