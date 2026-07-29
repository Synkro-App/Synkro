import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, updateDoc, getDoc, getDocs, deleteField, Timestamp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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
let desubscribirRutinaActual = null;
let datosDiaActualCache = null; 
let modoActual = "ver";

// Callback pendiente para la acción del modal
let accionConfirmadaModal = null;

// --- FUNCIONES AUXILIARES DE CÁLCULO ---

function calcularEdadExacta(fechaNacStr) {
    if (!fechaNacStr) return null;
    let dia, mes, año;

    // Detectar formato DD-MM-YYYY o YYYY-MM-DD
    if (fechaNacStr.includes("-")) {
        const partes = fechaNacStr.split("-");
        if (partes[0].length === 4) { // YYYY-MM-DD
            año = parseInt(partes[0]);
            mes = parseInt(partes[1]) - 1;
            dia = parseInt(partes[2]);
        } else { // DD-MM-YYYY
            dia = parseInt(partes[0]);
            mes = parseInt(partes[1]) - 1;
            año = parseInt(partes[2]);
        }
    } else if (fechaNacStr.includes(".")) { // Formato DD.MM.YYYY
        const partes = fechaNacStr.split(".");
        dia = parseInt(partes[0]);
        mes = parseInt(partes[1]) - 1;
        año = parseInt(partes[2]);
    } else {
        return null;
    }

    const hoy = new Date();
    let edad = hoy.getFullYear() - año;
    const diferenciaMeses = hoy.getMonth() - mes;

    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < dia)) {
        edad--;
    }

    return edad >= 0 ? edad : 0;
}

function calcularDiasRestantes(fechaExp) {
    if (!fechaExp) return 0;
    let expDate;

    // Si es un Timestamp de Firestore
    if (fechaExp.seconds !== undefined) {
        expDate = fechaExp.toDate();
    } else {
        // Si es un string o una fecha nativa de JS
        expDate = new Date(fechaExp);
    }

    const hoy = new Date();
    
    // Resetear horas para comparar días exactos sin importar las horas
    hoy.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);

    const diferenciaMs = expDate.getTime() - hoy.getTime();
    const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

    return dias > 0 ? dias : 0;
}

// --- GESTIÓN INTERNA DEL MODAL PERSONALIZADO ---
function abrirModalConfirmacion(tituloKey, mensajeBase, reemplazo, callbackAccion) {
    const modal = document.getElementById("modal-confirmar-borrar");
    const txtTitulo = document.getElementById("modal-confirmar-titulo");
    const txtMensaje = document.getElementById("modal-confirmar-mensaje");
    const btnCancelar = document.getElementById("btn-modal-cancelar");
    const btnAceptar = document.getElementById("btn-modal-aceptar");

    if (!modal) return;

    // Traducción dinámica del título
    txtTitulo.textContent = (diccionario[tituloKey] && diccionario[tituloKey][currentLanguage]) 
        ? diccionario[tituloKey][currentLanguage] 
        : "Confirmar";

    // Reemplazo del texto dinámico en el cuerpo del mensaje
    let mensajeFormateado = (diccionario[mensajeBase] && diccionario[mensajeBase][currentLanguage])
        ? diccionario[mensajeBase][currentLanguage]
        : "¿Seguro que deseas eliminar?";
    
    if (reemplazo) {
        mensajeFormateado = mensajeFormateado.replace("%s", reemplazo);
    }
    txtMensaje.textContent = mensajeFormateado;

    // Traducir los botones del modal
    btnCancelar.textContent = (diccionario["btn_cancelar"] && diccionario["btn_cancelar"][currentLanguage]) 
        ? diccionario["btn_cancelar"][currentLanguage] 
        : "Cancelar";
    btnAceptar.textContent = (diccionario["btn_eliminar"] && diccionario["btn_eliminar"][currentLanguage]) 
        ? diccionario["btn_eliminar"][currentLanguage] 
        : "Eliminar";

    accionConfirmadaModal = callbackAccion;
    modal.classList.add("activo");
}

function cerrarModalConfirmacion() {
    const modal = document.getElementById("modal-confirmar-borrar");
    if (modal) modal.classList.remove("activo");
    accionConfirmadaModal = null;
}

function aplicarTraduccionesEstaticas(idioma) {
    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver && diccionario["btn_volver"] && diccionario["btn_volver"][idioma]) {
        btnVolver.textContent = diccionario["btn_volver"][idioma];
    }
    const btnLogout = document.getElementById("btn_cerrar_sesion");
    if (btnLogout && diccionario["btn_cerrar_sesion"] && diccionario["btn_cerrar_sesion"][idioma]) {
        btnLogout.textContent = diccionario["btn_cerrar_sesion"][idioma];
    }
    const lblSub = document.getElementById("text_subscripcion");
    if (lblSub && diccionario["text_subscripcion"] && diccionario["text_subscripcion"][idioma]) {
        lblSub.textContent = diccionario["text_subscripcion"][idioma];
    }
    const txtTitulo = document.getElementById("txt-titulo-rutinas");
    if (txtTitulo && diccionario["titulo_rutinas"] && diccionario["titulo_rutinas"][idioma]) {
        txtTitulo.textContent = diccionario["titulo_rutinas"][idioma];
    }
    
    const btnModoVer = document.getElementById("btn-modo-ver");
    if (btnModoVer && diccionario["btn_modo_ver"] && diccionario["btn_modo_ver"][idioma]) {
        btnModoVer.textContent = diccionario["btn_modo_ver"][idioma];
    }
    const btnModoEditar = document.getElementById("btn-modo-editar");
    if (btnModoEditar && diccionario["btn_modo_editar"] && diccionario["btn_modo_editar"][idioma]) {
        btnModoEditar.textContent = diccionario["btn_modo_editar"][idioma];
    }
}

function formatearFechaAId(fechaString) {
    if (!fechaString) return null;
    const partes = fechaString.split("-");
    return `${partes[2]}.${partes[1]}.${partes[0]}`;
}

function establecerFechaActualPorDefecto() {
    const inputFecha = document.getElementById("input-fecha-rutina");
    if (inputFecha && !inputFecha.value) {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        inputFecha.value = `${año}-${mes}-${dia}`;
    }
}

function inicializarEscuchaPlantillas() {
    if (!userDocIdGlobal) return;
    
    const refPlantillas = collection(db, "Usuarios", userDocIdGlobal, "Plantillas");
    onSnapshot(refPlantillas, (snapshot) => {
        const selectElement = document.getElementById("select-plantillas-disponibles");
        if (!selectElement) return;

        selectElement.innerHTML = '<option value="">Seleccionar plantilla...</option>';
        snapshot.forEach(docSnap => {
            const option = document.createElement("option");
            option.value = docSnap.id;
            option.textContent = docSnap.id;
            selectElement.appendChild(option);
        });
    });
}

// --- PROCESAR RECOMPENSA DE NOVAPOINTS ---
async function procesarPremioTarea(item, idDiaSujeto) {
    if (!userDocIdGlobal) return;

    try {
        const userRef = doc(db, "Usuarios", userDocIdGlobal);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentNovas = userData.NovaPoints !== undefined ? Number(userData.NovaPoints) : 0;
            const nuevosNovas = currentNovas + 5;

            // 1. Sumar los 5 NovaPoints al usuario
            await updateDoc(userRef, {
                NovaPoints: nuevosNovas
            });

            // 2. Buscar y contar transacciones que empiecen por "rutina" para el ID incremental
            const refTransacciones = collection(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints");
            const snapTransacciones = await getDocs(refTransacciones);
            
            let contadorRutina = 0;
            snapTransacciones.forEach(docSnap => {
                if (docSnap.id.startsWith("rutina")) {
                    contadorRutina++;
                }
            });

            const nuevoIdTransaccion = `rutina${contadorRutina + 1}`;

            // 3. Crear el documento de la transacción con los campos de fecha actualizados
            const docTransaccionRef = doc(db, "Usuarios", userDocIdGlobal, "Transacciones de NovaPoints", nuevoIdTransaccion);
            await setDoc(docTransaccionRef, {
                Categoría: item.categoria,
                NovaPoints: 5,
                Número: Number(item.bloque),
                Rutina: item.rutina,
                Tarea: item.tarea,
                fechatarea: idDiaSujeto,       // La fecha de la tarea en formato de string "DD.MM.YYYY"
                fecha: Timestamp.now(),        // La fecha en que se completa la tarea como Timestamp nativo de Firebase
                donde: "rutinas",
                tipo: "suma"
            });
        }
    } catch (error) {
        console.error("Error al procesar la recompensa de NovaPoints:", error);
    }
}

// --- MODO VER CRONOLÓGICO ---
function renderizarModoVerCronologico(datosDocumento, idDiaSujeto, docRef, contenedor) {
    const divCuadro = document.createElement("div");
    divCuadro.className = "cuadro-dia-rutina";

    const divHeader = document.createElement("div");
    divHeader.className = "header-cuadro-dia";
    const spanTitulo = document.createElement("span");
    spanTitulo.className = "titulo-cuadro-dia";
    
    const textoLineaTiempo = (diccionario["txt_linea_tiempo"] && diccionario["txt_linea_tiempo"][currentLanguage]) 
        ? diccionario["txt_linea_tiempo"][currentLanguage] 
        : "Linea de Tiempo";
        
    spanTitulo.textContent = `${idDiaSujeto} - ${textoLineaTiempo}`;
    divHeader.appendChild(spanTitulo);
    divCuadro.appendChild(divHeader);

    let listaTareasPlana = [];

    const clavesBloques = Object.keys(datosDocumento)
        .filter(key => !isNaN(key))
        .sort((a, b) => Number(a) - Number(b));

    clavesBloques.forEach(numBloque => {
        const mapaBloque = datosDocumento[numBloque];
        Object.keys(mapaBloque).forEach(nombreRutina => {
            const mapaRutina = mapaBloque[nombreRutina];
            Object.keys(mapaRutina).forEach(nombreCategoria => {
                const mapaCategoria = mapaRutina[nombreCategoria];
                Object.keys(mapaCategoria).forEach(nombreTarea => {
                    const infoTarea = mapaCategoria[nombreTarea];
                    listaTareasPlana.push({
                        bloque: numBloque,
                        rutina: nombreRutina,
                        categoria: nombreCategoria,
                        tarea: nombreTarea,
                        hora_inicio: infoTarea.hora_inicio || "00:00",
                        hora_fin: infoTarea.hora_fin || "00:00",
                        completada: infoTarea.completada || false,
                        primera: infoTarea.primera || false
                    });
                });
            });
        });
    });

    if (listaTareasPlana.length === 0) {
        const pVacio = document.createElement("p");
        pVacio.className = "msg-estado-vacio";
        pVacio.textContent = "No hay tareas programadas para hoy.";
        divCuadro.appendChild(pVacio);
        contenedor.appendChild(divCuadro);
        return;
    }

    listaTareasPlana.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

    let ultimaRutinaImpresa = null;
    let ultimaCategoriaImpresa = null;

    listaTareasPlana.forEach(item => {
        
        if (item.rutina !== ultimaRutinaImpresa || item.categoria !== ultimaCategoriaImpresa) {
            const divCambio = document.createElement("div");
            divCambio.className = "cambio-contexto-cronologico";
            divCambio.textContent = `⏱️ ${item.bloque}. ${item.rutina} ➔ ${item.categoria}`;
            divCuadro.appendChild(divCambio);

            ultimaRutinaImpresa = item.rutina;
            ultimaCategoriaImpresa = item.categoria;
        }

        const divTareaRow = document.createElement("div");
        divTareaRow.className = `tarea-item-row ${item.completada ? 'completada' : ''}`;

        const divTareaInfo = document.createElement("div");
        divTareaInfo.className = "tarea-info";

        const spanTareaNombre = document.createElement("span");
        spanTareaNombre.className = `tarea-nombre ${item.completada ? 'completada-line' : ''}`;
        spanTareaNombre.textContent = item.tarea;

        const spanTareaHoras = document.createElement("span");
        spanTareaHoras.className = "tarea-horas";
        spanTareaHoras.textContent = `⏰ ${item.hora_inicio} - ${item.hora_fin}`;

        divTareaInfo.appendChild(spanTareaNombre);
        divTareaInfo.appendChild(spanTareaHoras);

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "checkbox-completar";
        checkbox.checked = item.completada;

        checkbox.addEventListener("change", async () => {
            const marcarComoCompletada = checkbox.checked;
            const rutaCampoCompletada = `${item.bloque}.${item.rutina}.${item.categoria}.${item.tarea}.completada`;
            const rutaCampoPrimera = `${item.bloque}.${item.rutina}.${item.categoria}.${item.tarea}.primera`;

            try {
                // Si pasa de false a true y nunca ha sido completada en el pasado (primera no existe o es false)
                if (marcarComoCompletada && !item.primera) {
                    await updateDoc(docRef, {
                        [rutaCampoCompletada]: true,
                        [rutaCampoPrimera]: true
                    });
                    await procesarPremioTarea(item, idDiaSujeto);
                } else {
                    // Si se desmarca, o si se marca de nuevo pero ya había cobrado su premio en el pasado
                    await updateDoc(docRef, {
                        [rutaCampoCompletada]: marcarComoCompletada
                    });
                }
            } catch (error) {
                console.error("Error al actualizar estado en vista cronológica:", error);
            }
        });

        divTareaRow.appendChild(divTareaInfo);
        divTareaRow.appendChild(checkbox);
        divCuadro.appendChild(divTareaRow);
    });

    contenedor.appendChild(divCuadro);
}

// --- MODO EDICIÓN CON LOS NUEVOS MODALES INTEGRADOS ---
function renderizarModoEditarBloques(datosDocumento, idDiaSujeto, docRef, contenedor) {
    const divCuadro = document.createElement("div");
    divCuadro.className = "cuadro-dia-rutina";

    const divHeader = document.createElement("div");
    divHeader.className = "header-cuadro-dia";
    const spanTitulo = document.createElement("span");
    spanTitulo.className = "titulo-cuadro-dia";
    
    const textoEstructura = (diccionario["txt_estructura_bloques"] && diccionario["txt_estructura_bloques"][currentLanguage])
        ? diccionario["txt_estructura_bloques"][currentLanguage]
        : "Estructura de Bloques";

    spanTitulo.textContent = `${idDiaSujeto} - ${textoEstructura}`;
    divHeader.appendChild(spanTitulo);
    divCuadro.appendChild(divHeader);

    const clavesBloques = Object.keys(datosDocumento)
        .filter(key => !isNaN(key))
        .sort((a, b) => Number(a) - Number(b));

    if (clavesBloques.length === 0) {
        const pVacio = document.createElement("p");
        pVacio.className = "msg-estado-vacio";
        pVacio.textContent = "Sin tareas. Diseña una estructura añadiendo una abajo.";
        divCuadro.appendChild(pVacio);
    } else {
        clavesBloques.forEach(numBloque => {
            const mapaBloque = datosDocumento[numBloque];
            Object.keys(mapaBloque).forEach(nombreRutina => {
                const mapaRutina = mapaBloque[nombreRutina];

                const divBloqueCard = document.createElement("div");
                divBloqueCard.className = "bloque-rutina-card";

                const divBloqueHeaderEdit = document.createElement("div");
                divBloqueHeaderEdit.className = "bloque-header-edit";

                const inputNum = document.createElement("input");
                inputNum.type = "number";
                inputNum.className = "input-edit-bloque-num";
                inputNum.value = numBloque;

                const inputRutina = document.createElement("input");
                inputRutina.type = "text";
                inputRutina.className = "input-edit-bloque-rutina";
                inputRutina.value = nombreRutina;

                const btnBorrarBloque = document.createElement("button");
                btnBorrarBloque.type = "button";
                btnBorrarBloque.className = "btn-borrar-item";
                btnBorrarBloque.textContent = "❌";
                btnBorrarBloque.title = "Borrar bloque completo";

                const guardarCambioBloque = async () => {
                    const nuevoNum = inputNum.value.trim();
                    const nuevaRutina = inputRutina.value.trim();
                    if (!nuevoNum || !nuevaRutina) return;

                    if (nuevoNum !== numBloque || nuevaRutina !== nombreRutina) {
                        try {
                            const copiaMapaOriginal = JSON.parse(JSON.stringify(mapaRutina));
                            await updateDoc(docRef, {
                                [`${numBloque}`]: deleteField(),
                                [`${nuevoNum}.${nuevaRutina}`]: copiaMapaOriginal
                            });
                        } catch (error) {
                            console.error("Error al reestructurar bloque:", error);
                        }
                    }
                };

                inputNum.addEventListener("change", guardarCambioBloque);
                inputRutina.addEventListener("change", guardarCambioBloque);

                btnBorrarBloque.addEventListener("click", () => {
                    abrirModalConfirmacion(
                        "titulo_confirmar_borrado", 
                        "msg_borrar_bloque", 
                        `${numBloque}. ${nombreRutina}`, 
                        async () => {
                            try {
                                await updateDoc(docRef, { [`${numBloque}`]: deleteField() });
                            } catch (error) {
                                console.error("Error al borrar bloque:", error);
                            }
                        }
                    );
                });

                divBloqueHeaderEdit.appendChild(inputNum);
                divBloqueHeaderEdit.appendChild(inputRutina);
                divBloqueHeaderEdit.appendChild(btnBorrarBloque);
                divBloqueCard.appendChild(divBloqueHeaderEdit);

                Object.keys(mapaRutina).forEach(nombreCategoria => {
                    const mapaCategoria = mapaRutina[nombreCategoria];

                    const divCategoriaBox = document.createElement("div");
                    divCategoriaBox.className = "categoria-container";

                    const divCatHeaderEdit = document.createElement("div");
                    divCatHeaderEdit.className = "categoria-header-edit";

                    const inputCat = document.createElement("input");
                    inputCat.type = "text";
                    inputCat.className = "input-edit-categoria";
                    inputCat.value = nombreCategoria;

                    const btnBorrarCat = document.createElement("button");
                    btnBorrarCat.type = "button";
                    btnBorrarCat.className = "btn-borrar-item";
                    btnBorrarCat.textContent = "❌";
                    btnBorrarCat.title = "Borrar categoría completa";

                    const guardarCambioCategoria = async () => {
                        const nuevaCat = inputCat.value.trim();
                        if (!nuevaCat || nuevaCat === nombreCategoria) return;

                        try {
                            const copiaCategoriaOriginal = JSON.parse(JSON.stringify(mapaCategoria));
                            await updateDoc(docRef, {
                                [`${inputNum.value}.${inputRutina.value}.${nombreCategoria}`]: deleteField(),
                                [`${inputNum.value}.${inputRutina.value}.${nuevaCat}`]: copiaCategoriaOriginal
                            });
                        } catch (error) {
                            console.error("Error al renombrar categoría:", error);
                        }
                    };

                    inputCat.addEventListener("change", guardarCambioCategoria);

                    btnBorrarCat.addEventListener("click", () => {
                        abrirModalConfirmacion(
                            "titulo_confirmar_borrado", 
                            "msg_borrar_categoria", 
                            nombreCategoria, 
                            async () => {
                                try {
                                    await updateDoc(docRef, {
                                        [`${inputNum.value}.${inputRutina.value}.${nombreCategoria}`]: deleteField()
                                    });
                                } catch (error) {
                                    console.error("Error al borrar categoría:", error);
                                }
                            }
                        );
                    });

                    divCatHeaderEdit.appendChild(inputCat);
                    divCatHeaderEdit.appendChild(btnBorrarCat);
                    divCategoriaBox.appendChild(divCatHeaderEdit);

                    const divTareasList = document.createElement("div");
                    divTareasList.className = "tareas-list";

                    Object.keys(mapaCategoria).forEach(nombreTarea => {
                        const tareaObj = mapaCategoria[nombreTarea];

                        const divTareaRow = document.createElement("div");
                        divTareaRow.className = "tarea-item-row";

                        const divInputsEditTareaRow = document.createElement("div");
                        divInputsEditTareaRow.className = "inputs-edit-tarea-row";

                        const inputTareaNombre = document.createElement("input");
                        inputTareaNombre.type = "text";
                        inputTareaNombre.className = "input-edit-tarea-nombre";
                        inputTareaNombre.value = nombreTarea;

                        const inputTareaInicio = document.createElement("input");
                        inputTareaInicio.type = "text";
                        inputTareaInicio.className = "input-edit-tarea-time";
                        inputTareaInicio.value = tareaObj.hora_inicio || "00:00";

                        const inputTareaFin = document.createElement("input");
                        inputTareaFin.type = "text";
                        inputTareaFin.className = "input-edit-tarea-time";
                        inputTareaFin.value = tareaObj.hora_fin || "00:00";

                        const btnBorrarTarea = document.createElement("button");
                        btnBorrarTarea.type = "button";
                        btnBorrarTarea.className = "btn-borrar-item";
                        btnBorrarTarea.textContent = "❌";
                        btnBorrarTarea.title = "Borrar tarea";

                        const guardarCambiosFilaTarea = async () => {
                            const nuevoNomTarea = inputTareaNombre.value.trim();
                            const nuevaHoraIni = inputTareaInicio.value.trim() || "00:00";
                            const nuevaHoraFin = inputTareaFin.value.trim() || "00:00";

                            if (!nuevoNomTarea) return;

                            try {
                                const baseRuta = `${inputNum.value}.${inputRutina.value}.${inputCat.value}`;
                                if (nuevoNomTarea !== nombreTarea) {
                                    await updateDoc(docRef, {
                                        [`${baseRuta}.${nombreTarea}`]: deleteField(),
                                        [`${baseRuta}.${nuevoNomTarea}`]: {
                                            hora_inicio: nuevaHoraIni,
                                            hora_fin: nuevaHoraFin,
                                            completada: tareaObj.completada || false,
                                            primera: tareaObj.primera || false
                                        }
                                    });
                                } else {
                                    await updateDoc(docRef, {
                                        [`${baseRuta}.${nombreTarea}.hora_inicio`]: nuevaHoraIni,
                                        [`${baseRuta}.${nombreTarea}.hora_fin`]: nuevaHoraFin
                                    });
                                }
                            } catch (error) {
                                console.error("Error al actualizar tarea:", error);
                            }
                        };

                        inputTareaNombre.addEventListener("change", guardarCambiosFilaTarea);
                        inputTareaInicio.addEventListener("change", guardarCambiosFilaTarea);
                        inputTareaFin.addEventListener("change", guardarCambiosFilaTarea);

                        btnBorrarTarea.addEventListener("click", () => {
                            abrirModalConfirmacion(
                                "titulo_confirmar_borrado",
                                "msg_borrar_tarea",
                                nombreTarea,
                                async () => {
                                    try {
                                        await updateDoc(docRef, {
                                            [`${inputNum.value}.${inputRutina.value}.${inputCat.value}.${nombreTarea}`]: deleteField()
                                        });
                                    } catch (error) {
                                        console.error("Error al borrar tarea:", error);
                                    }
                                }
                            );
                        });

                        divInputsEditTareaRow.appendChild(inputTareaNombre);
                        divInputsEditTareaRow.appendChild(inputTareaInicio);
                        divInputsEditTareaRow.appendChild(inputTareaFin);

                        divTareaRow.appendChild(divInputsEditTareaRow);
                        divTareaRow.appendChild(btnBorrarTarea);
                        divTareasList.appendChild(divTareaRow);
                    });

                    divCategoriaBox.appendChild(divTareasList);
                    divBloqueCard.appendChild(divCategoriaBox);
                });

                divCuadro.appendChild(divBloqueCard);
            });
        });
    }

    const divForm = document.createElement("div");
    divForm.className = "formulario-add-tarea";
    const divInputs = document.createElement("div");
    divInputs.className = "form-row-inputs";

    const inBloque = document.createElement("input");
    inBloque.type = "number";
    inBloque.placeholder = "Nº";
    inBloque.className = "form-input-text";
    inBloque.style.maxWidth = "60px";

    const inRutina = document.createElement("input");
    inRutina.type = "text";
    inRutina.placeholder = "Rutina";
    inRutina.className = "form-input-text";

    const inCat = document.createElement("input");
    inCat.type = "text";
    inCat.placeholder = "Categoría";
    inCat.className = "form-input-text";

    const inTarea = document.createElement("input");
    inTarea.type = "text";
    inTarea.placeholder = "Tarea";
    inTarea.className = "form-input-text";

    const inInicio = document.createElement("input");
    inInicio.type = "text";
    inInicio.placeholder = "00:00";
    inInicio.className = "form-input-time";

    const inFin = document.createElement("input");
    inFin.type = "text";
    inFin.placeholder = "00:00";
    inFin.className = "form-input-time";

    divInputs.appendChild(inBloque);
    divInputs.appendChild(inRutina);
    divInputs.appendChild(inCat);
    divInputs.appendChild(inTarea);
    divInputs.appendChild(inInicio);
    divInputs.appendChild(inFin);

    const btnSubmitTarea = document.createElement("button");
    btnSubmitTarea.type = "button";
    btnSubmitTarea.className = "btn-accion-rutina";
    btnSubmitTarea.textContent = "Añadir Tarea";

    btnSubmitTarea.addEventListener("click", async () => {
        const b = inBloque.value.trim();
        const r = inRutina.value.trim();
        const c = inCat.value.trim();
        const t = inTarea.value.trim();
        const hi = inInicio.value.trim() || "00:00";
        const hf = inFin.value.trim() || "00:00";

        if (!b || !r || !c || !t) return;

        const rutaCompleta = `${b}.${r}.${c}.${t}`;
        try {
            await updateDoc(docRef, {
                [rutaCompleta]: {
                    hora_inicio: hi,
                    hora_fin: hf,
                    completada: false,
                    primera: false
                }
            });
            inTarea.value = "";
            inInicio.value = "";
            inFin.value = "";
        } catch (error) {
            console.error("Error al añadir tarea:", error);
        }
    });

    divForm.appendChild(divInputs);
    divForm.appendChild(btnSubmitTarea);
    divCuadro.appendChild(divForm);
    contenedor.appendChild(divCuadro);
}

function actualizarEscuchaRutinaDia() {
    if (desubscribirRutinaActual) {
        desubscribirRutinaActual();
        desubscribirRutinaActual = null;
    }

    const inputFecha = document.getElementById("input-fecha-rutina");
    const idDiaSujeto = formatearFechaAId(inputFecha.value);

    if (!idDiaSujeto || !userDocIdGlobal) return;

    const contenedor = document.getElementById("contenedor-cuadros-rutinas");
    const docRef = doc(db, "Usuarios", userDocIdGlobal, "Rutinas", idDiaSujeto);

    const panelHerramientas = document.getElementById("panel-herramientas-rutinas");
    if (modoActual === "editar") {
        panelHerramientas.style.display = "flex";
    } else {
        panelHerramientas.style.display = "none";
    }

    desubscribirRutinaActual = onSnapshot(docRef, (docSnap) => {
        contenedor.innerHTML = "";

        if (docSnap.exists()) {
            datosDiaActualCache = docSnap.data();
            
            if (modoActual === "ver") {
                renderizarModoVerCronologico(datosDiaActualCache, idDiaSujeto, docRef, contenedor);
            } else {
                renderizarModoEditarBloques(datosDiaActualCache, idDiaSujeto, docRef, contenedor);
            }
        } else {
            datosDiaActualCache = null;

            const divCuadro = document.createElement("div");
            divCuadro.className = "cuadro-dia-rutina";

            const divHeader = document.createElement("div");
            divHeader.className = "header-cuadro-dia";
            const spanTitulo = document.createElement("span");
            spanTitulo.className = "titulo-cuadro-dia";
            spanTitulo.textContent = idDiaSujeto;
            divHeader.appendChild(spanTitulo);
            divCuadro.appendChild(divHeader);

            const divContenido = document.createElement("div");
            divContenido.className = "contenido-cuadro-provisional";
            
            const btnCrear = document.createElement("button");
            btnCrear.type = "button";
            btnCrear.className = "btn-accion-rutina";
            btnCrear.textContent = "Añadir Día";
            
            btnCrear.addEventListener("click", async () => {
                try {
                    await setDoc(docRef, {
                        inicializado: true,
                        creadoEn: new Date()
                    }, { merge: true });
                } catch (error) {
                    console.error(error);
                }
            });

            divContenido.appendChild(btnCrear);
            divCuadro.appendChild(divContenido);
            contenedor.appendChild(divCuadro);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    const txtNombre = document.getElementById("user-display-name");
    if (txtNombre) txtNombre.textContent = "---";

    establecerFechaActualPorDefecto();

    document.getElementById("fila-perfil").addEventListener("click", () => window.location.href = "Perfil.html");
    document.getElementById("fila-novas").addEventListener("click", () => window.location.href = "NovaPoints.html");

    // Configurar escuchas de eventos del Pop-up Modal
    document.getElementById("btn-modal-cancelar").addEventListener("click", () => {
        cerrarModalConfirmacion();
    });

    document.getElementById("btn-modal-aceptar").addEventListener("click", () => {
        if (accionConfirmadaModal) {
            accionConfirmadaModal();
        }
        cerrarModalConfirmacion();
    });

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error(error);
    }

    aplicarTraduccionesEstaticas(currentLanguage);

    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");
    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    const btnVer = document.getElementById("btn-modo-ver");
    const btnEditar = document.getElementById("btn-modo-editar");

    btnVer.addEventListener("click", () => {
        if (modoActual === "ver") return;
        modoActual = "ver";
        btnVer.classList.add("activo");
        btnEditar.classList.remove("activo");
        actualizarEscuchaRutinaDia();
    });

    btnEditar.addEventListener("click", () => {
        if (modoActual === "editar") return;
        modoActual = "editar";
        btnEditar.classList.add("activo");
        btnVer.classList.remove("activo");
        actualizarEscuchaRutinaDia();
    });

    const qUsuario = query(collection(db, "Usuarios"), where("usuario", "==", nombreUsuarioLogueado));
    onSnapshot(qUsuario, async (querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userRef = doc(db, "Usuarios", userDoc.id);
            
            if (userDocIdGlobal !== userDoc.id) {
                userDocIdGlobal = userDoc.id;
                actualizarEscuchaRutinaDia();
                inicializarEscuchaPlantillas();
            }

            const userData = userDoc.data();
            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            if (imgAvatar) imgAvatar.src = userData.imgperfil || "default-profile.png";
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;

            // --- CÁLCULO DE EDAD ---
            let edadCalculada = null;
            if (userData.fechanacimiento) {
                edadCalculada = calcularEdadExacta(userData.fechanacimiento);
            }

            // --- CÁLCULO DE DÍAS RESTANTES DE SUSCRIPCIÓN ---
            let diasRestantesCalculados = 0;
            let subActiva = "Ninguna";
            if (userData.subs && typeof userData.subs === "object" && userData.subs.subs) {
                subActiva = userData.subs.subs;
                if (userData.subs.fechaExpiracion) {
                    diasRestantesCalculados = calcularDiasRestantes(userData.subs.fechaExpiracion);
                }
            }

            // --- ACTUALIZAR EL CONTENIDO EN EL DOM ---
            if (valSubs) {
                if (subActiva !== "Ninguna") {
                    valSubs.textContent = `${subActiva} (${diasRestantesCalculados}d)`;
                } else {
                    valSubs.textContent = "Ninguna";
                }
            }

            // --- ACTUALIZAR BASE DE DATOS DE FORMA INTELIGENTE ---
            // Solo escribimos si el valor guardado difiere del calculado (evita bucles infinitos en onSnapshot)
            let cambiosARegistrar = {};

            if (edadCalculada !== null && userData.Edad !== edadCalculada) {
                cambiosARegistrar.Edad = edadCalculada;
            }

            if (userData.subs && typeof userData.subs === "object") {
                if (userData.subs.diasrestantes !== diasRestantesCalculados) {
                    cambiosARegistrar["subs.diasrestantes"] = diasRestantesCalculados;
                }
            }

            if (Object.keys(cambiosARegistrar).length > 0) {
                try {
                    await updateDoc(userRef, cambiosARegistrar);
                } catch (error) {
                    console.error("Error al guardar campos auto-calculados en el perfil:", error);
                }
            }
        }
    });

    document.getElementById("btn-ejecutar-copiar").addEventListener("click", async () => {
        const inputDestino = document.getElementById("input-fecha-destino");
        const idDestinoFormateado = formatearFechaAId(inputDestino.value);

        if (!idDestinoFormateado || !userDocIdGlobal || !datosDiaActualCache) return;

        try {
            const docDestinoRef = doc(db, "Usuarios", userDocIdGlobal, "Rutinas", idDestinoFormateado);
            await setDoc(docDestinoRef, {
                ...datosDiaActualCache,
                creadoEn: new Date()
            });
            inputDestino.value = "";
        } catch (error) {
            console.error("Error al copiar día:", error);
        }
    });

    document.getElementById("btn-guardar-plantilla").addEventListener("click", async () => {
        const inputNombrePlan = document.getElementById("input-nombre-plantilla");
        const nombrePlantilla = inputNombrePlan.value.trim();

        if (!nombrePlantilla || !userDocIdGlobal || !datosDiaActualCache) return;

        try {
            const docPlantillaRef = doc(db, "Usuarios", userDocIdGlobal, "Plantillas", nombrePlantilla);
            await setDoc(docPlantillaRef, {
                ...datosDiaActualCache
            });
            inputNombrePlan.value = "";
        } catch (error) {
            console.error("Error al guardar plantilla:", error);
        }
    });

    document.getElementById("btn-aplicar-plantilla").addEventListener("click", async () => {
        const selectPlan = document.getElementById("select-plantillas-disponibles");
        const plantillaSeleccionada = selectPlan.value;

        const inputFechaActual = document.getElementById("input-fecha-rutina");
        const idDiaActual = formatearFechaAId(inputFechaActual.value);

        if (!plantillaSeleccionada || !idDiaActual || !userDocIdGlobal) return;

        try {
            const docPlantillaRef = doc(db, "Usuarios", userDocIdGlobal, "Plantillas", plantillaSeleccionada);
            const snapPlantilla = await getDoc(docPlantillaRef);

            if (snapPlantilla.exists()) {
                const docDestinoRef = doc(db, "Usuarios", userDocIdGlobal, "Rutinas", idDiaActual);
                await setDoc(docDestinoRef, {
                    ...snapPlantilla.data(),
                    inicializado: true,
                    creadoEn: new Date()
                });
            }
        } catch (error) {
            console.error("Error al aplicar plantilla:", error);
        }
    });

    document.getElementById("input-fecha-rutina").addEventListener("change", () => {
        actualizarEscuchaRutinaDia();
    });

    document.getElementById("btn_volver").addEventListener("click", () => window.history.back());
    document.getElementById("btn_cerrar_sesion").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
    });
});