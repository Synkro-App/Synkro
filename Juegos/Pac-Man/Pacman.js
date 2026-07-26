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
let novasUsuarioGlobal = 0;
let edadUsuarioGlobal = 0;
let subsUsuarioGlobal = "";

// --- VARIABLES DEL PAC-MAN ---
const canvas = document.getElementById("pacmanCanvas");
const ctx = canvas.getContext("2d");
const sizeC = 15; 

// Laberinto Base Clásico (1=Muro, 0=Bolita, 3=Batería Azul Grande, 2=Espacio Vacío)
const mapaBase = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,2,1,2,1,1,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,2,1,1,2,1,1,2,1,0,1,1,1,1],
    [2,2,2,2,0,2,2,1,2,2,2,1,2,2,0,2,2,2,2],
    [1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1],
    [2,2,2,1,0,1,2,2,2,2,2,2,2,1,0,1,2,2,2],
    [1,1,1,1,0,1,2,1,1,1,1,1,2,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,3,0,1,0,0,0,0,0,2,0,0,0,0,0,1,0,3,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let mapaActual = [];
let pacman = { x: 9, y: 16, dx: 0, dy: 0, nextDx: 0, nextDy: 0, anguloBoca: 0, abriendo: true };

// Los 4 Fantasmas Originales
let fantasmas = [];
let modoAsustadoTicks = 0; 

let nivelActual = 1;
let puntosAcumuladosPartida = 0;

let bucleJuegoId = null;
let juegoEjecutandose = false;

let touchStartX = 0;
let touchStartY = 0;
const umbralDeslizar = 30;

// --- FUNCIÓN DE CÁLCULO DE EDAD ---
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

// Función auxiliar para traducir la palabra "Nivel" o "Level"
function obtenerTextoNivel(idioma) {
    const traduccionesNivel = {
        es: "Nivel",
        en: "Level",
        fr: "Niveau",
        ro: "Nivel"
    };
    return traduccionesNivel[idioma] || traduccionesNivel["es"];
}

function aplicarTraduccionesEstaticas(idioma) {
    // Título e Inicio
    const txtTitulo = document.getElementById("txt-titulo-pacman");
    if (txtTitulo && diccionario["pacman_titulo"] && diccionario["pacman_titulo"][idioma]) {
        txtTitulo.textContent = diccionario["pacman_titulo"][idioma];
    }
    const btnPlay = document.getElementById("btn-comenzar");
    if (btnPlay && diccionario["pacman_jugar_partida"] && diccionario["pacman_jugar_partida"][idioma]) {
        btnPlay.textContent = diccionario["pacman_jugar_partida"][idioma];
    }

    // Cabecera Común
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver && diccionario["btn_volver"] && diccionario["btn_volver"][idioma]) {
        btnVolver.textContent = diccionario["btn_volver"][idioma];
    }
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout && diccionario["btn_cerrar_sesion"] && diccionario["btn_cerrar_sesion"][idioma]) {
        btnLogout.textContent = diccionario["btn_cerrar_sesion"][idioma];
    }

    // Modal Intermedio
    const popTitulo = document.getElementById("txt-pop-titulo");
    if (popTitulo && diccionario["pacman_nivel_superado"] && diccionario["pacman_nivel_superado"][idioma]) {
        popTitulo.textContent = diccionario["pacman_nivel_superado"][idioma];
    }
    const popSub = document.getElementById("txt-pop-sub");
    if (popSub && diccionario["pacman_preparando_mapa"] && diccionario["pacman_preparando_mapa"][idioma]) {
        popSub.textContent = diccionario["pacman_preparando_mapa"][idioma];
    }
    const popBtn = document.getElementById("btn-pop-continuar");
    if (popBtn && diccionario["pacman_continuar"] && diccionario["pacman_continuar"][idioma]) {
        popBtn.textContent = diccionario["pacman_continuar"][idioma];
    }

    // Fin de partida / Game Over
    const btnRetry = document.getElementById("btn-reiniciar");
    if (btnRetry && diccionario["snake_volver_a_jugar"] && diccionario["snake_volver_a_jugar"][idioma]) {
        btnRetry.textContent = diccionario["snake_volver_a_jugar"][idioma];
    }
    const btnQuitGO = document.getElementById("btn-terminar-go");
    if (btnQuitGO && diccionario["snake_terminar_partida"] && diccionario["snake_terminar_partida"][idioma]) {
        btnQuitGO.textContent = diccionario["snake_terminar_partida"][idioma];
    }
}

async function finalizarYSubirTransaccion(nivelAlcanzado) {
    if (!userDocIdGlobal || puntosAcumuladosPartida <= 0) return;

    const totalAGanar = puntosAcumuladosPartida;
    puntosAcumuladosPartida = 0; 

    try {
        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const snapshotTransacciones = await getDocs(transaccionesRef);
        
        let contadorPacman = 0;
        snapshotTransacciones.forEach((docSnap) => {
            if (docSnap.id.startsWith("pacman")) {
                contadorPacman++;
            }
        });

        const nuevoIdIncremental = `pacman${contadorPacman + 1}`;
        const nuevoDocTransaccionRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdIncremental);

        await setDoc(nuevoDocTransaccionRef, {
            NovaPoints: totalAGanar,
            donde: "Pac-Man",
            fecha: Timestamp.now(),
            niveles_jugados: nivelAlcanzado,
            tipo: "suma"
        });

        const nuevoSaldo = novasUsuarioGlobal + totalAGanar;
        const userRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userRef, { NovaPoints: nuevoSaldo });

    } catch (err) {
        console.error("Error al registrar transaccion de Pacman:", err);
    }
}

function iniciarCargaNivel(nivel) {
    nivelActual = nivel;
    
    // Corregido: ya no muestra "Fácil", sino el nivel numérico real traducido
    const palabraNivel = obtenerTextoNivel(currentLanguage);
    document.getElementById("label-nivel").textContent = `${palabraNivel} ${nivelActual}`;
    
    mapaActual = JSON.parse(JSON.stringify(mapaBase));
    modoAsustadoTicks = 0;

    // Reset Pacman
    pacman.x = 9;
    pacman.y = 16;
    pacman.dx = 0;
    pacman.dy = 0;
    pacman.nextDx = 0;
    pacman.nextDy = 0;

    // Ajuste de ticks para velocidad de IA según dificultad
    let ticksNormales = 4; // Nivel 1
    if (nivelActual === 2) ticksNormales = 3; 
    if (nivelActual === 3) ticksNormales = 2; // Nivel 3

    // Inicializar los 4 Fantasmas Oficiales con dispersión de esquinas (zonas) fijas
    fantasmas = [
        { id: "Blinky", x: 8, y: 9, color: "#ff0000", dx: 1, dy: 0, tickCount: 0, maxTicks: ticksNormales, zonaPreferida: {x: 1, y: 1} },
        { id: "Pinky",  x: 10, y: 9, color: "#ffb8ff", dx: -1, dy: 0, tickCount: 0, maxTicks: ticksNormales, zonaPreferida: {x: 17, y: 1} },
        { id: "Inky",   x: 9, y: 10, color: "#00ffff", dx: 0, dy: -1, tickCount: 0, maxTicks: ticksNormales, zonaPreferida: {x: 1, y: 19} },
        { id: "Clyde",  x: 10, y: 10, color: "#ffb851", dx: 0, dy: -1, tickCount: 0, maxTicks: ticksNormales, zonaPreferida: {x: 17, y: 19} }
    ];

    if (bucleJuegoId) clearInterval(bucleJuegoId);
    juegoEjecutandose = true;
    bucleJuegoId = setInterval(bucleDeJuego, 140);
}

function bucleDeJuego() {
    if (modoAsustadoTicks > 0) {
        modoAsustadoTicks--;
    }

    // 1. Validar si puede girar
    if (pacman.nextDx !== 0 || pacman.nextDy !== 0) {
        let nx = pacman.x + pacman.nextDx;
        let ny = pacman.y + pacman.nextDy;
        if (esPosicionValida(nx, ny)) {
            pacman.dx = pacman.nextDx;
            pacman.dy = pacman.nextDy;
        }
    }

    // 2. Avanzar Pac-Man
    let px = pacman.x + pacman.dx;
    let py = pacman.y + pacman.dy;

    if (esPosicionValida(px, py)) {
        pacman.x = px;
        pacman.y = py;
        
        if (pacman.x < 0) pacman.x = 18;
        if (pacman.x > 18) pacman.x = 0;
    }

    // Animación boca
    if (pacman.dx !== 0 || pacman.dy !== 0) {
        if (pacman.abriendo) {
            pacman.anguloBoca += 0.2;
            if (pacman.anguloBoca >= 0.45) pacman.abriendo = false;
        } else {
            pacman.anguloBoca -= 0.2;
            if (pacman.anguloBoca <= 0) pacman.abriendo = true;
        }
    }

    // 3. Procesar colisión con celdas de comida
    if (pacman.x >= 0 && pacman.x < 19 && pacman.y >= 0 && pacman.y < 21) {
        let celdaActual = mapaActual[pacman.y][pacman.x];
        
        if (celdaActual === 0) {
            mapaActual[pacman.y][pacman.x] = 2; 
            puntosAcumuladosPartida += 5;
            document.getElementById("contador-novas").textContent = puntosAcumuladosPartida;
            evaluarVictoriaNivel();
        } 
        else if (celdaActual === 3) {
            mapaActual[pacman.y][pacman.x] = 2;
            puntosAcumuladosPartida += 5;
            modoAsustadoTicks = 45; // ~6 segundos vulnerables
            document.getElementById("contador-novas").textContent = puntosAcumuladosPartida;
            evaluarVictoriaNivel();
        }
    }

    // 4. Mover Inteligente de los 4 Fantasmas
    fantasmas.forEach(f => {
        f.tickCount++;
        let maxTicksEfectivos = modoAsustadoTicks > 0 ? f.maxTicks * 2 : f.maxTicks;
        
        if (f.tickCount >= maxTicksEfectivos) {
            f.tickCount = 0;
            moverFantasmaMejorado(f);
        }

        // Colisión letal o captura de fantasma
        if (f.x === pacman.x && f.y === pacman.y) {
            if (modoAsustadoTicks > 0) {
                puntosAcumuladosPartida += 500; // ¡+500 NovaPoints de premio por comer fantasmas!
                document.getElementById("contador-novas").textContent = puntosAcumuladosPartida;
                f.x = 9;
                f.y = 10;
            } else {
                ejecutarGameOver();
            }
        }
    });

    renderizarCanvas();
}

function esPosicionValida(x, y) {
    if (x < 0 || x > 18) return true;
    if (y < 0 || y >= 21) return false;
    return mapaActual[y][x] !== 1;
}

function evaluarVictoriaNivel() {
    let limpio = true;
    for (let r = 0; r < mapaActual.length; r++) {
        for (let c = 0; c < mapaActual[r].length; c++) {
            if (mapaActual[r][c] === 0 || mapaActual[r][c] === 3) {
                limpio = false;
                break;
            }
        }
    }

    if (limpio) {
        juegoEjecutandose = false;
        clearInterval(bucleJuegoId);
        
        if (nivelActual < 3) {
            aplicarTraduccionesEstaticas(currentLanguage);
            document.getElementById("modal-intermedio").classList.remove("oculto");
        } else {
            ejecutarFinPartida(true);
        }
    }
}

function moverFantasmaMejorado(f) {
    const direcciones = [
        {dx: 0, dy: -1}, {dx: 0, dy: 1},
        {dx: -1, dy: 0}, {dx: 1, dy: 0}
    ];

    let opcionesValidas = [];
    direcciones.forEach(dir => {
        if (dir.dx === -f.dx && dir.dy === -f.dy) return; 

        let nx = f.x + dir.dx;
        let ny = f.y + dir.dy;
        if (esPosicionValida(nx, ny) && nx >= 0 && nx < 19) {
            let objetivoX = modoAsustadoTicks > 0 ? f.zonaPreferida.x : pacman.x;
            let objetivoY = modoAsustadoTicks > 0 ? f.zonaPreferida.y : pacman.y;

            let dist = Math.abs(nx - objetivoX) + Math.abs(ny - objetivoY);
            opcionesValidas.push({ dir, dist });
        }
    });

    if (opcionesValidas.length === 0) {
        let nx = f.x - f.dx;
        let ny = f.y - f.dy;
        if (esPosicionValida(nx, ny)) {
            f.dx = -f.dx; f.dy = -f.dy;
            f.x += f.dx; f.y += f.dy;
        }
        return;
    }

    opcionesValidas.sort((a, b) => a.dist - b.dist);
    let mejorOpcion = opcionesValidas[0].dir;

    f.dx = mejorOpcion.dx;
    f.dy = mejorOpcion.dy;
    f.x += f.dx;
    f.y += f.dy;
}

function renderizarCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < mapaActual.length; r++) {
        for (let c = 0; c < mapaActual[r].length; c++) {
            if (mapaActual[r][c] === 1) {
                ctx.fillStyle = "#0000ff"; 
                ctx.fillRect(c * sizeC, r * sizeC, sizeC, sizeC);
            } else if (mapaActual[r][c] === 0) {
                ctx.fillStyle = "#ffb8ae"; 
                ctx.beginPath();
                ctx.arc(c * sizeC + sizeC/2, r * sizeC + sizeC/2, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (mapaActual[r][c] === 3) {
                ctx.fillStyle = (Math.floor(Date.now() / 250) % 2 === 0) ? "#00ffff" : "#ffb8ae";
                ctx.beginPath();
                ctx.arc(c * sizeC + sizeC/2, r * sizeC + sizeC/2, 5.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Dibujar Pac-Man redondo
    ctx.save();
    ctx.fillStyle = "#ffff00";
    let px = pacman.x * sizeC + sizeC/2;
    let py = pacman.y * sizeC + sizeC/2;
    ctx.translate(px, py);

    let rotacionAngulo = 0;
    if (pacman.dx === 1) rotacionAngulo = 0;
    if (pacman.dx === -1) rotacionAngulo = Math.PI;
    if (pacman.dy === 1) rotacionAngulo = Math.PI / 2;
    if (pacman.dy === -1) rotacionAngulo = 3 * Math.PI / 2;
    ctx.rotate(rotacionAngulo);

    ctx.beginPath();
    ctx.arc(0, 0, sizeC/2 - 1, pacman.anguloBoca, Math.PI * 2 - pacman.anguloBoca);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    // Dibujar los 4 Fantasmas Originales
    fantasmas.forEach(f => {
        if (modoAsustadoTicks > 0) {
            ctx.fillStyle = (modoAsustadoTicks < 15 && Math.floor(Date.now() / 150) % 2 === 0) ? "#ffffff" : "#2020ff";
        } else {
            ctx.fillStyle = f.color;
        }

        let fx = f.x * sizeC + sizeC/2;
        let fy = f.y * sizeC + sizeC/2;
        
        ctx.beginPath();
        ctx.arc(fx, fy - 1, sizeC/2 - 1, Math.PI, 0, false);
        ctx.lineTo(fx + sizeC/2 - 1, fy + sizeC/2);
        ctx.lineTo(fx - sizeC/2 + 1, fy + sizeC/2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = modoAsustadoTicks > 0 ? "#ffb8ae" : "#ffffff";
        ctx.fillRect(fx - 4, fy - 3, 3, 3);
        ctx.fillRect(fx + 1, fy - 3, 3, 3);
    });
}

function cambiarDireccionSegura(dx, dy) {
    if (!juegoEjecutandose) return;
    pacman.nextDx = dx;
    pacman.nextDy = dy;
}

function ejecutarGameOver() {
    ejecutarFinPartida(false);
}

function ejecutarFinPartida(victoriaCompleta) {
    juegoEjecutandose = false;
    clearInterval(bucleJuegoId);

    const msgBox = document.getElementById("mensaje-resultado");
    const palabraNivel = obtenerTextoNivel(currentLanguage);
    
    // Corregido: sustituido "Novas" por "NovaPoints" y mostrando "Muerto en el Nivel X" correctamente
    if (victoriaCompleta) {
        const prefijoVic = diccionario["pacman_victoria_total"] ? diccionario["pacman_victoria_total"][currentLanguage] : "¡FELICIDADES, CAMPEON/A!<br>Campaña Completada.<br>Recibes";
        msgBox.innerHTML = `${prefijoVic} +${puntosAcumuladosPartida} NovaPoints`;
    } else {
        const prefijoGOver = diccionario["pacman_fin_nivel"] ? diccionario["pacman_fin_nivel"][currentLanguage] : "Fin de la partida<br>Muerto en el";
        msgBox.innerHTML = `${prefijoGOver} ${palabraNivel} ${nivelActual}<br>+${puntosAcumuladosPartida} NovaPoints`;
    }

    document.getElementById("zona-GameOver").classList.remove("oculto");
    finalizarYSubirTransaccion(nivelActual);
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Pac-Man:", error);
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

    // Controles de botones y modal traducido
    document.getElementById("btn-comenzar").addEventListener("click", () => {
        document.getElementById("pantalla-inicio").classList.add("oculto");
        document.getElementById("pantalla-juego").classList.remove("oculto");
        puntosAcumuladosPartida = 0;
        document.getElementById("contador-novas").textContent = "0";
        iniciarCargaNivel(1);
    });

    document.getElementById("btn-pop-continuar").addEventListener("click", () => {
        document.getElementById("modal-intermedio").classList.add("oculto");
        iniciarCargaNivel(nivelActual + 1);
    });

    document.getElementById("btn-reiniciar").addEventListener("click", () => {
        document.getElementById("zona-GameOver").classList.add("oculto");
        puntosAcumuladosPartida = 0;
        document.getElementById("contador-novas").textContent = "0";
        iniciarCargaNivel(1);
    });

    document.getElementById("btn-terminar-go").addEventListener("click", () => {
        document.getElementById("pantalla-juego").classList.add("oculto");
        document.getElementById("pantalla-inicio").classList.remove("oculto");
    });

    document.getElementById("btn-cambiar-modo").addEventListener("click", () => {
        if (juegoEjecutandose) {
            juegoEjecutandose = false;
            clearInterval(bucleJuegoId);
            finalizarYSubirTransaccion(nivelActual);
        }
        document.getElementById("pantalla-juego").classList.add("oculto");
        document.getElementById("pantalla-inicio").classList.remove("oculto");
    });

    // Teclado
    document.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "ArrowUp": case "w": case "W":
                cambiarDireccionSegura(0, -1);
                if (juegoEjecutandose) event.preventDefault();
                break;
            case "ArrowDown": case "s": case "S":
                cambiarDireccionSegura(0, 1);
                if (juegoEjecutandose) event.preventDefault();
                break;
            case "ArrowLeft": case "a": case "A":
                cambiarDireccionSegura(-1, 0);
                if (juegoEjecutandose) event.preventDefault();
                break;
            case "ArrowRight": case "d": case "D":
                cambiarDireccionSegura(1, 0);
                if (juegoEjecutandose) event.preventDefault();
                break;
        }
    });

    // Soporte Táctil Móvil
    const contenedorCanvas = document.querySelector(".canvas-container");
    contenedorCanvas.addEventListener("touchstart", (event) => {
        if (!juegoEjecutandose) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }, { passive: true });

    contenedorCanvas.addEventListener("touchend", (event) => {
        if (!juegoEjecutandose) return;
        let diffX = event.changedTouches[0].clientX - touchStartX;
        let diffY = event.changedTouches[0].clientY - touchStartY;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (Math.abs(diffX) > umbralDeslizar) {
                if (diffX > 0) cambiarDireccionSegura(1, 0);  
                else cambiarDireccionSegura(-1, 0); 
            }
        } else {
            if (Math.abs(diffY) > umbralDeslizar) {
                if (diffY > 0) cambiarDireccionSegura(0, 1);  
                else cambiarDireccionSegura(0, -1); 
            }
        }
    }, { passive: true });

    // Escucha en tiempo real del Usuario (onSnapshot) con guardado y cálculo incondicional
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

            // --- CÁLCULO E INSERCIÓN INCONDICIONAL DE EDAD ---
            if (userData.fechanacimiento) {
                const edadCalculada = calcularEdadCompleta(userData.fechanacimiento);
                edadUsuarioGlobal = edadCalculada;
                const userRef = doc(db, "Usuarios", userDocIdGlobal);
                await updateDoc(userRef, { Edad: edadCalculada });
            } else {
                edadUsuarioGlobal = userData.Edad !== undefined ? Number(userData.Edad) : 0;
            }

            // --- CÁLCULO E INSERCIÓN INCONDICIONAL DE DIASRESTANTES ---
            if (userData.subs && typeof userData.subs === "object") {
                subsUsuarioGlobal = userData.subs.subs || ""; 
                if (userData.subs.fechaExpiracion) {
                    const timestampExpiracion = userData.subs.fechaExpiracion.toDate ? userData.subs.fechaExpiracion.toDate() : new Date(userData.subs.fechaExpiracion);
                    const hoy = new Date();
                    const diferenciaMilisegundos = timestampExpiracion.getTime() - hoy.getTime();
                    const diasCalculados = Math.ceil(diferenciaMilisegundos / (1000 * 60 * 60 * 24));

                    if (diasCalculados <= 0) {
                        subsUsuarioGlobal = "";
                        const textoNinguna = (diccionario["text_ninguna"] && diccionario["text_ninguna"][currentLanguage]) || "Ninguna";
                        const textoSubscripcion = (diccionario["text_subscripcion"] && diccionario["text_subscripcion"][currentLanguage]) || "Subscripción: ";
                        valSubs.textContent = `${textoSubscripcion}${textoNinguna}`;
                        const userRef = doc(db, "Usuarios", userDocIdGlobal);
                        await updateDoc(userRef, { subs: deleteField() });
                    } else {
                        const userRef = doc(db, "Usuarios", userDocIdGlobal);
                        await updateDoc(userRef, { "subs.diasrestantes": diasCalculados });
                        const textoSubscripcion = (diccionario["text_subscripcion"] && diccionario["text_subscripcion"][currentLanguage]) || "Subscripción: ";
                        valSubs.textContent = `${textoSubscripcion}${subsUsuarioGlobal} (${diasCalculados}d)`;
                    }
                } else {
                    const dias = userData.subs.diasrestantes !== undefined ? userData.subs.diasrestantes : 0;
                    const textoSubscripcion = (diccionario["text_subscripcion"] && diccionario["text_subscripcion"][currentLanguage]) || "Subscripción: ";
                    valSubs.textContent = `${textoSubscripcion}${subsUsuarioGlobal} (${dias}d)`;
                }
            } else {
                subsUsuarioGlobal = "";
                const textoSubscripcion = (diccionario["text_subscripcion"] && diccionario["text_subscripcion"][currentLanguage]) || "Subscripción: ";
                const textoNinguna = (diccionario["text_ninguna"] && diccionario["text_ninguna"][currentLanguage]) || "Ninguna";
                valSubs.textContent = `${textoSubscripcion}${textoNinguna}`;
            }
        }
    }, (error) => {
        console.error("Error en tiempo real con el usuario en Pac-Man:", error);
    });

    document.getElementById("btn_volver").addEventListener("click", () => window.history.back());
    document.getElementById("btn-logout").addEventListener("click", async () => {
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
});