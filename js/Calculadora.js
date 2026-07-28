import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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

// --- VARIABLES DE ESTADO DE LA CALCULADORA VISUAL ---
let ecuacionCompleta = ""; 
let numeroActual = "";      
let reiniciarPantalla = false;

// --- CÁLCULO RIGUROSO DE EDAD (DD-MM-AAAA) ---
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
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en CALCULADORA:", error);
    }

    aplicarTraduccionesEstaticas(currentLanguage);

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");
    const displayCalc = document.getElementById("calc-screen");

    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    // --- REDIRECCIONES DE FILAS ---
    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) {
        filaPerfil.addEventListener("click", () => {
            window.location.href = "Perfil.html";
        });
    }

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) {
        filaNovas.addEventListener("click", () => {
            window.location.href = "NovaPoints.html";
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
            if (imgAvatar) imgAvatar.src = userData.imgperfil || "default-profile.png";
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
        console.error("Error en tiempo real con el usuario en CALCULADORA:", error);
    });

    // --- LÓGICA DE CONTROL VISUAL ---
    function actualizarDisplay() {
        if (!displayCalc) return;
        
        let visual = ecuacionCompleta + numeroActual;
        
        // Formatear visualmente los operadores para que se vean limpios
        visual = visual.replace(/\*/g, " × ").replace(/\//g, " ÷ ").replace(/\+/g, " + ").replace(/-/g, " − ");
        
        displayCalc.value = visual || "0";
    }

    function procesarNumero(numero) {
        if (reiniciarPantalla) {
            ecuacionCompleta = "";
            numeroActual = "";
            reiniciarPantalla = false;
        }

        if (numero === "." && numeroActual.includes(".")) return;
        if (numero === "0" && numeroActual === "0") return;

        if (numeroActual === "0" && numero !== ".") {
            numeroActual = numero;
        } else {
            numeroActual += numero;
        }

        actualizarDisplay();
    }

    function procesarOperador(opSeleccionado) {
        if (reiniciarPantalla) {
            reiniciarPantalla = false;
        }

        // Si no hay nada escrito y se pulsa un signo (salvo el menos para negativos), ignoramos
        if (ecuacionCompleta === "" && numeroActual === "") {
            if (opSeleccionado === "-") {
                numeroActual = "-";
                actualizarDisplay();
            }
            return;
        }

        // Si el usuario ya pulsó un operador y desea corregirlo por otro sin haber puesto un nuevo número
        if (numeroActual === "") {
            const ultimoCaracter = ecuacionCompleta.trim().slice(-1);
            if (["+", "-", "*", "/"].includes(ultimoCaracter)) {
                ecuacionCompleta = ecuacionCompleta.trim().slice(0, -1) + opSeleccionado + " ";
                actualizarDisplay();
                return;
            }
        }

        ecuacionCompleta += numeroActual + " " + opSeleccionado + " ";
        numeroActual = "";
        actualizarDisplay();
    }

    function ejecutarCalculo() {
        if (ecuacionCompleta === "" && numeroActual === "") return;

        let expresionEvaluable = ecuacionCompleta + numeroActual;
        expresionEvaluable = expresionEvaluable.trim();

        // Si termina en un operador suelto al dar Enter, autocompletamos con el número anterior o lo eliminamos
        const ultimoChar = expresionEvaluable.slice(-1);
        if (["+", "-", "*", "/"].includes(ultimoChar)) {
            expresionEvaluable = expresionEvaluable.slice(0, -1).trim();
        }

        if (!expresionEvaluable) return;

        try {
            // Evaluamos la expresión de forma matemática segura sin usar eval directo
            // Usamos Function como alternativa controlada para operaciones sencillas de calculadora
            let resultado = new Function(`return (${expresionEvaluable})`)();

            if (resultado === Infinity || resultado === -Infinity || isNaN(resultado)) {
                alert("Operación inválida o división entre cero");
                limpiarCalculadora();
                return;
            }

            // Redondear decimales flotantes largos
            let resultadoFormateado = Number(resultado.toFixed(8)).toString();

            // Guardamos la ecuación entera para que NO desaparezca de la pantalla al resolver
            ecuacionCompleta = expresionEvaluable + " = " + resultadoFormateado;
            numeroActual = "";
            reiniciarPantalla = true; // El próximo número pulsado limpiará el historial previo
            
            if (displayCalc) {
                let visual = ecuacionCompleta;
                visual = visual.replace(/\*/g, " × ").replace(/\//g, " ÷ ").replace(/\+/g, " + ").replace(/-/g, " − ");
                displayCalc.value = visual;
            }

        } catch (error) {
            console.error("Error evaluando expresión matemática:", error);
            alert("Error en la estructura de la ecuación");
            limpiarCalculadora();
        }
    }

    function borrarUltimoCaracter() {
        if (reiniciarPantalla) {
            // Si ya se resolvió, un backspace permite seguir modificando el resultado obtenido
            reiniciarPantalla = false;
        }

        if (numeroActual.length > 0) {
            numeroActual = numeroActual.slice(0, -1);
        } else if (ecuacionCompleta.length > 0) {
            // Quitamos los espacios y el operador o número del historial de la ecuación
            ecuacionCompleta = ecuacionCompleta.trim();
            // Si el último elemento es un operador, lo quitamos junto a su espacio correlativo
            const ultimoChar = ecuacionCompleta.slice(-1);
            if (["+", "-", "*", "/"].includes(ultimoChar)) {
                ecuacionCompleta = ecuacionCompleta.slice(0, -1).trim() + " ";
            } else {
                ecuacionCompleta = ecuacionCompleta.slice(0, -1);
            }
        }
        actualizarDisplay();
    }

    function limpiarCalculadora() {
        ecuacionCompleta = "";
        numeroActual = "";
        reiniciarPantalla = false;
        actualizarDisplay();
    }

    // Vinculación de eventos táctiles / click
    const botonesNum = document.querySelectorAll(".btn-num");
    botonesNum.forEach(btn => {
        btn.addEventListener("click", () => {
            procesarNumero(btn.getAttribute("data-num"));
        });
    });

    const botonesOp = document.querySelectorAll(".btn-operator");
    botonesOp.forEach(btn => {
        btn.addEventListener("click", () => {
            procesarOperador(btn.getAttribute("data-op"));
        });
    });

    const btnEqual = document.getElementById("btn-calc-equal");
    if (btnEqual) {
        btnEqual.addEventListener("click", () => {
            ejecutarCalculo();
        });
    }

    const btnClear = document.getElementById("btn-calc-clear");
    if (btnClear) {
        btnClear.addEventListener("click", () => {
            limpiarCalculadora();
        });
    }

    // --- MANEJO DE EVENTOS DE TECLADO FÍSICO EXACTO ---
    document.addEventListener("keydown", (event) => {
        const tecla = event.key;

        if ((tecla >= "0" && tecla <= "9") || tecla === ".") {
            event.preventDefault();
            procesarNumero(tecla);
        }
        else if (tecla === "+" || tecla === "-" || tecla === "*" || tecla === "/") {
            event.preventDefault();
            procesarOperador(tecla);
        }
        else if (tecla === "Enter" || tecla === "=") {
            event.preventDefault();
            ejecutarCalculo();
        }
        else if (tecla === "Backspace") {
            event.preventDefault();
            borrarUltimoCaracter();
        }
        else if (tecla === "Escape") {
            event.preventDefault();
            limpiarCalculadora();
        }
    });

    // --- MANEJO DE EVENTOS DE CABECERA ---
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
            window.location.href = "index.html";
        });
    }
});