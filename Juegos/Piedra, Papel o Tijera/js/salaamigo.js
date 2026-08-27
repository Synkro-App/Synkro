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

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "salaamigo_titulo": { "es": "Jugar con Amigo", "en": "Play with Friend", "fr": "Jouer avec un Ami", "ro": "Joacă cu un Prieten" },
    "tengo_codigo": { "es": "Tengo un código", "en": "I have a code", "fr": "J'ai un code", "ro": "Am un cod" },
    "generar_codigo": { "es": "Generar un código", "en": "Generate a code", "fr": "Générer un code", "ro": "Generează un cod" },
    "piedra": { "es": "Piedra 🪨", "en": "Rock 🪨", "fr": "Pierre 🪨", "ro": "Piatră 🪨" },
    "papel": { "es": "Papel 📋", "en": "Paper 📋", "fr": "Papier 📋", "ro": "Hârtie 📋" },
    "tijera": { "es": "Tijera ✂️", "en": "Scissors ✂️", "fr": "Ciseaux ✂️", "ro": "Foarfece ✂️" },
    "esperando_segundo": { "es": "Esperando al segundo jugador... Tu código es: <strong>{codigo}</strong>", "en": "Waiting for the second player... Your code is: <strong>{codigo}</strong>", "fr": "En attente du deuxième joueur... Votre code est : <strong>{codigo}</strong>", "ro": "Se așteaptă al doilea jucător... Codul tău este: <strong>{codigo}</strong>" },
    "jugador_no_quiere": { "es": "{nombre} ya no quiere o puede jugar.", "en": "{nombre} no longer wants or can play.", "fr": "{nombre} ne veut plus ou ne peut plus jouer.", "ro": "{nombre} nu mai vrea sau nu poate juca." },
    "jugador_no_quiere_volver": { "es": "{nombre} ya no quiere o puede volver a jugar.", "en": "{nombre} no longer wants or can play again.", "fr": "{nombre} ne veut plus ou ne peut plus rejouer.", "ro": "{nombre} nu mai vrea sau nu poate juca din nou." },
    "quiere_volver_jugar": { "es": "El jugador <strong>{nombre}</strong> quiere volver a jugar.", "en": "Player <strong>{nombre}</strong> wants to play again.", "fr": "Le joueur <strong>{nombre}</strong> veut rejouer.", "ro": "Jucătorul <strong>{nombre}</strong> vrea să joace din nou." },
    "btn_aceptar": { "es": "Aceptar", "en": "Accept", "fr": "Accepter", "ro": "Acceptă" },
    "btn_rechazar": { "es": "Rechazar", "en": "Reject", "fr": "Rejeter", "ro": "Respinge" },
    "btn_cerrar": { "es": "Cerrar", "en": "Close", "fr": "Fermer", "ro": "Închide" },
    "btn_volver_jugar": { "es": "Volver a jugar", "en": "Play again", "fr": "Rejouer", "ro": "Joacă din nou" },
    "esperando_respuesta": { "es": "Esperando la respuesta del otro jugador...", "en": "Waiting for the other player's response...", "fr": "En attente de la réponse de l'autre joueur...", "ro": "Se așteaptă răspunsul celuilalt jucător..." },
    "resultado_ronda": { "es": "Resultado de la ronda", "en": "Round result", "fr": "Résultat de la manche", "ro": "Rezultatul rundei" },
    "partida_empatada": { "es": "Partida empatada", "en": "Tied game", "fr": "Match nul", "ro": "Joc egal" },
    "ganador_jugador_1": { "es": "Ganador Jugador 1: {nombre}", "en": "Winner Player 1: {nombre}", "fr": "Gagnant Joueur 1 : {nombre}", "ro": "Câștigător Jucător 1: {nombre}" },
    "ganador_jugador_2": { "es": "Ganador Jugador 2: {nombre}", "en": "Winner Player 2: {nombre}", "fr": "Gagnant Joueur 2 : {nombre}", "ro": "Câștigător Jucător 2: {nombre}" },
    "eleccion_guardada": { "es": "Elección guardada. Esperando al otro jugador...", "en": "Choice saved. Waiting for the other player...", "fr": "Choix enregistré. En attente de l'autre joueur...", "ro": "Alegerea salvată. Se așteaptă celălalt jucător..." },
    "elige_opcion": { "es": "Elige tu opción:", "en": "Choose your option:", "fr": "Choisissez votre option :", "ro": "Alege-ți opțiunea:" },
    "codigo_no_valido": { "es": "Código no válido o partida ya llena.", "en": "Invalid code or game already full.", "fr": "Code invalide ou partie déjà pleine.", "ro": "Cod invalid sau jocul este deja plin." }
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

function obtenerTextoTraduccion(clave, fallbackTexto, reemplazos = {}) {
    let texto = fallbackTexto;
    if (diccionario[clave] && diccionario[clave][currentLanguage]) {
        texto = diccionario[clave][currentLanguage];
    } else if (traduccionesLocales[clave] && traduccionesLocales[clave][currentLanguage]) {
        texto = traduccionesLocales[clave][currentLanguage];
    }
    for (const [key, value] of Object.entries(reemplazos)) {
        texto = texto.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return texto;
}

function aplicarTraduccionesEstaticas() {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs) lblSubs.textContent = obtenerTextoTraduccion("text_subscripcion", "Suscripción:");
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) btnVolver.textContent = obtenerTextoTraduccion("btn_volver", "Volver");
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "Cerrar sesión");
    
    const tituloSalaAmigo = document.getElementById("titulo-salaamigo");
    if (tituloSalaAmigo) tituloSalaAmigo.textContent = obtenerTextoTraduccion("salaamigo_titulo", "Jugar con Amigo");
    
    const btnTengo = document.getElementById("btn-tengo-codigo");
    if (btnTengo) btnTengo.textContent = obtenerTextoTraduccion("tengo_codigo", "Tengo un código");
    
    const btnGenerar = document.getElementById("btn-generar-codigo");
    if (btnGenerar) btnGenerar.textContent = obtenerTextoTraduccion("generar_codigo", "Generar un código");

    const btnPiedra = document.getElementById("btn-amigo-piedra");
    if (btnPiedra) btnPiedra.textContent = obtenerTextoTraduccion("piedra", "Piedra 🪨");
    
    const btnPapel = document.getElementById("btn-amigo-papel");
    if (btnPapel) btnPapel.textContent = obtenerTextoTraduccion("papel", "Papel 📋");
    
    const btnTijera = document.getElementById("btn-amigo-tijera");
    if (btnTijera) btnTijera.textContent = obtenerTextoTraduccion("tijera", "Tijera ✂️");
}

async function registrarNovaPointsAmigo() {
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
        
        await setDoc(nuevoDocRef, {
            NovaPoints: 10,
            "donde": "Piedra, Papel o Tijera",
            fecha: serverTimestamp(),
            modo: "con amigo",
            tipo: "suma"
        });

        const userDocRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userDocRef, {
            NovaPoints: increment(10)
        });

        const txtNovas = document.getElementById("user-novas");
        if (txtNovas) {
            const actual = parseInt(txtNovas.textContent, 10) || 0;
            txtNovas.textContent = actual + 10;
        }
    } catch (error) {
        console.error("Error al registrar NovaPoints con amigo:", error);
    }
}

async function generarNuevoCodigoPartida() {
    try {
        const partidasRef = collection(db, "Partidas de piedra papel o tijera");
        const querySnapshot = await getDocs(partidasRef);
        
        let contadorAmigo = 1;
        let codigoIncremental = 0;
        let codigosExistentes = new Set();

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.codigo !== undefined) {
                codigosExistentes.add(parseInt(data.codigo, 10));
            }
            if (docSnap.id.startsWith("amigo")) {
                const numeroStr = docSnap.id.replace("amigo", "");
                const num = parseInt(numeroStr, 10);
                if (!isNaN(num) && num >= contadorAmigo) {
                    contadorAmigo = num + 1;
                }
            }
        });

        while (codigosExistentes.has(codigoIncremental)) {
            codigoIncremental++;
        }

        partidaIdGlobal = `amigo${contadorAmigo}`;
        esJugador1 = true;

        const nuevaPartidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
        await setDoc(nuevaPartidaRef, {
            codigo: String(codigoIncremental),
            "Jugador 1": nombreUsuarioLogueado,
            "Jugador 2": "",
            fecha: [],
            ganador: [],
            partidasjugadas: 0
        });

        const msgEspera = obtenerTextoTraduccion("esperando_segundo", "Esperando al segundo jugador... Tu código es: <strong>{codigo}</strong>", { codigo: codigoIncremental });
        mostrarModalEspera(msgEspera, false);
        escucharPartida(partidaIdGlobal);

    } catch (error) {
        console.error("Error generando código de partida:", error);
    }
}

async function unirseConCodigo(codigoIngresado) {
    if (!codigoIngresado) return;
    try {
        const partidasRef = collection(db, "Partidas de piedra papel o tijera");
        const querySnapshot = await getDocs(partidasRef);
        
        let docEncontradoId = null;
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (String(data.codigo).trim() === String(codigoIngresado).trim() && (!data["Jugador 2"] || data["Jugador 2"] === "")) {
                docEncontradoId = docSnap.id;
            }
        });

        if (!docEncontradoId) {
            alert(obtenerTextoTraduccion("codigo_no_valido", "Código no válido o partida ya llena."));
            return;
        }

        partidaIdGlobal = docEncontradoId;
        esJugador1 = false;

        const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
        await updateDoc(partidaRef, {
            "Jugador 2": nombreUsuarioLogueado
        });

        document.getElementById("modal-tengo-codigo").style.display = "none";
        escucharPartida(partidaIdGlobal);

    } catch (error) {
        console.error("Error uniéndose a la partida:", error);
    }
}

function escucharPartida(idPartida) {
    const partidaRef = doc(db, "Partidas de piedra papel o tijera", idPartida);
    
    unsubscribePartida = onSnapshot(partidaRef, async (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();

        if (data.partida === "terminada") {
            document.getElementById("modal-espera").style.display = "flex";
            const nombreSolicitante = data.ultimoSolicitante || "El otro jugador";
            document.getElementById("texto-modal-espera").textContent = obtenerTextoTraduccion("jugador_no_quiere", "{nombre} ya no quiere o puede jugar.", { nombre: nombreSolicitante });
            const contenedorBones = document.getElementById("contenedor-botones-espera");
            const textoAceptar = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
            contenedorBones.innerHTML = `<button type="button" id="btn-aceptar-salida" class="btn-default">${textoAceptar}</button>`;
            document.getElementById("btn-aceptar-salida").addEventListener("click", () => {
                window.location.reload();
            });
            return;
        }

        if (data.peticion === "esperando" && data.ultimoSolicitante && data.ultimoSolicitante !== nombreUsuarioLogueado) {
            document.getElementById("modal-espera").style.display = "flex";
            const nombreSolicitante = data.ultimoSolicitante;
            document.getElementById("texto-modal-espera").textContent = obtenerTextoTraduccion("jugador_no_quiere_volver", "{nombre} ya no quiere o puede volver a jugar.", { nombre: nombreSolicitante });
            const contenedorBones = document.getElementById("contenedor-botones-espera");
            const textoAceptar = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
            contenedorBones.innerHTML = `<button type="button" id="btn-aceptar-salida-peticion" class="btn-default">${textoAceptar}</button>`;
            document.getElementById("btn-aceptar-salida-peticion").addEventListener("click", () => {
                window.location.href = "../../index.html";
            });
            return;
        }

        if (data.peticion === "espera" && data.ultimoSolicitante && data.ultimoSolicitante !== nombreUsuarioLogueado) {
            document.getElementById("modal-espera").style.display = "flex";
            const nombreSolicitante = data.ultimoSolicitante;
            document.getElementById("texto-modal-espera").innerHTML = obtenerTextoTraduccion("quiere_volver_jugar", "El jugador <strong>{nombre}</strong> quiere volver a jugar.", { nombre: nombreSolicitante });
            const contenedorBones = document.getElementById("contenedor-botones-espera");
            const textoRechazar = obtenerTextoTraduccion("btn_rechazar", "Rechazar");
            const textoAceptar = obtenerTextoTraduccion("btn_aceptar", "Aceptar");
            contenedorBones.innerHTML = `
                <button type="button" id="btn-rechazar-juego" class="btn-default">${textoRechazar}</button>
                <button type="button" id="btn-aceptar-juego" class="btn-default" style="background: linear-gradient(135deg, #00aeff, #00eeff);">${textoAceptar}</button>
            `;

            document.getElementById("btn-aceptar-juego").addEventListener("click", async () => {
                await updateDoc(partidaRef, {
                    peticion: deleteField(),
                    ultimoSolicitante: deleteField(),
                    eleccionJ1: deleteField(),
                    eleccionJ2: deleteField()
                });
                rondaProcesadaUltima = null;
                document.getElementById("modal-espera").style.display = "none";
            });

            document.getElementById("btn-rechazar-juego").addEventListener("click", async () => {
                await updateDoc(partidaRef, {
                    peticion: "esperando",
                    ultimoSolicitante: nombreUsuarioLogueado
                });
            });
            return;
        }

        if (data.partida === "espera") {
            const e1 = data.eleccionJ1;
            const e2 = data.eleccionJ2;
            let resultadoRonda = "";
            let ganadorRonda = "empate";

            if (e1 === e2) {
                resultadoRonda = obtenerTextoTraduccion("partida_empatada", "Partida empatada");
            } else if (
                (e1 === "piedra" && e2 === "tijera") ||
                (e1 === "papel" && e2 === "piedra") ||
                (e1 === "tijera" && e2 === "papel")
            ) {
                resultadoRonda = obtenerTextoTraduccion("ganador_jugador_1", "Ganador Jugador 1: {nombre}", { nombre: data["Jugador 1"] });
                ganadorRonda = data["Jugador 1"];
            } else {
                resultadoRonda = obtenerTextoTraduccion("ganador_jugador_2", "Ganador Jugador 2: {nombre}", { nombre: data["Jugador 2"] });
                ganadorRonda = data["Jugador 2"];
            }

            mostrarModalEspera(`
                <h3>${resultadoRonda}</h3>
            `, true);
            return;
        }

        if (data["Jugador 1"] && data["Jugador 2"]) {
            document.getElementById("panel-opciones-iniciales").style.display = "none";
            document.getElementById("modal-espera").style.display = "none";
            document.getElementById("panel-juego-amigo").style.display = "flex";

            const ganadores = data.ganador || [];
            let score1 = 0;
            let score2 = 0;
            ganadores.forEach(g => {
                if (g === data["Jugador 1"]) score1++;
                if (g === data["Jugador 2"]) score2++;
            });

            document.getElementById("score-amigo-j1").textContent = score1;
            document.getElementById("score-amigo-j2").textContent = score2;
            document.getElementById("text-jugador1-amigo").innerHTML = `${data["Jugador 1"]}: <strong id="score-amigo-j1">${score1}</strong>`;
            document.getElementById("text-jugador2-amigo").innerHTML = `${data["Jugador 2"]}: <strong id="score-amigo-j2">${score2}</strong>`;

            const campoEleccionPropio = esJugador1 ? "eleccionJ1" : "eleccionJ2";
            const campoEleccionContrario = esJugador1 ? "eleccionJ2" : "eleccionJ1";

            if (data[campoEleccionPropio] && !data[campoEleccionContrario]) {
                document.getElementById("turno-indicator-amigo").textContent = obtenerTextoTraduccion("eleccion_guardada", "Elección guardada. Esperando al otro jugador...");
                document.getElementById("botones-eleccion-amigo").style.display = "none";
            } else if (data[campoEleccionPropio] && data[campoEleccionContrario]) {
                const idRondaActual = `${data.partidasjugadas}-${data.eleccionJ1}-${data.eleccionJ2}`;
                if (rondaProcesadaUltima !== idRondaActual) {
                    rondaProcesadaUltima = idRondaActual;
                    await procesarFinRondaAmigo(data);
                }
            } else {
                document.getElementById("turno-indicator-amigo").textContent = obtenerTextoTraduccion("elige_opcion", "Elige tu opción:");
                document.getElementById("botones-eleccion-amigo").style.display = "flex";
            }
        }
    });
}

async function realizarEleccionAmigo(eleccion) {
    if (!partidaIdGlobal) return;
    const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
    const campoEleccion = esJugador1 ? "eleccionJ1" : "eleccionJ2";

    await updateDoc(partidaRef, {
        [campoEleccion]: eleccion
    });
}

async function procesarFinRondaAmigo(data) {
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
            if (esJugador1) {
                await registrarNovaPointsAmigo();
            }
        } else {
            ganadorRonda = data["Jugador 2"];
            if (!esJugador1) {
                await registrarNovaPointsAmigo();
            }
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

function mostrarModalEspera(htmlContenido, mostrarBotonesAccion) {
    const modal = document.getElementById("modal-espera");
    modal.style.display = "flex";
    document.getElementById("texto-modal-espera").innerHTML = htmlContenido;
    
    const contenedorBones = document.getElementById("contenedor-botones-espera");
    if (mostrarBotonesAccion) {
        const textoCerrar = obtenerTextoTraduccion("btn_cerrar", "Cerrar");
        const textoVolverJugar = obtenerTextoTraduccion("btn_volver_jugar", "Volver a jugar");
        contenedorBones.innerHTML = `
            <button type="button" id="btn-cerrar-partida" class="btn-default">${textoCerrar}</button>
            <button type="button" id="btn-volver-jugar" class="btn-default" style="background: linear-gradient(135deg, #00aeff, #00eeff);">${textoVolverJugar}</button>
        `;

        document.getElementById("btn-cerrar-partida").addEventListener("click", async () => {
            if (partidaIdGlobal) {
                const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
                await updateDoc(partidaRef, {
                    partida: "terminada",
                    ultimoSolicitante: nombreUsuarioLogueado
                });
            }
            window.location.reload();
        });

        document.getElementById("btn-volver-jugar").addEventListener("click", async () => {
            if (partidaIdGlobal) {
                const partidaRef = doc(db, "Partidas de piedra papel o tijera", partidaIdGlobal);
                await updateDoc(partidaRef, {
                    peticion: "espera",
                    ultimoSolicitante: nombreUsuarioLogueado,
                    partida: deleteField(),
                    eleccionJ1: deleteField(),
                    eleccionJ2: deleteField()
                });
                const msgEsperando = obtenerTextoTraduccion("esperando_respuesta", "Esperando la respuesta del otro jugador...");
                mostrarModalEspera(msgEsperando, false);
            }
        });
    } else {
        contenedorBones.innerHTML = "";
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

    document.getElementById("btn-generar-codigo").addEventListener("click", () => {
        generarNuevoCodigoPartida();
    });

    document.getElementById("btn-tengo-codigo").addEventListener("click", () => {
        document.getElementById("modal-tengo-codigo").style.display = "flex";
    });

    document.getElementById("btn-cancelar-codigo").addEventListener("click", () => {
        document.getElementById("modal-tengo-codigo").style.display = "none";
    });

    document.getElementById("btn-unirse-codigo").addEventListener("click", () => {
        const codigoVal = document.getElementById("input-codigo-amigo").value;
        unirseConCodigo(codigoVal);
    });

    document.getElementById("btn-amigo-piedra").addEventListener("click", () => realizarEleccionAmigo("piedra"));
    document.getElementById("btn-amigo-papel").addEventListener("click", () => realizarEleccionAmigo("papel"));
    document.getElementById("btn-amigo-tijera").addEventListener("click", () => realizarEleccionAmigo("tijera"));

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
            window.location.href = "../../index.html";
        });
    }
});