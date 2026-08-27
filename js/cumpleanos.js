import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    setDoc,
    getDoc,
    updateDoc, 
    increment,
    deleteField,
    Timestamp 
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
let fechaNacimientoGlobal = null;
let userDataGlobal = null;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "info_cumpleanos": { 
        "es": "Entra el día de tu cumpleaños para recibir una recompensa especial", 
        "en": "Log in on your birthday to receive a special reward", 
        "fr": "Connectez-vous le jour de votre anniversaire pour recevoir une récompense spéciale", 
        "ro": "Conectează-te de ziua ta de naștere pentru a primi o recompensă specială" 
    },
    "btn_feliz_cumpleanos": { 
        "es": "✨ ¡Feliz cumpleaños! ✨", 
        "en": "✨ Happy birthday! ✨", 
        "fr": "✨ Joyeux anniversaire ! ✨", 
        "ro": "✨ La mulți ani! ✨" 
    },
    "modal_titulo": { 
        "es": "¡Sorpresa de Cumpleaños!", 
        "en": "Birthday Surprise!", 
        "fr": "Surprise d'anniversaire !", 
        "ro": "Surpriză de ziua ta!" 
    },
    "modal_mensaje": { 
        "es": "Como hoy es un día especial, y has decidido celebrarlo con nosotros, te regalamos 100.000 NovaPoints para que lo puedas usar en la web, y una suscripción Estelar de 1 semana", 
        "en": "As today is a special day, and you decided to celebrate it with us, we are gifting you 100,000 NovaPoints to use on the web, and a 1-week Stellar subscription", 
        "fr": "Comme aujourd'hui est un jour spécial et que vous avez décidé de le fêter avec nous, nous vous offrons 100 000 NovaPoints à utiliser sur le web et un abonnement Stellaire d'une semaine", 
        "ro": "Deoarece astăzi este o zi specială și ai decis să o sărbătorești cu noi, îți oferim 100.000 NovaPoints pe care să îi folosești pe web și un abonament Estelar de 1 săptămână" 
    },
    "btn_reclamar": { 
        "es": "Reclamar Regalo", 
        "en": "Claim Gift", 
        "fr": "Réclamer le cadeau", 
        "ro": "Revendică cadoul" 
    },
    "msg_ya_reclamado": {
        "es": "Ya has reclamado tu recompensa de cumpleaños este año.",
        "en": "You have already claimed your birthday reward this year.",
        "fr": "Vous avez déjà réclamé votre récompense d'anniversaire cette année.",
        "ro": "Ai revendicat deja recompensa de ziua ta în acest an."
    },
    "msg_exito": {
        "es": "¡Recompensa reclamada con éxito!",
        "en": "Reward claimed successfully!",
        "fr": "Récompense réclamée avec succès !",
        "ro": "Recompensă revendicată cu succes!"
    }
};

function normalizarSourceImagen(cadenaImagen) {
    if (!cadenaImagen) return "default-profile.png";
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

function calcularDiasRestantesCumpleanos(fechaNacimientoStr) {
    if (!fechaNacimientoStr) return 0;
    let mes, dia;
    if (fechaNacimientoStr.includes("-")) {
        const partes = fechaNacimientoStr.split("-");
        if (partes[0].length === 4) {
            mes = parseInt(partes[1], 10) - 1;
            dia = parseInt(partes[2], 10);
        } else {
            dia = parseInt(partes[0], 10);
            mes = parseInt(partes[1], 10) - 1;
        }
    } else {
        return 0;
    }

    const hoy = new Date();
    let anoActual = hoy.getFullYear();
    let proximoCumple = new Date(anoActual, mes, dia);

    if (hoy > proximoCumple) {
        proximoCumple.setFullYear(anoActual + 1);
    }

    const unDiaMs = 1000 * 60 * 60 * 24;
    const diferenciaMs = proximoCumple.setHours(0,0,0,0) - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).setHours(0,0,0,0);
    return Math.round(diferenciaMs / unDiaMs);
}

function esHoyCumpleanos(fechaNacimientoStr) {
    if (!fechaNacimientoStr) return false;
    let mesNac, diaNac;
    if (fechaNacimientoStr.includes("-")) {
        const partes = fechaNacimientoStr.split("-");
        if (partes[0].length === 4) {
            mesNac = parseInt(partes[1], 10) - 1;
            diaNac = parseInt(partes[2], 10);
        } else {
            diaNac = parseInt(partes[0], 10);
            mesNac = parseInt(partes[1], 10) - 1;
        }
    } else {
        return false;
    }

    const hoy = new Date();
    return hoy.getDate() === diaNac && hoy.getMonth() === mesNac;
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

    const infoCumple = document.getElementById("info-cumpleanos");
    if (infoCumple) infoCumple.textContent = obtenerTextoTraduccion("info_cumpleanos", "Entra el día de tu cumpleaños para recibir una recompensa especial");

    const btnFelizCumple = document.getElementById("btn-feliz-cumpleanos");
    if (btnFelizCumple) btnFelizCumple.textContent = obtenerTextoTraduccion("btn_feliz_cumpleanos", "✨ ¡Feliz cumpleaños! ✨");

    const modalTitulo = document.getElementById("modal-titulo");
    if (modalTitulo) modalTitulo.textContent = obtenerTextoTraduccion("modal_titulo", "¡Sorpresa de Cumpleaños!");

    const modalMensaje = document.getElementById("modal-mensaje");
    if (modalMensaje) modalMensaje.textContent = obtenerTextoTraduccion("modal_mensaje", "Como hoy es un día especial, y has decidido celebrarlo con nosotros, te regalamos 100.000 NovaPoints para que lo puedas usar en la web, y una suscripción Estelar de 1 semana");

    const btnReclamar = document.getElementById("btn-reclamar");
    if (btnReclamar) btnReclamar.textContent = obtenerTextoTraduccion("btn_reclamar", "Reclamar Regalo");
}

function mostrarMensajeEstado(texto) {
    const contenedorMsg = document.getElementById("mensaje-estado-cumple");
    if (contenedorMsg) {
        contenedorMsg.textContent = texto;
        contenedorMsg.style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json:", error);
    }

    aplicarTraduccionesEstaticas();

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");
    const btnFelizCumple = document.getElementById("btn-feliz-cumpleanos");
    const modalCumpleanos = document.getElementById("modal-cumpleanos");
    const btnReclamar = document.getElementById("btn-reclamar");
    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) filaPerfil.addEventListener("click", () => { window.location.href = "Perfil.html"; });

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) filaNovas.addEventListener("click", () => { window.location.href = "NovaPoints.html"; });

    if (btnFelizCumple && modalCumpleanos) {
        btnFelizCumple.addEventListener("click", () => {
            modalCumpleanos.style.display = "flex";
        });
    }

    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    try {
        const querySnapshot = await getDocs(qUsuario);
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            userDataGlobal = userDoc.data();
            fechaNacimientoGlobal = userDataGlobal.fechanacimiento || "";

            if (txtNombre) txtNombre.textContent = userDataGlobal.usuario || nombreUsuarioLogueado;
            const avatarUrl = normalizarSourceImagen(userDataGlobal.imgperfil);
            if (imgAvatar) imgAvatar.src = avatarUrl;
            if (txtNovas) txtNovas.textContent = userDataGlobal.NovaPoints !== undefined ? userDataGlobal.NovaPoints : 0;

            if (fechaNacimientoGlobal) {
                const edadCalculada = calcularEdadCompleta(fechaNacimientoGlobal);
                const diasRestantesCalculados = calcularDiasRestantesCumpleanos(fechaNacimientoGlobal);
                const esSuCumpleanosHoy = esHoyCumpleanos(fechaNacimientoGlobal);

                const anoActualStr = new Date().getFullYear().toString();
                const cumpleDocRef = doc(db, "Usuarios", userDocIdGlobal, "cumpleaños", anoActualStr);
                const cumpleDocSnap = await getDoc(cumpleDocRef);
                const yaReclamadoEsteAno = cumpleDocSnap.exists() && cumpleDocSnap.data().recibidas === true;

                if (yaReclamadoEsteAno) {
                    mostrarMensajeEstado(obtenerTextoTraduccion("msg_ya_reclamado", "Ya has reclamado tu recompensa de cumpleaños este año."));
                } else if (esSuCumpleanosHoy && btnFelizCumple) {
                    btnFelizCumple.style.display = "block";
                }

                const actualizaciones = {};
                if (userDataGlobal.Edad === undefined || Number(userDataGlobal.Edad) !== edadCalculada) {
                    actualizaciones.Edad = edadCalculada;
                }
                actualizaciones.diasrestantescumple = diasRestantesCalculados;

                if (Object.keys(actualizaciones).length > 0) {
                    await updateDoc(doc(db, "Usuarios", userDocIdGlobal), actualizaciones);
                }
            }

            if (userDataGlobal.subs && typeof userDataGlobal.subs === "object") {
                let subsTexto = userDataGlobal.subs.subs || ""; 
                if (userDataGlobal.subs.fechaExpiracion) {
                    const timestampExpiracion = userDataGlobal.subs.fechaExpiracion.toDate ? userDataGlobal.subs.fechaExpiracion.toDate() : new Date(userDataGlobal.subs.fechaExpiracion);
                    const hoy = new Date();
                    const diasCalculados = Math.ceil((timestampExpiracion.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    if (diasCalculados <= 0) {
                        if (valSubs) valSubs.textContent = obtenerTextoTraduccion("text_ninguna", "Ninguna");
                        await updateDoc(doc(db, "Usuarios", userDocIdGlobal), { subs: deleteField() });
                    } else {
                        await updateDoc(doc(db, "Usuarios", userDocIdGlobal), { "subs.diasrestantes": diasCalculados });
                        if (valSubs) valSubs.textContent = `${subsTexto} (${diasCalculados}d)`;
                    }
                } else {
                    const dias = userDataGlobal.subs.diasrestantes !== undefined ? userDataGlobal.subs.diasrestantes : 0;
                    if (valSubs) valSubs.textContent = `${subsTexto} (${dias}d)`;
                }
            } else {
                if (valSubs) valSubs.textContent = obtenerTextoTraduccion("text_ninguna", "Ninguna");
            }
        }
    } catch (error) {
        console.error("Error al obtener los datos del usuario:", error);
    }

    // Lógica del Botón Reclamar Regalo con Validación de Tipo de Suscripción (Estelar vs Premium/Básica/Ninguna)
    if (btnReclamar) {
        btnReclamar.addEventListener("click", async () => {
            if (!userDocIdGlobal) return;

            const ahora = new Date();
            const anoActualStr = ahora.getFullYear().toString();
            const timestampActual = Timestamp.fromDate(ahora);

            try {
                const cumpleDocRef = doc(db, "Usuarios", userDocIdGlobal, "cumpleaños", anoActualStr);
                const cumpleSnap = await getDoc(cumpleDocRef);
                if (cumpleSnap.exists() && cumpleSnap.data().recibidas === true) {
                    modalCumpleanos.style.display = "none";
                    if (btnFelizCumple) btnFelizCumple.style.display = "none";
                    mostrarMensajeEstado(obtenerTextoTraduccion("msg_ya_reclamado", "Ya has reclamado tu recompensa de cumpleaños este año."));
                    return;
                }

                let fechaExpiracionBase = ahora;

                // Comprobamos si el usuario ya tiene una suscripción "Estelar"
                if (userDataGlobal && userDataGlobal.subs && typeof userDataGlobal.subs === "object") {
                    const tipoSubscripcion = userDataGlobal.subs.subs;

                    if (tipoSubscripcion === "Estelar" && userDataGlobal.subs.fechaExpiracion) {
                        const expAnterior = userDataGlobal.subs.fechaExpiracion.toDate ? userDataGlobal.subs.fechaExpiracion.toDate() : new Date(userDataGlobal.subs.fechaExpiracion);
                        // Si ya es Estelar y no ha caducado, le sumamos los 7 días a la fecha existente
                        if (expAnterior > ahora) {
                            fechaExpiracionBase = expAnterior;
                        }
                    }
                    // Si es Premium, Básica o de cualquier otro tipo, ignoramos el tiempo restante anterior y la fechaBase se queda en 'ahora'
                }

                const fechaExpiracionDate = new Date(fechaExpiracionBase.getTime() + (7 * 24 * 60 * 60 * 1000));
                const timestampExpiracion = Timestamp.fromDate(fechaExpiracionDate);
                const diasRestantesTotales = Math.ceil((fechaExpiracionDate.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

                // 1. Crear documento en subcolección "cumpleaños"
                await setDoc(cumpleDocRef, {
                    NovaPoints: 100000,
                    Subscripion: "Estelar 1 semana",
                    fecha: timestampActual,
                    recibidas: true
                });

                // 2. Actualizar documento principal del usuario (sobrescribe cualquier plan inferior a Estelar)
                const userDocRef = doc(db, "Usuarios", userDocIdGlobal);
                const nuevasSubsData = {
                    subs: "Estelar",
                    fechaCompra: timestampActual,
                    fechaExpiracion: timestampExpiracion,
                    diasrestantes: diasRestantesTotales
                };

                await updateDoc(userDocRef, {
                    NovaPoints: increment(100000),
                    subs: nuevasSubsData
                });

                // Actualizar la variable local en memoria por si interactúa más veces sin recargar la página
                if (!userDataGlobal.subs) userDataGlobal.subs = {};
                userDataGlobal.subs = nuevasSubsData;

                // 3. Crear ID incremental para "Transacciones de NovaPoints"
                const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
                const transSnapshot = await getDocs(transaccionesRef);
                let contadorCumpleanos = 0;
                transSnapshot.forEach(documento => {
                    if (documento.id.startsWith("cumpleaños")) {
                        contadorCumpleanos++;
                    }
                });
                const nuevoIdTransaccion = `cumpleaños${contadorCumpleanos + 1}`;

                // 4. Crear documento de transacción exacto
                await setDoc(doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdTransaccion), {
                    NovaPoints: 100000,
                    donde: "Cumpleaños",
                    fecha: timestampActual,
                    fechacumple: fechaNacimientoGlobal,
                    tipo: "suma"
                });

                // Actualizar interfaz visualmente
                if (txtNovas) {
                    txtNovas.textContent = parseInt(txtNovas.textContent || "0") + 100000;
                }
                if (valSubs) {
                    valSubs.textContent = `Estelar (${diasRestantesTotales}d)`;
                }

                modalCumpleanos.style.display = "none";
                if (btnFelizCumple) btnFelizCumple.style.display = "none";
                mostrarMensajeEstado(obtenerTextoTraduccion("msg_exito", "¡Recompensa reclamada con éxito!"));

            } catch (error) {
                console.error("Error al procesar la recompensa de cumpleaños:", error);
            }
        });
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
            window.location.href = "index.html";
        });
    }
});