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
    onSnapshot,
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
let nombreUsuarioGlobal = "";
let edadUsuarioGlobal = 0; 
let subsUsuarioGlobal = ""; 
let avatarUsuarioGlobal = "default-profile.png";
let userNovaPointsGlobal = 0;
let unsubscribeGeneral = null;

const traduccionesLocales = {
    "btn_cerrar_sesion": { "es": "Cerrar sesión", "en": "Log out", "fr": "Déconnexion", "ro": "Deconectare" },
    "text_ninguna": { "es": "Ninguna", "en": "None", "fr": "Aucune", "ro": "Niciuna" },
    "text_subscripcion": { "es": "Suscripción:", "en": "Subscription:", "fr": "Abonnement:", "ro": "Abonament:" },
    "btn_volver": { "es": "Volver", "en": "Back", "fr": "Retour", "ro": "Înapoi" },
    "titulo_loteria": { "es": "Lotería", "en": "Lottery", "fr": "Loterie", "ro": "Loterie" },
    "label_mi_boleto": { "es": "Mi boleto:", "en": "My ticket:", "fr": "Mon billet:", "ro": "Biletul meu:" },
    "btn_numeros_premios": { "es": "Números y Premios", "en": "Numbers and Prizes", "fr": "Numéros et Prix", "ro": "Numere și Premii" },
    "btn_modal_mis_numeros": { "es": "Mis números", "en": "My numbers", "fr": "Mes numéros", "ro": "Numerele mele" },
    "btn_modal_premios": { "es": "Premios", "en": "Prizes", "fr": "Prix", "ro": "Premii" },
    "info_precio_boleto": { "es": "Cada boleto cuesta 1.000 NovaPoints, y cada usuario solo puede comprar uno", "en": "Each ticket costs 1,000 NovaPoints, and each user can only buy one", "fr": "Chaque billet coûte 1 000 NovaPoints, et chaque utilisateur ne peut en acheter qu'un seul", "ro": "Fiecare bilet costă 1.000 NovaPoints și fiecare utilizator poate cumpăra doar unul" },
    "info_premios_detalle": { "es": "Juega y prueba suerte, el Primer premio son 500.000 NovaPoints, el segundo 300.000 el tercero 150.000 el cuarto y el quinto 50.000 y 5 números de devolución (1.000)", "en": "Play and try your luck, the First prize is 500,000 NovaPoints, second 300,000 third 150,000 fourth and fifth 50,000 and 5 refund numbers (1,000)", "fr": "Jouez et tentez votre chance, le premier prix est de 500 000 NovaPoints, le deuxième de 300 000, le troisième de 150 000, le quatrième et le cinquième de 50 000 et 5 numéros de remboursement (1 000)", "ro": "Joacă și încearcă-ți norocul, premiul întâi este de 500.000 NovaPoints, al doilea 300.000, al treilea 150.000, al patrulea și al cincilea 50.000 și 5 numere de rambursare (1.000)" },
    "texto_confirmar_compra": { "es": "¿Deseas comprar este boleto?", "en": "Do you want to buy this ticket?", "fr": "Voulez-vous acheter ce billet?", "ro": "Dorești să cumperi acest bilet?" },
    "modal_compra_titulo": { "es": "Comprar boleto", "en": "Buy ticket", "fr": "Acheter un billet", "ro": "Cumpără bilet" },
    "btn_compra_si": { "es": "SI", "en": "YES", "fr": "OUI", "ro": "DA" },
    "btn_compra_no": { "es": "NO", "en": "NO", "fr": "NON", "ro": "NU" },
    "primer_puesto": { "es": "Primer puesto:", "en": "First place:", "fr": "Première place:", "ro": "Locul întâi:" },
    "segundo_puesto": { "es": "Segundo puesto:", "en": "Second place:", "fr": "Deuxième place:", "ro": "Locul al doilea:" },
    "tercer_puesto": { "es": "Tercer puesto:", "en": "Third place:", "fr": "Troisième place:", "ro": "Locul al treilea:" },
    "cuarto_quinto_puesto": { "es": "Cuarto y quinto puesto:", "en": "Fourth and fifth place:", "fr": "Quatrième et cinquième place:", "ro": "Locul al patrulea și al cincilea:" },
    "devueltos": { "es": "Devueltos:", "en": "Refunded:", "fr": "Remboursés:", "ro": "Rambursate:" },
    "puesto_devuelto": { "es": "devuelto", "en": "refunded", "fr": "remboursé", "ro": "rambursat" },
    "sin_comprador": { "es": "Sin comprador", "en": "No buyer", "fr": "Pas d'acheteur", "ro": "Fără cumpărător" },
    "comprador_label": { "es": "Comprador:", "en": "Buyer:", "fr": "Acheteur:", "ro": "Cumpărător:" },
    "btn_reclamar_premios_top": { "es": "Premios", "en": "Prizes", "fr": "Prix", "ro": "Premii" },
    "modal_reclamar_title": { "es": "Premios pendientes", "en": "Pending prizes", "fr": "Prix en attente", "ro": "Premii în așteptare" },
    "msg_no_activa": { "es": "Todavía no está activa, espera a la semana de juego", "en": "Not active yet, please wait for the game week", "fr": "Pas encore actif, veuillez attendre la semaine de jeu", "ro": "Nu este activ încă, te rugăm să aștepți săptămâna de joc" },
    "msg_ya_comprado": { "es": "Ya tienes un boleto comprado para esta semana.", "en": "You already bought a ticket for this week.", "fr": "Vous avez déjà acheté un billet pour cette semaine.", "ro": "Ai cumpărat deja un bilet pentru această săptămână." },
    "msg_poco_saldo": { "es": "No tienes suficientes NovaPoints (necesitas 1.000).", "en": "You don't have enough NovaPoints (you need 1,000).", "fr": "Vous n'avez pas assez de NovaPoints (vous avez besoin de 1 000).", "ro": "Nu ai suficiente NovaPoints (ai nevoie de 1.000)." },
    "msg_exito_compra": { "es": "¡Boleto comprado con éxito!", "en": "Ticket successfully purchased!", "fr": "Billet acheté avec succès !", "ro": "Bilet cumpărat cu succes!" },
    "texto_boleto_label": { "es": "Boleto", "en": "Ticket", "fr": "Billet", "ro": "Bilet" },
    "texto_al_label": { "es": "al", "en": "to", "fr": "au", "ro": "la" },
    "etiqueta_semana": { "es": "Semana", "en": "Week", "fr": "Semaine", "ro": "Săptămâna" },
    "msg_premio_reclamado": { "es": "¡Premio reclamado con éxito! Has recibido {cantidad} NovaPoints.", "en": "Prize successfully claimed! You have received {cantidad} NovaPoints.", "fr": "Prix réclamé avec succès ! Vous avez reçu {cantidad} NovaPoints.", "ro": "Premiu revendicat cu succes! Ai primit {cantidad} NovaPoints." },
    "etiqueta_puesto": { "es": "Puesto", "en": "Place", "fr": "Place", "ro": "Loc" }
};

function mostrarPopUpTemporal(mensaje) {
    const popup = document.getElementById("popup-temporal");
    if (!popup) return;
    popup.textContent = mensaje;
    popup.style.display = "block";
    setTimeout(() => {
        popup.style.display = "none";
    }, 4000);
}

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

function obtenerTextoTraduccion(clave, fallbackTexto) {
    if (diccionario[clave] && diccionario[clave][currentLanguage]) {
        return diccionario[clave][currentLanguage];
    }
    if (traduccionesLocales[clave] && traduccionesLocales[clave][currentLanguage]) {
        return traduccionesLocales[clave][currentLanguage];
    }
    return fallbackTexto;
}

function formatearNombreSemana(idSemanaDoc) {
    const palabraSemana = obtenerTextoTraduccion("etiqueta_semana", "Semana");
    const matchNum = idSemanaDoc.toLowerCase().match(/\d+/);
    if (matchNum) {
        return `${palabraSemana} ${matchNum[0]}`;
    }
    return idSemanaDoc;
}

function formatearTimestampSoloFecha(timestampObj) {
    if (!timestampObj) return "";
    let fecha = timestampObj.toDate ? timestampObj.toDate() : new Date(timestampObj);
    if (isNaN(fecha.getTime())) return "";
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const aaaa = fecha.getFullYear();
    return `${dd}-${mm}-${aaaa}`;
}

function aplicarTraduccionesEstaticas() {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs) lblSubs.textContent = obtenerTextoTraduccion("text_subscripcion", "Suscripción:");
    
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) btnVolver.textContent = obtenerTextoTraduccion("btn_volver", "Volver");
    
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.textContent = obtenerTextoTraduccion("btn_cerrar_sesion", "Cerrar sesión");
    
    const tituloLoteria = document.getElementById("titulo-loteria");
    if (tituloLoteria) tituloLoteria.textContent = obtenerTextoTraduccion("titulo_loteria", "Lotería");

    const labelMiBoleto = document.getElementById("label-mi-boleto");
    if (labelMiBoleto) labelMiBoleto.textContent = obtenerTextoTraduccion("label_mi_boleto", "Mi boleto:");

    const btnNumPremios = document.getElementById("btn-numeros-premios");
    if (btnNumPremios) btnNumPremios.textContent = obtenerTextoTraduccion("btn_numeros_premios", "Números y Premios");

    const btnReclamarPremios = document.getElementById("btn-reclamar-premios");
    if (btnReclamarPremios) btnReclamarPremios.textContent = obtenerTextoTraduccion("btn_reclamar_premios_top", "Premios");

    const infoPrecio = document.getElementById("info-precio-boleto");
    if (infoPrecio) infoPrecio.textContent = obtenerTextoTraduccion("info_precio_boleto", "Cada boleto cuesta 1.000 NovaPoints, y cada usuario solo puede comprar uno");

    const infoPremios = document.getElementById("info-premios-detalle");
    if (infoPremios) infoPremios.textContent = obtenerTextoTraduccion("info_premios_detalle", "Juega y prueba suerte, el Primer premio son 500.000 NovaPoints, el segundo 300.000 el tercero 150.000 el cuarto y el quinto 50.000 y 5 números de devolución (1.000)");

    const modalNpTitle = document.getElementById("modal-np-title");
    if (modalNpTitle) modalNpTitle.textContent = obtenerTextoTraduccion("btn_numeros_premios", "Números y Premios");

    const btnModalMisNum = document.getElementById("btn-modal-mis-numeros");
    if (btnModalMisNum) btnModalMisNum.textContent = obtenerTextoTraduccion("btn_modal_mis_numeros", "Mis números");

    const btnModalPremios = document.getElementById("btn-modal-premios");
    if (btnModalPremios) btnModalPremios.textContent = obtenerTextoTraduccion("btn_modal_premios", "Premios");

    const modalMisNumTitle = document.getElementById("modal-misnum-title");
    if (modalMisNumTitle) modalMisNumTitle.textContent = obtenerTextoTraduccion("btn_modal_mis_numeros", "Mis números");

    const modalPremiosTitle = document.getElementById("modal-premios-title");
    if (modalPremiosTitle) modalPremiosTitle.textContent = obtenerTextoTraduccion("btn_modal_premios", "Premios");

    const modalCompraTitulo = document.getElementById("modal-compra-titulo");
    if (modalCompraTitulo) modalCompraTitulo.textContent = obtenerTextoTraduccion("modal_compra_titulo", "Comprar boleto");

    const textoConfirmarCompra = document.getElementById("texto-confirmar-compra");
    if (textoConfirmarCompra) textoConfirmarCompra.textContent = obtenerTextoTraduccion("texto_confirmar_compra", "¿Deseas comprar este boleto?");

    const btnCompraSi = document.getElementById("btn-compra-si");
    if (btnCompraSi) btnCompraSi.textContent = obtenerTextoTraduccion("btn_compra_si", "SI");

    const btnCompraNo = document.getElementById("btn-compra-no");
    if (btnCompraNo) btnCompraNo.textContent = obtenerTextoTraduccion("btn_compra_no", "NO");

    const modalReclamarTitle = document.getElementById("modal-reclamar-title");
    if (modalReclamarTitle) modalReclamarTitle.textContent = obtenerTextoTraduccion("modal_reclamar_title", "Premios pendientes");
}

function configurarSincronizacionEnTiempoReal() {
    if (unsubscribeGeneral) unsubscribeGeneral();

    // Sincronización única y unificada para evitar llamadas cruzadas redundantes
    unsubscribeGeneral = onSnapshot(collection(db, "Loteria"), async (loteriaSnapshot) => {
        await evaluarYRenderizarLoteria(loteriaSnapshot);
    });
}

async function evaluarYRenderizarLoteria(loteriaSnapshot) {
    const contenedorBoletos = document.getElementById("boletos-en-vigor-container");
    const badgeMiBoleto = document.getElementById("mi-boleto-container");
    const valMiBoleto = document.getElementById("val-mi-boleto");
    const btnReclamarPremiosTop = document.getElementById("btn-reclamar-premios");

    if (!contenedorBoletos) return;

    // Limpieza estricta y absoluta del contenedor para evitar duplicados visuales
    contenedorBoletos.innerHTML = "";

    const fechaActual = new Date();
    let boletoActivoEncontrado = null;
    let idSemanaActiva = null;
    let haySemanaEnVigor = false;
    const semanasProcesadasIds = new Set();

    for (const docSemana of loteriaSnapshot.docs) {
        const idSemanaDoc = docSemana.id;
        
        if (semanasProcesadasIds.has(idSemanaDoc)) continue;
        semanasProcesadasIds.add(idSemanaDoc);

        const datos = docSemana.data();
        const fechainicio = datos.fechainicio;
        const fechafin = datos.fechafin;

        if (!fechainicio || !fechafin) continue;

        const fechaInicioDate = fechainicio.toDate ? fechainicio.toDate() : new Date(fechainicio);
        const fechaFinDate = fechafin.toDate ? fechafin.toDate() : new Date(fechafin);

        let nombreSemanaFormateado = formatearNombreSemana(idSemanaDoc);

        if (fechaActual > fechaFinDate && !datos.premiados) {
            const boletosArray = datos.boletos || [];
            if (boletosArray.length > 0) {
                let copiaArray = [...boletosArray];
                let premiadosSeleccionados = [];
                
                for (let i = 0; i < Math.min(5, copiaArray.length); i++) {
                    const indexAleatorio = Math.floor(Math.random() * copiaArray.length);
                    premiadosSeleccionados.push(copiaArray.splice(indexAleatorio, 1)[0]);
                }

                let devueltosSeleccionados = [];
                for (let i = 0; i < Math.min(5, copiaArray.length); i++) {
                    const indexAleatorio = Math.floor(Math.random() * copiaArray.length);
                    devueltosSeleccionados.push(copiaArray.splice(indexAleatorio, 1)[0]);
                }

                const mapPremiados = {
                    "puesto 1": premiadosSeleccionados[0] !== undefined ? premiadosSeleccionados[0] : null,
                    "puesto 2": premiadosSeleccionados[1] !== undefined ? premiadosSeleccionados[1] : null,
                    "puesto 3": premiadosSeleccionados[2] !== undefined ? premiadosSeleccionados[2] : null,
                    "puestos 4 y 5": {
                        "puesto 4": premiadosSeleccionados[3] !== undefined ? premiadosSeleccionados[3] : null,
                        "puesto 5": premiadosSeleccionados[4] !== undefined ? premiadosSeleccionados[4] : null
                    }
                };

                await updateDoc(doc(db, "Loteria", idSemanaDoc), {
                    premiados: mapPremiados,
                    devueltos: devueltosSeleccionados
                });
                datos.premiados = mapPremiados;
                datos.devueltos = devueltosSeleccionados;
            }
        }

        if (datos.premiados && datos.devueltos && userDocIdGlobal) {
            const subUsuarioDocRef = doc(db, "Usuarios", userDocIdGlobal, "Loteria", idSemanaDoc);
            const subUsuarioSnap = await getDoc(subUsuarioDocRef);
            
            if (subUsuarioSnap.exists()) {
                const dataUserBoleto = subUsuarioSnap.data();
                const numeroBoletoUsuario = dataUserBoleto.boleto;

                if (dataUserBoleto.premio === undefined) {
                    let puestoGanado = null;
                    const p = datos.premiados;
                    if (p["puesto 1"] === numeroBoletoUsuario) puestoGanado = "primer puesto";
                    else if (p["puesto 2"] === numeroBoletoUsuario) puestoGanado = "segundo puesto";
                    else if (p["puesto 3"] === numeroBoletoUsuario) puestoGanado = "tercer puesto";
                    else if (p["puestos 4 y 5"] && (p["puestos 4 y 5"]["puesto 4"] === numeroBoletoUsuario || p["puestos 4 y 5"]["puesto 5"] === numeroBoletoUsuario)) puestoGanado = "cuarto y quinto puesto";
                    else if (datos.devueltos.includes(numeroBoletoUsuario)) puestoGanado = "devuelto";

                    if (puestoGanado) {
                        await updateDoc(subUsuarioDocRef, {
                            premio: puestoGanado,
                            recogido: false
                        });
                    }
                }
            }
        }

        if (fechaActual >= fechaInicioDate && fechaActual <= fechaFinDate) {
            haySemanaEnVigor = true;
            idSemanaActiva = idSemanaDoc;
            const boletosDisponibles = datos.boletos || [];
            const compradosMap = datos.comprados || {};

            if (userDocIdGlobal) {
                const subUserRef = doc(db, "Usuarios", userDocIdGlobal, "Loteria", idSemanaActiva);
                const subUserSnap = await getDoc(subUserRef);
                if (subUserSnap.exists()) {
                    const sbData = subUserSnap.data();
                    if (sbData.boleto !== undefined) {
                        boletoActivoEncontrado = sbData.boleto;
                    }
                }
            }

            const tarjetaSemana = document.createElement("div");
            tarjetaSemana.className = "semana-card";

            const tituloCard = document.createElement("h3");
            tituloCard.className = "semana-card-title";
            tituloCard.textContent = nombreSemanaFormateado;
            tarjetaSemana.appendChild(tituloCard);

            const gridNumeros = document.createElement("div");
            gridNumeros.className = "boletos-numeros-grid";

            // Eliminar duplicados mediante un Set estricto de boletos únicos
            const boletosUnicos = [...new Set(boletosDisponibles)];

            boletosUnicos.forEach((numBoleto) => {
                const btnBoleto = document.createElement("button");
                btnBoleto.type = "button";
                btnBoleto.className = "boleto-item-btn";
                btnBoleto.textContent = numBoleto;

                let yaCompradoPorAlguien = false;
                for (let key in compradosMap) {
                    if (compradosMap[key].boleto === numBoleto) {
                        yaCompradoPorAlguien = true;
                        break;
                    }
                }

                if (yaCompradoPorAlguien) {
                    btnBoleto.classList.add("comprado");
                }

                btnBoleto.addEventListener("click", () => {
                    if (yaCompradoPorAlguien) return;
                    abrirModalConfirmarCompra(idSemanaActiva, numBoleto);
                });

                gridNumeros.appendChild(btnBoleto);
            });

            tarjetaSemana.appendChild(gridNumeros);
            contenedorBoletos.appendChild(tarjetaSemana);
        }
    }

    if (!haySemanaEnVigor) {
        const mensajeInactivo = document.createElement("div");
        mensajeInactivo.className = "loteria-info-box";
        mensajeInactivo.textContent = obtenerTextoTraduccion("msg_no_activa", "Todavía no está activa, espera a la semana de juego");
        contenedorBoletos.appendChild(mensajeInactivo);
    }

    if (badgeMiBoleto && valMiBoleto) {
        if (boletoActivoEncontrado !== null && idSemanaActiva) {
            badgeMiBoleto.style.display = "block";
            valMiBoleto.textContent = boletoActivoEncontrado;
        } else {
            badgeMiBoleto.style.display = "none";
        }
    }

    if (userDocIdGlobal && btnReclamarPremiosTop) {
        const subColeccionLoteriaRef = collection(db, "Usuarios", userDocIdGlobal, "Loteria");
        const snapSub = await getDocs(subColeccionLoteriaRef);
        let hayPendientes = false;
        snapSub.forEach(sDoc => {
            const d = sDoc.data();
            if (d.premio !== undefined && d.recogido === false) {
                hayPendientes = true;
            }
        });

        if (hayPendientes) {
            btnReclamarPremiosTop.style.display = "block";
        } else {
            btnReclamarPremiosTop.style.display = "none";
        }
    }
}

let semanaSeleccionadaCompra = null;
let numeroSeleccionadoCompra = null;

function abrirModalConfirmarCompra(idSemana, numBoleto) {
    if (!userDocIdGlobal) return;

    getDoc(doc(db, "Usuarios", userDocIdGlobal, "Loteria", idSemana)).then(async (snap) => {
        if (snap.exists() && snap.data().boleto !== undefined) {
            mostrarPopUpTemporal(obtenerTextoTraduccion("msg_ya_comprado", "Ya tienes un boleto comprado para esta semana."));
            return;
        }

        if (userNovaPointsGlobal < 1000) {
            mostrarPopUpTemporal(obtenerTextoTraduccion("msg_poco_saldo", "No tienes suficientes NovaPoints (necesitas 1.000)."));
            return;
        }

        semanaSeleccionadaCompra = idSemana;
        numeroSeleccionadoCompra = numBoleto;
        document.getElementById("modal-confirmar-compra").style.display = "flex";
    });
}

document.getElementById("btn-compra-si").addEventListener("click", async () => {
    if (!semanaSeleccionadaCompra || numeroSeleccionadoCompra === null || !userDocIdGlobal) return;

    try {
        const fechaServer = serverTimestamp();
        
        await setDoc(doc(db, "Usuarios", userDocIdGlobal, "Loteria", semanaSeleccionadaCompra), {
            boleto: numeroSeleccionadoCompra,
            fecha: fechaServer
        });

        const transRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const transSnap = await getDocs(transRef);
        let maxIdx = 0;
        transSnap.forEach(tDoc => {
            if (tDoc.id.startsWith("loteria")) {
                const num = parseInt(tDoc.id.replace("loteria", ""), 10);
                if (!isNaN(num) && num > maxIdx) maxIdx = num;
            }
        });
        const idTransaccionNueva = `loteria${maxIdx + 1}`;

        await setDoc(doc(transRef, idTransaccionNueva), {
            NovaPoints: 1000,
            boleto: numeroSeleccionadoCompra,
            donde: "Lotería",
            fecha: fechaServer,
            tipo: "suma"
        });

        const userDocRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userDocRef, {
            NovaPoints: increment(-1000)
        });
        userNovaPointsGlobal -= 1000;
        document.getElementById("user-novas").textContent = userNovaPointsGlobal;

        const loteriaDocRef = doc(db, "Loteria", semanaSeleccionadaCompra);
        const loteriaSnap = await getDoc(loteriaDocRef);
        let compradosActuales = {};
        if (loteriaSnap.exists() && loteriaSnap.data().comprados) {
            compradosActuales = loteriaSnap.data().comprados;
        }

        const siguienteKeyComprado = Object.keys(compradosActuales).length;
        compradosActuales[siguienteKeyComprado] = {
            boleto: numeroSeleccionadoCompra,
            fecha: fechaServer,
            usuario: nombreUsuarioGlobal
        };

        await updateDoc(loteriaDocRef, {
            comprados: compradosActuales
        });

        document.getElementById("modal-confirmar-compra").style.display = "none";
        mostrarPopUpTemporal(obtenerTextoTraduccion("msg_exito_compra", "¡Boleto comprado con éxito!"));

        const snapshotActualizado = await getDocs(collection(db, "Loteria"));
        await evaluarYRenderizarLoteria(snapshotActualizado);

    } catch (error) {
        console.error("Error al comprar el boleto:", error);
    }
});

document.getElementById("btn-compra-no").addEventListener("click", () => {
    document.getElementById("modal-confirmar-compra").style.display = "none";
});

document.getElementById("close-modal-compra-x").addEventListener("click", () => {
    document.getElementById("modal-confirmar-compra").style.display = "none";
});

document.getElementById("btn-numeros-premios").addEventListener("click", () => {
    document.getElementById("modal-numeros-premios").style.display = "flex";
});

document.getElementById("close-modal-np").addEventListener("click", () => {
    document.getElementById("modal-numeros-premios").style.display = "none";
});

document.getElementById("btn-modal-mis-numeros").addEventListener("click", async () => {
    document.getElementById("modal-numeros-premios").style.display = "none";
    const modalMisNum = document.getElementById("modal-mis-numeros");
    const listaContent = document.getElementById("lista-mis-numeros-content");
    listaContent.innerHTML = "";

    try {
        const subLoteriaRef = collection(db, "Usuarios", userDocIdGlobal, "Loteria");
        const subSnap = await getDocs(subLoteriaRef);

        for (const docSub of subSnap.docs) {
            const idSemanaDoc = docSub.id;
            const dataSub = docSub.data();
            const numBoleto = dataSub.boleto;
            const fechaCompraStr = formatearTimestampSoloFecha(dataSub.fecha);

            let nombreSemanaLimpio = formatearNombreSemana(idSemanaDoc);

            const mainLoteriaDoc = await getDoc(doc(db, "Loteria", idSemanaDoc));
            let rangoSemanasStr = "";
            if (mainLoteriaDoc.exists()) {
                const mData = mainLoteriaDoc.data();
                const inicioStr = formatearTimestampSoloFecha(mData.fechainicio);
                const finStr = formatearTimestampSoloFecha(mData.fechafin);
                const textoAl = obtenerTextoTraduccion("texto_al_label", "al");
                rangoSemanasStr = ` (${inicioStr} ${textoAl} ${finStr})`;
            }

            const textoBoletoLabel = obtenerTextoTraduccion("texto_boleto_label", "Boleto");

            const itemDiv = document.createElement("div");
            itemDiv.className = "item-lista-modal";
            itemDiv.innerHTML = `<span>${nombreSemanaLimpio}:${rangoSemanasStr} - ${textoBoletoLabel}: ${numBoleto}</span> <span style="font-size:0.85rem; color:#555;">${fechaCompraStr}</span>`;
            listaContent.appendChild(itemDiv);
        }

    } catch (error) {
        console.error("Error al cargar los números del usuario:", error);
    }

    modalMisNum.style.display = "flex";
});

document.getElementById("close-modal-mis-num").addEventListener("click", () => {
    document.getElementById("modal-mis-numeros").style.display = "none";
});

document.getElementById("btn-modal-premios").addEventListener("click", async () => {
    document.getElementById("modal-numeros-premios").style.display = "none";
    const modalPremios = document.getElementById("modal-premios");
    const listaPremiosContent = document.getElementById("lista-premios-content");
    listaPremiosContent.innerHTML = "";

    try {
        const loteriaSnapshot = await getDocs(collection(db, "Loteria"));

        for (const docSemana of loteriaSnapshot.docs) {
            const idSemanaDoc = docSemana.id;
            let nombreSemanaLimpio = formatearNombreSemana(idSemanaDoc);

            const datos = docSemana.data();
            const premiados = datos.premiados || {};
            const devueltos = datos.devueltos || [];
            const compradosMap = datos.comprados || {};

            const boxSemana = document.createElement("div");
            boxSemana.className = "premios-semana-box";

            const tituloSemana = document.createElement("h3");
            tituloSemana.textContent = nombreSemanaLimpio;
            boxSemana.appendChild(tituloSemana);

            function crearBotonNumero(num) {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "boleto-item-btn";
                btn.textContent = num !== undefined && num !== null ? num : "-";

                btn.addEventListener("click", () => {
                    if (num === undefined || num === null) return;
                    let nombreComprador = obtenerTextoTraduccion("sin_comprador", "Sin comprador");
                    for (let k in compradosMap) {
                        if (compradosMap[k].boleto === num) {
                            nombreComprador = compradosMap[k].usuario;
                            break;
                        }
                    }
                    abrirModalComprador(num, nombreComprador);
                });
                return btn;
            }

            const tPrimer = document.createElement("div");
            tPrimer.style.fontSize = "0.9rem";
            tPrimer.style.fontWeight = "bold";
            tPrimer.textContent = obtenerTextoTraduccion("primer_puesto", "Primer puesto:");
            boxSemana.appendChild(tPrimer);
            const row1 = document.createElement("div");
            row1.className = "premios-numeros-row";
            row1.appendChild(crearBotonNumero(premiados["puesto 1"]));
            boxSemana.appendChild(row1);

            const tSegundo = document.createElement("div");
            tSegundo.style.fontSize = "0.9rem";
            tSegundo.style.fontWeight = "bold";
            tSegundo.style.marginTop = "5px";
            tSegundo.textContent = obtenerTextoTraduccion("segundo_puesto", "Segundo puesto:");
            boxSemana.appendChild(tSegundo);
            const row2 = document.createElement("div");
            row2.className = "premios-numeros-row";
            row2.appendChild(crearBotonNumero(premiados["puesto 2"]));
            boxSemana.appendChild(row2);

            const tTercero = document.createElement("div");
            tTercero.style.fontSize = "0.9rem";
            tTercero.style.fontWeight = "bold";
            tTercero.style.marginTop = "5px";
            tTercero.textContent = obtenerTextoTraduccion("tercer_puesto", "Tercer puesto:");
            boxSemana.appendChild(tTercero);
            const row3 = document.createElement("div");
            row3.className = "premios-numeros-row";
            row3.appendChild(crearBotonNumero(premiados["puesto 3"]));
            boxSemana.appendChild(row3);

            const tCuartoQuinto = document.createElement("div");
            tCuartoQuinto.style.fontSize = "0.9rem";
            tCuartoQuinto.style.fontWeight = "bold";
            tCuartoQuinto.style.marginTop = "5px";
            tCuartoQuinto.textContent = obtenerTextoTraduccion("cuarto_quinto_puesto", "Cuarto y quinto puesto:");
            boxSemana.appendChild(tCuartoQuinto);
            const row4 = document.createElement("div");
            row4.className = "premios-numeros-row";
            if (premiados["puestos 4 y 5"]) {
                row4.appendChild(crearBotonNumero(premiados["puestos 4 y 5"]["puesto 4"]));
                row4.appendChild(crearBotonNumero(premiados["puestos 4 y 5"]["puesto 5"]));
            }
            boxSemana.appendChild(row4);

            const tDevueltos = document.createElement("div");
            tDevueltos.style.fontSize = "0.9rem";
            tDevueltos.style.fontWeight = "bold";
            tDevueltos.style.marginTop = "5px";
            tDevueltos.textContent = obtenerTextoTraduccion("devueltos", "Devueltos:");
            boxSemana.appendChild(tDevueltos);
            const row5 = document.createElement("div");
            row5.className = "premios-numeros-row";
            devueltos.forEach(numDev => {
                row5.appendChild(crearBotonNumero(numDev));
            });
            boxSemana.appendChild(row5);

            listaPremiosContent.appendChild(boxSemana);
        }

    } catch (error) {
        console.error("Error al cargar los premios:", error);
    }

    modalPremios.style.display = "flex";
});

document.getElementById("close-modal-premios").addEventListener("click", () => {
    document.getElementById("modal-premios").style.display = "none";
});

function abrirModalComprador(numBoleto, nombreComprador) {
    const modalComp = document.getElementById("modal-comprador");
    const textoComp = document.getElementById("texto-comprador-info");
    const labelComp = obtenerTextoTraduccion("comprador_label", "Comprador:");
    const textoBoletoLabel = obtenerTextoTraduccion("texto_boleto_label", "Boleto");
    textoComp.textContent = `${labelComp} ${nombreComprador} (${textoBoletoLabel}: ${numBoleto})`;
    modalComp.style.display = "flex";
}

document.getElementById("close-modal-comprador").addEventListener("click", () => {
    document.getElementById("modal-comprador").style.display = "none";
});

document.getElementById("btn-reclamar-premios").addEventListener("click", async () => {
    if (!userDocIdGlobal) return;
    const modalReclamar = document.getElementById("modal-reclamar-lista");
    const listaReclamarContent = document.getElementById("lista-reclamar-content");
    listaReclamarContent.innerHTML = "";

    try {
        const subLoteriaRef = collection(db, "Usuarios", userDocIdGlobal, "Loteria");
        const snapSub = await getDocs(subLoteriaRef);

        snapSub.forEach(sDoc => {
            const idSemanaDoc = sDoc.id;
            let nombreSemanaLimpio = formatearNombreSemana(idSemanaDoc);

            const data = sDoc.data();
            if (data.premio !== undefined && data.recogido === false) {
                const btnReclamo = document.createElement("button");
                btnReclamo.type = "button";
                btnReclamo.className = "boleto-item-btn";
                btnReclamo.style.textAlign = "left";
                btnReclamo.style.width = "100%";
                const textoBoletoLabel = obtenerTextoTraduccion("texto_boleto_label", "Boleto");
                const etiquetaPuesto = obtenerTextoTraduccion("etiqueta_puesto", "Puesto");
                
                let clavePuestoTraduccion = "";
                if (data.premio === "primer puesto") clavePuestoTraduccion = "primer_puesto";
                else if (data.premio === "segundo puesto") clavePuestoTraduccion = "segundo_puesto";
                else if (data.premio === "tercer puesto") clavePuestoTraduccion = "tercer_puesto";
                else if (data.premio === "cuarto y quinto puesto") clavePuestoTraduccion = "cuarto_quinto_puesto";
                else if (data.premio === "devuelto") clavePuestoTraduccion = "puesto_devuelto";

                let textoPuestoTraducido = clavePuestoTraduccion ? obtenerTextoTraduccion(clavePuestoTraduccion, data.premio) : data.premio;
                textoPuestoTraducido = textoPuestoTraducido.replace(":", "").trim();

                btnReclamo.textContent = `${nombreSemanaLimpio}: ${textoBoletoLabel} ${data.boleto}, ${etiquetaPuesto}: ${textoPuestoTraducido}`;

                btnReclamo.addEventListener("click", () => {
                    reclamarPremioIndividual(idSemanaDoc, data.premio);
                });

                listaReclamarContent.appendChild(btnReclamo);
            }
        });

    } catch (error) {
        console.error("Error al listar premios pendientes:", error);
    }

    modalReclamar.style.display = "flex";
});

document.getElementById("close-modal-reclamar").addEventListener("click", () => {
    document.getElementById("modal-reclamar-lista").style.display = "none";
});

async function reclamarPremioIndividual(idSemana, puestoPremio) {
    if (!userDocIdGlobal) return;

    let cantidadNova = 0;
    if (puestoPremio === "primer puesto") cantidadNova = 500000;
    else if (puestoPremio === "segundo puesto") cantidadNova = 300000;
    else if (puestoPremio === "tercer puesto") cantidadNova = 150000;
    else if (puestoPremio === "cuarto y quinto puesto") cantidadNova = 50000;
    else if (puestoPremio === "devuelto") cantidadNova = 1000;

    try {
        const fechaServer = serverTimestamp();

        const userDocRef = doc(db, "Usuarios", userDocIdGlobal);
        await updateDoc(userDocRef, {
            NovaPoints: increment(cantidadNova)
        });
        userNovaPointsGlobal += cantidadNova;
        document.getElementById("user-novas").textContent = userNovaPointsGlobal;

        const subDocRef = doc(db, "Usuarios", userDocIdGlobal, "Loteria", idSemana);
        await updateDoc(subDocRef, {
            recogido: true
        });

        const transRef = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
        const transSnap = await getDocs(transRef);
        let maxIdx = 0;
        transSnap.forEach(tDoc => {
            if (tDoc.id.startsWith("loteria")) {
                const num = parseInt(tDoc.id.replace("loteria", ""), 10);
                if (!isNaN(num) && num > maxIdx) maxIdx = num;
            }
        });
        const idTransaccionNueva = `loteria${maxIdx + 1}`;

        await setDoc(doc(transRef, idTransaccionNueva), {
            NovaPoints: cantidadNova,
            donde: "Lotería",
            fecha: fechaServer,
            premio: puestoPremio,
            tipo: "suma"
        });

        document.getElementById("modal-reclamar-lista").style.display = "none";
        
        let plantillaMsg = obtenerTextoTraduccion("msg_premio_reclamado", "¡Premio reclamado con éxito! Has recibido {cantidad} NovaPoints.");
        let mensajeFinal = plantillaMsg.replace("{cantidad}", cantidadNova);
        mostrarPopUpTemporal(mensajeFinal);

        const snapshotActualizado = await getDocs(collection(db, "Loteria"));
        await evaluarYRenderizarLoteria(snapshotActualizado);

    } catch (error) {
        console.error("Error al reclamar el premio:", error);
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
    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    nombreUsuarioGlobal = nombreUsuarioLogueado;

    const filaPerfil = document.getElementById("fila-perfil");
    if (filaPerfil) filaPerfil.addEventListener("click", () => { window.location.href = "Perfil.html"; });

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) filaNovas.addEventListener("click", () => { window.location.href = "NovaPoints.html"; });

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
            userNovaPointsGlobal = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;
            if (txtNovas) txtNovas.textContent = userNovaPointsGlobal;

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

    configurarSincronizacionEnTiempoReal();

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