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
    serverTimestamp,
    onSnapshot,
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

let codigoPartidaActual = null;
let idDocumentoPartida = null;
let esJugador1 = false;
let unsubscribePartida = null;

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
}

async function obtenerSiguienteIdPartida() {
    const ref = collection(db, "Partidas tres en raya");
    const snapshot = await getDocs(ref);
    let maxNum = 0;
    snapshot.forEach(docSnap => {
        if (docSnap.id.startsWith("amigotres")) {
            const numStr = docSnap.id.replace("amigotres", "");
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `amigotres${maxNum + 1}`;
}

async function obtenerSiguienteIdTransaccion() {
    const ref = collection(db, "Transacciones de NovaPoints");
    const snapshot = await getDocs(ref);
    let maxNum = 0;
    snapshot.forEach(docSnap => {
        if (docSnap.id.startsWith("tresenraya")) {
            const numStr = docSnap.id.replace("tresenraya", "");
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });
    return `tresenraya${maxNum + 1}`;
}

async function obtenerSiguienteCodigo() {
    const ref = collection(db, "Partidas tres en raya");
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
    
    let siguienteNum = maxCodigo + 1;
    if (siguienteNum > 999999999) {
        siguienteNum = 0;
    }
    return String(siguienteNum).padStart(10, '0');
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
        console.error("Error al obtener los datos del usuario:", error);
    }

    // --- LÓGICA DE INTERACCIÓN DE CÓDIGOS Y JUEGO ---
    const btnGenerarCodigo = document.getElementById("btn-generar-codigo");
    const btnIntroducirCodigo = document.getElementById("btn-introducir-codigo");
    const contenedorInputCodigo = document.getElementById("contenedor-input-codigo");
    const contenedorEsperaCodigo = document.getElementById("contenedor-espera-codigo");
    const lblCodigoGenerado = document.getElementById("lbl-codigo-generado");
    const btnUnirseSala = document.getElementById("btn-unirse-sala");
    const inputCodigoSala = document.getElementById("input-codigo-sala");
    const modalCodigo = document.getElementById("modal-codigo");
    const tableroTresenraya = document.getElementById("tablero-tresenraya");
    const mensajeTurno = document.getElementById("mensaje-turno");
    const infoPartidaTxt = document.getElementById("info-partida-txt");

    btnGenerarCodigo.addEventListener("click", async () => {
        const nuevoCodigo = await obtenerSiguienteCodigo();
        const nuevoId = await obtenerSiguienteIdPartida();
        
        idDocumentoPartida = nuevoId;
        codigoPartidaActual = nuevoCodigo;
        esJugador1 = true;

        const partidaData = {
            codigo: nuevoCodigo,
            enuso: true,
            jugador1: nombreUsuarioLogueado,
            jugador2: "",
            partidasjugas: 0,
            ganador: [],
            fecha: {},
            vecesusado: 0
        };

        await setDoc(doc(db, "Partidas tres en raya", nuevoId), partidaData);

        lblCodigoGenerado.textContent = nuevoCodigo;
        btnGenerarCodigo.style.display = "none";
        btnIntroducirCodigo.style.display = "none";
        contenedorEsperaCodigo.style.display = "block";

        iniciarEscuchaPartida(nuevoId);
    });

    btnIntroducirCodigo.addEventListener("click", () => {
        btnGenerarCodigo.style.display = "none";
        btnIntroducirCodigo.style.display = "none";
        contenedorInputCodigo.style.display = "block";
    });

    btnUnirseSala.addEventListener("click", async () => {
        const codigoIngresado = inputCodigoSala.value.trim();
        if (!codigoIngresado) return;

        const refPartidas = collection(db, "Partidas tres en raya");
        const q = query(refPartidas, where("codigo", "==", codigoIngresado), where("enuso", "==", true));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Código no válido o sala no disponible.");
            return;
        }

        const docPartida = querySnapshot.docs[0];
        idDocumentoPartida = docPartida.id;
        codigoPartidaActual = codigoIngresado;
        esJugador1 = false;

        const dataPartida = docPartida.data();
        const nuevoVecesUsado = (dataPartida.vecesusado || 0) + 1;

        let nuevoEnUso = true;
        if (nuevoVecesUsado >= 999999999) {
            nuevoEnUso = false;
        }

        await updateDoc(doc(db, "Partidas tres en raya", idDocumentoPartida), {
            jugador2: nombreUsuarioLogueado,
            vecesusado: nuevoVecesUsado,
            enuso: nuevoEnUso
        });

        modalCodigo.style.display = "none";
        tableroTresenraya.style.display = "block";
        iniciarEscuchaPartida(idDocumentoPartida);
    });

    function iniciarEscuchaPartida(idDoc) {
        unsubscribePartida = onSnapshot(doc(db, "Partidas tres en raya", idDoc), (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();

            if (esJugador1 && data.jugador2) {
                modalCodigo.style.display = "none";
                tableroTresenraya.style.display = "block";
            }

            if (data.jugador1 && data.jugador2) {
                mensajeTurno.textContent = `Jugador 1: ${data.jugador1} | Jugador 2: ${data.jugador2}`;
            }
        });
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            if (unsubscribePartida) unsubscribePartida();
            window.history.back();
        });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            if (unsubscribePartida) unsubscribePartida();
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
