import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField, getDocs, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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
let novasUsuarioGlobal = 0;

// --- BANCO MULTIIDIOMA DE PALABRAS ---
const bancoPalabrasMundi = {
    es: {
        facil: ["CASA", "PERRO", "GATO", "SOL", "LUNA", "MESA", "ZONA", "AGUA", "NENE", "NENA"],
        medio: ["PLATANO", "TECLADO", "VENTANA", "PANTALLA", "BOTANICA", "CUADERNO", "FIRESTORE"],
        dificil: ["MIGRAÑA", "PREMATURO", "SINCRONIA", "ESTRUCTURA", "SUBCORRECCION", "UNIVERSO"]
    },
    en: {
        facil: ["HOME", "DOG", "CAT", "SUN", "MOON", "DESK", "GAME", "BLUE", "BABY", "STAR"],
        medio: ["BANANA", "KEYBOARD", "WINDOW", "SCREEN", "BOTANY", "NOTEBOOK", "DATABASE"],
        dificil: ["MIGRAINE", "PREMATURE", "SYNCHRONY", "STRUCTURE", "CORRECTION", "UNIVERSE"]
    },
    fr: {
        facil: ["CHAT", "CHIEN", "LUNE", "SOLEI", "ZONE", "EAU", "BEBE", "ROSE", "PAIN", "VENT"],
        medio: ["BANANE", "CLAVIER", "FENETRE", "ECRAN", "BOTANIQUE", "CAHIER", "DONNEES"],
        dificil: ["MIGRAINE", "PREMATURE", "SYNCHRONIE", "STRUCTURE", "CORRECTION", "UNIVERS"]
    },
    ro: {
        facil: ["CASA", "CAINE", "PISICA", "SOARE", "LUNA", "MASA", "ZONA", "APA", "COPIL", "STELE"],
        medio: ["BANANA", "TASTATURA", "FEREASTRA", "ECRAN", "BOTANICA", "CAIET", "MATRICE"],
        dificil: ["MIGRENA", "PREMATUR", "SINCRONIE", "STRUCTURA", "CORECTIE", "UNIVERS"]
    }
};

// --- CONFIGURACIÓN DE TECLADOS SEGÚN IDIOMA ---
const tecladosPorIdioma = {
    es: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split(""),
    en: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    fr: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    ro: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
};

let dificultadSeleccionada = "";
let palabraSecreta = "";
let letrasAdivinadas = [];
let intentosRestantes = 6;
let juegoTerminado = false;

const dibujosVisuales = [
    "   ", 
    " 🙂 ", 
    " 🙂<br> │ ", 
    " 🙂<br>/│ ", 
    " 🙂<br>/│\\", 
    " 🙂<br>/│\\<br>/  ", 
    " 💀<br>/│\\<br>/ \\"
];

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

function aplicarTraduccionesEstaticas(idioma) {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs && diccionario["text_subscripcion"] && diccionario["text_subscripcion"][idioma]) {
        lblSubs.textContent = diccionario["text_subscripcion"][idioma];
    }
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver && diccionario["btn_volver"] && diccionario["btn_volver"][idioma]) {
        btnVolver.textContent = diccionario["btn_volver"][idioma];
    }
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout && diccionario["btn_cerrar_sesion"] && diccionario["btn_cerrar_sesion"][idioma]) {
        btnLogout.textContent = diccionario["btn_cerrar_sesion"][idioma];
    }

    const txtEligeDif = document.getElementById("txt-elige-dificultad");
    if (txtEligeDif && diccionario["ahorcado_elige_dificultad"] && diccionario["ahorcado_elige_dificultad"][idioma]) {
        txtEligeDif.textContent = diccionario["ahorcado_elige_dificultad"][idioma];
    }
    const btnFacil = document.getElementById("btn-dif-facil");
    if (btnFacil && diccionario["ahorcado_modo_facil"] && diccionario["ahorcado_modo_facil"][idioma]) {
        btnFacil.textContent = diccionario["ahorcado_modo_facil"][idioma];
    }
    const btnMedio = document.getElementById("btn-dif-medio");
    if (btnMedio && diccionario["ahorcado_modo_medio"] && diccionario["ahorcado_modo_medio"][idioma]) {
        btnMedio.textContent = diccionario["ahorcado_modo_medio"][idioma];
    }
    const btnDificil = document.getElementById("btn-dif-dificil");
    if (btnDificil && diccionario["ahorcado_modo_dificil"] && diccionario["ahorcado_modo_dificil"][idioma]) {
        btnDificil.textContent = diccionario["ahorcado_modo_dificil"][idioma];
    }
    const btnNext = document.getElementById("btn-reiniciar");
    if (btnNext && diccionario["ahorcado_siguiente_palabra"] && diccionario["ahorcado_siguiente_palabra"][idioma]) {
        btnNext.textContent = diccionario["ahorcado_siguiente_palabra"][idioma];
    }
}

async function procesarPremioJuego() {
    if (!userDocIdGlobal) return;
    try {
        let puntosAOtorgar = 0;
        if (dificultadSeleccionada === "facil") {
            puntosAOtorgar = 5;
        } else if (dificultadSeleccionada === "medio") {
            puntosAOtorgar = 10;
        } else if (dificultadSeleccionada === "dificil") {
            puntosAOtorgar = 20;
        }

        if (puntosAOtorgar === 0) return;

        const saldoBaseActual = novasUsuarioGlobal;

        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const snapshotTransacciones = await getDocs(transaccionesRef);
        
        let contadorAhorcado = 0;
        snapshotTransacciones.forEach((docSnap) => {
            if (docSnap.id.startsWith("ahorcado")) {
                contadorAhorcado++;
            }
        });

        const nuevoIdIncremental = `ahorcado${contadorAhorcado + 1}`;
        const nuevoDocTransaccionRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdIncremental);

        await setDoc(nuevoDocTransaccionRef, {
            NovaPoints: puntosAOtorgar,
            donde: "Ahorcado",
            fecha: Timestamp.now(),
            tipo: "suma"
        });

        const nuevoSaldo = saldoBaseActual + puntosAOtorgar;
        const userRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userRef, { NovaPoints: nuevoSaldo });

    } catch (err) {
        console.error("Error gestionando la transacción incremental:", err);
    }
}

function iniciarPartida(nivel) {
    dificultadSeleccionada = nivel;
    letrasAdivinadas = [];
    intentosRestantes = 6;
    juegoTerminado = false;

    const bancoIdioma = bancoPalabrasMundi[currentLanguage] || bancoPalabrasMundi["es"];
    const palabrasDisponibles = bancoIdioma[nivel];
    palabraSecreta = palabrasDisponibles[Math.floor(Math.random() * palabrasDisponibles.length)];

    document.getElementById("pantalla-dificultad").classList.add("oculto");
    document.getElementById("pantalla-juego").classList.remove("oculto");

    const claveModo = `ahorcado_modo_${nivel}`;
    document.getElementById("label-nivel").textContent = (diccionario[claveModo] && diccionario[claveModo][currentLanguage]) || nivel;
    document.getElementById("mensaje-resultado").textContent = "";
    document.getElementById("btn-reiniciar").classList.add("oculto");

    actualizarInterfazJuego();
    generarTecladoVisual();
}

function actualizarInterfazJuego() {
    const textoIntentos = (diccionario["ahorcado_intentos"] && diccionario["ahorcado_intentos"][currentLanguage]) || "Intentos";
    document.getElementById("intentos-restantes").textContent = `${textoIntentos}: ${intentosRestantes}`;
    
    const fallos = 6 - intentosRestantes;
    document.getElementById("dibujo-ahorcado").innerHTML = dibujosVisuales[fallos];

    let display = "";
    for (let char of palabraSecreta) {
        const charNormalizado = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (letrasAdivinadas.includes(charNormalizado)) {
            display += char + " ";
        } else {
            display += "_ ";
        }
    }
    document.getElementById("palabra-con-guiones").textContent = display.trim();

    const palabraNormalizada = palabraSecreta.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let haGanado = true;
    for (let letra of palabraNormalizada) {
        if (!letrasAdivinadas.includes(letra)) {
            haGanado = false;
            break;
        }
    }

    if (haGanado) {
        juegoTerminado = true;
        document.getElementById("mensaje-resultado").textContent = (diccionario["ahorcado_has_ganado"] && diccionario["ahorcado_has_ganado"][currentLanguage]) || "¡Has ganado! 🎉";
        desactivarTecladoVisual();
        document.getElementById("btn-reiniciar").classList.remove("oculto");

        procesarPremioJuego();
    } else if (intentosRestantes <= 0) {
        juegoTerminado = true;
        const textoPerdido = (diccionario["ahorcado_has_perdido"] && diccionario["ahorcado_has_perdido"][currentLanguage]) || "¡Perdiste!";
        document.getElementById("mensaje-resultado").textContent = `${textoPerdido} Era: ${palabraSecreta} 😢`;
        desactivarTecladoVisual();
        document.getElementById("btn-reiniciar").classList.remove("oculto");
    }
}

function generarTecladoVisual() {
    const contenedorTeclado = document.getElementById("teclado-letras");
    contenedorTeclado.innerHTML = "";
    
    const letras = tecladosPorIdioma[currentLanguage] || tecladosPorIdioma["es"];

    letras.forEach(letra => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-letra";
        btn.setAttribute("data-key", letra);
        btn.textContent = letra;
        
        btn.addEventListener("click", () => {
            presionarLetra(letra);
        });
        contenedorTeclado.appendChild(btn);
    });
}

function presionarLetra(letra) {
    if (juegoTerminado) return;

    const letraNormalizada = letra.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (letrasAdivinadas.includes(letraNormalizada)) return;

    const btnVisual = document.querySelector(`.btn-letra[data-key="${letraNormalizada}"]`);
    if (btnVisual) btnVisual.disabled = true;

    const palabraNormalizada = palabraSecreta.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (palabraNormalizada.includes(letraNormalizada)) {
        letrasAdivinadas.push(letraNormalizada);
    } else {
        intentosRestantes--;
    }

    actualizarInterfazJuego();
}

function desactivarTecladoVisual() {
    const botones = document.querySelectorAll(".btn-letra");
    botones.forEach(btn => btn.disabled = true);
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en AHORCADO:", error);
    }

    aplicarTraduccionesEstaticas(currentLanguage);

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");

    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "../../index.html";
        return;
    }

    const botonesDificultad = document.querySelectorAll(".btn-dificultad");
    botonesDificultad.forEach(btn => {
        btn.addEventListener("click", () => {
            iniciarPartida(btn.getAttribute("data-nivel"));
        });
    });

    document.getElementById("btn-reiniciar").addEventListener("click", () => {
        iniciarPartida(dificultadSeleccionada);
    });

    document.getElementById("btn-cambiar-modo").addEventListener("click", () => {
        juegoTerminado = true;
        document.getElementById("pantalla-juego").classList.add("oculto");
        document.getElementById("pantalla-dificultad").classList.remove("oculto");
    });

    // --- ENLACE AL TECLADO FÍSICO CORREGIDO ---
    document.addEventListener("keydown", (event) => {
        if (document.getElementById("pantalla-juego").classList.contains("oculto") || juegoTerminado) {
            return;
        }
        
        const teclaPresionada = event.key.toUpperCase();
        
        const letrasValidas = tecladosPorIdioma[currentLanguage] || tecladosPorIdioma["es"];
        if (letrasValidas.includes(teclaPresionada)) {
            event.preventDefault();
            presionarLetra(teclaPresionada);
        }
    });

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

    // --- ESCUCHA EN TIEMPO REAL DEL USUARIO (onSnapshot) ---
    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    onSnapshot(qUsuario, async (querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            if (imgAvatar) imgAvatar.src = userData.imgperfil || "../../default-profile.png";
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;
            novasUsuarioGlobal = userData.NovaPoints !== undefined ? Number(userData.NovaPoints) : 0;

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
                        valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
                        const userRef = doc(db, "Usuarios", userDocIdGlobal);
                        await updateDoc(userRef, { subs: deleteField() });
                    } else {
                        if (userData.subs.diasrestantes === undefined || userData.subs.diasrestantes !== diasCalculados) {
                            const userRef = doc(db, "Usuarios", userDocIdGlobal);
                            await updateDoc(userRef, { "subs.diasrestantes": diasCalculados });
                        }
                        valSubs.textContent = `${subsUsuarioGlobal} (${diasCalculados}d)`;
                    }
                } else {
                    const dias = userData.subs.diasrestantes !== undefined ? userData.subs.diasrestantes : 0;
                    valSubs.textContent = `${subsUsuarioGlobal} (${dias}d)`;
                }
            } else {
                subsUsuarioGlobal = "";
                valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
            }
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en AHORCADO:", error);
    });

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