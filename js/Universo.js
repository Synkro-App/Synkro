import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField, getDocs, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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

// Campos locales sincronizados
let edadUsuarioGlobal = 0; 
let subsUsuarioGlobal = ""; 

// Mantener índice de imagen actual por cada contenedor
let carruselEstados = {};

// Almacenará los datos del producto seleccionado para la compra modal
let productoSeleccionadoActual = null;

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

    // --- TRADUCCIONES DEL NUEVO FORMULARIO Y BOTÓN DE PEDIDO PERSONALIZADO ---
    const btnPedidoPers = document.getElementById("btn_pedido_personalizado");
    if (btnPedidoPers && diccionario["btn_pedido_personalizado"] && diccionario["btn_pedido_personalizado"][idioma]) {
        btnPedidoPers.textContent = diccionario["btn_pedido_personalizado"][idioma];
    }

    const modalTitulo = document.getElementById("modal_titulo_personalizado");
    if (modalTitulo && diccionario["modal_titulo_personalizado"] && diccionario["modal_titulo_personalizado"][idioma]) {
        modalTitulo.textContent = diccionario["modal_titulo_personalizado"][idioma];
    }

    const lblFormaContacto = document.getElementById("lbl_forma_contacto");
    if (lblFormaContacto && diccionario["lbl_forma_contacto"] && diccionario["lbl_forma_contacto"][idioma]) {
        lblFormaContacto.textContent = diccionario["lbl_forma_contacto"][idioma];
    }

    const lblDatoContacto = document.getElementById("lbl_dato_contacto");
    if (lblDatoContacto && diccionario["lbl_dato_contacto"] && diccionario["lbl_dato_contacto"][idioma]) {
        lblDatoContacto.textContent = diccionario["lbl_dato_contacto"][idioma];
    }

    const lblDesarrollaIdea = document.getElementById("lbl_desarrolla_idea");
    if (lblDesarrollaIdea && diccionario["lbl_desarrolla_idea"] && diccionario["lbl_desarrolla_idea"][idioma]) {
        lblDesarrollaIdea.textContent = diccionario["lbl_desarrolla_idea"][idioma];
    }

    const txtareaIdea = document.getElementById("textarea-idea");
    if (txtareaIdea && diccionario["ph_desarrolla_idea"] && diccionario["ph_desarrolla_idea"][idioma]) {
        txtareaIdea.placeholder = diccionario["ph_desarrolla_idea"][idioma];
    }

    const lblPermisoGrabar = document.getElementById("lbl_permiso_grabar");
    if (lblPermisoGrabar && diccionario["lbl_permiso_grabar"] && diccionario["lbl_permiso_grabar"][idioma]) {
        lblPermisoGrabar.textContent = diccionario["lbl_permiso_grabar"][idioma];
    }

    const lblPermisoRrss = document.getElementById("lbl_permiso_rrss");
    if (lblPermisoRrss && diccionario["lbl_permiso_rrss"] && diccionario["lbl_permiso_rrss"][idioma]) {
        lblPermisoRrss.textContent = diccionario["lbl_permiso_rrss"][idioma];
    }

    const lblDeseasEtiquetar = document.getElementById("lbl_deseas_etiquetar");
    if (lblDeseasEtiquetar && diccionario["lbl_deseas_etiquetar"] && diccionario["lbl_deseas_etiquetar"][idioma]) {
        lblDeseasEtiquetar.textContent = diccionario["lbl_deseas_etiquetar"][idioma];
    }

    const btnCancelar = document.getElementById("btn_cancelar");
    if (btnCancelar && diccionario["btn_cancelar"] && diccionario["btn_cancelar"][idioma]) {
        btnCancelar.textContent = diccionario["btn_cancelar"][idioma];
    }

    const btnEnviarPeticion = document.getElementById("btn_enviar_peticion");
    if (btnEnviarPeticion && diccionario["btn_enviar_peticion"] && diccionario["btn_enviar_peticion"][idioma]) {
        btnEnviarPeticion.textContent = diccionario["btn_enviar_peticion"][idioma];
    }

    // --- TRADUCCIONES DEL NUEVO MODAL DE HACER PEDIDO ARTÍCULO ---
    const modalTituloPedido = document.getElementById("modal_titulo_pedido");
    if (modalTituloPedido && diccionario["modal_titulo_pedido"] && diccionario["modal_titulo_pedido"][idioma]) {
        modalTituloPedido.textContent = diccionario["modal_titulo_pedido"][idioma];
    }

    const lblFormaContactoPedido = document.getElementById("lbl_forma_contacto_pedido");
    if (lblFormaContactoPedido && diccionario["lbl_forma_contacto"] && diccionario["lbl_forma_contacto"][idioma]) {
        lblFormaContactoPedido.textContent = diccionario["lbl_forma_contacto"][idioma];
    }

    const lblDatoContactoPedido = document.getElementById("lbl_dato_contacto_pedido");
    if (lblDatoContactoPedido && diccionario["lbl_dato_contacto"] && diccionario["lbl_dato_contacto"][idioma]) {
        lblDatoContactoPedido.textContent = diccionario["lbl_dato_contacto"][idioma];
    }

    const lblOpcionesProd = document.getElementById("lbl_opciones_producto");
    if (lblOpcionesProd && diccionario["lbl_opciones_producto"] && diccionario["lbl_opciones_producto"][idioma]) {
        lblOpcionesProd.textContent = diccionario["lbl_opciones_producto"][idioma];
    }

    const lblMensajeOpcional = document.getElementById("lbl_mensaje_opcional");
    if (lblMensajeOpcional && diccionario["lbl_mensaje_opcional"] && diccionario["lbl_mensaje_opcional"][idioma]) {
        lblMensajeOpcional.textContent = diccionario["lbl_mensaje_opcional"][idioma];
    }

    const txtareaMsgPedido = document.getElementById("textarea-mensaje-pedido");
    if (txtareaMsgPedido && diccionario["ph_mensaje_opcional"] && diccionario["ph_mensaje_opcional"][idioma]) {
        txtareaMsgPedido.placeholder = diccionario["ph_mensaje_opcional"][idioma];
    }

    const lblPermisoGrabarPedido = document.getElementById("lbl_permiso_grabar_pedido");
    if (lblPermisoGrabarPedido && diccionario["lbl_permiso_grabar"] && diccionario["lbl_permiso_grabar"][idioma]) {
        lblPermisoGrabarPedido.textContent = diccionario["lbl_permiso_grabar"][idioma];
    }

    const lblPermisoRrssPedido = document.getElementById("lbl_permiso_rrss_pedido");
    if (lblPermisoRrssPedido && diccionario["lbl_permiso_rrss"] && diccionario["lbl_permiso_rrss"][idioma]) {
        lblPermisoRrssPedido.textContent = diccionario["lbl_permiso_rrss"][idioma];
    }

    const lblDeseasEtiquetarPedido = document.getElementById("lbl_deseas_etiquetar_pedido");
    if (lblDeseasEtiquetarPedido && diccionario["lbl_deseas_etiquetar"] && diccionario["lbl_deseas_etiquetar"][idioma]) {
        lblDeseasEtiquetarPedido.textContent = diccionario["lbl_deseas_etiquetar"][idioma];
    }

    const btnCancelarPedido = document.getElementById("btn_cancelar_pedido");
    if (btnCancelarPedido && diccionario["btn_cancelar"] && diccionario["btn_cancelar"][idioma]) {
        btnCancelarPedido.textContent = diccionario["btn_cancelar"][idioma];
    }

    const btnEnviarPedido = document.getElementById("btn_enviar_pedido");
    if (btnEnviarPedido && diccionario["btn_enviar"] && diccionario["btn_enviar"][idioma]) {
        btnEnviarPedido.textContent = diccionario["btn_enviar"][idioma];
    }

    // Traducir opciones internas SI/NO de los selectores generales
    for (let i = 1; i <= 3; i++) {
        const opSi = document.getElementById(`opcion_si_${i}`);
        if (opSi && diccionario["opcion_si"] && diccionario["opcion_si"][idioma]) opSi.textContent = diccionario["opcion_si"][idioma];
        const opNo = document.getElementById(`opcion_no_${i}`);
        if (opNo && diccionario["opcion_no"] && diccionario["opcion_no"][idioma]) opNo.textContent = diccionario["opcion_no"][idioma];

        const opSiPed = document.getElementById(`opcion_si_pedido_${i}`);
        if (opSiPed && diccionario["opcion_si"] && diccionario["opcion_si"][idioma]) opSiPed.textContent = diccionario["opcion_si"][idioma];
        const opNoPed = document.getElementById(`opcion_no_pedido_${i}`);
        if (opNoPed && diccionario["opcion_no"] && diccionario["opcion_no"][idioma]) opNoPed.textContent = diccionario["opcion_no"][idioma];
    }
}

function procesarMapaPreciosRecursivo(nodoActual, rutaAcumulada, lineasResultado) {
    if (nodoActual === null || nodoActual === undefined) return;

    if (typeof nodoActual !== "object") {
        const rutaTexto = rutaAcumulada.join(" - ");
        lineasResultado.push({ camino: rutaTexto, valor: nodoActual });
        return;
    }

    for (const llave in nodoActual) {
        if (Object.prototype.hasOwnProperty.call(nodoActual, llave)) {
            procesarMapaPreciosRecursivo(nodoActual[llave], [...rutaAcumulada, llave], lineasResultado);
        }
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

    aplicarTraduccionesEstaticas(currentLanguage);

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");
    const mainContainer = document.querySelector("main");

    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

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

    // 1. ESCUCHA EN TIEMPO REAL DEL USUARIO (onSnapshot)
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
        console.error("Error en tiempo real con el usuario:", error);
    });

    // 2. ESCUCHA EN TIEMPO REAL DE LA COLECCIÓN "Universo"
    const universoRef = collection(db, "Universo");
    
    onSnapshot(universoRef, (snapshotUniverso) => {
        if (!mainContainer) return;
        mainContainer.innerHTML = "";

        snapshotUniverso.forEach((docUniverso) => {
            const docId = docUniverso.id;
            const dataUniverso = docUniverso.data();

            const boxContainer = document.createElement("div");
            boxContainer.className = "universo-doc-container";
            boxContainer.dataset.id = docId;

            // --- TÍTULO ---
            const titleElement = document.createElement("h2");
            titleElement.className = "universo-doc-title";

            let nombreTraducido = docId; 
            let nombreEnEs = docId; 

            if (dataUniverso.nombre && typeof dataUniverso.nombre === "object") {
                nombreTraducido = dataUniverso.nombre[currentLanguage] || dataUniverso.nombre["es"] || Object.values(dataUniverso.nombre)[0] || docId;
                nombreEnEs = dataUniverso.nombre["es"] || nombreTraducido;
            }
            titleElement.textContent = nombreTraducido;
            boxContainer.appendChild(titleElement);

            // --- CARRUSEL DE IMÁGENES ---
            let listaImagenes = [];
            if (Array.isArray(dataUniverso.imagenes)) {
                listaImagenes = dataUniverso.imagenes.filter(img => img && img.trim() !== "");
            } else if (typeof dataUniverso.imagen === "string" && dataUniverso.imagen.trim() !== "") {
                listaImagenes.push(dataUniverso.imagen);
            }

            if (listaImagenes.length > 0) {
                if (carruselEstados[docId] === undefined || carruselEstados[docId] >= listaImagenes.length) {
                    carruselEstados[docId] = 0;
                }

                const carouselWrapper = document.createElement("div");
                carouselWrapper.className = "universo-carousel-wrapper";

                const imgElement = document.createElement("img");
                imgElement.className = "universo-carousel-img";
                imgElement.src = listaImagenes[carruselEstados[docId]];
                imgElement.alt = nombreTraducido;
                carouselWrapper.appendChild(imgElement);

                if (listaImagenes.length > 1) {
                    const arrowLeft = document.createElement("button");
                    arrowLeft.type = "button";
                    arrowLeft.className = "carousel-arrow arrow-left";
                    arrowLeft.innerHTML = "&#10094;";
                    arrowLeft.addEventListener("click", () => {
                        carruselEstados[docId] = (carruselEstados[docId] - 1 + listaImagenes.length) % listaImagenes.length;
                        imgElement.src = listaImagenes[carruselEstados[docId]];
                    });

                    const arrowRight = document.createElement("button");
                    arrowRight.type = "button";
                    arrowRight.className = "carousel-arrow arrow-right";
                    arrowRight.innerHTML = "&#10095;";
                    arrowRight.addEventListener("click", () => {
                        carruselEstados[docId] = (carruselEstados[docId] + 1) % listaImagenes.length;
                        imgElement.src = listaImagenes[carruselEstados[docId]];
                    });

                    carouselWrapper.appendChild(arrowLeft);
                    carouselWrapper.appendChild(arrowRight);
                }

                boxContainer.appendChild(carouselWrapper);
            }

            // --- DESCRIPCIÓN ---
            if (dataUniverso.descripcion && typeof dataUniverso.descripcion === "object") {
                const descTraducida = dataUniverso.descripcion[currentLanguage] || dataUniverso.descripcion["es"] || Object.values(dataUniverso.descripcion)[0];
                
                if (descTraducida && descTraducida.trim() !== "") {
                    const descElement = document.createElement("p");
                    descElement.className = "universo-doc-description";
                    descElement.textContent = descTraducida;
                    boxContainer.appendChild(descElement);
                }
            }

            // --- ATRIBUTOS DINÁMICOS BASADOS EN EL CAMPO 'tipo' ---
            let tiposActivos = [];
            if (typeof dataUniverso.tipo === "string" && dataUniverso.tipo.trim() !== "") {
                tiposActivos = dataUniverso.tipo.split(",").map(t => t.trim().toLowerCase());
            } else if (Array.isArray(dataUniverso.tipo)) {
                tiposActivos = dataUniverso.tipo.map(t => String(t).trim().toLowerCase());
            }

            if (tiposActivos.length > 0) {
                const atributosContainer = document.createElement("div");
                atributosContainer.className = "universo-atributos-container";
                let tieneAtributosVisibles = false;

                for (const campoRaiz in dataUniverso) {
                    if (Object.prototype.hasOwnProperty.call(dataUniverso, campoRaiz)) {
                        const campoMinuscula = campoRaiz.toLowerCase();

                        if (tiposActivos.includes(campoMinuscula) && dataUniverso[campoRaiz] && typeof dataUniverso[campoRaiz] === "object") {
                            const mapaAtributos = dataUniverso[campoRaiz];
                            const llavesInternas = Object.keys(mapaAtributos);

                            if (llavesInternas.length > 0) {
                                tieneAtributosVisibles = true;

                                const grupoDiv = document.createElement("div");
                                grupoDiv.className = "atributo-grupo";

                                const grupoTitulo = document.createElement("h3");
                                grupoTitulo.className = "atributo-grupo-titulo";
                                grupoTitulo.textContent = campoRaiz;
                                grupoDiv.appendChild(grupoTitulo);

                                const listaItemsDiv = document.createElement("div");
                                listaItemsDiv.className = "atributo-items-lista";

                                llavesInternas.forEach((claveInterna) => {
                                    const lineaItem = document.createElement("div");
                                    lineaItem.className = "atributo-item-linea";

                                    const claveSpan = document.createElement("span");
                                    claveSpan.className = "atributo-item-clave";
                                    claveSpan.textContent = `${claveInterna}: `;

                                    const valorSpan = document.createElement("span");
                                    valorSpan.textContent = mapaAtributos[claveInterna];

                                    lineaItem.appendChild(claveSpan);
                                    lineaItem.appendChild(valorSpan);
                                    listaItemsDiv.appendChild(lineaItem);
                                });

                                grupoDiv.appendChild(listaItemsDiv);
                                atributosContainer.appendChild(grupoDiv);
                            }
                        }
                    }
                }

                if (tieneAtributosVisibles) {
                    boxContainer.appendChild(atributosContainer);
                }
            }

            // --- PROCESAMIENTO Y RENDERIZADO DE PRECIOS MAPA ---
            if (dataUniverso.precio && typeof dataUniverso.precio === "object") {
                const preciosBlock = document.createElement("div");
                preciosBlock.className = "universo-precios-block";

                let listaLineasPrecios = [];
                procesarMapaPreciosRecursivo(dataUniverso.precio, [], listaLineasPrecios);

                listaLineasPrecios.forEach((item) => {
                    const lineaDiv = document.createElement("div");
                    lineaDiv.className = "precio-linea";

                    const pathSpan = document.createElement("span");
                    pathSpan.className = "precio-keys-path";
                    pathSpan.textContent = item.camino ? `${item.camino}: ` : "";

                    const valorSpan = document.createElement("span");
                    valorSpan.className = "precio-valor-final";
                    valorSpan.textContent = typeof item.valor === "string" && !item.valor.includes("€") ? `${item.valor}€` : item.valor;

                    lineaDiv.appendChild(pathSpan);
                    lineaDiv.appendChild(valorSpan);
                    preciosBlock.appendChild(lineaDiv);
                });

                if (listaLineasPrecios.length > 0) {
                    boxContainer.appendChild(preciosBlock);
                }
            }

            // --- NUEVO BOTÓN: HACER PEDIDO ARTÍCULO ---
            const btnHacerPedido = document.createElement("button");
            btnHacerPedido.type = "button";
            btnHacerPedido.className = "btn-default btn-block";
            btnHacerPedido.textContent = diccionario["btn_hacer_pedido"] ? diccionario["btn_hacer_pedido"][currentLanguage] : "Hacer pedido";
            
            btnHacerPedido.addEventListener("click", () => {
                abrirModalPedidoArticulo({
                    id: docId,
                    nombreEs: nombreEnEs,
                    tipos: tiposActivos,
                    datosRaw: dataUniverso
                });
            });
            boxContainer.appendChild(btnHacerPedido);

            mainContainer.appendChild(boxContainer);
        });
    }, (error) => {
        console.error("Error en tiempo real con la colección Universo:", error);
    });

    // --- LÓGICA COHESIVA DEL MODAL DE PEDIDOS PERSONALIZADOS ---
    const modalPedido = document.getElementById("modal-pedido-personalizado");
    const btnAbrirModal = document.getElementById("btn_pedido_personalizado");
    const btnCancelarModal = document.getElementById("btn_cancelar");
    const formPedido = document.getElementById("form-pedido-personalizado");

    const selectPublicar = document.getElementById("select-permiso-publicar");
    const bloqueRrss = document.getElementById("bloque-permiso-rrss");
    const selectRrss = document.getElementById("select-permiso-rrss");
    const bloqueEtiquetar = document.getElementById("bloque-deseas-etiquetar");
    const selectEtiquetar = document.getElementById("select-etiquetar");
    const bloqueInputsEtiquetas = document.getElementById("bloque-inputs-etiquetas");

    const inputTikTok = document.getElementById("input-user-tiktok");
    const inputInstagram = document.getElementById("input-user-instagram");

    function resetearFormularioCompleto() {
        formPedido.reset();
        bloqueRrss.classList.add("hidden");
        bloqueEtiquetar.classList.add("hidden");
        bloqueInputsEtiquetas.classList.add("hidden");
        inputTikTok.removeAttribute("required");
        inputInstagram.removeAttribute("required");
    }

    if (btnAbrirModal) {
        btnAbrirModal.addEventListener("click", () => {
            resetearFormularioCompleto();
            modalPedido.classList.remove("hidden");
        });
    }

    if (btnCancelarModal) {
        btnCancelarModal.addEventListener("click", () => {
            modalPedido.classList.add("hidden");
            resetearFormularioCompleto();
        });
    }

    selectPublicar.addEventListener("change", () => {
        if (selectPublicar.value === "SI") {
            bloqueRrss.classList.remove("hidden");
        } else {
            bloqueRrss.classList.add("hidden");
            bloqueEtiquetar.classList.add("hidden");
            bloqueInputsEtiquetas.classList.add("hidden");
            selectRrss.value = "NO";
            selectEtiquetar.value = "NO";
            inputTikTok.removeAttribute("required");
            inputInstagram.removeAttribute("required");
        }
    });

    selectRrss.addEventListener("change", () => {
        if (selectRrss.value === "SI") {
            bloqueEtiquetar.classList.remove("hidden");
        } else {
            bloqueEtiquetar.classList.add("hidden");
            bloqueInputsEtiquetas.classList.add("hidden");
            selectEtiquetar.value = "NO";
            inputTikTok.removeAttribute("required");
            inputInstagram.removeAttribute("required");
        }
    });

    selectEtiquetar.addEventListener("change", () => {
        if (selectEtiquetar.value === "SI") {
            bloqueInputsEtiquetas.classList.remove("hidden");
            inputTikTok.setAttribute("required", "true");
            inputInstagram.setAttribute("required", "true");
        } else {
            bloqueInputsEtiquetas.classList.add("hidden");
            inputTikTok.removeAttribute("required");
            inputInstagram.removeAttribute("required");
        }
    });

    formPedido.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
            const pedidosRef = collection(db, "Pedidos");
            const snapshotPedidos = await getDocs(pedidosRef);
            
            let maxIndex = 0;
            snapshotPedidos.forEach((documento) => {
                const idDoc = documento.id;
                if (idDoc.startsWith("personalizado")) {
                    const numeroParte = idDoc.replace("personalizado", "");
                    const numParsed = parseInt(numeroParte, 10);
                    if (!isNaN(numParsed) && numParsed > maxIndex) {
                        maxIndex = numParsed;
                    }
                }
            });

            const nuevoIdIncremental = `personalizado${maxIndex + 1}`;
            const valorPermisoPublicar = selectPublicar.value === "SI";
            const valorPermisoRrss = selectPublicar.value === "SI" && selectRrss.value === "SI";
            const valorEtiquetar = selectPublicar.value === "SI" && selectRrss.value === "SI" && selectEtiquetar.value === "SI";

            const nuevoPedidoDoc = {
                via: document.getElementById("select-via").value,
                contacto: document.getElementById("input-contacto").value,
                mensaje: document.getElementById("textarea-idea").value,
                permiso_publicar: valorPermisoPublicar,
                permiso_rrss: valorPermisoRrss,
                etiquetar: valorEtiquetar,
                usuario_tiktok: valorEtiquetar ? inputTikTok.value : "",
                usuario_instagram: valorEtiquetar ? inputInstagram.value : "",
                completada: false,
                contestada: false,
                posible: true,
                fecha: serverTimestamp(),
                usuario: nombreUsuarioLogueado
            };

            await setDoc(doc(db, "Pedidos", nuevoIdIncremental), nuevoPedidoDoc);
            modalPedido.classList.add("hidden");
            resetearFormularioCompleto();
        } catch (error) {
            console.error("Error al enviar el pedido personalizado:", error);
        }
    });

    // --- NUEVA LÓGICA DEL POP-UP: HACER PEDIDO ARTÍCULO ---
    const modalHacerPedido = document.getElementById("modal-hacer-pedido");
    const btnCancelarPedido = document.getElementById("btn_cancelar_pedido");
    const formHacerPedido = document.getElementById("form-hacer-pedido");
    const contenedorOpcionesDinamicas = document.getElementById("contenedor-opciones-dinamicas");

    const selectPublicarPedido = document.getElementById("select-permiso-publicar-pedido");
    const bloqueRrssPedido = document.getElementById("bloque-permiso-rrss-pedido");
    const selectRrssPedido = document.getElementById("select-permiso-rrss-pedido");
    const bloqueEtiquetarPedido = document.getElementById("bloque-deseas-etiquetar-pedido");
    const selectEtiquetarPedido = document.getElementById("select-etiquetar-pedido");
    const bloqueInputsEtiquetasPedido = document.getElementById("bloque-inputs-etiquetas-pedido");

    const inputTikTokPedido = document.getElementById("input-user-tiktok-pedido");
    const inputInstagramPedido = document.getElementById("input-user-instagram-pedido");

    function resetearFormularioPedido() {
        formHacerPedido.reset();
        contenedorOpcionesDinamicas.innerHTML = "";
        bloqueRrssPedido.classList.add("hidden");
        bloqueEtiquetarPedido.classList.add("hidden");
        bloqueInputsEtiquetasPedido.classList.add("hidden");
        inputTikTokPedido.removeAttribute("required");
        inputInstagramPedido.removeAttribute("required");
        productoSeleccionadoActual = null;
    }

    function abrirModalPedidoArticulo(producto) {
        resetearFormularioPedido();
        productoSeleccionadoActual = producto;

        // Generar dinámicamente campos select según los mapas del producto
        producto.tipos.forEach((tipoCampo) => {
            // Buscar la propiedad exacta respetando minúsculas/mayúsculas
            let propiedadOriginal = Object.keys(producto.datosRaw).find(k => k.toLowerCase() === tipoCampo);
            
            if (propiedadOriginal && producto.datosRaw[propiedadOriginal] && typeof producto.datosRaw[propiedadOriginal] === "object") {
                const mapaValores = producto.datosRaw[propiedadOriginal];
                const llavesOpciones = Object.keys(mapaValores);

                if (llavesOpciones.length > 0) {
                    const grupoDiv = document.createElement("div");
                    grupoDiv.className = "form-group";

                    const labelSelect = document.createElement("label");
                    labelSelect.textContent = `${propiedadOriginal.charAt(0).toUpperCase() + propiedadOriginal.slice(1)}:`;
                    labelSelect.setAttribute("for", `dynamic-select-${tipoCampo}`);
                    grupoDiv.appendChild(labelSelect);

                    const selectElement = document.createElement("select");
                    selectElement.id = `dynamic-select-${tipoCampo}`;
                    selectElement.className = "dynamic-product-option";
                    selectElement.dataset.optionType = propiedadOriginal;
                    selectElement.required = true;

                    llavesOpciones.forEach((llave) => {
                        const option = document.createElement("option");
                        option.value = llave;
                        option.textContent = `${llave}: ${mapaValores[llave]}`;
                        selectElement.appendChild(option);
                    });

                    grupoDiv.appendChild(selectElement);
                    contenedorOpcionesDinamicas.appendChild(grupoDiv);
                }
            }
        });

        modalHacerPedido.classList.remove("hidden");
    }

    if (btnCancelarPedido) {
        btnCancelarPedido.addEventListener("click", () => {
            modalHacerPedido.classList.add("hidden");
            resetearFormularioPedido();
        });
    }

    // Lógica condicional de permisos para el modal de compra artículo
    selectPublicarPedido.addEventListener("change", () => {
        if (selectPublicarPedido.value === "SI") {
            bloqueRrssPedido.classList.remove("hidden");
        } else {
            bloqueRrssPedido.classList.add("hidden");
            bloqueEtiquetarPedido.classList.add("hidden");
            bloqueInputsEtiquetasPedido.classList.add("hidden");
            selectRrssPedido.value = "NO";
            selectEtiquetarPedido.value = "NO";
            inputTikTokPedido.removeAttribute("required");
            inputInstagramPedido.removeAttribute("required");
        }
    });

    selectRrssPedido.addEventListener("change", () => {
        if (selectRrssPedido.value === "SI") {
            bloqueEtiquetarPedido.classList.remove("hidden");
        } else {
            bloqueEtiquetarPedido.classList.add("hidden");
            bloqueInputsEtiquetasPedido.classList.add("hidden");
            selectEtiquetarPedido.value = "NO";
            inputTikTokPedido.removeAttribute("required");
            inputInstagramPedido.removeAttribute("required");
        }
    });

    selectEtiquetarPedido.addEventListener("change", () => {
        if (selectEtiquetarPedido.value === "SI") {
            bloqueInputsEtiquetasPedido.classList.remove("hidden");
            inputTikTokPedido.setAttribute("required", "true");
            inputInstagramPedido.setAttribute("required", "true");
        } else {
            bloqueInputsEtiquetasPedido.classList.add("hidden");
            inputTikTokPedido.removeAttribute("required");
            inputInstagramPedido.removeAttribute("required");
        }
    });

    // Procesamiento y envío incremental por nombre a la colección Pedidos
    formHacerPedido.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!productoSeleccionadoActual) return;

        try {
            const nombreBaseEs = productoSeleccionadoActual.nombreEs;

            const pedidosRef = collection(db, "Pedidos");
            const snapshotPedidos = await getDocs(pedidosRef);
            
            let maxIndex = 0;
            snapshotPedidos.forEach((documento) => {
                const idDoc = documento.id;
                if (idDoc.startsWith(nombreBaseEs)) {
                    const numeroParte = idDoc.replace(nombreBaseEs, "");
                    const numParsed = parseInt(numeroParte, 10);
                    if (!isNaN(numParsed) && numParsed > maxIndex) {
                        maxIndex = numParsed;
                    }
                }
            });

            const nuevoIdIncremental = `${nombreBaseEs}${maxIndex + 1}`;

            // Mapear todas las opciones dinámicas elegidas del producto
            const selectsDinamicos = contenedorOpcionesDinamicas.querySelectorAll(".dynamic-product-option");
            let arrayOpcionesElegidas = [];
            selectsDinamicos.forEach((sel) => {
                const tipoLlave = sel.dataset.optionType;
                const valorElegido = sel.value;
                arrayOpcionesElegidas.push(`${tipoLlave}: ${valorElegido}`);
            });
            const stringTipoFinal = arrayOpcionesElegidas.join(", ");

            const valorPermisoPublicar = selectPublicarPedido.value === "SI";
            const valorPermisoRrss = selectPublicarPedido.value === "SI" && selectRrssPedido.value === "SI";
            const valorEtiquetar = selectPublicarPedido.value === "SI" && selectRrssPedido.value === "SI" && selectEtiquetarPedido.value === "SI";

            const inputMsgValor = document.getElementById("textarea-mensaje-pedido").value.trim();

            const nuevoPedidoArticuloDoc = {
                via: document.getElementById("select-via-pedido").value,
                contacto: document.getElementById("input-contacto-pedido").value,
                tipo: stringTipoFinal,
                permiso_publicar: valorPermisoPublicar,
                permiso_rrss: valorPermisoRrss,
                etiquetar: valorEtiquetar,
                usuario_tiktok: valorEtiquetar ? inputTikTokPedido.value : "",
                usuario_instagram: valorEtiquetar ? inputInstagramPedido.value : "",
                completada: false,
                contestada: false,
                posible: true,
                fecha: serverTimestamp(),
                usuario: nombreUsuarioLogueado
            };

            // Solo crea el campo mensaje si el usuario ha rellenado el input
            if (inputMsgValor !== "") {
                nuevoPedidoArticuloDoc.mensaje = inputMsgValor;
            }

            await setDoc(doc(db, "Pedidos", nuevoIdIncremental), nuevoPedidoArticuloDoc);
            modalHacerPedido.classList.add("hidden");
            resetearFormularioPedido();
        } catch (error) {
            console.error("Error al procesar el pedido del artículo:", error);
        }
    });

    // --- MANEJO DE EVENTOS DE LOS BOTONES DE CABECERA ---
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