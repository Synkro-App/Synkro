import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc,
    setDoc,
    updateDoc, 
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
let anosLlevadosGlobal = 1;
let novasRecompensaGlobal = 50000;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "btn_feliz_aniversario": { 
        "es": "✨ ¡Feliz aniversario! ✨", 
        "en": "✨ Happy anniversary! ✨", 
        "fr": "✨ Joyeux anniversaire ! ✨", 
        "ro": "✨ La mulți ani de aniversare! ✨" 
    },
    "modal_aniversario_titulo": { 
        "es": "¡Feliz Aniversario en Synkro!", 
        "en": "Happy Anniversary on Synkro!", 
        "fr": "Joyeux anniversaire sur Synkro !", 
        "ro": "La mulți ani pe Synkro!" 
    },
    "btn_reclamar_aniversario": { 
        "es": "Reclamar recompensa", 
        "en": "Claim reward", 
        "fr": "Réclamer la récompense", 
        "ro": "Revendică recompensa" 
    },
    "msg_ya_reclamado": {
        "es": "Ya has reclamado tu recompensa de aniversario este año.",
        "en": "You have already claimed your anniversary reward this year.",
        "fr": "Vous avez déjà réclamé votre récompense d'anniversaire cette année.",
        "ro": "Ai revendicat deja recompensa de aniversare în acest an."
    },
    "msg_recompensa_exito": {
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

function calcularAnosYDiasRestantesRegistro(fechaRegTimestamp) {
    if (!fechaRegTimestamp) return { anos: 0, diasRestantes: 0, fechaFormateada: "", proximoAniversarioStr: "" };
    
    const fechaReg = fechaRegTimestamp.toDate ? fechaRegTimestamp.toDate() : new Date(fechaRegTimestamp);
    const hoy = new Date();
    
    let anos = hoy.getFullYear() - fechaReg.getFullYear();
    const diferenciaMeses = hoy.getMonth() - fechaReg.getMonth();
    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < fechaReg.getDate())) {
        anos--;
    }
    if (anos < 0) anos = 0;

    let proximoAniversario = new Date(hoy.getFullYear(), fechaReg.getMonth(), fechaReg.getDate());
    if (hoy > proximoAniversario) {
        proximoAniversario.setFullYear(hoy.getFullYear() + 1);
    }

    const unDiaMs = 1000 * 60 * 60 * 24;
    const diferenciaMs = proximoAniversario.setHours(0,0,0,0) - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).setHours(0,0,0,0);
    const diasRestantes = Math.round(diferenciaMs / unDiaMs);

    const dd = String(fechaReg.getDate()).padStart(2, '0');
    const mm = String(fechaReg.getMonth() + 1).padStart(2, '0');
    const yyyyProximo = proximoAniversario.getFullYear();
    const fechaFormateada = `${dd}-${mm}-${yyyyProximo}`;

    return { anos, diasRestantes, fechaFormateada, fechaReg };
}

function esHoyAniversario(fechaRegTimestamp) {
    if (!fechaRegTimestamp) return false;
    const fechaReg = fechaRegTimestamp.toDate ? fechaRegTimestamp.toDate() : new Date(fechaRegTimestamp);
    const hoy = new Date();
    return hoy.getDate() === fechaReg.getDate() && hoy.getMonth() === fechaReg.getMonth();
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

    const btnFelizAniversario = document.getElementById("btn-feliz-aniversario");
    if (btnFelizAniversario) btnFelizAniversario.textContent = obtenerTextoTraduccion("btn_feliz_aniversario", "✨ ¡Feliz aniversario! ✨");

    const modalTitulo = document.getElementById("modal-aniversario-titulo");
    if (modalTitulo) modalTitulo.textContent = obtenerTextoTraduccion("modal_aniversario_titulo", "¡Feliz Aniversario en Synkro!");

    const btnReclamar = document.getElementById("btn-reclamar-aniversario");
    if (btnReclamar) btnReclamar.textContent = obtenerTextoTraduccion("btn_reclamar_aniversario", "Reclamar recompensa");
}

function mostrarMensajeEstado(texto) {
    const contenedorMsg = document.getElementById("mensaje-estado-aniversario");
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
    const btnFelizAniversario = document.getElementById("btn-feliz-aniversario");
    const modalAniversario = document.getElementById("modal-aniversario");
    const infoAniversario = document.getElementById("info-aniversario");
    const modalMensajeAniversario = document.getElementById("modal-aniversario-mensaje");
    const btnReclamarAniversario = document.getElementById("btn-reclamar-aniversario");
    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) filaPerfil.addEventListener("click", () => { window.location.href = "Perfil.html"; });

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) filaNovas.addEventListener("click", () => { window.location.href = "NovaPoints.html"; });

    if (btnFelizAniversario && modalAniversario) {
        btnFelizAniversario.addEventListener("click", () => {
            modalAniversario.style.display = "flex";
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
            const fecharegistro = userData.fecharegistro;

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            const avatarUrl = normalizarSourceImagen(userData.imgperfil);
            if (imgAvatar) imgAvatar.src = avatarUrl;
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;

            if (fecharegistro) {
                const calculo = calcularAnosYDiasRestantesRegistro(fecharegistro);
                const fechaFormateada = calculo.fechaFormateada;
                const diasRestantes = calculo.diasRestantes;
                const esAniversarioHoy = esHoyAniversario(fecharegistro);

                anosLlevadosGlobal = calculo.anos;
                if (anosLlevadosGlobal < 1) anosLlevadosGlobal = 1;

                novasRecompensaGlobal = 50000;
                if (anosLlevadosGlobal === 1) novasRecompensaGlobal = 100000;
                else if (anosLlevadosGlobal === 2) novasRecompensaGlobal = 70000;

                let textoInfoTemplate = `Entra el día {fecha} para recibir una recompensa por hacer un año con nosotros (o un año más)`;
                if (currentLanguage === "en") {
                    textoInfoTemplate = `Log in on {fecha} to receive a reward for spending a year with us (or another year)`;
                } else if (currentLanguage === "fr") {
                    textoInfoTemplate = `Connectez-vous le {fecha} pour recevoir une récompense pour avoir passé une année avec nous (ou une de plus)`;
                } else if (currentLanguage === "ro") {
                    textoInfoTemplate = `Conectează-te în data de {fecha} pentru a primi o recompensă pentru că ai petrecut un an cu noi (sau încă un an)`;
                }
                if (infoAniversario) {
                    infoAniversario.textContent = textoInfoTemplate.replace("{fecha}", fechaFormateada);
                }

                let textoModalTemplate = `Hoy hace ${anosLlevadosGlobal} ${anosLlevadosGlobal === 1 ? 'año' : 'años'} y para agradecerte la confianza en nosotros, te regalamos ${novasRecompensaGlobal.toLocaleString()} NovaPoints y un mes de subscripción Estelar`;
                if (currentLanguage === "en") {
                    textoModalTemplate = `Today marks ${anosLlevadosGlobal} ${anosLlevadosGlobal === 1 ? 'year' : 'years'} and to thank you for trusting us, we gift you ${novasRecompensaGlobal.toLocaleString()} NovaPoints and one month of Stellar subscription`;
                } else if (currentLanguage === "fr") {
                    textoModalTemplate = `Aujourd'hui cela fait ${anosLlevadosGlobal} ${anosLlevadosGlobal === 1 ? 'an' : 'ans'} et pour vous remercier de votre confiance, nous vous offrons ${novasRecompensaGlobal.toLocaleString()} NovaPoints et un abonnement Stellaire d'un mois`;
                } else if (currentLanguage === "ro") {
                    textoModalTemplate = `Astăzi se împlinesc ${anosLlevadosGlobal} ${anosLlevadosGlobal === 1 ? 'an' : 'ani'} și pentru a îți mulțumi pentru încrederea acordată, îți oferim ${novasRecompensaGlobal.toLocaleString()} NovaPoints și o lună de abonament Estelar`;
                }
                if (modalMensajeAniversario) {
                    modalMensajeAniversario.textContent = textoModalTemplate;
                }

                const anoActualStr = new Date().getFullYear().toString();
                const aniversarioDocRef = doc(db, "Usuarios", userDocIdGlobal, "aniversario", anoActualStr);
                const aniversarioDocSnap = await getDoc(aniversarioDocRef);
                const yaReclamadoEsteAno = aniversarioDocSnap.exists() && aniversarioDocSnap.data().recibidas === true;

                if (yaReclamadoEsteAno) {
                    mostrarMensajeEstado(obtenerTextoTraduccion("msg_ya_reclamado", "Ya has reclamado tu recompensa de aniversario este año."));
                } else if (esAniversarioHoy && btnFelizAniversario) {
                    btnFelizAniversario.style.display = "block";
                }

                const actualizaciones = {};
                if (userData.Edad === undefined || Number(userData.Edad) !== calculo.anos) {
                    actualizaciones.Edad = calculo.anos;
                }
                actualizaciones.diasrestantes = diasRestantes;

                if (Object.keys(actualizaciones).length > 0) {
                    await updateDoc(doc(db, "Usuarios", userDocIdGlobal), actualizaciones);
                }
            }

            if (userData.subs && typeof userData.subs === "object") {
                let subsTexto = userData.subs.subs || ""; 
                if (userData.subs.fechaExpiracion) {
                    const timestampExpiracion = userData.subs.fechaExpiracion.toDate ? userData.subs.fechaExpiracion.toDate() : new Date(userData.subs.fechaExpiracion);
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
                    const dias = userData.subs.diasrestantes !== undefined ? userData.subs.diasrestantes : 0;
                    if (valSubs) valSubs.textContent = `${subsTexto} (${dias}d)`;
                }
            } else {
                if (valSubs) valSubs.textContent = obtenerTextoTraduccion("text_ninguna", "Ninguna");
            }

            // Lógica para Reclamar Recompensa
            if (btnReclamarAniversario) {
                btnReclamarAniversario.addEventListener("click", async () => {
                    try {
                        const anoActualStr = new Date().getFullYear().toString();
                        const aniversarioRef = doc(db, "Usuarios", userDocIdGlobal, "aniversario", anoActualStr);
                        const anivSnap = await getDoc(aniversarioRef);

                        if (anivSnap.exists() && anivSnap.data().recibidas === true) {
                            mostrarMensajeEstado(obtenerTextoTraduccion("msg_ya_reclamado", "Ya has reclamado tu recompensa de aniversario este año."));
                            modalAniversario.style.display = "none";
                            if (btnFelizAniversario) btnFelizAniversario.style.display = "none";
                            return;
                        }

                        const timestampActual = Timestamp.now();

                        // 1. Crear documento en subcolección aniversarios
                        await setDoc(aniversarioRef, {
                            NovaPoints: novasRecompensaGlobal,
                            fecha: timestampActual,
                            recibidas: true
                        });

                        // 2. Sumar NovaPoints al usuario
                        const novasActuales = userData.NovaPoints !== undefined ? Number(userData.NovaPoints) : 0;
                        const nuevasNovas = novasActuales + novasRecompensaGlobal;
                        await updateDoc(doc(db, "Usuarios", userDocIdGlobal), {
                            NovaPoints: nuevasNovas
                        });

                        // 3. Crear documento en Transacciones de NovaPoints con id incremental (aniversario1, aniversario2...)
                        const transaccionesRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
                        const transSnap = await getDocs(transaccionesRef);
                        let contadorAniversario = 1;
                        transSnap.forEach(tDoc => {
                            if (tDoc.id.startsWith("aniversario")) {
                                contadorAniversario++;
                            }
                        });
                        const idTransaccion = `aniversario${contadorAniversario}`;
                        await setDoc(doc(transaccionesRef, idTransaccion), {
                            NovaPoints: novasRecompensaGlobal,
                            where: "Aniversario",
                            fecha: timestampActual,
                            años: anosLlevadosGlobal,
                            tipo: "suma"
                        });

                        // 4. Lógica de suscripción Estelar
                        let nuevaFechaCompra = timestampActual;
                        let nuevaFechaExpiracion;
                        const hoyDate = new Date();

                        if (userData.subs && typeof userData.subs === "object" && userData.subs.subs) {
                            const tipoSubActual = userData.subs.subs;
                            if (tipoSubActual === "Estelar") {
                                // Si ya tiene Estelar, mantiene su fechaCompra anterior si existe, o usa el actual
                                if (userData.subs.fechaCompra) {
                                    nuevaFechaCompra = userData.subs.fechaCompra;
                                }
                                // Si tiene fechaExpiracion vigente y es futura, sumamos sobre ella; si no, desde hoy
                                let baseExp = hoyDate;
                                if (userData.subs.fechaExpiracion) {
                                    const expAnterior = userData.subs.fechaExpiracion.toDate ? userData.subs.fechaExpiracion.toDate() : new Date(userData.subs.fechaExpiracion);
                                    if (expAnterior > hoyDate) {
                                        baseExp = expAnterior;
                                    }
                                }
                                baseExp.setDate(baseExp.getDate() + 30);
                                nuevaFechaExpiracion = Timestamp.fromDate(baseExp);
                            } else {
                                // Si tiene otra suscripción inferior (Básica, Premium), parte de cero
                                let baseExp = new Date();
                                baseExp.setDate(baseExp.getDate() + 30);
                                nuevaFechaExpiracion = Timestamp.fromDate(baseExp);
                            }
                        } else {
                            // Si no tenía suscripción activa
                            let baseExp = new Date();
                            baseExp.setDate(baseExp.getDate() + 30);
                            nuevaFechaExpiracion = Timestamp.fromDate(baseExp);
                        }

                        const expDateObj = nuevaFechaExpiracion.toDate ? nuevaFechaExpiracion.toDate() : new Date(nuevaFechaExpiracion);
                        const diasRestantesSubs = Math.ceil((expDateObj.getTime() - hoyDate.getTime()) / (1000 * 60 * 60 * 24));

                        await updateDoc(doc(db, "Usuarios", userDocIdGlobal), {
                            subs: {
                                subs: "Estelar",
                                fechaCompra: nuevaFechaCompra,
                                fechaExpiracion: nuevaFechaExpiracion,
                                diasrestantes: diasRestantesSubs > 0 ? diasRestantesSubs : 0
                            }
                        });

                        // Actualizar UI localmente
                        if (txtNovas) txtNovas.textContent = nuevasNovas;
                        if (valSubs) valSubs.textContent = `Estelar (${diasRestantesSubs > 0 ? diasRestantesSubs : 0}d)`;

                        modalAniversario.style.display = "none";
                        if (btnFelizAniversario) btnFelizAniversario.style.display = "none";
                        mostrarMensajeEstado(obtenerTextoTraduccion("msg_recompensa_exito", "¡Recompensa reclamada con éxito!"));

                    } catch (error) {
                        console.error("Error al reclamar la recompensa de aniversario:", error);
                    }
                });
            }
        }
    } catch (error) {
        console.error("Error al obtener los datos del usuario para aniversario:", error);
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