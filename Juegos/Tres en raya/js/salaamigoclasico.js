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
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

// Credenciales oficiales reales
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

// Variables de estado de la partida de amigo clásico
let codigoPartidaActual = null;
let docPartidaIdGlobal = null;
let esJugador1 = false;
let tableroClasico = ["", "", "", "", "", "", "", "", ""];
let partidaActiva = false;
let turnoActualSimbolo = "X"; // X para jugador1, O para jugador2

// Diccionario local de fallback para traducciones de esta vista
const traduccionesLocales = {
    "titulo_sala_amigo_clasico": {
        "es": "Sala Amigo - Clásico",
        "en": "Friend Room - Classic",
        "fr": "Salon Ami - Classique",
        "ro": "Cameră Prieten - Clasic"
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
    }
};

// --- FUNCIÓN PARA FORMATEAR IMÁGENES BASE64 O URL ---
function normalizarSourceImagen(cadenaImagen) {
    if (!cadenaImagen) return "../../default-profile.png";
    
    const str = cadenaImagen.trim();
    if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:") || str.startsWith("../") || str.startsWith("./")) {
        return str;
    }
    
    return `data:image/jpeg;base64,${str}`;
}

// --- CÁLCULO RIGUROSO DE EDAD ---
function calcularEdadCompleta(fechaNacimientoStr) {
    if (!fechaNacimientoStr) return 0;
    
    let ano, mes, dia;
    if (fechaNacimientoStr.includes("-")) {
        const partes = fechaNacimientoStr.split("-");
        if (partes[0].length === 4) { // YYYY-MM-DD
            ano = parseInt(partes[0], 10);
            mes = parseInt(partes[1], 10) - 1;
            dia = parseInt(partes[2], 10);
        } else { // DD-MM-YYYY
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
        lblTitulo.textContent = obtenerTextoTraduccion("titulo_sala_amigo_clasico", "Sala Amigo - Clásico");
    }
}

// --- LÓGICA DE GESTIÓN DE CÓDIGOS Y SALA ---
async function iniciarFlujoSalaAmigo() {
    const contenedorJuego = document.getElementById("contenedor-juego");
    if (!contenedorJuego) return;

    contenedorJuego.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%; text-align: center;">
            <p style="font-size: 1.2rem; font-weight: bold;">¿Tienes un código de sala o prefieres generar uno nuevo?</p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button id="btn-opcion-tiene" class="btn-default" style="background-color: #1e90ff; color: #ffffff;">Tengo un código</button>
                <button id="btn-opcion-generar" class="btn-default" style="background-color: #32cd32; color: #ffffff;">Generar código</button>
            </div>
            <div id="contenedor-dinamico-accion" style="width: 100%; margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px;"></div>
        </div>
    `;

    document.getElementById("btn-opcion-tiene").addEventListener("click", () => {
        const divDinamico = document.getElementById("contenedor-dinamico-accion");
        divDinamico.innerHTML = `
            <input type="text" id="input-codigo-ingresado" placeholder="Introduce el código (ej. 0000000000)" maxlength="10" style="padding: 10px; font-size: 1rem; border-radius: 5px; border: 1px solid #000; width: 250px; text-align: center;">
            <button id="btn-unirse-sala" class="btn-default" style="background-color: #ff4500; color: #fff;">Unirse a la partida</button>
        `;

        document.getElementById("btn-unirse-sala").addEventListener("click", async () => {
            const codigoInput = document.getElementById("input-codigo-ingresado").value.trim();
            if (codigoInput.length !== 10) {
                alert("El código debe tener exactamente 10 dígitos.");
                return;
            }
            await unirsePartidaConCodigo(codigoInput);
        });
    });

    document.getElementById("btn-opcion-generar").addEventListener("click", async () => {
        await generarNuevoCodigoPartida();
    });
}

async function generarNuevoCodigoPartida() {
    try {
        const partidasRef = collection(db, "Partidas tres en raya");
        const snapshot = await getDocs(partidasRef);

        let maxIdNum = 0;
        let listaCodigosExistentes = [];

        snapshot.forEach((documento) => {
            const idDoc = documento.id;
            if (idDoc.startsWith("amigoclasico")) {
                const numStr = idDoc.replace("amigoclasico", "");
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxIdNum) {
                    maxIdNum = num;
                }
                const data = documento.data();
                if (data.enuso === true && data.codigo) {
                    listaCodigosExistentes.push(data.codigo);
                }
            }
        });

        // Generar código incremental de 10 dígitos que no esté en uso
        let nuevoCodigoStr = "0000000000";
        let contadorGeneracion = 0;

        while (contadorGeneracion <= 999999999) {
            nuevoCodigoStr = String(contadorGeneracion).padStart(10, '0');
            if (!listaCodigosExistentes.includes(nuevoCodigoStr)) {
                break;
            }
            contadorGeneracion++;
        }

        const nuevoIdDoc = `amigoclasico${maxIdNum + 1}`;
        const nuevaPartidaRef = doc(db, "Partidas tres en raya", nuevoIdDoc);

        const nombreUsuarioLogueado = localStorage.getItem("user");

        await setDoc(nuevaPartidaRef, {
            codigo: nuevoCodigoStr,
            enuso: true,
            jugador1: nombreUsuarioLogueado,
            jugador2: "",
            partidasjugas: 0,
            ganador: [],
            fecha: {},
            vecesusado: 0
        });

        codigoPartidaActual = nuevoCodigoStr;
        docPartidaIdGlobal = nuevoIdDoc;
        esJugador1 = true;

        mostrarPantallaEsperaCodigo(nuevoCodigoStr);

    } catch (error) {
        console.error("Error al generar el código de partida:", error);
        alert("Hubo un error al generar la sala.");
    }
}

function mostrarPantallaEsperaCodigo(codigo) {
    const contenedorJuego = document.getElementById("contenedor-juego");
    contenedorJuego.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center;">
            <p style="font-size: 1.1rem;">Tu código de sala generado es:</p>
            <h2 style="font-size: 2rem; background: rgba(255,255,255,0.4); padding: 10px 20px; border-radius: 8px; letter-spacing: 2px;">${codigo}</h2>
            <p style="font-size: 0.95rem; color: #333;">Comparte este código con tu amigo para que pueda unirse. La partida comenzará en cuanto se una.</p>
            <button id="btn-comprobar-jugador2" class="btn-default" style="background-color: #32cd32; color: #fff; margin-top: 10px;">Verificar si ya se unió</button>
        </div>
    `;

    document.getElementById("btn-comprobar-jugador2").addEventListener("click", async () => {
        await verificarEstadoSala();
    });
}

async function verificarEstadoSala() {
    try {
        const partidaRef = doc(db, "Partidas tres en raya", docPartidaIdGlobal);
        const partidaSnap = await getDoc(partidaRef);

        if (partidaSnap.exists()) {
            const data = partidaSnap.data();
            if (data.jugador2 && data.jugador2 !== "") {
                iniciarTableroJuegoClasico(data.jugador1, data.jugador2);
            } else {
                alert("Aún no se ha unido ningún jugador con tu código.");
            }
        }
    } catch (error) {
        console.error("Error verificando estado de sala:", error);
    }
}

async function unirsePartidaConCodigo(codigoIngresado) {
    try {
        const partidasRef = collection(db, "Partidas tres en raya");
        const q = query(partidasRef, where("codigo", "==", codigoIngresado), where("enuso", "==", true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("No se encontró ninguna sala activa con ese código o ya no está en uso.");
            return;
        }

        const docPartida = querySnapshot.docs[0];
        docPartidaIdGlobal = docPartida.id;
        const dataPartida = docPartida.data();

        const nombreUsuarioLogueado = localStorage.getItem("user");
        if (dataPartida.jugador1 === nombreUsuarioLogueado) {
            alert("Eres el jugador 1 de esta sala. Espera a que se uná otro jugador.");
            codigoPartidaActual = dataPartida.codigo;
            esJugador1 = true;
            mostrarPantallaEsperaCodigo(codigoPartidaActual);
            return;
        }

        const vecesUsadasActuales = (dataPartida.vecesusado || 0) + 1;
        let actualizarEnUso = true;

        if (vecesUsadasActuales >= 999999999) {
            actualizarEnUso = false; // Se reiniciará/desactivará el uso de este código exacto
        }

        await updateDoc(doc(db, "Partidas tres en raya", docPartidaIdGlobal), {
            jugador2: nombreUsuarioLogueado,
            vecesusado: vecesUsadasActuales,
            enuso: actualizarEnUso
        });

        codigoPartidaActual = dataPartida.codigo;
        esJugador1 = false;

        iniciarTableroJuegoClasico(dataPartida.jugador1, nombreUsuarioLogueado);

    } catch (error) {
        console.error("Error al unirse a la partida:", error);
        alert("Error al intentar unirse a la sala.");
    }
}

// --- LÓGICA DEL JUEGO CLÁSICO DE TRES EN RAYA ---
const combinacionesGanadorasClasico = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
    [0, 4, 8], [2, 4, 6]            // Diagonales
];

function verificarGanadorClasico(tablero) {
    for (let combo of combinacionesGanadorasClasico) {
        const [a, b, c] = combo;
        if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
            return tablero[a]; // 'X' o 'O'
        }
    }
    if (!tablero.includes("")) {
        return "empate";
    }
    return null;
}

function iniciarTableroJuegoClasico(jugador1Nombre, jugador2Nombre) {
    partidaActiva = true;
    tableroClasico = ["", "", "", "", "", "", "", "", ""];
    turnoActualSimbolo = "X";

    const contenedorJuego = document.getElementById("contenedor-juego");
    contenedorJuego.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%;">
            <div style="display: flex; justify-content: space-around; width: 100%; font-weight: bold; font-size: 1.05rem;">
                <span>Jugador 1 (X): ${jugador1Nombre}</span>
                <span>Jugador 2 (O): ${jugador2Nombre}</span>
            </div>
            <div id="status-mensaje-juego" style="font-size: 1.1rem; font-weight: bold; margin-bottom: 5px;">Turno de: ${jugador1Nombre} (X)</div>
            
            <div class="grid-tres-en-raya" style="display: grid; grid-template-columns: repeat(3, 90px); grid-template-rows: repeat(3, 90px); gap: 8px;">
                <div class="cell-clasico" data-index="0" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="1" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="2" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="3" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="4" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="5" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="6" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="7" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
                <div class="cell-clasico" data-index="8" style="background: rgba(255,255,255,0.3); border: 2px solid #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: bold; cursor: pointer;"></div>
            </div>

            <button id="btn-reiniciar-partida-amigo" class="btn-default" style="display: none; background-color: #ffcc00; color: #000; margin-top: 10px;">Jugar otra ronda</button>
        </div>
    `;

    const cells = document.querySelectorAll(".cell-clasico");
    cells.forEach(cell => {
        cell.addEventListener("click", async (e) => {
            if (!partidaActiva) return;

            const index = parseInt(e.target.getAttribute("data-index"), 10);
            if (tableroClasico[index] !== "") return;

            // Validar turno según usuario local (Jugador 1 es X, Jugador 2 es O)
            const nombreUsuarioLogueado = localStorage.getItem("user");
            const esTurnoXLocal = turnoActualSimbolo === "X";
            const esMiTurno = (esTurnoXLocal && esJugador1) || (!esTurnoXLocal && !esJugador1);

            if (!esMiTurno) {
                alert("No es tu turno.");
                return;
            }

            tableroClasico[index] = turnoActualSimbolo;
            e.target.textContent = turnoActualSimbolo;

            const resultadoPartida = verificarGanadorClasico(tableroClasico);

            if (resultadoPartida) {
                partidaActiva = false;
                await registrarFinPartidaEnFirestore(resultadoPartida, jugador1Nombre, jugador2Nombre);
            } else {
                turnoActualSimbolo = turnoActualSimbolo === "X" ? "O" : "X";
                const lblStatus = document.getElementById("status-mensaje-juego");
                if (lblStatus) {
                    const nombreTurnoActual = (turnoActualSimbolo === "X") ? jugador1Nombre : jugador2Nombre;
                    lblStatus.textContent = `Turno de: ${nombreTurnoActual} (${turnoActualSimbolo})`;
                }
            }
        });
    });

    const btnReiniciarRonda = document.getElementById("btn-reiniciar-partida-amigo");
    if (btnReiniciarRonda) {
        btnReiniciarRonda.addEventListener("click", () => {
            iniciarTableroJuegoClasico(jugador1Nombre, jugador2Nombre);
        });
    }
}

async function registrarFinPartidaEnFirestore(resultado, j1, j2) {
    const lblStatus = document.getElementById("status-mensaje-juego");
    const btnReiniciarRonda = document.getElementById("btn-reiniciar-partida-amigo");
    if (btnReiniciarRonda) btnReiniciarRonda.style.display = "block";

    let textoGanadorArray = "";
    let nombreGanadorReal = "";

    if (resultado === "X") {
        textoGanadorArray = "jugador1";
        nombreGanadorReal = j1;
        if (lblStatus) lblStatus.textContent = `¡Ha ganado ${j1} (X)! (+10 NovaPoints)`;
    } else if (resultado === "O") {
        textoGanadorArray = "jugador2";
        nombreGanadorReal = j2;
        if (lblStatus) lblStatus.textContent = `¡Ha ganado ${j2} (O)! (+10 NovaPoints)`;
    } else {
        textoGanadorArray = "empate";
        if (lblStatus) lblStatus.textContent = "¡Empate!";
    }

    try {
        const partidaRef = doc(db, "Partidas tres en raya", docPartidaIdGlobal);
        const partidaSnap = await getDoc(partidaRef);

        if (partidaSnap.exists()) {
            const data = partidaSnap.data();
            const nuevasPartidasJugadas = (data.partidasjugas || 0) + 1;
            const nuevoArrayGanadores = data.ganador || [];
            nuevoArrayGanadores.push(textoGanadorArray);

            const nuevoMapaFechas = data.fecha || {};
            const keyFecha = `fecha${nuevasPartidasJugadas}`;
            nuevoMapaFechas[keyFecha] = serverTimestamp();

            await updateDoc(partidaRef, {
                partidasjugas: nuevasPartidasJugadas,
                ganador: nuevoArrayGanadores,
                fecha: nuevoMapaFechas
            });

            // Si hay un ganador real y coincide con el usuario logueado actual, otorgar NovaPoints
            const nombreUsuarioLogueado = localStorage.getItem("user");
            if (nombreGanadorReal === nombreUsuarioLogueado && userDocIdGlobal) {
                await otorgarNovaPointsGanadorAmigo();
            }
        }
    } catch (error) {
        console.error("Error al registrar el resultado de la partida en Firestore:", error);
    }
}

async function otorgarNovaPointsGanadorAmigo() {
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

        // Registrar subcolección Transacciones de NovaPoints con ID incremental "tresenraya"
        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const transSnapshot = await getDocs(transaccionesRef);

        let maxIndexTrans = 0;
        transSnapshot.forEach((documento) => {
            const docId = documento.id;
            if (docId.startsWith("tresenraya")) {
                const numStr = docId.replace("tresenraya", "");
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxIndexTrans) {
                    maxIndexTrans = num;
                }
            }
        });

        const nuevoIdTransaccion = `tresenraya${maxIndexTrans + 1}`;
        const nuevaTransRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdTransaccion);

        await setDoc(nuevaTransRef, {
            NovaPoints: 10,
            fecha: serverTimestamp(),
            modo: "clasico",
            donde: "tres en raya",
            tipojuego: "con amigo",
            tipo: "suma"
        });

    } catch (error) {
        console.error("Error al otorgar NovaPoints en sala con amigo:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Sala Amigo Clásico:", error);
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

    // Redirecciones de cabecera
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

    // --- CONSULTA Y VALIDACIÓN EN TIEMPO REAL DEL USUARIO ---
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

            // --- CÁLCULO EN TIEMPO REAL DE EDAD ---
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

            // --- PROCESADO Y CÁLCULO EN TIEMPO REAL DE SUSCRIPCIÓN ---
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
        console.error("Error al obtener los datos del usuario en Sala Amigo Clásico:", error);
    }

    // Iniciar el flujo de selección de código de sala al cargar la vista
    iniciarFlujoSalaAmigo();

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