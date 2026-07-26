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

// --- VARIABLES DEL BUCLE DEL SNAKE ---
const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");
const tamañoCuadrante = 15; 
const limiteCuadrantes = 20;

let snake = [];
let direccion = { x: 1, y: 0 };
let proximaDireccion = { x: 1, y: 0 };
let fruta = { x: 0, y: 0 };
let frutasComidasContador = 0;
let puntosAcumuladosPartida = 0;

let dificultadSeleccionada = "";
let bucleJuegoId = null;
let juegoEjecutandose = false;

// Variables táctiles
let touchStartX = 0;
let touchStartY = 0;
const umbralDeslizar = 30; 

const imagenFruta = new Image();
imagenFruta.src = "../../NovaPoints.png";

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
    if (txtEligeDif && diccionario["snake_elige_dificultad"] && diccionario["snake_elige_dificultad"][idioma]) {
        txtEligeDif.textContent = diccionario["snake_elige_dificultad"][idioma];
    }
    const btnFacil = document.getElementById("btn-dif-facil");
    if (btnFacil && diccionario["snake_modo_facil"] && diccionario["snake_modo_facil"][idioma]) {
        btnFacil.textContent = diccionario["snake_modo_facil"][idioma];
    }
    const btnMedio = document.getElementById("btn-dif-medio");
    if (btnMedio && diccionario["snake_modo_medio"] && diccionario["snake_modo_medio"][idioma]) {
        btnMedio.textContent = diccionario["snake_modo_medio"][idioma];
    }
    const btnDificil = document.getElementById("btn-dif-dificil");
    if (btnDificil && diccionario["snake_modo_dificil"] && diccionario["snake_modo_dificil"][idioma]) {
        btnDificil.textContent = diccionario["snake_modo_dificil"][idioma];
    }
    const btnRetry = document.getElementById("btn-reiniciar");
    if (btnRetry && diccionario["snake_volver_a_jugar"] && diccionario["snake_volver_a_jugar"][idioma]) {
        btnRetry.textContent = diccionario["snake_volver_a_jugar"][idioma];
    }
    const btnQuitGO = document.getElementById("btn-terminar-go");
    if (btnQuitGO && diccionario["snake_terminar_partida"] && diccionario["snake_terminar_partida"][idioma]) {
        btnQuitGO.textContent = diccionario["snake_terminar_partida"][idioma];
    }
}

async function finalizarYSubirTransaccion() {
    if (!userDocIdGlobal || puntosAcumuladosPartida <= 0) return;

    const totalAGanar = puntosAcumuladosPartida;
    puntosAcumuladosPartida = 0; 

    try {
        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const snapshotTransacciones = await getDocs(transaccionesRef);
        
        let contadorSnake = 0;
        snapshotTransacciones.forEach((docSnap) => {
            if (docSnap.id.startsWith("snake")) {
                contadorSnake++;
            }
        });

        const nuevoIdIncremental = `snake${contadorSnake + 1}`;
        const nuevoDocTransaccionRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdIncremental);

        await setDoc(nuevoDocTransaccionRef, {
            NovaPoints: totalAGanar,
            modo: dificultadSeleccionada,
            donde: "Snake",
            fecha: Timestamp.now(),
            tipo: "suma"
        });

        const nuevoSaldo = novasUsuarioGlobal + totalAGanar;
        const userRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userRef, { NovaPoints: nuevoSaldo });

    } catch (err) {
        console.error("Error al registrar transaccion incremental de Snake:", err);
    }
}

function iniciarPartida(nivel) {
    dificultadSeleccionada = nivel;
    frutasComidasContador = 0;
    puntosAcumuladosPartida = 0;
    document.getElementById("contador-frutas").textContent = "0";

    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direccion = { x: 1, y: 0 };
    proximaDireccion = { x: 1, y: 0 };

    colocarFrutaAleatoria();

    document.getElementById("pantalla-dificultad").classList.add("oculto");
    document.getElementById("pantalla-juego").classList.remove("oculto");
    document.getElementById("zona-GameOver").classList.add("oculto");

    const claveModo = `snake_modo_${nivel}`;
    document.getElementById("label-nivel").textContent = (diccionario[claveModo] && diccionario[claveModo][currentLanguage]) || nivel;

    if (bucleJuegoId) clearInterval(bucleJuegoId);
    
    let velocidad = 130;
    if (nivel === "medio") velocidad = 110;
    if (nivel === "dificil") velocidad = 80;

    juegoEjecutandose = true;
    bucleJuegoId = setInterval(bucleDeJuego, velocidad);
}

function colocarFrutaAleatoria() {
    let posicionValida = false;
    while (!posicionValida) {
        fruta.x = Math.floor(Math.random() * limiteCuadrantes);
        fruta.y = Math.floor(Math.random() * limiteCuadrantes);
        
        posicionValida = true;
        for (let segmento of snake) {
            if (segmento.x === fruta.x && segmento.y === fruta.y) {
                posicionValida = false;
                break;
            }
        }
    }
}

function bucleDeJuego() {
    direccion = proximaDireccion;

    let nuevaCabeza = {
        x: snake[0].x + direccion.x,
        y: snake[0].y + direccion.y
    };

    let haAtravesadoPared = false;

    // --- MANEJO DE PAREDES SEGÚN MODO ---
    if (dificultadSeleccionada === "facil" || dificultadSeleccionada === "medio") {
        // Cruzar al extremo opuesto
        if (nuevaCabeza.x < 0) { nuevaCabeza.x = limiteCuadrantes - 1; haAtravesadoPared = true; }
        else if (nuevaCabeza.x >= limiteCuadrantes) { nuevaCabeza.x = 0; haAtravesadoPared = true; }

        if (nuevaCabeza.y < 0) { nuevaCabeza.y = limiteCuadrantes - 1; haAtravesadoPared = true; }
        else if (nuevaCabeza.y >= limiteCuadrantes) { nuevaCabeza.y = 0; haAtravesadoPared = true; }

    } else if (dificultadSeleccionada === "dificil") {
        // Tocar pared es Game Over fulminante
        if (nuevaCabeza.x < 0 || nuevaCabeza.x >= limiteCuadrantes || nuevaCabeza.y < 0 || nuevaCabeza.y >= limiteCuadrantes) {
            ejecutarGameOver();
            return;
        }
    }

    // Comprobar colisión contra su propio cuerpo (Válido en todos los modos)
    for (let segmento of snake) {
        if (segmento.x === nuevaCabeza.x && segmento.y === nuevaCabeza.y) {
            ejecutarGameOver();
            return;
        }
    }

    // Añadimos la nueva cabeza siempre
    snake.unshift(nuevaCabeza);

    // --- LÓGICA DE ALIMENTACIÓN O CRECIMIENTO POR PARED ---
    if (nuevaCabeza.x === fruta.x && nuevaCabeza.y === fruta.y) {
        // Se come la fruta normal
        frutasComidasContador++;
        
        let valorFruta = 5;
        if (dificultadSeleccionada === "medio") valorFruta = 10;
        if (dificultadSeleccionada === "dificil") valorFruta = 20;

        puntosAcumuladosPartida += valorFruta;
        document.getElementById("contador-frutas").textContent = frutasComidasContador;
        
        colocarFrutaAleatoria();
    } 
    else if (dificultadSeleccionada === "medio" && haAtravesadoPared) {
        // NUEVA REGLA MODO MEDIO: Al atravesar la pared, crece un cuadrado. 
        // No quitamos la cola (snake.pop()) para que aumente de tamaño, igual que si comiera una fruta.
        // No suma puntos ni altera la fruta del mapa.
    } 
    else {
        // Movimiento ordinario sin crecer: se elimina el último segmento de la cola
        snake.pop(); 
    }

    renderizarCanvas();
}

function renderizarCanvas() {
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(0, 0, 0, 0.04)";
    for (let i = 0; i < canvas.width; i += tamañoCuadrante) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    // Pintar Serpiente
    snake.forEach((segmento, indice) => {
        ctx.fillStyle = (indice === 0) ? "#000000" : "#4a4a4a"; 
        ctx.strokeStyle = "#ffffff";
        ctx.fillRect(segmento.x * tamañoCuadrante, segmento.y * tamañoCuadrante, tamañoCuadrante, tamañoCuadrante);
        ctx.strokeRect(segmento.x * tamañoCuadrante, segmento.y * tamañoCuadrante, tamañoCuadrante, tamañoCuadrante);
    });

    // Renderizado Redondo Profesional de la Fruta
    ctx.save(); 
    ctx.beginPath();
    
    let centroX = fruta.x * tamañoCuadrante + tamañoCuadrante / 2;
    let centroY = fruta.y * tamañoCuadrante + tamañoCuadrante / 2;
    let radio = tamañoCuadrante / 2;

    ctx.arc(centroX, centroY, radio, 0, Math.PI * 2);
    ctx.clip(); 

    if (imagenFruta.complete) {
        ctx.drawImage(imagenFruta, fruta.x * tamañoCuadrante, fruta.y * tamañoCuadrante, tamañoCuadrante, tamañoCuadrante);
    } else {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(fruta.x * tamañoCuadrante, fruta.y * tamañoCuadrante, tamañoCuadrante, tamañoCuadrante);
    }
    ctx.restore(); 
}

function cambiarDireccionSegura(ejeX, ejeY) {
    if (!juegoEjecutandose) return;
    if (ejeX !== 0 && direccion.x !== 0) return;
    if (ejeY !== 0 && direccion.y !== 0) return;
    
    proximaDireccion = { x: ejeX, y: ejeY };
}

function ejecutarGameOver() {
    juegoEjecutandose = false;
    clearInterval(bucleJuegoId);

    const textoGO = (diccionario["snake_game_over"] && diccionario["snake_game_over"][currentLanguage]) || "Fin de la partida";
    document.getElementById("mensaje-resultado").textContent = `${textoGO} (+${puntosAcumuladosPartida} Novas)`;
    
    document.getElementById("zona-GameOver").classList.remove("oculto");

    finalizarYSubirTransaccion();
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('../../idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en SNAKE:", error);
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

    document.getElementById("btn-terminar-go").addEventListener("click", () => {
        document.getElementById("pantalla-juego").classList.add("oculto");
        document.getElementById("pantalla-dificultad").classList.remove("oculto");
    });

    document.getElementById("btn-cambiar-modo").addEventListener("click", () => {
        if (juegoEjecutandose) {
            juegoEjecutandose = false;
            clearInterval(bucleJuegoId);
            finalizarYSubirTransaccion();
        }
        document.getElementById("pantalla-juego").classList.add("oculto");
        document.getElementById("pantalla-dificultad").classList.remove("oculto");
    });

    // Enlace al teclado
    document.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "ArrowUp":
            case "w":
            case "W":
                cambiarDireccionSegura(0, -1);
                if (juegoEjecutandose) event.preventDefault();
                break;
            case "ArrowDown":
            case "s":
            case "S":
                cambiarDireccionSegura(0, 1);
                if (juegoEjecutandose) event.preventDefault();
                break;
            case "ArrowLeft":
            case "a":
            case "A":
                cambiarDireccionSegura(-1, 0);
                if (juegoEjecutandose) event.preventDefault();
                break;
            case "ArrowRight":
            case "d":
            case "D":
                cambiarDireccionSegura(1, 0);
                if (juegoEjecutandose) event.preventDefault();
                break;
        }
    });

    // Soporte Táctil
    const contenedorCanvas = document.querySelector(".canvas-container");
    
    contenedorCanvas.addEventListener("touchstart", (event) => {
        if (!juegoEjecutandose) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }, { passive: true });

    contenedorCanvas.addEventListener("touchend", (event) => {
        if (!juegoEjecutandose) return;
        
        let touchEndX = event.changedTouches[0].clientX;
        let touchEndY = event.changedTouches[0].clientY;
        
        let diffX = touchEndX - touchStartX;
        let diffY = touchEndY - touchStartY;
        
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

    // Redirecciones
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

    // Escucha Firestore
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
        console.error("Error en tiempo real con el usuario en SNAKE:", error);
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