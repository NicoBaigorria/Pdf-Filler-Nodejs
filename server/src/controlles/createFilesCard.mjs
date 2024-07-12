import fs from "fs";
import {
    getTicket,
    createFolder,
    createFile,
    deleteFolder,
    updateProperty,
} from "../services/hubspot.mjs";
import 'dotenv/config';

const accessToken = process.env.HUBSPOT_API_KEY;

const checkFiles = async (folder, programas, hs_object, aplicantes) => {
    const urlFolder = `https://api.hubapi.com/files/v3/folders/PDF-Gobierno_de_Canada/PDF-API/${hs_object}`;
    const urlFiles = `https://api.hubapi.com/files/v3/files/search?parentFolderId=`;

    const date = DateNow()

    console.log("dfghfdhdhgfhgf", urlFolder)


    const headers = new Headers({
        "Authorization": `Bearer ${accessToken}`,
    });

    const response = await fetch(urlFolder, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();

    // console.log("carpetas hubspot", responseData)

    //console.log(planesLista)

    let aplicantesList = aplicantes.split(";");

    // Recorro la lista de aplicantes de la consulta

    const listaPdfs = {};

    try {
        const resultados = await Promise.all(aplicantesList.map(async aplicante => {
            try {
                const responseAplicanteFolder = await fetch(urlFolder + "/" + aplicante, {
                    method: "GET",
                    headers: headers,
                });
                if (!responseAplicanteFolder.ok) {
                    throw new Error(`Folder for aplicante ${aplicante} not found!`);
                } else {
                    console.log("Consulta exitosa " + urlFolder + "/" + aplicante)
                }

                const responseAplicanteFolderData = await responseAplicanteFolder.json();

                const parentFolderId = responseAplicanteFolderData.id;

                console.log("consultando " + urlFiles + parentFolderId)

                const filesAplicante = await fetch(urlFiles + parentFolderId, {
                    method: "GET",
                    headers: headers,
                });

                if (!filesAplicante.ok)
                    throw new Error(`Error fetching files for aplicante ${aplicante}`);

                const filesAplicanteData = await filesAplicante.json();

                console.log(filesAplicanteData)

                const resultadoData = filesAplicanteData.results;

                return resultadoData.map(file => file.name);

            } catch (e) {
                console.log("Error processing aplicante:", aplicante, e);
                return []; // Return an empty array in case of error
            }
        }));

        resultados.forEach((result, index) => {
            listaPdfs[aplicantesList[index]] = result;
        });

        //console.log("fghjghjg", listaPdfs);

        programas = programas.replace("+", " ")

        let programasRequeridos = programas.split(";");

        //console.log(programasRequqeridos)

        const planesListaPath = "./src/Jsons/planesForm.json";

        const planesLista = await JSON.parse(fs.readFileSync(planesListaPath));

        //RECORRO LISTA DE PROGRAMAS SOLICITADOS

        let result = {};

        //POR CADA PROGRAMA REQUERIDO REVISAR PlanesLista Y REVISAR SI EL FORMULARIO SE ENCUENTRA EN CADA APLICANTES CONTENIDO Y USAR ESE VALOR PARA NAVEGAR POR
        // listaPdfs y si coinciden agregar a result con propiedad como el nombre de del formulario y un true de valor sino un false 

        programasRequeridos.map(programa => {
            for (let form in planesLista[programa]) {
                try {
                    console.log("check parametros", programa, form)
                    console.log("check", planesLista[programa][form].aplicantes)
                    planesLista[programa][form].aplicantes.map(aplicante => {
                        if (listaPdfs[aplicante]) {
                            if (!result[aplicante]) result[aplicante] = {}
                            listaPdfs[aplicante].includes(form)
                                ? result[aplicante][form] = true
                                : result[aplicante][form] = false
                        }
                    })

                } catch (e) {
                    console.log(e)
                }
            }
        })

        console.log("resultresultresult", result)


        const cardFilesList = [];

        for (let aplicante in result) {
            const properties = []
            for (let file in result[aplicante]) {
                const property = {
                    "label": file,
                    "dataType": "STATUS",
                    "value": result[aplicante][file] ? "completado" : "No hay propiedades",
                    "optionType": result[aplicante][file] ? "SUCCESS" : "DANGER"
                }

                properties.push(property)
            }

            cardFilesList.push(
                {
                    objectId: 245,
                    title: aplicante,
                    created: date,
                    priority: "HIGH",
                    project: "API",
                    reported_by: "PDF-Api",
                    description: "Estado archivo",
                    reporter_type: "Account Manager",
                    status: "In Progress",
                    ticket_type: "Bug",
                    updated: date,
                    properties: properties,
                },
            )
        }

        console.log("cardFilesList", cardFilesList)

        return cardFilesList

    } catch (error) {
        console.error("Error:", error);
    }

};

const createFillFolder = async (folder, subCarpeta, file) => {
    const path = folder + "/" + subCarpeta;
    const inputsFilesPath = "./src/InputFiles/";

    if (fs.existsSync(path)) {
        if (!fs.existsSync(path + "/" + file + ".pdf")) {
            try {
                const dataPdf = await fs.readFileSync(inputsFilesPath + file + ".pdf");
                await fs.writeFileSync(path + "/" + file + ".pdf", dataPdf);
                console.log("File copied successfully!");
            } catch (err) {
                console.error("Error:", err);
            }
        }
    } else {
        await fs.mkdir(path, { recursive: true }, async () => {
            console.log("asdsadsagfdhgfgh");
            try {
                const dataPdf = await fs.readFileSync(inputsFilesPath + file + ".pdf");
                await fs.writeFileSync(path + "/" + file + ".pdf", dataPdf);
                console.log("File copied successfully!");
            } catch (err) {
                console.error("Error:", err);
            }
        });
    }
};

const subirPdfs = async (hs_object, folderID, programas, aplicantes) => {

    const date = DateNow();

    try {
        const idTicket = folderID;
        const folder = "./src/OutputFiles/Pdf/" + idTicket;

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        const listaProgramas = await JSON.parse(
            fs.readFileSync("./src/Jsons/planesForm.json", "utf8")
        );

        const processingPromises = [];

        programas = programas.replace("+", " ")

        let programasRequeridos = programas.split(";");
        // let aplicantesList = aplicantes.split(";");

        await Promise.all(programasRequeridos.map(async (programa) => {
            for (let pdf in listaProgramas[programa]) {
                try {
                    await Promise.all(listaProgramas[programa][pdf].aplicantes.map(async (aplicante) => {
                        processingPromises.push(await createFillFolder(folder, aplicante, pdf));
                    }));
                } catch (e) {
                    console.log("error al agregar folder : ", e)
                }
            }
        }));

        await Promise.all(processingPromises);

        // await deleteFolder(folderID);
        let folderId = folderID;

        if (!folderID) {
            folderId = await createFolder(hs_object);
        }

        const jsonPropsTicket = {
            id_folder: folderId,
        };

        await updateProperty(hs_object, jsonPropsTicket);

        const foldersAplicantes = await fs.promises.readdir(folder);

        let uploadPromises = [];

        let filesUploaded = {};

        let HubspotFolders = {};

        await Promise.all(foldersAplicantes.map(async (folderAplicante) => {
            const idFolderAplicante = await createFolder(folderAplicante, folderId);
            HubspotFolders[folderAplicante] = idFolderAplicante
        }));

        console.log("HubspotFolders", HubspotFolders)

        async function processFolder(folder, folderAplicante, file, idFolderAplicante) {
            console.log("cvbcvnxcbcx", `${folder}/${folderAplicante}`, file, idFolderAplicante);
            try {
                await createFile(`${folder}/${folderAplicante}`, file, idFolderAplicante);
                if (!filesUploaded[folderAplicante]) {
                    filesUploaded[folderAplicante] = [];
                }
                filesUploaded[folderAplicante].push(file);
            } catch (error) {
                console.error("An error occurred while creating file:", error);
            }
        }
        
        await Promise.all(foldersAplicantes.map(async (folderAplicante) => {
            const folders = await fs.promises.readdir(`${folder}/${folderAplicante}`);
            await Promise.all(folders.map(async (file) => {
                if (HubspotFolders[folderAplicante]) {
                    const idFolderAplicante = HubspotFolders[folderAplicante];
                    if (folderAplicante == "TODOS") {
                        Object.keys(HubspotFolders).forEach((aplicante) => {
                            if (aplicante !== "TODOS") {
                                uploadPromises.push(processFolder(folder, folderAplicante, file, HubspotFolders[aplicante]));
                            }
                        });
                    }else if (folderAplicante == "PRINCIPAL (si tiene una pareja en common-law)" && aplicantes.includes("PAREJA")) {
                        uploadPromises.push(processFolder(folder, folderAplicante, file, HubspotFolders[aplicante]));
                    } else {
                        uploadPromises.push(processFolder(folder, folderAplicante, file, idFolderAplicante));
                    }
                }
            }));
        }));
        

        await Promise.all(uploadPromises);

        console.log("filesUploaded",filesUploaded)

        const cardFilesList = [];

        for (let aplicante in filesUploaded) {
            const properties = []
            for (let file in filesUploaded[aplicante]) {
                const property = {
                    "label": file,
                    "dataType": "STATUS",
                    "value": filesUploaded[aplicante][file] ? "completado" : "No hay propiedades",
                    "optionType": filesUploaded[aplicante][file] ? "SUCCESS" : "DANGER"
                }

                properties.push(property)
            }

            cardFilesList.push(
                {
                    objectId: 245,
                    title: aplicante,
                    created: date,
                    priority: "HIGH",
                    project: "API",
                    reported_by: "PDF-Api",
                    description: "Estado archivo",
                    reporter_type: "Account Manager",
                    status: "In Progress",
                    ticket_type: "Bug",
                    updated: date,
                    properties: properties,
                },
            )
        }


        console.log("filesUploaded", filesUploaded)

        console.log("cardFilesList", JSON.stringify(cardFilesList));

        return cardFilesList;

    } catch (e) {
        console.log(e);
    }
};


const DateNow = ()=>{
    // Get the current date
const today = new Date();

// Extract the year, month, and day
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');

// Format the date as YYYY-MM-DD
const formattedDate = `${year}-${month}-${day}`;

return(formattedDate);

}

const createLinkPdfs = async (hs_object, folder, programas, aplicantes) => {
    const url = `https://app.hubspot.com/files/21669225/?folderId=${folder}`;

    await subirPdfs(hs_object, folder, programas, aplicantes)

    const result = await checkFiles(folder, programas, hs_object, aplicantes)

    const date = DateNow();

    const bodyCard = {
        results: [
            {
                objectId: 245,
                title: "Link a carpeta en Hubspot",
                link: url,
                created: date,
                priority: "HIGH",
                project: "API",
                reported_by: "Pdf Api",
                description: "Link a carpeta en Hubspot",
                reporter_type: "Account Manager",
                status: "In Progress",
                ticket_type: "Bug",
                updated: date,
            },
            ...result,
        ],
    };

    console.log(bodyCard);

    return bodyCard;

};

const createFilesCard = async (req, res) => {
    const programas = req.query.proceso_migratorio
        ? req.query.proceso_migratorio
        : null;
    const aplicantes = req.query.aplicantes_relacionados
        ? req.query.aplicantes_relacionados
        : null;
    const hs_object = req.query.hs_object_id ? req.query.hs_object_id : null;
    const folderId = await createFolder(hs_object);

    console.log("folderIdfolderId", folderId)

    if (folderId && programas) {
        const result = await createLinkPdfs(
            hs_object,
            folderId,
            programas,
            aplicantes
        );

        res.status(200);
        res.send(JSON.stringify(result));
    } else {
        const result = {
            results: [
                {
                    objectId: 245,
                    title: "Faltan Parametros",
                    created: "2016-09-15",
                    priority: "HIGH",
                    project: "API",
                    reported_by: "msmith@hubspot.com",
                    description: "Faltan Parametros",
                    reporter_type: "Account Manager",
                    status: "In Progress",
                    ticket_type: "Bug",
                    updated: "2016-09-28",
                },
            ],
        };

        res.status(200);
        res.send(result);
    }
};

export default createFilesCard;
