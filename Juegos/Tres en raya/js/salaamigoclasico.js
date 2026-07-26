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
let intervaloVerificacionSala = null;
let intervaloPartidaEnVivo = null;

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
    },
    "pregunta_codigo_sala": {
        "es": "¿Tienes un código de sala o prefieres generar uno nuevo?",
        "en": "Do you have a room code or prefer to generate a new one?",
        "fr": "Avez-vous un code de salon ou préférez-vous en générer un nouveau ?",
        "ro": "Ai un cod de cameră sau preferi să generezi unul nou?"
    },
    "btn_tengo_codigo": {
        "es": "Tengo un código",
        "en": "I have a code",
        "fr": "J'ai un code",
        "ro": "Am un cod"
    },
    "btn_generar_codigo": {
        "es": "Generar código",
        "en": "Generate code",
        "fr": "Générer un code",
        "ro": "Generează cod"
    },
    "placeholder_codigo": {
        "es": "Introduce el código (ej. 0000000000)",
        "en": "Enter the code (e.g. 0000000000)",
        "fr": "Entrez le code (ex. 0000000000)",
        "ro": "Introdu codul (ex. 0000000000)"
    },
    "btn_unirse_partida": {
        "es": "Unirse a la partida",
        "en": "Join game",
        "fr": "Rejoindre la partie",
        "ro": "Alătură-te jocului"
    },
    "texto_tu_codigo_generado": {
        "es": "Tu código de sala generado es:",
        "en": "Your generated room code is:",
        "fr": "Votre code de salon généré est :",
        "ro": "Codul tău generat pentru cameră este:"
    },
    "texto_comparte_codigo": {
        "es": "Comparte este código con tu amigo para que pueda unirse. La partida comenzará en cuanto se una.",
        "en": "Share this code with your friend so they can join. The game will start as soon as they join.",
        "fr": "Partagez ce code avec votre ami pour qu'il puisse rejoindre. La partie commencera dès qu'il rejoindra.",
        "ro": "Împărtășește acest cod cu prietenul tău pentru a se putea alătura. Jocul va începe imediat ce se va alătura."
    },
    "btn_verificar_unido": {
        "es": "Esperando jugador...",
        "en": "Waiting for player...",
        "fr": "En attente d'un joueur...",
        "ro": "Se așteaptă jucătorul..."
    },
    "error_no_jugador_unido": {
        "es": "Aún no se ha unido ningún jugador con tu código.",
        "en": "No player has joined with your code yet.",
        "fr": "Aucun joueur n'a encore rejoint avec votre code.",
        "ro": "Niciun jucător nu s-a alăturat încă cu codul tău."
    },
    "error_codigo_invalido": {
        "es": "El código debe tener exactamente 10 dígitos.",
        "en": "The code must be exactly 10 digits.",
        "fr": "Le code doit comporter exactement 10 chiffres.",
        "ro": "Codul trebuie să aibă exact 10 cifre."
    },
    "error_sala_no_encontrada": {
        "es": "No se encontró ninguna sala activa con ese código o ya no está en uso.",
        "en": "No active room was found with that code or it is no longer in use.",
        "fr": "Aucune salle active n'a été trouvée avec ce code ou elle n'est plus active.",
        "ro": "Nu s-a găsit nicio cameră activă cu acel cod sau nu mai este în uz."
    },
    "error_propio_codigo": {
        "es": "Eres el jugador 1 de esta sala. Espera a que se uná otro jugador.",
        "en": "You are player 1 of this room. Wait for another player to join.",
        "fr": "Vous êtes le joueur 1 de ce salon. Attendez qu'un autre joueur rejoigne.",
        "ro": "Ești jucătorul 1 din această cameră. Așteaptă să se alăture un alt jucător."
    },
    "no_es_tu_turno": {
        "es": "No es tu turno.",
        "en": "It is not your turn.",
        "fr": "Ce n'est pas votre tour.",
        "ro": "Nu este rândul tău."
    }
};

// --- POP-UP PERSONALIZADO (CERO ALERTS) ---
function mostrarPopupAviso(mensaje) {
    const modalAntiguo = document.getElementById("modal-aviso-personalizado");
    if (modalAntiguo) modalAntiguo.remove();

    const modal = document.createElement("div");
    modal.id = "modal-aviso-personalizado";
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(3px);";
    
    modal.innerHTML = `
        <div style="background: #ffffff; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3); border: 2px solid #000;">
            <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 20px; color: #000;">${mensaje}</p>
            <button id="btn-cerrar-modal" class="btn-default" style="background-color: #1e90ff; color: #fff; padding: 8px 20px;">Aceptar</button>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById("btn-cerrar-modal").addEventListener("click", () => {
        modal.remove();
    });
}

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
    if (intervaloVerificacionSala) clearInterval(intervaloVerificacionSala);
    if (intervaloPartidaEnVivo) clearInterval(intervaloPartidaEnVivo);

    const contenedorJuego = document.getElementById("contenedor-juego");
    if (!contenedorJuego) return;

    const textoPregunta = obtenerTextoTraduccion("pregunta_codigo_sala", "¿Tienes un código de sala o prefieres generar uno nuevo?");
    const textoBtnTiene = obtenerTextoTraduccion("btn_tengo_codigo", "Tengo un código");
    const textoBtnGenerar = obtenerTextoTraduccion("btn_generar_codigo", "Generar código");

    contenedorJuego.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%; text-align: center;">
            <p style="font-size: 1.2rem; font-weight: bold;">${textoPregunta}</p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button id="btn-opcion-tiene" class="btn-default" style="background-color: #1e90ff; color: #ffffff;">${textoBtnTiene}</button>
                <button id="btn-opcion-generar" class="btn-default" style="background-color: #32cd32; color: #ffffff;">${textoBtnGenerar}</button>
            </div>
            <div id="contenedor-dinamico-accion" style="width: 100%; margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px;"></div>
        </div>
    `;

    document.getElementById("btn-opcion-tiene").addEventListener("click", () => {
        const placeholderTxt = obtenerTextoTraduccion("placeholder_codigo", "Introduce el código (ej. 0000000000)");
        const textoBtnUnirse = obtenerTextoTraduccion("btn_unirse_partida", "Unirse a la partida");

        const divDinamico = document.getElementById("contenedor-dinamico-accion");
        divDinamico.innerHTML = `
            <input type="text" id="input-codigo-ingresado" placeholder="${placeholderTxt}" maxlength="10" style="padding: 10px; font-size: 1rem; border-radius: 5px; border: 1px solid #000; width: 260px; text-align: center;">
            <button id="btn-unirse-sala" class="btn-default" style="background-color: #ff4500; color: #fff;">${textoBtnUnirse}</button>
        `;

        document.getElementById("btn-unirse-sala").addEventListener("click", async () => {
            const codigoInput = document.getElementById("input-codigo-ingresado").value.trim();
            if (codigoInput.length !== 10) {
                mostrarPopupAviso(obtenerTextoTraduccion("error_codigo_invalido", "El código debe tener exactamente 10 dígitos."));
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
            vecesusado: 0,
            tablero: ["", "", "", "", "", "", "", "", ""]
        });

        codigoPartidaActual = nuevoCodigoStr;
        docPartidaIdGlobal = nuevoIdDoc;
        esJugador1 = true;

        mostrarPantallaEsperaCodigo(nuevoCodigoStr);

    } catch (error) {
        console.error("Error al generar el código de partida:", error);
        mostrarPopupAviso("Hubo un error al generar la sala.");
    }
}

function mostrarPantallaEsperaCodigo(codigo) {
    const contenedorJuego = document.getElementById("contenedor-juego");
    const textoTuCodigo = obtenerTextoTraduccion("texto_tu_codigo_generado", "Tu código de sala generado es:");
    const textoComparte = obtenerTextoTraduccion("texto_comparte_codigo", "Comparte este código con tu amigo para que pueda unirse. La partida comenzará en cuanto se una.");
    const textoVerificar = obtenerTextoTraduccion("btn_verificar_unido", "Esperando jugador...");

    contenedorJuego.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; text-align: center;">
            <p style="font-size: 1.1rem;">${textoTuCodigo}</p>
            <h2 style="font-size: 2rem; background: rgba(255,255,255,0.4); padding: 10px 20px; border-radius: 8px; letter-spacing: 2px;">${codigo}</h2>
            <p style="font-size: 0.95rem; color: #333; max-width: 400px;">${textoComparte}</p>
            <button id="btn-comprobar-jugador2" class="btn-default" style="background-color: #32cd32; color: #fff; margin-top: 10px;">${textoVerificar}</button>
        </div>
    `;

    // Polling automático para verificar si jugador2 se ha unido
    if (intervaloVerificacionSala) clearInterval(intervaloVerificacionSala);
    intervaloVerificacionSala = setInterval(async () => {
        try {
            const partidaRef = doc(db, "Partidas tres en raya", docPartidaIdGlobal);
            const partidaSnap = await getDoc(partidaRef);

            if (partidaSnap.exists()) {
                const data = partidaSnap.data();
                if (data.jugador2 && data.jugador2 !== "") {
                    clearInterval(intervaloVerificacionSala);
                    iniciarTableroJuegoClasico(data.jugador1, data.jugador2);
                }
            }
        } catch (err) {
            console.error("Error en polling de sala:", err);
        }
    }, 2000);

    document.getElementById("btn-comprobar-jugador2").addEventListener("click", async () => {
        await verificarEstadoSala(true);
    });
}

async function verificarEstadoSala(mostrarAlertaSiVacio = false) {
    try {
        const partidaRef = doc(db, "Partidas tres en raya", docPartidaIdGlobal);
        const partidaSnap = await getDoc(partidaRef);

        if (partidaSnap.exists()) {
            const data = partidaSnap.data();
            if (data.jugador2 && data.jugador2 !== "") {
                if (intervaloVerificacionSala) clearInterval(intervaloVerificacionSala);
                iniciarTableroJuegoClasico(data.jugador1, data.jugador2);
            } else if (mostrarAlertaSiVacio) {
                mostrarPopupAviso(obtenerTextoTraduccion("error_no_jugador_unido", "Aún no se ha unido ningún jugador con tu código."));
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
            mostrarPopupAviso(obtenerTextoTraduccion("error_sala_no_encontrada", "No se encontró ninguna sala activa con ese código o ya no está en uso."));
            return;
        }

        const docPartida = querySnapshot.docs[0];
        docPartidaIdGlobal = docPartida.id;
        const dataPartida = docPartida.data();

        const nombreUsuarioLogueado = localStorage.getItem("user");
        if (dataPartida.jugador1 === nombreUsuarioLogueado) {
            mostrarPopupAviso(obtenerTextoTraduccion("error_propio_codigo", "Eres el jugador 1 de esta sala. Espera a que se uná otro jugador."));
            codigoPartidaActual = dataPartida.codigo;
            esJugador1 = true;
            mostrarPantallaEsperaCodigo(codigoPartidaActual);
            return;
        }

        const vecesUsadasActuales = (dataPartida.vecesusado || 0) + 1;
        let actualizarEnUso = true;

        if (vecesUsadasActuales >= 999999999) {
            actualizarEnUso = false;
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
        mostrarPopupAviso("Error al intentar unirse a la sala.");
    }
}

// --- OBTENER AVATAR DE UN USUARIO DESDE FIRESTORE ---
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
        console.error("Error obteniendo avatar de usuario:", e);
    }
    return "../../default-profile.png";
}

// --- LÓGICA DEL JUEGO CLÁSICO DE TRES EN RAYA CON SINCRONIZACIÓN EN VIVO ---
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

async function iniciarTableroJuegoClasico(jugador1Nombre, jugador2Nombre) {
    partidaActiva = true;
    tableroClasico = ["", "", "", "", "", "", "", "", ""];

    // Obtener avatares de ambos jugadores
    const avatarJ1 = await obtenerAvatarUsuario(jugador1Nombre);
    const avatarJ2 = await obtenerAvatarUsuario(jugador2Nombre);

    const contenedorJuego = document.getElementById("contenedor-juego");
    contenedorJuego.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%;">
            <div style="display: flex; justify-content: space-around; width: 100%; font-weight: bold; font-size: 0.95rem; gap: 10px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 6px;">
                    <img src="${avatarJ1}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid #000;">
                    <span>J1 (X): ${jugador1Nombre}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 6px;">
                    <img src="${avatarJ2}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid #000;">
                    <span>J2 (O): ${jugador2Nombre}</span>
                </div>
            </div>
            <div id="status-mensaje-juego" style="font-size: 1.1rem; font-weight: bold; margin-bottom: 5px;">Cargando turno...</div>
            
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

    // Configurar escuchador en tiempo real para sincronizar jugadas del rival
    if (intervaloPartidaEnVivo) clearInterval(intervaloPartidaEnVivo);
    intervaloPartidaEnVivo = setInterval(async () => {
        try {
            const partidaRef = doc(db, "Partidas tres en raya", docPartidaIdGlobal);
            const partidaSnap = await getDoc(partidaRef);
            if (partidaSnap.exists()) {
                const data = partidaSnap.data();
                if (data.tablero) {
                    tableroClasico = data.tablero;
                    actualizarInterfazTableroVisual(jugador1Nombre, jugador2Nombre);
                }
            }
        } catch (err) {
            console.error("Error sincronizando tablero en vivo:", err);
        }
    }, 1500);

    const cells = document.querySelectorAll(".cell-clasico");
    cells.forEach(cell => {
        cell.addEventListener("click", async (e) => {
            if (!partidaActiva) return;

            const index = parseInt(e.target.getAttribute("data-index"), 10);
            if (tableroClasico[index] !== "") return;

            // Calcular de quién es el turno contando cuántas fichas hay puestas
            const fichasPuestas = tableroClasico.filter(val => val !== "").length;
            const turnoCalculadoSimbolo = (fichasPuestas % 2 === 0) ? "X" : "O";

            const nombreUsuarioLogueado = localStorage.getItem("user");
            const esTurnoXLocal = turnoCalculadoSimbolo === "X";
            const esMiTurno = (esTurnoXLocal && esJugador1) || (!esTurnoXLocal && !esJugador1);

            if (!esMiTurno) {
                mostrarPopupAviso(obtenerTextoTraduccion("no_es_tu_turno", "No es tu turno."));
                return;
            }

            tableroClasico[index] = turnoCalculadoSimbolo;
            e.target.textContent = turnoCalculadoSimbolo;

            // Actualizar Firestore con el nuevo estado del tablero
            try {
                await updateDoc(doc(db, "Partidas tres en raya", docPartidaIdGlobal), {
                    tablero: tableroClasico
                });
            } catch (err) {
                console.error("Error actualizando movimiento en Firestore:", err);
            }

            const resultadoPartida = verificarGanadorClasico(tableroClasico);
            if (resultadoPartida) {
                partidaActiva = false;
                if (intervaloPartidaEnVivo) clearInterval(intervaloPartidaEnVivo);
                await registrarFinPartidaEnFirestore(resultadoPartida, jugador1Nombre, jugador2Nombre);
            } else {
                actualizarInterfazTableroVisual(jugador1Nombre, jugador2Nombre);
            }
        });
    });

    const btnReiniciarRonda = document.getElementById("btn-reiniciar-partida-amigo");
    if (btnReiniciarRonda) {
        btnReiniciarRonda.addEventListener("click", async () => {
            // Reiniciar tablero en Firestore y localmente
            tableroClasico = ["", "", "", "", "", "", "", "", ""];
            partidaActiva = true;
            try {
                await updateDoc(doc(db, "Partidas tres en raya", docPartidaIdGlobal), {
                    tablero: tableroClasico
                });
            } catch (e) {
                console.error("Error reiniciando partida:", e);
            }
            iniciarTableroJuegoClasico(jugador1Nombre, jugador2Nombre);
        });
    }
}

function actualizarInterfazTableroVisual(j1, j2) {
    const cells = document.querySelectorAll(".cell-clasico");
    cells.forEach((cell, idx) => {
        cell.textContent = tableroClasico[idx] || "";
    });

    const fichasPuestas = tableroClasico.filter(val => val !== "").length;
    const turnoSimboloActual = (fichasPuestas % 2 === 0) ? "X" : "O";
    const nombreTurnoActual = (turnoSimboloActual === "X") ? j1 : j2;

    const lblStatus = document.getElementById("status-mensaje-juego");
    if (lblStatus && partidaActiva) {
        lblStatus.textContent = `Turno de: ${nombreTurnoActual} (${turnoSimboloActual})`;
    }

    const resultado = verificarGanadorClasico(tableroClasico);
    if (resultado && partidaActiva) {
        partidaActiva = false;
        if (intervaloPartidaEnVivo) clearInterval(intervaloPartidaEnVivo);
        registrarFinPartidaEnFirestore(resultado, j1, j2);
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
        console.error("Error al obtener los datos del usuario en Sala Amigo Clásico:", error);
    }

    iniciarFlujoSalaAmigo();

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            if (intervaloVerificacionSala) clearInterval(intervaloVerificacionSala);
            if (intervaloPartidaEnVivo) clearInterval(intervaloPartidaEnVivo);
            window.history.back();
        });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (intervaloVerificacionSala) clearInterval(intervaloVerificacionSala);
            if (intervaloPartidaEnVivo) clearInterval(intervaloPartidaEnVivo);
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
