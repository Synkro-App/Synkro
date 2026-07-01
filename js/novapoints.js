import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField, getDocs, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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
let globalUserDocId = null; 

// Función para hashear texto en SHA-256 manteniendo mayúsculas y minúsculas exactas
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);                    
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);  
    const hashArray = Array.from(new Uint8Array(hashBuffer));              
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); 
    return hashHex;
}

// CONTROLADOR DEL MODAL POP-UP PERSONALIZADO INTERNO (PROMISE-BASED)
function abrirModalPersonalizado(mensaje, requierePassword = false) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const txtMsg = document.getElementById("custom-modal-text");
        const passContainer = document.getElementById("custom-modal-password-container");
        const inputPass = document.getElementById("custom-modal-input-pass");
        
        const btnSi = document.getElementById("custom-modal-btn-si");
        const btnNo = document.getElementById("custom-modal-btn-no");
        const btnOk = document.getElementById("custom-modal-btn-ok");

        txtMsg.textContent = mensaje;
        inputPass.value = "";

        if (requierePassword) {
            passContainer.classList.remove("hidden");
            btnSi.classList.remove("hidden");
            btnNo.classList.remove("hidden");
            btnOk.classList.add("hidden");
        } else {
            passContainer.classList.add("hidden");
            btnSi.classList.remove("hidden");
            btnNo.classList.remove("hidden");
            btnOk.classList.add("hidden");
        }

        overlay.classList.remove("hidden");

        function limpiarEventos() {
            btnSi.replaceWith(btnSi.cloneNode(true));
            btnNo.replaceWith(btnNo.cloneNode(true));
            btnOk.replaceWith(btnOk.cloneNode(true));
        }

        document.getElementById("custom-modal-btn-si").addEventListener("click", () => {
            overlay.classList.add("hidden");
            limpiarEventos();
            if (requierePassword) {
                resolve({ respuesta: true, valor: inputPass.value });
            } else {
                resolve(true);
            }
        });

        document.getElementById("custom-modal-btn-no").addEventListener("click", () => {
            overlay.classList.add("hidden");
            limpiarEventos();
            if (requierePassword) {
                resolve({ respuesta: false, valor: "" });
            } else {
                resolve(false);
            }
        });
    });
}

// ALERTA PERSONALIZADA SIN VENTANAS DEL NAVEGADOR
function abrirAlertaPersonalizada(mensaje) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal-overlay");
        const txtMsg = document.getElementById("custom-modal-text");
        const passContainer = document.getElementById("custom-modal-password-container");
        
        const btnSi = document.getElementById("custom-modal-btn-si");
        const btnNo = document.getElementById("custom-modal-btn-no");
        const btnOk = document.getElementById("custom-modal-btn-ok");

        txtMsg.textContent = mensaje;
        passContainer.classList.add("hidden");
        btnSi.classList.add("hidden");
        btnNo.classList.add("hidden");
        btnOk.classList.remove("hidden");

        overlay.classList.remove("hidden");

        function limpiarEventos() {
            btnOk.replaceWith(btnOk.cloneNode(true));
        }

        document.getElementById("custom-modal-btn-ok").addEventListener("click", () => {
            overlay.classList.add("hidden");
            limpiarEventos();
            resolve(true);
        });
    });
}

function calcularEdadCompleta(fechaNacimientoStr) {
    if (!fechaNacimientoStr || !fechaNacimientoStr.includes("-")) return 0;
    const partes = fechaNacimientoStr.split("-");
    if (partes.length !== 3) return 0;
    
    let dia, mes, ano;
    if (partes[2].length === 4) { 
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        ano = parseInt(partes[2], 10);
    } else if (partes[0].length === 4) { 
        ano = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        dia = parseInt(partes[2], 10);
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

function calcularDiasRestantesTimestamp(timestampFirebase) {
    if (!timestampFirebase || typeof timestampFirebase.toDate !== 'function') return 0;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaExpiracion = timestampFirebase.toDate();
    fechaExpiracion.setHours(0, 0, 0, 0);
    
    const diferenciaMs = fechaExpiracion.getTime() - hoy.getTime();
    if (diferenciaMs <= 0) return 0;
    
    return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
}

function aplicarTraducciones(idioma) {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs && diccionario["text_subscripcion"] && diccionario["text_subscripcion"][idioma]) {
        lblSubs.textContent = diccionario["text_subscripcion"][idioma] + " ";
    }

    const btnLogout = document.getElementById("btn_cerrar_sesion");
    if (btnLogout && diccionario["btn_cerrar_sesion"] && diccionario["btn_cerrar_sesion"][idioma]) {
        btnLogout.textContent = diccionario["btn_cerrar_sesion"][idioma];
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver && diccionario["btn_volver"] && diccionario["btn_volver"][idioma]) {
        btnVolver.textContent = diccionario["btn_volver"][idioma];
    }

    const qSonTitle = document.getElementById("text_que_son_np");
    if (qSonTitle && diccionario["text_que_son_np"] && diccionario["text_que_son_np"][idioma]) qSonTitle.textContent = diccionario["text_que_son_np"][idioma];

    const qSonDesc = document.getElementById("text_desc_que_son");
    if (qSonDesc && diccionario["text_desc_que_son"] && diccionario["text_desc_que_son"][idioma]) qSonDesc.textContent = diccionario["text_desc_que_son"][idioma];

    const cObtenerTitle = document.getElementById("text_como_obtener_np");
    if (cObtenerTitle && diccionario["text_como_obtener_np"] && diccionario["text_como_obtener_np"][idioma]) cObtenerTitle.textContent = diccionario["text_como_obtener_np"][idioma];

    const eGastarTitle = document.getElementById("text_en_que_gastar_np");
    if (eGastarTitle && diccionario["text_en_que_gastar_np"] && diccionario["text_en_que_gastar_np"][idioma]) eGastarTitle.textContent = diccionario["text_en_que_gastar_np"][idioma];

    const eGastarDesc = document.getElementById("text_desc_en_que_gastar");
    if (eGastarDesc && diccionario["text_desc_en_que_gastar"] && diccionario["text_desc_en_que_gastar"][idioma]) eGastarDesc.textContent = diccionario["text_desc_en_que_gastar"][idioma];

    const tSubsTitle = document.getElementById("text_tienda_subs");
    if (tSubsTitle && diccionario["text_tienda_subs"] && diccionario["text_tienda_subs"][idioma]) tSubsTitle.textContent = diccionario["text_tienda_subs"][idioma];
}

async function cargarBotonesObtener(idioma) {
    const gridBotones = document.getElementById("container-obtener-botones");
    if (!gridBotones) return;

    gridBotones.innerHTML = "";

    try {
        const obtenerRef = collection(db, "Obtener");
        const snapshot = await getDocs(obtenerRef);

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            let nombreBoton = "---";
            if (data.nombre && typeof data.nombre === 'object') {
                nombreBoton = data.nombre[idioma] || data.nombre["es"] || "---";
            }

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-np-dinamico";
            btn.textContent = nombreBoton;

            btn.addEventListener("click", () => {
                if (data.pagina) {
                    window.location.href = `${data.pagina}.html`;
                }
            });

            gridBotones.appendChild(btn);
        });
    } catch (error) {
        console.error("Error cargando la colección Obtener:", error);
    }
}

// Comprobación de edad integrada usando SHA-256 sin ventanas emergentes nativas
async function comprobarAutorizacionMenor(userData, idioma) {
    const edad = userData.Edad !== undefined ? Number(userData.Edad) : 0;
    if (edad < 18) {
        const txtPrompt = diccionario["prompt_pass_menor"]?.[idioma] || "Eres menor de edad. Introduce la contraseña de autorización:";
        const modalRes = await abrirModalPersonalizado(txtPrompt, true);
        
        if (!modalRes.respuesta) return false;

        // Hashear el valor introducido con preservación exacta de mayúsculas/minúsculas
        const passHasheada = await sha256(modalRes.valor);

        // Campo exacto 'contraseñaautorizacion' de Firestore
        if (passHasheada !== userData.contraseñaautorizacion) {
            const txtError = diccionario["alert_error_pass"]?.[idioma] || "Contraseña de autorización incorrecta.";
            await abrirAlertaPersonalizada(txtError);
            return false;
        }
    }
    return true;
}

async function ejecutarAbandonarSubscripcion(userData, idioma) {
    if (!globalUserDocId) return;
    
    const autorizado = await comprobarAutorizacionMenor(userData, idioma);
    if (!autorizado) return;

    const txtConfirm = diccionario["pop_abandonar_msg"]?.[idioma] || "Perderás todas las NovaPoints gastadas en la subscripción y no las podrás recuperar, ¿Estás seguro de que quieres continuar?";
    const acepto = await abrirModalPersonalizado(txtConfirm, false);
    
    if (acepto) {
        try {
            const userRef = doc(db, "Usuarios", globalUserDocId);
            await updateDoc(userRef, { subs: deleteField() });
        } catch (error) {
            console.error("Error al abandonar suscripción:", error);
        }
    }
}

async function ejecutarComprarSubscripcion(userData, tiendaData, idioma) {
    if (!globalUserDocId) return;

    // FILTRO PRIMARIO Y ABSOLUTO: Comprobación usando el campo correcto 'price'
    const costoSuscripcion = tiendaData.Price !== undefined ? Number(tiendaData.Price) : 0;
    const misNovaPoints = userData.NovaPoints !== undefined ? Number(userData.NovaPoints) : 0;

    if (misNovaPoints < costoSuscripcion) {
        const txtNoPoints = diccionario["alert_no_points"]?.[idioma] || "No tienes suficientes NovaPoints para comprar esta subscripción.";
        await abrirAlertaPersonalizada(txtNoPoints);
        return; // Detiene la ejecución por completo
    }
    
    // Si tiene saldo suficiente, pasamos al chequeo de minoría de edad
    const autorizado = await comprobarAutorizacionMenor(userData, idioma);
    if (!autorizado) return;

    const txtConfirmCompra = diccionario["pop_comprar_msg"]?.[idioma] || "¿Deseas comprar la subscripción?";
    const aceptoCompra = await abrirModalPersonalizado(txtConfirmCompra, false);
    
    if (aceptoCompra) {
        try {
            const userRef = doc(db, "Usuarios", globalUserDocId);
            
            const fechaCompraDate = new Date();
            const duracionDias = tiendaData.duracióndías !== undefined ? Number(tiendaData.duracióndías) : 0;
            
            const fechaExpiracionDate = new Date();
            fechaExpiracionDate.setDate(fechaCompraDate.getDate() + duracionDias);

            fechaCompraDate.setHours(0,0,0,0);
            fechaExpiracionDate.setHours(0,0,0,0);
            const diffMs = fechaExpiracionDate.getTime() - fechaCompraDate.getTime();
            const diasRestantesCalculados = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            const nuevoMapaSubs = {
                subs: tiendaData.Subscripción || "",
                fechaCompra: Timestamp.fromDate(new Date()),
                fechaExpiracion: Timestamp.fromDate(fechaExpiracionDate),
                diasrestantes: diasRestantesCalculados
            };

            const nuevosNovaPoints = misNovaPoints - costoSuscripcion;

            await updateDoc(userRef, {
                NovaPoints: nuevosNovaPoints,
                subs: nuevoMapaSubs
            });

            const transaccionesRef = collection(db, "Usuarios", globalUserDocId, "Transacciones de NovaPoints");
            const snapTransacciones = await getDocs(transaccionesRef);
            
            let contadorCompras = 0;
            snapTransacciones.forEach((tSnap) => {
                if (tSnap.id.startsWith("compra")) {
                    contadorCompras++;
                }
            });

            const nuevoIdCompra = `compra${contadorCompras + 1}`;
            const docTransaccionRef = doc(db, "Usuarios", globalUserDocId, "Transacciones de NovaPoints", nuevoIdCompra);

            await setDoc(docTransaccionRef, {
                NovaPoints: costoSuscripcion,
                Subscripción: tiendaData.Subscripción || "",
                donde: "Tienda",
                fecha: Timestamp.fromDate(new Date()),
                tipo: "resta"
            });

        } catch (error) {
            console.error("Error al procesar la compra en Firestore:", error);
        }
    }
}

function renderizarTienda(userData, idioma) {
    const tiendaContainer = document.getElementById("container-tienda-suscripciones");
    if (!tiendaContainer) return;

    tiendaContainer.innerHTML = "";

    const tieneSubsActiva = userData && userData.subs && typeof userData.subs === 'object' && Object.keys(userData.subs).length > 0;
    const nombreSubsActiva = tieneSubsActiva ? userData.subs.subs : null;

    const tiendaRef = collection(db, "Tienda");
    
    onSnapshot(tiendaRef, (snapshot) => {
        tiendaContainer.innerHTML = ""; 

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const subsTitle = data.Subscripción || "Suscripción sin nombre";
            const diasDuracion = data.duracióndías !== undefined ? data.duracióndías : 0;
            const precioSuscripcion = data.Price !== undefined ? data.Price : 0;
            const seccionesArray = Array.isArray(data.Secciones) ? data.Secciones : [];
            const contenidoArray = Array.isArray(data.Contanido) ? data.Contanido : [];

            const card = document.createElement("div");
            card.className = "np-tienda-card";

            const titleEl = document.createElement("h3");
            titleEl.className = "np-card-sub-title";
            titleEl.textContent = subsTitle;
            card.appendChild(titleEl);

            // CORREGIDO: Muestra los días y el precio en NovaPoints juntos al lado
            const labelDias = (diccionario["text_dias"] && diccionario["text_dias"][idioma]) ? diccionario["text_dias"][idioma] : "días";
            const durationEl = document.createElement("p");
            durationEl.className = "np-card-duration";
            durationEl.textContent = `${diasDuracion} ${labelDias} - ${precioSuscripcion} NP`;
            card.appendChild(durationEl);

            if (seccionesArray.length > 0) {
                const secTitle = document.createElement("p");
                secTitle.className = "np-card-list-title";
                secTitle.textContent = "Secciones:";
                card.appendChild(secTitle);

                const ulSec = document.createElement("ul");
                ulSec.className = "np-card-ul";
                seccionesArray.forEach(item => {
                    const li = document.createElement("li");
                    li.textContent = item;
                    ulSec.appendChild(li);
                });
                card.appendChild(ulSec);
            }

            if (contenidoArray.length > 0) {
                const contTitle = document.createElement("p");
                contTitle.className = "np-card-list-title";
                contTitle.textContent = "Contenido:";
                card.appendChild(contTitle);

                const ulCont = document.createElement("ul");
                ulCont.className = "np-card-ul";
                contenidoArray.forEach(item => {
                    const li = document.createElement("li");
                    li.textContent = item;
                    ulCont.appendChild(li);
                });
                card.appendChild(ulCont);
            }

            if (!tieneSubsActiva) {
                const btnComprar = document.createElement("button");
                btnComprar.type = "button";
                btnComprar.className = "btn-tienda-action";
                btnComprar.textContent = (diccionario["btn_comprar_subs"] && diccionario["btn_comprar_subs"][idioma]) 
                    ? diccionario["btn_comprar_subs"][idioma] 
                    : "Comprar subscripción";
                
                btnComprar.addEventListener("click", () => {
                    ejecutarComprarSubscripcion(userData, data, idioma);
                });

                card.appendChild(btnComprar);

            } else if (nombreSubsActiva === subsTitle) {
                const btnAbandonar = document.createElement("button");
                btnAbandonar.type = "button";
                btnAbandonar.className = "btn-tienda-action";
                btnAbandonar.textContent = (diccionario["btn_abandonar_subs"] && diccionario["btn_abandonar_subs"][idioma]) 
                    ? diccionario["btn_abandonar_subs"][idioma] 
                    : "Abandonar subscripción";
                
                btnAbandonar.addEventListener("click", () => {
                    ejecutarAbandonarSubscripcion(userData, idioma);
                });

                card.appendChild(btnAbandonar);
            }

            tiendaContainer.appendChild(card);
        });
    }, (err) => {
        console.error("Error leyendo colección Tienda:", err);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en NovaPoints:", error);
    }

    aplicarTraducciones(currentLanguage);
    await cargarBotonesObtener(currentLanguage);

    const nombreUsuarioLogueado = localStorage.getItem("user");
    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    const triggerPerfil = document.getElementById("perfil-trigger-zone");
    if (triggerPerfil) {
        triggerPerfil.addEventListener("click", () => {
            window.location.href = "Perfil.html";
        });
    }

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            window.history.back();
        });
    }

    const btnCerrarSesion = document.getElementById("btn_cerrar_sesion");
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener("click", () => {
            localStorage.removeItem("user");
            window.location.href = "index.html";
        });
    }

    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    onSnapshot(qUsuario, async (querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            globalUserDocId = userDoc.id; 
            const userData = userDoc.data();

            const imgElement = document.getElementById("user-profile-img");
            if (imgElement) {
                imgElement.src = userData.imgperfil ? userData.imgperfil : "default-profile.png";
            }

            const nameElement = document.getElementById("user-profile-name");
            if (nameElement) {
                nameElement.textContent = userData.usuario || nombreUsuarioLogueado;
            }

            const pointsElement = document.getElementById("amount-novapoints");
            if (pointsElement) {
                pointsElement.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;
            }

            if (userData.fechanacimiento) {
                const edadCalculada = calcularEdadCompleta(userData.fechanacimiento);
                if (userData.Edad === undefined || Number(userData.Edad) !== edadCalculada) {
                    const userRef = doc(db, "Usuarios", globalUserDocId);
                    await updateDoc(userRef, { Edad: edadCalculada });
                }
            }

            aplicarTraducciones(currentLanguage);
            renderizarTienda(userData, currentLanguage);

            const subsTextElement = document.getElementById("text-subscription-status");
            if (subsTextElement) {
                if (!userData.subs || typeof userData.subs !== 'object' || Object.keys(userData.subs).length === 0) {
                    const textoNinguna = (diccionario["text_ninguna"] && diccionario["text_ninguna"][currentLanguage]) 
                        ? diccionario["text_ninguna"][currentLanguage] 
                        : "Ninguna";
                    subsTextElement.textContent = textoNinguna;
                } else {
                    const subsName = userData.subs.subs || "";
                    const expirationTimestamp = userData.subs.fechaExpiracion || null;
                    
                    const diasRestantesCalculados = calcularDiasRestantesTimestamp(expirationTimestamp);
                    
                    if (diasRestantesCalculados <= 0) {
                        const userRef = doc(db, "Usuarios", globalUserDocId);
                        await updateDoc(userRef, { subs: deleteField() });
                        
                        const textoNinguna = (diccionario["text_ninguna"] && diccionario["text_ninguna"][currentLanguage]) 
                            ? diccionario["text_ninguna"][currentLanguage] 
                            : "Ninguna";
                        subsTextElement.textContent = textoNinguna;
                    } else {
                        if (userData.subs.diasrestantes === undefined || Number(userData.subs.diasrestantes) !== diasRestantesCalculados) {
                            const userRef = doc(db, "Usuarios", globalUserDocId);
                            const mapaActualizado = { ...userData.subs, diasrestantes: diasRestantesCalculados };
                            await updateDoc(userRef, { subs: mapaActualizado });
                        }

                        subsTextElement.textContent = `${subsName} (${diasRestantesCalculados} d)`;
                    }
                }
            }
        }
    }, (error) => {
        console.error("Error leyendo Firestore en NovaPoints:", error);
    });
});