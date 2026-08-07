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

let scoreUsuario = 0;
let scoreIa = 0;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "iadificil_titulo": { "es": "Piedra, Papel o Tijera - Difícil", "en": "Rock, Paper, Scissors - Hard", "fr": "Pierre, Papier, Ciseaux - Difficile", "ro": "Piatră, Hârtie sau Foarfece - Greu" },
    "piedra": { "es": "Piedra 🪨", "en": "Rock 🪨", "fr": "Pierre 🪨", "ro": "Piatră 🪨" },
    "papel": { "es": "Papel 📋", "en": "Paper 📋", "fr": "Papier 📋", "ro": "Hârtie 📋" },
    "tijera": { "es": "Tijera ✂️", "en": "Scissors ✂️", "fr": "Ciseaux ✂️", "ro": "Foarfece ✂️" },
    "tu_eleccion": { "es": "Tu elección", "en": "Your choice", "fr": "Votre choix", "ro": "Alegerea ta" },
    "eleccion_ia": { "es": "Elección IA", "en": "AI Choice", "fr": "Choix IA", "ro": "Alegerea IA" },
    "empate": { "es": "¡Empate!", "en": "It's a tie!", "fr": "Égalité !", "ro": "Egalitate!" },
    "ganas": { "es": "¡Has ganado! (+20 NovaPoints)", "en": "You win! (+20 NovaPoints)", "fr": "Vous avez gagné ! (+20 NovaPoints)", "ro": "Ai câștigat! (+20 NovaPoints)" },
    "pierdes": { "es": "¡Has perdido!", "en": "You lose!", "fr": "Vous avez perdu !", "ro": "Ai pierdut!" }
};

const emojisOpciones = {
    "piedra": "🪨",
    "papel": "📋",
    "tijera": "✂️"
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
    
    const tituloIaDificil = document.getElementById("titulo-iadificil");
    if (tituloIaDificil) tituloIaDificil.textContent = obtenerTextoTraduccion("iadificil_titulo", "Piedra, Papel o Tijera - Difícil");
    
    const btnPiedra = document.getElementById("btn-piedra");
    if (btnPiedra) btnPiedra.textContent = obtenerTextoTraduccion("piedra", "Piedra 🪨");
    
    const btnPapel = document.getElementById("btn-papel");
    if (btnPapel) btnPapel.textContent = obtenerTextoTraduccion("papel", "Papel 📋");
    
    const btnTijera = document.getElementById("btn-tijera");
    if (btnTijera) btnTijera.textContent = obtenerTextoTraduccion("tijera", "Tijera ✂️");

    const lblTuEleccion = document.getElementById("label-tu-eleccion");
    if (lblTuEleccion) lblTuEleccion.textContent = obtenerTextoTraduccion("tu_eleccion", "Tu elección");

    const lblIaEleccion = document.getElementById("label-ia-eleccion");
    if (lblIaEleccion) lblIaEleccion.textContent = obtenerTextoTraduccion("eleccion_ia", "Elección IA");
}

async function registrarVictoriaNovaPoints() {
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
            NovaPoints: 20,
            "donde": "Piedra, Papel o Tijera",
            fecha: serverTimestamp(),
            modo: "iadificil",
            tipo: "suma"
        });

        const userDocRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userDocRef, {
            NovaPoints: increment(20)
        });

        const txtNovas = document.getElementById("user-novas");
        if (txtNovas) {
            const actual = parseInt(txtNovas.textContent, 10) || 0;
            txtNovas.textContent = actual + 20;
        }
    } catch (error) {
        console.error("Error al registrar la transacción de NovaPoints:", error);
    }
}

function jugar(eleccionUsuario) {
    // IA Modo Difícil Ajustado (Casi imposible real): 75% probabilidad de ganar a la mala, 20% empate y solo un 5% de que puedas ganar (aprox 1 de cada 20)
    let eleccionIa;
    const probabilidad = Math.random();
    
    if (probabilidad < 0.75) {
        // La IA te gana (75%)
        if (eleccionUsuario === "piedra") eleccionIa = "papel";
        else if (eleccionUsuario === "papel") eleccionIa = "tijera";
        else eleccionIa = "piedra";
    } else if (probabilidad < 0.95) {
        // Empate (20%)
        eleccionIa = eleccionUsuario;
    } else {
        // La IA te deja ganar (5% - estrictamente controlado para que sea muy difícil)
        if (eleccionUsuario === "piedra") eleccionIa = "tijera";
        else if (eleccionUsuario === "papel") eleccionIa = "piedra";
        else eleccionIa = "papel";
    }

    const displayTu = document.getElementById("display-tu-eleccion");
    const displayIa = document.getElementById("display-ia-eleccion");
    const txtResultado = document.getElementById("resultado-partida");
    const scoreUsrElem = document.getElementById("score-usuario");
    const scoreIaElem = document.getElementById("score-ia");

    if (displayTu) displayTu.textContent = emojisOpciones[eleccionUsuario] || "❓";
    if (displayIa) displayIa.textContent = emojisOpciones[eleccionIa] || "❓";

    if (eleccionUsuario === eleccionIa) {
        if (txtResultado) txtResultado.textContent = obtenerTextoTraduccion("empate", "¡Empate!");
    } else if (
        (eleccionUsuario === "piedra" && eleccionIa === "tijera") ||
        (eleccionUsuario === "papel" && eleccionIa === "piedra") ||
        (eleccionUsuario === "tijera" && eleccionIa === "papel")
    ) {
        if (txtResultado) txtResultado.textContent = obtenerTextoTraduccion("ganas", "¡Has ganado! (+20 NovaPoints)");
        scoreUsuario++;
        if (scoreUsrElem) scoreUsrElem.textContent = scoreUsuario;
        registrarVictoriaNovaPoints();
    } else {
        if (txtResultado) txtResultado.textContent = obtenerTextoTraduccion("pierdes", "¡Has perdido!");
        scoreIa++;
        if (scoreIaElem) scoreIaElem.textContent = scoreIa;
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

    const btnPiedra = document.getElementById("btn-piedra");
    if (btnPiedra) btnPiedra.addEventListener("click", () => jugar("piedra"));

    const btnPapel = document.getElementById("btn-papel");
    if (btnPapel) btnPapel.addEventListener("click", () => jugar("papel"));

    const btnTijera = document.getElementById("btn-tijera");
    if (btnTijera) btnTijera.addEventListener("click", () => jugar("tijera"));

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