import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    getDoc,
    setDoc,
    updateDoc, 
    onSnapshot,
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
let nombreUsuarioLogueado = "";
let unsubPartida = null;
let idPartidaActual = null;
let miSimbolo = null; // 'X' o 'O'
let avatarUsuarioLogueado = "../../default-profile.png";
let indiceFichaSeleccionada = null; // Para la fase de movimiento
let partidaFinalizadaGlobal = false;
let popupActivoActual = null;

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
    "titulo_amigo_tres": {
        "es": "Tres en Raya con Amigo",
        "en": "Tic-Tac-Toe with Friend",
        "fr": "Morpion avec un Ami",
        "ro": "X și 0 cu Prieten"
    },
    "pregunta_deseas_hacer": {
        "es": "¿Qué deseas hacer?",
        "en": "What would you like to do?",
        "fr": "Que souhaitez-vous faire ?",
        "ro": "Ce dorești să faci?"
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
    "titulo_introduce_codigo": {
        "es": "Introduce el código",
        "en": "Enter the code",
        "fr": "Entrez le code",
        "ro": "Introdu codul"
    },
    "btn_unirse": {
        "es": "Unirse",
        "en": "Join",
        "fr": "Rejoindre",
        "ro": "Alătură-te"
    },
    "titulo_codigo_generado": {
        "es": "Código Generado",
        "en": "Generated Code",
        "fr": "Code Généré",
        "ro": "Cod Generat"
    },
    "comparte_codigo_amigo": {
        "es": "Comparte este código con tu amigo:",
        "en": "Share this code with your friend:",
        "fr": "Partagez ce code avec votre ami :",
        "ro": "Împărtășește acest cod cu prietenul tău:"
    },
    "esperando_jugador_dos": {
        "es": "Esperando a que se una el jugador 2...",
        "en": "Waiting for player 2 to join...",
        "fr": "En attente de la connexion du joueur 2...",
        "ro": "Se așteaptă conectarea jucătorului 2..."
    },
    "error_codigo_vacio": {
        "es": "Por favor, introduce un código válido.",
        "en": "Please enter a valid code.",
        "fr": "Veuillez entrer un code valide.",
        "ro": "Te rugăm să introduci un cod valid."
    },
    "error_codigo_no_existe": {
        "es": "El código no existe o ya no está en uso.",
        "en": "The code does not exist or is no longer in use.",
        "fr": "Le code n'existe pas ou n'est plus actif.",
        "ro": "Codul nu există sau nu mai este în uz."
    },
    "error_propia_partida": {
        "es": "No puedes unirte a tu propia partida como jugador 2.",
        "en": "You cannot join your own game as player 2.",
        "fr": "Vous ne pouvez pas rejoindre votre propre partie en tant que joueur 2.",
        "ro": "Nu te poți alătura propriului tău joc ca jucător 2."
    },
    "titulo_juego": {
        "es": "Tres en Raya",
        "en": "Tic-Tac-Toe",
        "fr": "Morpion",
        "ro": "X și 0"
    },
    "turno_de_tu": {
        "es": "Es tu turno",
        "en": "It's your turn",
        "fr": "C'est votre tour",
        "ro": "Este rândul tău"
    },
    "turno_del_rival": {
        "es": "Turno del rival",
        "en": "Opponent's turn",
        "fr": "Tour de l'adversaire",
        "ro": "Rândul adversarului"
    },
    "no_es_tu_turno": {
        "es": "No es tu turno",
        "en": "It's not your turn",
        "fr": "Ce n'est pas votre tour",
        "ro": "Nu este rândul tău"
    },
    "jugador_uno_label": {
        "es": "Jugador 1 (X):",
        "en": "Player 1 (X):",
        "fr": "Joueur 1 (X) :",
        "ro": "Jucătorul 1 (X):"
    },
    "jugador_dos_label": {
        "es": "Jugador 2 (O):",
        "en": "Player 2 (O):",
        "fr": "Joueur 2 (O) :",
        "ro": "Jucătorul 2 (O):"
    },
    "btn_aceptar": {
        "es": "Aceptar",
        "en": "Accept",
        "fr": "Accepter",
        "ro": "Acceptă"
    },
    "btn_cerrar": {
        "es": "Cerrar",
        "en": "Close",
        "fr": "Fermer",
        "ro": "Închide"
    },
    "btn_volver_a_jugar": {
        "es": "Volver a jugar",
        "en": "Play again",
        "fr": "Rejouer",
        "ro": "Joacă din nou"
    },
    "esperando_respuesta": {
        "es": "Esperando respuesta",
        "en": "Waiting for response",
        "fr": "En attente de réponse",
        "ro": "Se așteaptă răspunsul"
    },
    "btn_volver": {
        "es": "Volver",
        "en": "Back",
        "fr": "Retour",
        "ro": "Înapoi"
    },
    "text_subscripcion": {
        "es": "Suscripción:",
        "en": "Subscription:",
        "fr": "Abonnement:",
        "ro": "Abonament:"
    },
    "ganador_jugador": {
        "es": "Ganador Jugador {simbolo}: {nombre}",
        "en": "Winner Player {simbolo}: {nombre}",
        "fr": "Gagnant Joueur {simbolo} : {nombre}",
        "ro": "Câștigător Jucător {simbolo}: {nombre}"
    },
    "jugador_no_quiere": {
        "es": "Jugador {simbolo}: {nombre} ya no quiere/puede jugar más",
        "en": "Player {simbolo}: {nombre} no longer wants/can play",
        "fr": "Joueur {simbolo} : {nombre} ne veut plus / ne peut plus jouer",
        "ro": "Jucător {simbolo}: {nombre} nu mai vrea/poate juca"
    },
    "jugador_quiere_volver": {
        "es": "Jugador {simbolo}: {nombre} quiere volver a jugar",
        "en": "Player {simbolo}: {nombre} wants to play again",
        "fr": "Joueur {simbolo} : {nombre} veut rejouer",
        "ro": "Jucător {simbolo}: {nombre} vrea să joace din nou"
    }
};

function mostrarPopupPersonalizado(contenidoHtml, idPopup = "modal-aviso-personalizado") {
    const modalAntiguo = document.getElementById(idPopup);
    if (modalAntiguo) modalAntiguo.remove();

    const modal = document.createElement("div");
    modal.id = idPopup;
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(3px);";
    
    modal.innerHTML = `
        <div style="background: #ffffff; padding: 25px; border-radius: 12px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3); border: 2px solid #000; display: flex; flex-direction: column; gap: 15px;">
            ${contenidoHtml}
        </div>
    `;

    document.body.appendChild(modal);
    popupActivoActual = modal;
    return modal;
}

function cerrarPopupActual() {
    if (popupActivoActual) {
        popupActivoActual.remove();
        popupActivoActual = null;
    }
    const modalGenerico = document.getElementById("modal-aviso-personalizado");
    if (modalGenerico) modalGenerico.remove();
}

function mostrarPopupAviso(mensaje, callbackCierre = null) {
    const contenido = `
        <p style="font-size: 1.1rem; font-weight: bold; color: #000;">${mensaje}</p>
        <button id="btn-cerrar-modal" class="btn-default" style="background-color: #1e90ff; color: #fff; padding: 8px 20px;">${obtenerTextoTraduccion("btn_aceptar", "Aceptar")}</button>
    `;
    const modal = mostrarPopupPersonalizado(contenido);
    document.getElementById("btn-cerrar-modal").addEventListener("click", () => {
        cerrarPopupActual();
        if (callbackCierre) callbackCierre();
    });
}

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

function obtenerTextoTraduccion(clave, fallbackTexto, reemplazos = {}) {
    let texto = fallbackTexto;
    if (diccionario[clave] && diccionario[clave][currentLanguage]) {
        texto = diccionario[clave][currentLanguage];
    } else if (traduccionesLocales[clave] && traduccionesLocales[clave][currentLanguage]) {
        texto = traduccionesLocales[clave][currentLanguage];
    }
    
    for (const [key, val] of Object.entries(reemplazos)) {
        texto = texto.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }
    return texto;
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

    const txtTituloAmigo = document.getElementById("txt-titulo-amigo");
    if (txtTituloAmigo) {
        txtTituloAmigo.textContent = obtenerTextoTraduccion("titulo_amigo_tres", "Tres en Raya con Amigo");
    }

    const txtPregunta = document.getElementById("txt-pregunta-accion");
    if (txtPregunta) {
        txtPregunta.textContent = obtenerTextoTraduccion("pregunta_deseas_hacer", "¿Qué deseas hacer?");
    }

    const btnTengoCodigo = document.getElementById("btn-tengo-codigo");
    if (btnTengoCodigo) {
        btnTengoCodigo.textContent = obtenerTextoTraduccion("btn_tengo_codigo", "Tengo un código");
    }

    const btnGenerarCodigo = document.getElementById("btn-generar-codigo");
    if (btnGenerarCodigo) {
        btnGenerarCodigo.textContent = obtenerTextoTraduccion("btn_generar_codigo", "Generar código");
    }

    const txtTituloIntroduce = document.getElementById("txt-titulo-introduce");
    if (txtTituloIntroduce) {
        txtTituloIntroduce.textContent = obtenerTextoTraduccion("titulo_introduce_codigo", "Introduce el código");
    }

    const btnUnirsePartida = document.getElementById("btn-unirse-partida");
    if (btnUnirsePartida) {
        btnUnirsePartida.textContent = obtenerTextoTraduccion("btn_unirse", "Unirse");
    }

    const txtTituloGenerado = document.getElementById("txt-titulo-generado");
    if (txtTituloGenerado) {
        txtTituloGenerado.textContent = obtenerTextoTraduccion("titulo_codigo_generado", "Código Generado");
    }

    const txtComparteAmigo = document.getElementById("txt-comparte-amigo");
    if (txtComparteAmigo) {
        txtComparteAmigo.textContent = obtenerTextoTraduccion("comparte_codigo_amigo", "Comparte este código con tu amigo:");
    }

    const txtEsperandoJugador = document.getElementById("txt-esperando-jugador");
    if (txtEsperandoJugador) {
        txtEsperandoJugador.textContent = obtenerTextoTraduccion("esperando_jugador_dos", "Esperando a que se una el jugador 2...");
    }

    const txtTituloJuego = document.getElementById("txt-titulo-juego");
    if (txtTituloJuego) {
        txtTituloJuego.textContent = obtenerTextoTraduccion("titulo_juego", "Tres en Raya");
    }

    const txtLabelJ1 = document.getElementById("txt-label-jugador1");
    if (txtLabelJ1) {
        txtLabelJ1.textContent = obtenerTextoTraduccion("jugador_uno_label", "Jugador 1 (X):");
    }

    const txtLabelJ2 = document.getElementById("txt-label-jugador2");
    if (txtLabelJ2) {
        txtLabelJ2.textContent = obtenerTextoTraduccion("jugador_dos_label", "Jugador 2 (O):");
    }
}

async function obtenerDatosUsuarioPorNombre(nombreUsuario) {
    try {
        const usuariosRef = collection(db, "Usuarios");
        const qUser = query(usuariosRef, where("usuario", "==", nombreUsuario));
        const querySnap = await getDocs(qUser);
        if (!querySnap.empty) {
            const data = querySnap.docs[0].data();
            return {
                avatar: normalizarSourceImagen(data.imgperfil)
            };
        }
    } catch (error) {
        console.error("Error buscando datos del usuario:", error);
    }
    return { avatar: "../../default-profile.png" };
}

function comprobarGanadorTablero(tablero) {
    const combinacionesGanadoras = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Filas
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columnas
        [0, 4, 8], [2, 4, 6]            // Diagonales
    ];

    for (const combo of combinacionesGanadoras) {
        const [a, b, c] = combo;
        if (tablero[a] && tablero[a] === tablero[b] && tablero[a] === tablero[c]) {
            return tablero[a]; // Devuelve 'X' u 'O'
        }
    }
    return null;
}

function mostrarMenuOpcionesPrincipal() {
    cerrarPopupActual();
    if (unsubPartida) {
        unsubPartida();
        unsubPartida = null;
    }
    idPartidaActual = null;
    partidaFinalizadaGlobal = false;
    indiceFichaSeleccionada = null;

    const seccionTablero = document.getElementById("seccion-tablero");
    const seccionOpciones = document.getElementById("seccion-opciones");
    const seccionIngresarCodigo = document.getElementById("seccion-ingresar-codigo");
    const seccionEsperaCodigo = document.getElementById("seccion-espera-codigo");

    if (seccionTablero) seccionTablero.style.display = "none";
    if (seccionIngresarCodigo) seccionIngresarCodigo.style.display = "none";
    if (seccionEsperaCodigo) seccionEsperaCodigo.style.display = "none";
    if (seccionOpciones) seccionOpciones.style.display = "flex";
}

async function procesarVictoriaGanador(ganadorNombre, simboloGanador) {
    if (partidaFinalizadaGlobal) return;
    partidaFinalizadaGlobal = true;

    if (ganadorNombre === nombreUsuarioLogueado && userDocIdGlobal) {
        try {
            const userRef = doc(db, "Usuarios", userDocIdGlobal);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const dataUser = userSnap.data();
                const novasActuales = dataUser.NovaPoints !== undefined ? Number(dataUser.NovaPoints) : 0;
                await updateDoc(userRef, { NovaPoints: novasActuales + 10 });
            }

            const transColRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
            const transSnap = await getDocs(transColRef);
            let maxIndex = 0;
            transSnap.forEach(docSnap => {
                const docId = docSnap.id;
                if (docId.startsWith("tresenraya")) {
                    const numStr = docId.replace("tresenraya", "");
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num) && num > maxIndex) {
                        maxIndex = num;
                    }
                }
            });

            const nuevoIdTransaccion = `tresenraya${maxIndex + 1}`;
            const nuevoDocTransRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdTransaccion);
            
            await setDoc(nuevoDocTransRef, {
                NovaPoints: 10,
                donde: "tres en raya",
                fecha: serverTimestamp(),
                modo: "tres en movimiento",
                tipo: "suma",
                tipojuego: "con amigo"
            });
        } catch (error) {
            console.error("Error al otorgar recompensa de NovaPoints:", error);
        }
    }

    if (idPartidaActual) {
        try {
            const docRef = doc(db, "Partidas tres en raya", idPartidaActual);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const dataPartida = docSnap.data();
                const ganadorArray = dataPartida.ganador || [];
                ganadorArray.push(ganadorNombre);
                await updateDoc(docRef, { ganador: ganadorArray });
            }
        } catch (err) {
            console.error("Error al actualizar array de ganadores en la partida:", err);
        }
    }

    mostrarPopupFinalizacion(ganadorNombre, simboloGanador);
}

function mostrarPopupFinalizacion(ganadorNombre, simboloGanador) {
    const textoGanador = obtenerTextoTraduccion("ganador_jugador", `Ganador Jugador ${simboloGanador}: ${ganadorNombre}`, { simbolo: simboloGanador, nombre: ganadorNombre });
    const textoCerrar = obtenerTextoTraduccion("btn_cerrar", "Cerrar");
    const textoVolverAJugar = obtenerTextoTraduccion("btn_volver_a_jugar", "Volver a jugar");

    const contenido = `
        <p style="font-size: 1.2rem; font-weight: bold; color: #000;">${textoGanador}</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
            <button id="btn-popup-cerrar" class="btn-default" style="background-color: #ff0000; color: #fff; padding: 8px 15px;">${textoCerrar}</button>
            <button id="btn-popup-volver" class="btn-main" style="padding: 8px 15px;">${textoVolverAJugar}</button>
        </div>
    `;

    const modal = mostrarPopupPersonalizado(contenido, "modal-final-partida");

    document.getElementById("btn-popup-cerrar").addEventListener("click", async () => {
        cerrarPopupActual();
        if (idPartidaActual) {
            try {
                const docRef = doc(db, "Partidas tres en raya", idPartidaActual);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const arrayVolver = data.volver || [];
                    arrayVolver.push("NO");
                    await updateDoc(docRef, { volver: arrayVolver, enuso: false });
                }
            } catch (err) {
                console.error("Error al registrar cierre de partida:", err);
            }
        }
        mostrarMenuOpcionesPrincipal();
    });

    document.getElementById("btn-popup-volver").addEventListener("click", async () => {
        cerrarPopupActual();
        const textoEsperando = obtenerTextoTraduccion("esperando_respuesta", "Esperando respuesta");
        mostrarPopupPersonalizado(`<p style="font-size: 1.1rem; font-weight: bold; color: #000;" class="espera-texto">${textoEsperando}...</p>`, "modal-esperando-respuesta");

        if (idPartidaActual) {
            try {
                const docRef = doc(db, "Partidas tres en raya", idPartidaActual);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const arrayVolver = data.volver || [];
                    arrayVolver.push("SI");
                    await updateDoc(docRef, { volver: arrayVolver });
                }
            } catch (err) {
                console.error("Error al actualizar array volver con SI:", err);
            }
        }
    });
}

function mostrarTableroJuego() {
    const seccionOpciones = document.getElementById("seccion-opciones");
    const seccionIngresarCodigo = document.getElementById("seccion-ingresar-codigo");
    const seccionEsperaCodigo = document.getElementById("seccion-espera-codigo");
    const seccionTablero = document.getElementById("seccion-tablero");

    if (seccionOpciones) seccionOpciones.style.display = "none";
    if (seccionIngresarCodigo) seccionIngresarCodigo.style.display = "none";
    if (seccionEsperaCodigo) seccionEsperaCodigo.style.display = "none";
    if (seccionTablero) seccionTablero.style.display = "flex";
}

function iniciarLogicaTablero(partidaDocId) {
    idPartidaActual = partidaDocId;
    partidaFinalizadaGlobal = false;
    indiceFichaSeleccionada = null;

    const celdas = document.querySelectorAll(".celda-juego");
    const txtEstadoTurno = document.getElementById("txt-estado-turno");
    const txtJ1Nombre = document.getElementById("txt-j1-nombre");
    const imgJ1Avatar = document.getElementById("img-j1-avatar");
    const txtJ2Nombre = document.getElementById("txt-j2-nombre");
    const imgJ2Avatar = document.getElementById("img-j2-avatar");

    if (unsubPartida) unsubPartida();

    unsubPartida = onSnapshot(doc(db, "Partidas tres en raya", idPartidaActual), async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        if (data.jugador1 === nombreUsuarioLogueado) {
            miSimbolo = "X";
        } else if (data.jugador2 === nombreUsuarioLogueado) {
            miSimbolo = "O";
        }

        if (data.jugador1) {
            txtJ1Nombre.textContent = data.jugador1;
            if (data.jugador1 === nombreUsuarioLogueado) {
                imgJ1Avatar.src = avatarUsuarioLogueado;
            } else {
                const datosJ1 = await obtenerDatosUsuarioPorNombre(data.jugador1);
                imgJ1Avatar.src = datosJ1.avatar;
            }
        }

        if (data.jugador2) {
            txtJ2Nombre.textContent = data.jugador2;
            if (data.jugador2 === nombreUsuarioLogueado) {
                imgJ2Avatar.src = avatarUsuarioLogueado;
            } else {
                const datosJ2 = await obtenerDatosUsuarioPorNombre(data.jugador2);
                imgJ2Avatar.src = datosJ2.avatar;
            }
        }

        const tableroEstado = data.tablero || ["", "", "", "", "", "", "", "", ""];
        celdas.forEach((celda, index) => {
            celda.textContent = tableroEstado[index] || "";
            celda.classList.remove("celda-seleccionada");
            if (indiceFichaSeleccionada === index) {
                celda.classList.add("celda-seleccionada");
            }
        });

        const arrayVolver = data.volver || [];
        const rivalNombre = (nombreUsuarioLogueado === data.jugador1) ? data.jugador2 : data.jugador1;
        const rivalSimbolo = (miSimbolo === "X") ? "O" : "X";

        // 1. Si el rival le dio a NO o cerró la partida
        if (data.enuso === false && arrayVolver.includes("NO") && partidaFinalizadaGlobal) {
            const modalEsperaActual = document.getElementById("modal-esperando-respuesta");
            
            // SOLO se muestra el aviso si el usuario actual estaba esperando (tenía el modal de espera abierto o votó "SI")
            if (modalEsperaActual) {
                cerrarPopupActual();
                const textoNoDesea = obtenerTextoTraduccion("jugador_no_quiere", `Jugador ${rivalSimbolo}: ${rivalNombre} ya no quiere/puede jugar más`, { simbolo: rivalSimbolo, nombre: rivalNombre });
                const textoAceptar = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
                
                const contenidoNo = `
                    <p style="font-size: 1.1rem; font-weight: bold; color: #000;">${textoNoDesea}</p>
                    <button id="btn-aceptar-no" class="btn-default" style="background-color: #1e90ff; color: #fff; padding: 8px 20px;">${textoAceptar}</button>
                `;
                mostrarPopupPersonalizado(contenidoNo, "modal-rival-rechaza");

                document.getElementById("btn-aceptar-no").addEventListener("click", () => {
                    cerrarPopupActual();
                    mostrarMenuOpcionesPrincipal();
                });
                return;
            } else {
                // Si el usuario actual también había dado a No o salido, se va directo a opciones
                const modalRechazoActual = document.getElementById("modal-rival-rechaza");
                if (!modalRechazoActual && popupActivoActual === null) {
                    mostrarMenuOpcionesPrincipal();
                    return;
                }
            }
        }

        // 2. Manejo del array volver cuando un jugador pulsa Volver a jugar
        if (arrayVolver.length === 1 && partidaFinalizadaGlobal) {
            const modalActual = document.getElementById("modal-peticion-rival");
            const modalEspera = document.getElementById("modal-esperando-respuesta");
            
            if (!modalActual && !modalEspera) {
                cerrarPopupActual();
                const textoPeticion = obtenerTextoTraduccion("jugador_quiere_volver", `Jugador ${rivalSimbolo}: ${rivalNombre} quiere volver a jugar`, { simbolo: rivalSimbolo, nombre: rivalNombre });
                const textoAceptar = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
                const contenidoPeticion = `
                    <p style="font-size: 1.1rem; font-weight: bold; color: #000;">${textoPeticion}</p>
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                        <button id="btn-rival-si" class="btn-main" style="padding: 8px 15px;">${textoAceptar}</button>
                        <button id="btn-rival-no" class="btn-default" style="background-color: #ff0000; color: #fff; padding: 8px 15px;">No</button>
                    </div>
                `;
                mostrarPopupPersonalizado(contenidoPeticion, "modal-peticion-rival");

                document.getElementById("btn-rival-si").addEventListener("click", async () => {
                    cerrarPopupActual();
                    const docRef = doc(db, "Partidas tres en raya", idPartidaActual);
                    const snapActual = await getDoc(docRef);
                    if (snapActual.exists()) {
                        const arr = snapActual.data().volver || [];
                        arr.push("SI");
                        await updateDoc(docRef, { volver: arr });
                    }
                });

                document.getElementById("btn-rival-no").addEventListener("click", async () => {
                    cerrarPopupActual();
                    const docRef = doc(db, "Partidas tres en raya", idPartidaActual);
                    const snapActual = await getDoc(docRef);
                    if (snapActual.exists()) {
                        const arr = snapActual.data().volver || [];
                        arr.push("NO");
                        await updateDoc(docRef, { volver: arr, enuso: false });
                    }
                    
                    // Como este usuario dijo NO, lo enviamos directamente a la pantalla principal sin mostrarle el mensaje de rechazo
                    mostrarMenuOpcionesPrincipal();
                });
            }
        }

        if (arrayVolver.length >= 2) {
            if (arrayVolver[0] === "SI" && arrayVolver[1] === "SI") {
                cerrarPopupActual();
                partidaFinalizadaGlobal = false;
                indiceFichaSeleccionada = null;
                await updateDoc(doc(db, "Partidas tres en raya", idPartidaActual), {
                    tablero: ["", "", "", "", "", "", "", "", ""],
                    turno: data.jugador1,
                    volver: deleteField()
                });
                return;
            } else if (arrayVolver.includes("NO")) {
                const modalEsperaActual = document.getElementById("modal-esperando-respuesta");
                if (modalEsperaActual) {
                    cerrarPopupActual();
                    const textoNoDesea = obtenerTextoTraduccion("jugador_no_quiere", `Jugador ${rivalSimbolo}: ${rivalNombre} ya no quiere/puede jugar más`, { simbolo: rivalSimbolo, nombre: rivalNombre });
                    const textoAceptar = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
                    
                    const contenidoNo = `
                        <p style="font-size: 1.1rem; font-weight: bold; color: #000;">${textoNoDesea}</p>
                        <button id="btn-aceptar-no" class="btn-default" style="background-color: #1e90ff; color: #fff; padding: 8px 20px;">${textoAceptar}</button>
                    `;
                    mostrarPopupPersonalizado(contenidoNo, "modal-rival-rechaza");
                    document.getElementById("btn-aceptar-no").addEventListener("click", () => {
                        cerrarPopupActual();
                        mostrarMenuOpcionesPrincipal();
                    });
                    return;
                }
            }
        }

        const simboloGanador = comprobarGanadorTablero(tableroEstado);
        if (simboloGanador && !partidaFinalizadaGlobal) {
            const nombreGanadorPartida = (simboloGanador === "X") ? data.jugador1 : data.jugador2;
            if (nombreGanadorPartida) {
                procesarVictoriaGanador(nombreGanadorPartida, simboloGanador);
            }
        }

        const turnoActual = data.turno || data.jugador1;
        if (!simboloGanador) {
            if (turnoActual === nombreUsuarioLogueado) {
                if (txtEstadoTurno) txtEstadoTurno.textContent = obtenerTextoTraduccion("turno_de_tu", "Es tu turno");
            } else {
                if (txtEstadoTurno) txtEstadoTurno.textContent = obtenerTextoTraduccion("turno_del_rival", "Turno del rival");
            }
        } else {
            if (txtEstadoTurno) txtEstadoTurno.textContent = `Partida finalizada. Ganador: ${(simboloGanador === "X") ? data.jugador1 : data.jugador2}`;
        }
    });

    celdas.forEach(celda => {
        celda.onclick = async () => {
            if (partidaFinalizadaGlobal) return;

            const index = parseInt(celda.getAttribute("data-index"), 10);
            
            const docRef = doc(db, "Partidas tres en raya", idPartidaActual);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const data = docSnap.data();

            const tableroActualComprobacion = data.tablero || ["", "", "", "", "", "", "", "", ""];
            if (comprobarGanadorTablero(tableroActualComprobacion)) return;

            const turnoActual = data.turno || data.jugador1;
            if (turnoActual !== nombreUsuarioLogueado) {
                mostrarPopupAviso(obtenerTextoTraduccion("no_es_tu_turno", "No es tu turno"));
                return;
            }

            const tableroEstado = [...tableroActualComprobacion];
            const fichasPuestas = tableroEstado.filter(f => f !== "").length;

            if (fichasPuestas < 6) {
                if (tableroEstado[index] !== "") return;

                tableroEstado[index] = miSimbolo;
                const siguienteTurno = (turnoActual === data.jugador1) ? data.jugador2 : data.jugador1;

                await updateDoc(docRef, {
                    tablero: tableroEstado,
                    turno: siguienteTurno
                });
            } else {
                if (indiceFichaSeleccionada === null) {
                    if (tableroEstado[index] === miSimbolo) {
                        indiceFichaSeleccionada = index;
                        celda.classList.add("celda-seleccionada");
                    }
                } else {
                    if (index === indiceFichaSeleccionada) {
                        indiceFichaSeleccionada = null;
                        celda.classList.remove("celda-seleccionada");
                    } else if (tableroEstado[index] === "") {
                        tableroEstado[indiceFichaSeleccionada] = "";
                        tableroEstado[index] = miSimbolo;
                        indiceFichaSeleccionada = null;

                        const siguienteTurno = (turnoActual === data.jugador1) ? data.jugador2 : data.jugador1;

                        await updateDoc(docRef, {
                            tablero: tableroEstado,
                            turno: siguienteTurno
                        });
                    } else {
                        if (tableroEstado[index] === miSimbolo) {
                            indiceFichaSeleccionada = index;
                            celdas.forEach(c => c.classList.remove("celda-seleccionada"));
                            celda.classList.add("celda-seleccionada");
                        }
                    }
                }
            }
        };
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
            avatarUsuarioLogueado = normalizarSourceImagen(userData.imgperfil);
            if (imgAvatar) imgAvatar.src = avatarUsuarioLogueado;
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
        console.error("Error al obtener los datos del usuario:", error);
    }

    const btnTengoCodigo = document.getElementById("btn-tengo-codigo");
    const btnGenerarCodigo = document.getElementById("btn-generar-codigo");
    const seccionOpciones = document.getElementById("seccion-opciones");
    const seccionIngresarCodigo = document.getElementById("seccion-ingresar-codigo");
    const seccionEsperaCodigo = document.getElementById("seccion-espera-codigo");
    const codigoGeneradoDisplay = document.getElementById("codigo-generado-display");
    const btnUnirsePartida = document.getElementById("btn-unirse-partida");
    const inputCodigoAmigo = document.getElementById("input-codigo-amigo");

    if (btnTengoCodigo) {
        btnTengoCodigo.addEventListener("click", () => {
            if (seccionOpciones) seccionOpciones.style.display = "none";
            if (seccionIngresarCodigo) seccionIngresarCodigo.style.display = "flex";
        });
    }

    if (btnGenerarCodigo) {
        btnGenerarCodigo.addEventListener("click", async () => {
            if (seccionOpciones) seccionOpciones.style.display = "none";
            if (seccionEsperaCodigo) seccionEsperaCodigo.style.display = "flex";

            try {
                const partidasRef = collection(db, "Partidas tres en raya");
                const partidasSnap = await getDocs(partidasRef);
                let maxIdNum = 0;
                let ultimoCodigoNum = -1;

                partidasSnap.forEach(docSnap => {
                    const docId = docSnap.id;
                    if (docId.startsWith("amigotres")) {
                        const numStr = docId.replace("amigotres", "");
                        const num = parseInt(numStr, 10);
                        if (!isNaN(num) && num > maxIdNum) {
                            maxIdNum = num;
                        }
                    }
                    const data = docSnap.data();
                    if (data.codigo !== undefined) {
                        const cNum = parseInt(data.codigo, 10);
                        if (!isNaN(cNum) && cNum > ultimoCodigoNum) {
                            ultimoCodigoNum = cNum;
                        }
                    }
                });

                let siguienteCodigoNum = ultimoCodigoNum + 1;
                if (siguienteCodigoNum > 999999999) {
                    siguienteCodigoNum = 0;
                }
                const codigoGeneradoStr = String(siguienteCodigoNum).padStart(10, '0');

                if (codigoGeneradoDisplay) {
                    codigoGeneradoDisplay.textContent = codigoGeneradoStr;
                }

                const nuevoIdPartida = `amigotres${maxIdNum + 1}`;
                const nuevoDocPartidaRef = doc(db, "Partidas tres en raya", nuevoIdPartida);

                await setDoc(nuevoDocPartidaRef, {
                    codigo: codigoGeneradoStr,
                    enuso: true,
                    fecha: {
                        fecha1: serverTimestamp()
                    },
                    ganador: [],
                    jugador1: nombreUsuarioLogueado,
                    jugador2: "",
                    "partidas jugadas": 0,
                    vecesusado: 0,
                    tablero: ["", "", "", "", "", "", "", "", ""],
                    turno: nombreUsuarioLogueado
                });

                if (unsubPartida) unsubPartida();
                unsubPartida = onSnapshot(nuevoDocPartidaRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const dataPartida = docSnap.data();
                        if (dataPartida.jugador2 && dataPartida.jugador2.trim() !== "") {
                            mostrarTableroJuego();
                            iniciarLogicaTablero(nuevoIdPartida);
                        }
                    }
                });

            } catch (error) {
                console.error("Error al generar el código de partida:", error);
            }
        });
    }

    if (btnUnirsePartida && inputCodigoAmigo) {
        btnUnirsePartida.addEventListener("click", async () => {
            const codigoIngresado = inputCodigoAmigo.value.trim();
            if (!codigoIngresado) {
                mostrarPopupAviso(obtenerTextoTraduccion("error_codigo_vacio", "Por favor, introduce un código válido."));
                return;
            }

            try {
                const partidasRef = collection(db, "Partidas tres en raya");
                const qPartida = query(partidasRef, where("codigo", "==", codigoIngresado), where("enuso", "==", true));
                const querySnap = await getDocs(qPartida);

                if (querySnap.empty) {
                    mostrarPopupAviso(obtenerTextoTraduccion("error_codigo_no_existe", "El código no existe o ya no está en uso."));
                    return;
                }

                const partidaDoc = querySnap.docs[0];
                const partidaData = partidaDoc.data();

                if (partidaData.jugador1 === nombreUsuarioLogueado) {
                    mostrarPopupAviso(obtenerTextoTraduccion("error_propia_partida", "No puedes unirte a tu propia partida como jugador 2."));
                    return;
                }

                const vecesActuales = partidaData.vecesusado !== undefined ? partidaData.vecesusado : 0;
                const nuevoVecesUsado = vecesActuales + 1;
                
                const fechasActuales = partidaData.fecha || {};
                fechasActuales[`fecha${nuevoVecesUsado + 1}`] = serverTimestamp();

                let enUsoNuevo = true;
                if (nuevoVecesUsado >= 999999999) {
                    enUsoNuevo = false;
                }

                const partidaRef = doc(db, "Partidas tres en raya", partidaDoc.id);
                await updateDoc(partidaRef, {
                    jugador2: nombreUsuarioLogueado,
                    vecesusado: nuevoVecesUsado,
                    enuso: enUsoNuevo,
                    fecha: fechasActuales
                });

                mostrarTableroJuego();
                iniciarLogicaTablero(partidaDoc.id);

            } catch (error) {
                console.error("Error al unirse a la partida:", error);
            }
        });
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            if (unsubPartida) unsubPartida();
            window.history.back();
        });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (unsubPartida) unsubPartida();
            if (userDocIdGlobal) {
                try {
                    const userRef = doc(db, "Usuarios", userDocIdGlobal);
                    await updateDoc(userRef, { line: false });
                } catch (err) {
                    console.error("Error al actualizar estado 'line':", err);
                }
            }
            localStorage.clear();
            window.location.href = "../../index.html";
        });
    }
});