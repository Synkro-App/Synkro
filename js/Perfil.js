import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js";

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

const basePaisesCiudades = {
    "Europa": {
        "España": ["Andalucía", "Aragón", "Asturias", "Baleares", "Canarias", "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña", "Comunidad Valenciana", "Extremadura", "Galicia", "Madrid", "Murcia", "Navarra", "País Vasco", "La Rioja"],
        "Francia": ["Île-de-France", "Provence-Alpes-Côte d'Azur", "Nouvelle-Aquitaine", "Occitanie"],
        "Rumanía": ["Bucarest", "Transilvania", "Moldavia", "Muntenia"]
    },
    "América": {
        "Estados Unidos": ["California", "Nueva York", "Texas", "Florida"],
        "México": ["CDMX", "Jalisco", "Nuevo León", "Veracruz"],
        "Argentina": ["Buenos Aires", "Córdoba", "Santa Fe", "Mendoza"]
    }
};

const longitudesExtensiones = {
    "+34": 9, "+33": 9, "+40": 9, "+1": 10, "+52": 10, "+54": 10
};

let diccionario = {};
let currentLanguage = "es";
let userDocIdGlobal = null;
let edadUsuarioGlobal = 0;
let subsUsuarioGlobal = "";
let rawSexoFirebase = "";
let contrasenaAutorizacionFirebase = ""; 

let modoEdicionActivo = false;
let datosUsuarioMemoria = {}; 

let resolvePopupActual = null;

async function generarHashSHA256(cadena) {
    const encoder = new TextEncoder();
    const data = encoder.encode(cadena);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
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

function traducirSexo(valorSexo, idioma) {
    if (!valorSexo) return "---";
    const normalizado = valorSexo.toLowerCase().trim();
    let key = "";
    if (normalizado === "hombre" || normalizado === "man" || normalizado === "homme" || normalizado === "bărbat") {
        key = "sexo_hombre";
    } else if (normalizado === "mujer" || normalizado === "woman" || normalizado === "femme" || normalizado === "femeie") {
        key = "sexo_mujer";
    } else if (normalizado === "otro" || normalizado === "other" || normalizado === "autre" || normalizado === "altul") {
        key = "sexo_otro";
    } else if (normalizado === "prefiero no decirlo" || normalizado === "prefer not to say" || normalizado === "préfère ne pas dire" || normalizado === "prefer să nu spun") {
        key = "sexo_no_decir";
    }
    if (key && diccionario[key] && diccionario[key][idioma]) {
        return diccionario[key][idioma];
    }
    return valorSexo;
}

function abrirPopupPerfil({ textoKey, mostrarInput = false, mostrarBotonCancelar = false }) {
    return new Promise((resolve) => {
        resolvePopupActual = resolve;
        
        const overlay = document.getElementById("custom-popup-overlay");
        const txtMsg = document.getElementById("popup-message-text");
        const inputCont = document.getElementById("popup-input-container");
        const inputElement = document.getElementById("popup-secure-input");
        const btnCancel = document.getElementById("popup-btn-cancel");
        const btnConfirm = document.getElementById("popup-btn-confirm");

        inputElement.value = "";
        txtMsg.textContent = (diccionario[textoKey] && diccionario[textoKey][currentLanguage]) ? diccionario[textoKey][currentLanguage] : textoKey;
        btnConfirm.textContent = (diccionario["btn_aceptar"] && diccionario["btn_aceptar"][currentLanguage]) ? diccionario["btn_aceptar"][currentLanguage] : "Aceptar";
        btnCancel.textContent = (diccionario["btn_cancelar"] && diccionario["btn_cancelar"][currentLanguage]) ? diccionario["btn_cancelar"][currentLanguage] : "Cancelar";

        if (mostrarInput) inputCont.classList.remove("select-hidden");
        else inputCont.classList.add("select-hidden");

        if (mostrarBotonCancelar) btnCancel.classList.remove("select-hidden");
        else btnCancel.classList.add("select-hidden");

        overlay.classList.remove("select-hidden");
    });
}

function cerrarPopupPerfil(resultadoValor) {
    const overlay = document.getElementById("custom-popup-overlay");
    overlay.classList.add("select-hidden");
    if (resolvePopupActual) {
        resolvePopupActual(resultadoValor);
        resolvePopupActual = null;
    }
}

function actualizarTextoBotonEdicion(idioma) {
    const btnEdit = document.getElementById("btn-edit-toggle");
    if (!btnEdit) return;
    if (!modoEdicionActivo) {
        btnEdit.textContent = (diccionario["btn_editar_datos"] && diccionario["btn_editar_datos"][idioma]) ? diccionario["btn_editar_datos"][idioma] : "Editar datos";
    } else {
        btnEdit.textContent = (diccionario["btn_guardar_datos"] && diccionario["btn_guardar_datos"][idioma]) ? diccionario["btn_guardar_datos"][idioma] : "Guardar datos";
    }
}

function aplicarTraduccionesEstaticas(idioma) {
    const lblSubs = document.getElementById("text_subscripcion");
    if (lblSubs && diccionario["text_subscripcion"] && diccionario["text_subscripcion"][idioma]) lblSubs.textContent = diccionario["text_subscripcion"][idioma];

    const btnVolver = document.getElementById("btn_volver");
    if (btnVolver && diccionario["btn_volver"] && diccionario["btn_volver"][idioma]) btnVolver.textContent = diccionario["btn_volver"][idioma];

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout && diccionario["btn_cerrar_sesion"] && diccionario["btn_cerrar_sesion"][idioma]) btnLogout.textContent = diccionario["btn_cerrar_sesion"][idioma];

    const lblName = document.getElementById("label_nombre_completo");
    if (lblName && diccionario["label_nombre_completo"] && diccionario["label_nombre_completo"][idioma]) lblName.textContent = diccionario["label_nombre_completo"][idioma];

    const lblPais = document.getElementById("label_pais");
    if (lblPais && diccionario["label_pais"] && diccionario["label_pais"][idioma]) lblPais.textContent = diccionario["label_pais"][idioma];

    const lblCiudad = document.getElementById("label_ciudad");
    if (lblCiudad && diccionario["label_ciudad"] && diccionario["label_ciudad"][idioma]) lblCiudad.textContent = diccionario["label_ciudad"][idioma];

    const lblFecha = document.getElementById("label_fecha_nacimiento");
    if (lblFecha && diccionario["label_fecha_nacimiento"] && diccionario["label_fecha_nacimiento"][idioma]) lblFecha.textContent = diccionario["label_fecha_nacimiento"][idioma];

    const lblSexo = document.getElementById("label_sexo");
    if (lblSexo && diccionario["label_sexo"] && diccionario["label_sexo"][idioma]) lblSexo.textContent = diccionario["label_sexo"][idioma];

    const lblTlf = document.getElementById("label_telefono");
    if (lblTlf && diccionario["label_telefono"] && diccionario["label_telefono"][idioma]) lblTlf.textContent = diccionario["label_telefono"][idioma];

    const lblEmail = document.getElementById("label_email");
    if (lblEmail && diccionario["label_email"] && diccionario["label_email"][idioma]) lblEmail.textContent = diccionario["label_email"][idioma];

    const lblPassNormal = document.getElementById("label_contrasena");
    if (lblPassNormal && diccionario["label_contrasena"] && diccionario["label_contrasena"][idioma]) lblPassNormal.textContent = diccionario["label_contrasena"][idioma];

    const lblPassAuth = document.getElementById("label_pass_auth");
    if (lblPassAuth && diccionario["text_contrasena_autorizacion"] && diccionario["text_contrasena_autorizacion"][idioma]) lblPassAuth.textContent = diccionario["text_contrasena_autorizacion"][idioma];

    actualizarTextoBotonEdicion(idioma);
    if (!modoEdicionActivo) renderizarVistaLectura();
}

function renderizarVistaLectura() {
    document.getElementById("container-fullname").innerHTML = `<span id="data-fullname" class="data-value">${datosUsuarioMemoria.Nombrecompleto || "---"}</span>`;
    document.getElementById("container-country").innerHTML = `<span id="data-country" class="data-value">${datosUsuarioMemoria.pais || "---"}</span>`;
    document.getElementById("container-city").innerHTML = `<span id="data-city" class="data-value">${datosUsuarioMemoria.Ciudad || "---"}</span>`;
    document.getElementById("container-birthdate").innerHTML = `<span id="data-birthdate" class="data-value">${datosUsuarioMemoria.fechanacimiento || "---"}</span>`;
    // CORRECCIÓN: Sexo mapeado correctamente y traducido dinámicamente
    document.getElementById("container-gender").innerHTML = `<span id="data-gender" class="data-value">${traducirSexo(rawSexoFirebase, currentLanguage)}</span>`;
    document.getElementById("container-extension").innerHTML = `<span id="data-extension" class="data-value">${datosUsuarioMemoria.extension || "---"}</span>`;
    document.getElementById("container-phone").innerHTML = `<span id="data-phone" class="data-value">${datosUsuarioMemoria.nTelefono || "---"}</span>`;
    document.getElementById("container-email").innerHTML = `<span id="data-email" class="data-value">${datosUsuarioMemoria.email || "---"}</span>`;
}

function renderizarFormularioEdicion() {
    document.getElementById("container-fullname").innerHTML = `<input type="text" id="edit-fullname" class="edit-input-field" value="${datosUsuarioMemoria.Nombrecompleto || ''}">`;
    
    let htmlPais = `<select id="edit-country" class="edit-select-field"><option value="">---</option>`;
    for (const continente in basePaisesCiudades) {
        htmlPais += `<option value="" disabled style="font-weight:bold; color:#555;">┌─ ${continente}</option>`;
        for (const pais in basePaisesCiudades[continente]) {
            const selected = datosUsuarioMemoria.pais === pais ? "selected" : "";
            htmlPais += `<option value="${pais}" ${selected}>&nbsp;&nbsp;&nbsp;${pais}</option>`;
        }
    }
    htmlPais += `</select>`;
    document.getElementById("container-country").innerHTML = htmlPais;

    document.getElementById("container-city").innerHTML = `<select id="edit-city" class="edit-select-field"><option value="">---</option></select>`;
    
    const selectPais = document.getElementById("edit-country");
    const selectCiudad = document.getElementById("edit-city");

    const actualizarSelectorCiudades = (paisSeleccionado, ciudadActual) => {
        selectCiudad.innerHTML = `<option value="">---</option>`;
        if (!paisSeleccionado) return;
        
        for (const continente in basePaisesCiudades) {
            if (basePaisesCiudades[continente][paisSeleccionado]) {
                basePaisesCiudades[continente][paisSeleccionado].forEach(ciudad => {
                    const selected = ciudadActual === ciudad ? "selected" : "";
                    selectCiudad.innerHTML += `<option value="${ciudad}" ${selected}>${ciudad}</option>`;
                });
            }
        }
    };

    selectPais.addEventListener("change", (e) => {
        actualizarSelectorCiudades(e.target.value, "");
    });
    actualizarSelectorCiudades(datosUsuarioMemoria.pais, datosUsuarioMemoria.Ciudad);

    document.getElementById("container-birthdate").innerHTML = `<input type="text" id="edit-birthdate" class="edit-input-field" placeholder="dd-mm-aaaa" maxlength="10" value="${datosUsuarioMemoria.fechanacimiento || ''}">`;
    
    const inputFecha = document.getElementById("edit-birthdate");
    inputFecha.addEventListener("input", (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 2 && val.length <= 4) {
            val = val.slice(0, 2) + "-" + val.slice(2);
        } else if (val.length > 4) {
            val = val.slice(0, 2) + "-" + val.slice(2, 4) + "-" + val.slice(4, 8);
        }
        e.target.value = val;
    });

    // CORRECCIÓN: El desplegable de sexo traduce sus etiquetas dinámicamente usando las claves correspondientes
    const opcionesSexo = ["Hombre", "Mujer", "Otro", "Prefiero no decirlo"];
    let htmlSexo = `<select id="edit-gender" class="edit-select-field">`;
    opcionesSexo.forEach(opc => {
        const selected = (rawSexoFirebase && rawSexoFirebase.toLowerCase() === opc.toLowerCase()) ? "selected" : "";
        let trad = opc;
        if (opc === "Hombre" && diccionario["sexo_hombre"]) trad = diccionario["sexo_hombre"][currentLanguage];
        if (opc === "Mujer" && diccionario["sexo_mujer"]) trad = diccionario["sexo_mujer"][currentLanguage];
        if (opc === "Otro" && diccionario["sexo_otro"]) trad = diccionario["sexo_otro"][currentLanguage];
        if (opc === "Prefiero no decirlo" && diccionario["sexo_no_decir"]) trad = diccionario["sexo_no_decir"][currentLanguage];
        htmlSexo += `<option value="${opc}" ${selected}>${trad}</option>`;
    });
    htmlSexo += `</select>`;
    document.getElementById("container-gender").innerHTML = htmlSexo;

    let htmlExt = `<select id="edit-extension" class="edit-select-field">`;
    for (const ext in longitudesExtensiones) {
        const selected = datosUsuarioMemoria.extension === ext ? "selected" : "";
        htmlExt += `<option value="${ext}" ${selected}>${ext}</option>`;
    }
    htmlExt += `</select>`;
    document.getElementById("container-extension").innerHTML = htmlExt;

    document.getElementById("container-phone").innerHTML = `<input type="text" id="edit-phone" class="edit-input-field" value="${datosUsuarioMemoria.nTelefono || ''}">`;
    document.getElementById("container-email").innerHTML = `<input type="email" id="edit-email" class="edit-input-field" value="${datosUsuarioMemoria.email || ''}">`;
}

document.addEventListener("DOMContentLoaded", async () => {
    currentLanguage = localStorage.getItem("idioma") || "es";

    try {
        const respuesta = await fetch('idiomas.json');
        diccionario = await respuesta.json();
    } catch (error) {
        console.error("Error cargando idiomas.json en Perfil:", error);
    }

    document.getElementById("popup-btn-confirm").addEventListener("click", () => {
        const inp = document.getElementById("popup-secure-input");
        cerrarPopupPerfil({ clickConfirmar: true, valorInput: inp.value });
    });

    document.getElementById("popup-btn-cancel").addEventListener("click", () => {
        cerrarPopupPerfil({ clickConfirmar: false, valorInput: "" });
    });

    const selectorIdioma = document.getElementById("idioma-selector");
    if (selectorIdioma) {
        selectorIdioma.value = currentLanguage;
        selectorIdioma.addEventListener("change", (e) => {
            currentLanguage = e.target.value;
            localStorage.removeItem("idioma");
            localStorage.setItem("idioma", currentLanguage);
            aplicarTraduccionesEstaticas(currentLanguage);
        });
    }

    const txtNombre = document.getElementById("user-display-name");
    const imgAvatar = document.getElementById("user-avatar");
    const txtNovas = document.getElementById("user-novas");
    const valSubs = document.getElementById("subs-display-value");
    const avatarInput = document.getElementById("avatar-input");
    const nombreUsuarioLogueado = localStorage.getItem("user");

    if (!nombreUsuarioLogueado) {
        window.location.href = "index.html";
        return;
    }

    const btnEditToggle = document.getElementById("btn-edit-toggle");
    if (btnEditToggle) {
        btnEditToggle.addEventListener("click", async () => {
            if (!modoEdicionActivo) {
                // CORRECCIÓN: Solo se solicita contraseña de autorización si es ESTRICTAMENTE menor de 18 años (< 18)
                if (edadUsuarioGlobal < 18) {
                    const resPopup = await abrirPopupPerfil({ textoKey: "prompt_ingresar_pass", mostrarInput: true, mostrarBotonCancelar: true });
                    if (!resPopup.clickConfirmar || !resPopup.valorInput) return;

                    const hashIntento = await generarHashSHA256(resPopup.valorInput);
                    if (hashIntento !== contrasenaAutorizacionFirebase) {
                        await abrirPopupPerfil({ textoKey: "error_pass_incorrecta", mostrarInput: false, mostrarBotonCancelar: false });
                        return;
                    }
                }
                
                modoEdicionActivo = true;
                actualizarTextoBotonEdicion(currentLanguage);
                renderizarFormularioEdicion();
            } else {
                const nuevoNombre = document.getElementById("edit-fullname").value.trim();
                const nuevoPais = document.getElementById("edit-country").value;
                const nuevaCiudad = document.getElementById("edit-city").value;
                const nuevaFecha = document.getElementById("edit-birthdate").value.trim();
                const nuevoSexo = document.getElementById("edit-gender").value;
                const nuevaExt = document.getElementById("edit-extension").value;
                const nuevoTlf = document.getElementById("edit-phone").value.trim();
                const nuevoEmail = document.getElementById("edit-email").value.trim();

                if (!nuevoNombre || !nuevoPais || !nuevaCiudad || !nuevaFecha || !nuevoTlf || !nuevoEmail) {
                    await abrirPopupPerfil({ textoKey: "error_campos_vacios", mostrarInput: false, mostrarBotonCancelar: false });
                    return;
                }

                if (nuevaFecha.length !== 10) {
                    await abrirPopupPerfil({ textoKey: "error_campos_vacios", mostrarInput: false, mostrarBotonCancelar: false });
                    return;
                }

                const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!regexEmail.test(nuevoEmail)) {
                    await abrirPopupPerfil({ textoKey: "error_email", mostrarInput: false, mostrarBotonCancelar: false });
                    return;
                }

                const longitudRequerida = longitudesExtensiones[nuevaExt];
                const soloNumeros = nuevoTlf.replace(/\s+/g, ""); 
                if (isNaN(soloNumeros) || soloNumeros.length !== longitudRequerida) {
                    await abrirPopupPerfil({ textoKey: "error_telefono", mostrarInput: false, mostrarBotonCancelar: false });
                    return;
                }

                const nuevaEdadCalculada = calcularEdadCompleta(nuevaFecha);
                let objetoUpdateFirebase = {
                    Nombrecompleto: nuevoNombre,
                    pais: nuevoPais,
                    Ciudad: nuevaCiudad,
                    fechanacimiento: nuevaFecha,
                    sexo: nuevoSexo,
                    extension: nuevaExt,
                    nTelefono: soloNumeros, 
                    email: nuevoEmail,
                    Edad: nuevaEdadCalculada
                };

                if (edadUsuarioGlobal >= 18 && nuevaEdadCalculada < 18) {
                    let nuevaContrasenaAuth = "";
                    let exitoCreacion = false;
                    
                    while (!exitoCreacion) {
                        const resCrear = await abrirPopupPerfil({ textoKey: "prompt_crear_pass", mostrarInput: true, mostrarBotonCancelar: true });
                        if (!resCrear.clickConfirmar || !resCrear.valorInput) {
                            await abrirPopupPerfil({ textoKey: "error_pass_obligatoria", mostrarInput: false, mostrarBotonCancelar: false });
                            return; 
                        }
                        nuevaContrasenaAuth = resCrear.valorInput.trim();
                        if (nuevaContrasenaAuth.length > 0) exitoCreacion = true;
                    }
                    
                    const hashNuevaAuth = await generarHashSHA256(nuevaContrasenaAuth);
                    objetoUpdateFirebase.contraseñaautorizacion = hashNuevaAuth;
                } 
                else if (edadUsuarioGlobal < 18 && nuevaEdadCalculada >= 18) {
                    objetoUpdateFirebase.contraseñaautorizacion = deleteField();
                }

                try {
                    const userRef = doc(db, "Usuarios", userDocIdGlobal);
                    await updateDoc(userRef, objetoUpdateFirebase);
                    
                    // CORRECCIÓN: Cierre completo e inmediato del formulario regresando a vista lectura en pantalla
                    modoEdicionActivo = false;
                    actualizarTextoBotonEdicion(currentLanguage);
                    renderizarVistaLectura();
                } catch (error) {
                    console.error("Error al guardar perfil:", error);
                }
            }
        });
    }

    const boxPassNormal = document.getElementById("box-pass-normal");
    if (boxPassNormal) {
        boxPassNormal.addEventListener("click", () => {
            window.location.href = "cambiarcontrasena.html";
        });
    }

    const boxPassAuth = document.getElementById("box-pass-auth");
    if (boxPassAuth) {
        boxPassAuth.addEventListener("click", () => {
            window.location.href = "autorizacion.html";
        });
    }

    if (imgAvatar && avatarInput) {
        imgAvatar.addEventListener("click", () => {
            avatarInput.click();
        });
        avatarInput.addEventListener("change", (e) => {
            const archivo = e.target.files[0];
            if (archivo && userDocIdGlobal) {
                const lector = new FileReader();
                lector.onloadend = async () => {
                    const base64String = lector.result;
                    try {
                        const userRef = doc(db, "Usuarios", userDocIdGlobal);
                        await updateDoc(userRef, { imgperfil: base64String });
                    } catch (err) {
                        console.error("Error al guardar la imagen en Base64:", err);
                    }
                };
                lector.readAsDataURL(archivo);
            }
        });
    }

    const filaNovas = document.getElementById("fila-novas");
    if (filaNovas) {
        filaNovas.addEventListener("click", () => {
            window.location.href = "NovaPoints.html";
        });
    }

    const usuariosRef = collection(db, "Usuarios");
    const qUsuario = query(usuariosRef, where("usuario", "==", nombreUsuarioLogueado));

    onSnapshot(qUsuario, async (querySnapshot) => {
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            userDocIdGlobal = userDoc.id;
            const userData = userDoc.data();

            datosUsuarioMemoria = userData;
            contrasenaAutorizacionFirebase = userData.contraseñaautorizacion || "";

            if (txtNombre) txtNombre.textContent = userData.usuario || nombreUsuarioLogueado;
            if (imgAvatar) imgAvatar.src = userData.imgperfil || "default-profile.png";
            if (txtNovas) txtNovas.textContent = userData.NovaPoints !== undefined ? userData.NovaPoints : 0;

            rawSexoFirebase = userData.sexo || "";

            if (!modoEdicionActivo) {
                renderizarVistaLectura();
            }

            // CORRECCIÓN: Cálculo de Edad e instantáneo en Firestore al ingresar a la página
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
                        if (valSubs) valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
                        const userRef = doc(db, "Usuarios", userDocIdGlobal);
                        await updateDoc(userRef, { subs: deleteField() });
                    } else {
                        if (userData.subs.diasrestantes === undefined || userData.subs.diasrestantes !== diasCalculados) {
                            const userRef = doc(db, "Usuarios", userDocIdGlobal);
                            await updateDoc(userRef, { "subs.diasrestantes": diasCalculados });
                        }
                        if (valSubs) valSubs.textContent = `${subsUsuarioGlobal} (${diasCalculados}d)`;
                    }
                } else {
                    const dias = userData.subs.diasrestantes !== undefined ? userData.subs.diasrestantes : 0;
                    if (valSubs) valSubs.textContent = `${subsUsuarioGlobal} (${dias}d)`;
                }
            } else {
                subsUsuarioGlobal = "";
                if (valSubs) valSubs.textContent = diccionario["text_ninguna"] ? diccionario["text_ninguna"][currentLanguage] : "Ninguna";
            }
        }
    }, (error) => {
        console.error("Error en snapshot:", error);
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
                    console.error("Error al desconectar:", err);
                }
            }
            localStorage.clear();
            window.location.href = "index.html";
        });
    }

    aplicarTraduccionesEstaticas(currentLanguage);
});