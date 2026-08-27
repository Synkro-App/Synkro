import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    setDoc,
    deleteField,
    query,
    where,
    serverTimestamp,
    increment 
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

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_facil": { "es": "Corre Dino - Fácil", "en": "Dino Run - Easy", "fr": "Course Dino - Facile", "ro": "Fugi Dino - Ușor" }
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
    
    const tituloFacil = document.getElementById("titulo-facil");
    if (tituloFacil) tituloFacil.textContent = obtenerTextoTraduccion("titulo_facil", "Corre Dino - Fácil");
}

// --- LÓGICA DEL JUEGO: DINO RUN ---
function inicializarJuegoDino() {
    const canvas = document.getElementById("dinoCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const statKm = document.getElementById("stat-km");
    const statSaltos = document.getElementById("stat-saltos");
    const statAgachos = document.getElementById("stat-agachos");
    const statMonedas = document.getElementById("stat-monedas");

    let distanciaMetros = 0;
    let totalSaltos = 0;
    let totalAgachos = 0;
    let totalMonedas = 0;
    let gameSpeed = 4;
    let isGameOver = false;
    let isPlaying = false;
    let tiempoDesdeUltimaMoneda = 0; 
    let partidaGuardada = false;

    const monedaImg = new Image();
    monedaImg.src = "../../NovaPoints.png";

    const dino = {
        x: 50,
        y: 110,
        normalWidth: 36,
        normalHeight: 40,
        duckWidth: 46,
        duckHeight: 22,
        width: 36,
        height: 40,
        vy: 0,
        gravity: 0.55,
        jumpPower: -9.5,
        isJumping: false,
        isDuck: false,
        duckTimer: null,
        draw() {
            ctx.fillStyle = "#2e7d32";
            
            if (this.isDuck) {
                ctx.beginPath();
                ctx.roundRect(this.x, this.y + 18, this.width, this.height, 5);
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(this.x + 24, this.y + 10, 18, 14, 3);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(this.x + 34, this.y + 12, 4, 4);
            } else {
                ctx.beginPath();
                ctx.roundRect(this.x + 6, this.y + 12, 26, 24, 6);
                ctx.fill();
                ctx.beginPath();
                ctx.roundRect(this.x + 18, this.y, 18, 16, 4);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(this.x + 28, this.y + 4, 4, 4);
                ctx.fillStyle = "#000000";
                ctx.fillRect(this.x + 30, this.y + 5, 2, 2);

                ctx.fillStyle = "#1b5e20";
                if (this.isJumping) {
                    ctx.fillRect(this.x + 10, this.y + 36, 6, 4);
                    ctx.fillRect(this.x + 22, this.y + 36, 6, 4);
                } else {
                    const animPata = Math.floor(Date.now() / 100) % 2;
                    if (animPata === 0) {
                        ctx.fillRect(this.x + 10, this.y + 36, 5, 6);
                        ctx.fillRect(this.x + 22, this.y + 36, 5, 4);
                    } else {
                        ctx.fillRect(this.x + 10, this.y + 36, 5, 4);
                        ctx.fillRect(this.x + 22, this.y + 36, 5, 6);
                    }
                }

                ctx.fillStyle = "#2e7d32";
                ctx.beginPath();
                ctx.moveTo(this.x + 8, this.y + 16);
                ctx.lineTo(this.x, this.y + 12);
                ctx.lineTo(this.x + 8, this.y + 24);
                ctx.fill();
            }
        },
        update() {
            this.vy += this.gravity;
            this.y += this.vy;
            let sueloBase = this.isDuck ? 128 : 110;
            if (this.y > sueloBase) {
                this.y = sueloBase;
                this.vy = 0;
                this.isJumping = false;
            }
        },
        jump() {
            if (!this.isJumping && !this.isDuck) {
                this.vy = this.jumpPower;
                this.isJumping = true;
                totalSaltos++;
                if (statSaltos) statSaltos.textContent = totalSaltos;
            }
        },
        duck() {
            if (!this.isJumping) {
                if (!this.isDuck) {
                    totalAgachos++;
                    if (statAgachos) statAgachos.textContent = totalAgachos;
                }
                this.isDuck = true;
                this.width = this.duckWidth;
                this.height = this.duckHeight;
                this.y = 128;

                clearTimeout(this.duckTimer);
                this.duckTimer = setTimeout(() => {
                    this.standUp();
                }, 500);
            }
        },
        standUp() {
            this.isDuck = false;
            this.width = this.normalWidth;
            this.height = this.normalHeight;
            if (!this.isJumping) this.y = 110;
        }
    };

    let obstacles = [];
    class Obstacle {
        constructor() {
            this.tipo = Math.random() > 0.5 ? "alto" : "suelo";
            if (this.tipo === "suelo") {
                this.width = 18;
                this.height = 32;
                this.x = canvas.width;
                this.y = 150 - this.height;
            } else {
                this.width = 28;
                this.height = 16;
                this.x = canvas.width;
                this.y = 112; 
            }
        }
        draw() {
            ctx.fillStyle = "#d32f2f";
            if (this.tipo === "suelo") {
                ctx.beginPath();
                ctx.roundRect(this.x + 4, this.y, 10, 32, 3);
                ctx.fill();
                ctx.fillRect(this.x, this.y + 10, 4, 8);
                ctx.fillRect(this.x + 14, this.y + 6, 4, 8);
            } else {
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 4);
                ctx.fill();
            }
        }
        update() {
            this.x -= gameSpeed;
        }
    }

    let monedas = [];
    class Moneda {
        constructor() {
            this.width = 20;
            this.height = 20;
            this.x = canvas.width;
            const varianteAlt = Math.random();
            if (varianteAlt < 0.5) {
                this.y = 130; 
            } else {
                this.y = 55;  
            }
        }
        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(monedaImg, this.x, this.y, this.width, this.height);
            ctx.restore();
        }
        update() {
            this.x -= gameSpeed;
        }
    }

    function spawnElementos() {
        if (!isPlaying) return;
        
        const probabilidad = Math.random();
        
        if (probabilidad < 0.6) {
            obstacles.push(new Obstacle());
            tiempoDesdeUltimaMoneda++;
        } else if (probabilidad < 0.8 && tiempoDesdeUltimaMoneda >= 2) {
            monedas.push(new Moneda());
            tiempoDesdeUltimaMoneda = 0;
        } else {
            tiempoDesdeUltimaMoneda++;
        }

        const randomTime = Math.random() * 900 + 1300;
        setTimeout(spawnElementos, randomTime);
    }

    async function finalizarPartidaYGuardarRecompensas() {
        if (partidaGuardada || !userDocIdGlobal) return;
        partidaGuardada = true;

        const kmExactos = parseFloat((distanciaMetros / 100).toFixed(2));
        const kmEnteros = Math.floor(kmExactos);
        
        const novasPorMonedas = totalMonedas * 100;
        const novasPorKm = kmEnteros * 10;
        const novasTotales = novasPorMonedas + novasPorKm;

        if (novasTotales <= 0) return;

        try {
            const userDocRef = doc(db, "Usuarios", userDocIdGlobal);
            await updateDoc(userDocRef, {
                NovaPoints: increment(novasTotales)
            });

            const txtNovas = document.getElementById("user-novas");
            if (txtNovas) {
                const actual = parseInt(txtNovas.textContent, 10) || 0;
                txtNovas.textContent = actual + novasTotales;
            }

            const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
            const snapshotTrans = await getDocs(transaccionesRef);
            
            let maxIndex = 0;
            snapshotTrans.forEach(docSnap => {
                const idDoc = docSnap.id;
                if (idDoc.startsWith("corredino")) {
                    const numStr = idDoc.replace("corredino", "");
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num) && num > maxIndex) {
                        maxIndex = num;
                    }
                }
            });

            const nuevoIdTransaccion = `corredino${maxIndex + 1}`;

            // Documento de transacción con el campo modo: "facil" incluido
            await setDoc(doc(transaccionesRef, nuevoIdTransaccion), {
                NovaPoints: novasTotales,
                donde: "Corre Dino",
                fecha: serverTimestamp(),
                km: kmExactos,
                modo: "fácil",
                monedas: totalMonedas,
                tipo: "suma"
            });

        } catch (error) {
            console.error("Error al guardar las recompensas de Corre Dino:", error);
        }
    }

    function resetGame() {
        distanciaMetros = 0;
        totalSaltos = 0;
        totalAgachos = 0;
        totalMonedas = 0;
        gameSpeed = 4;
        obstacles = [];
        monedas = [];
        isGameOver = false;
        isPlaying = true;
        partidaGuardada = false;
        tiempoDesdeUltimaMoneda = 2;
        dino.standUp();
        dino.y = 110;
        dino.vy = 0;

        if (statKm) statKm.textContent = "0.00";
        if (statSaltos) statSaltos.textContent = "0";
        if (statAgachos) statAgachos.textContent = "0";
        if (statMonedas) statMonedas.textContent = "0";

        setTimeout(spawnElementos, 1000);
        loop();
    }

    window.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
            e.preventDefault();
            if (!isPlaying && !isGameOver) resetGame();
            else if (isPlaying) dino.jump();
            else if (isGameOver) resetGame();
        } else if (e.code === "ArrowDown") {
            e.preventDefault();
            if (isPlaying) dino.duck();
        }
    });

    window.addEventListener("keyup", (e) => {
        if (e.code === "ArrowDown") {
            if (isPlaying) dino.standUp();
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    canvas.addEventListener("touchend", (e) => {
        if (!touchStartX || !touchStartY) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) {
            if (!isPlaying && !isGameOver) resetGame();
            else if (isPlaying) dino.jump();
            else if (isGameOver) resetGame();
        } else if (diffY > 40 && Math.abs(diffY) > Math.abs(diffX)) {
            if (isPlaying) {
                dino.duck();
                setTimeout(() => dino.standUp(), 600);
            }
        } else if (diffY < -40 && Math.abs(diffY) > Math.abs(diffX)) {
            if (!isPlaying && !isGameOver) resetGame();
            else if (isPlaying) dino.jump();
            else if (isGameOver) resetGame();
        }

        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });

    canvas.addEventListener("click", () => {
        if (!isPlaying && !isGameOver) resetGame();
        else if (isPlaying) dino.jump();
        else if (isGameOver) resetGame();
    });

    function loop() {
        if (!isPlaying) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = "#666666";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 150);
        ctx.lineTo(canvas.width, 150);
        ctx.stroke();

        distanciaMetros += 0.05;
        const kmActuales = (distanciaMetros / 100).toFixed(2);
        if (statKm) statKm.textContent = kmActuales;

        dino.update();
        dino.draw();

        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].update();
            obstacles[i].draw();

            if (
                dino.x < obstacles[i].x + obstacles[i].width - 4 &&
                dino.x + dino.width - 4 > obstacles[i].x &&
                dino.y < obstacles[i].y + obstacles[i].height - 2 &&
                dino.y + dino.height > obstacles[i].y
            ) {
                isGameOver = true;
                isPlaying = false;
                finalizarPartidaYGuardarRecompensas();
            }

            if (obstacles[i].x + obstacles[i].width < 0) {
                obstacles.splice(i, 1);
                if (Math.floor(distanciaMetros) % 50 === 0) gameSpeed += 0.15;
            }
        }

        for (let j = monedas.length - 1; j >= 0; j--) {
            monedas[j].update();
            monedas[j].draw();

            if (
                dino.x < monedas[j].x + monedas[j].width &&
                dino.x + dino.width > monedas[j].x &&
                dino.y < monedas[j].y + monedas[j].height &&
                dino.y + dino.height > monedas[j].y
            ) {
                totalMonedas++;
                if (statMonedas) statMonedas.textContent = totalMonedas;
                monedas.splice(j, 1);
                continue;
            }

            if (monedas[j] && monedas[j].x + monedas[j].width < 0) {
                monedas.splice(j, 1);
            }
        }

        if (!isPlaying && isGameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.fillText("¡GAME OVER!", canvas.width / 2, canvas.height / 2 - 10);
            ctx.font = "12px Arial";
            ctx.fillText("Toca la pantalla o pulsa Espacio para reiniciar", canvas.width / 2, canvas.height / 2 + 15);
            ctx.textAlign = "start";
            return;
        }

        requestAnimationFrame(loop);
    }

    ctx.fillStyle = "#535353";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Toca o pulsa Espacio para empezar a correr", canvas.width / 2, canvas.height / 2);
    ctx.textAlign = "start";
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
    inicializarJuegoDino();

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