import fs from "fs";
import {
    getTicket,
    createFolder,
    createFile,
    deleteFolder,
    updateProperty,
} from "../services/hubspot.mjs";

/*
const checkFiles = async (folder, programas) => {
    const url = `https://api.hubapi.com/files/v3/files/search?parentFolderId=${folder}`;

    const accessToken = "pat-na1-31886066-9adb-4992-930a-91cd28f192ff";

    const headers = new Headers({
        Authorization: `Bearer ${accessToken}`,
    });

    const response = await fetch(url, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();

    console.log("carpetas hubspot", responseData)

    let programasRequeridos = programas.split(";");

    //console.log(programasRequqeridos)

    const planesListaPath = "./src/Jsons/planesForm.json";

    const planesLista = await JSON.parse(fs.readFileSync(planesListaPath));

    //console.log(planesLista)

    const listaPdfs = [];

    responseData.results.map((file) => listaPdfs.push(file.name));

    //console.log(listaPdfs)

    let pdfsPendientes = {};

    programasRequeridos.map((programa) => {
        pdfsPendientes[programa] = {};

        console.log("gfdg", planesLista[programa], programa);
        if (planesLista[programa]) {
            const pdfs = planesLista[programa];
            for (const pdf in pdfs) {
                listaPdfs.includes(pdf)
                    ? (pdfsPendientes[programa][pdf] = true)
                    : (pdfsPendientes[programa][pdf] = false);
            }
        }
    });

    //console.log(pdfsPendientes)

    return pdfsPendientes;
};
*/

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

        let programasRequeridos = programas.split(";");
        let aplicantesList = aplicantes.split(";");

        await Promise.all(programasRequeridos.map(async (programa) => {
            for (let pdf in listaProgramas[programa]) {
                await Promise.all(listaProgramas[programa][pdf].aplicantes.map(async (aplicante) => {
                    processingPromises.push(await createFillFolder(folder, aplicante, pdf));
                }));
            }
        }));

        await Promise.all(processingPromises);

        await deleteFolder(folderID);

        const folderId = await createFolder(hs_object);

        const jsonPropsTicket = {
            id_folder: folderId,
        };

        await updateProperty(hs_object, jsonPropsTicket);

        const foldersAplicantes = await fs.promises.readdir(folder);

        let uploadPromises = [];

        let filesUploaded = {};


        await Promise.all(foldersAplicantes.map(async (folderAplicante) => {
            const folders = await fs.promises.readdir(folder + "/" + folderAplicante);
            await Promise.all(folders.map(async (file) => {
                const idFolderAplicante = await createFolder(folderAplicante, folderId);
                uploadPromises.push(createFile(folder + "/" + folderAplicante, file, idFolderAplicante)
                    .then(() => {
                        if (!filesUploaded[folderAplicante]) {
                            filesUploaded[folderAplicante] = [];
                        }
                        filesUploaded[folderAplicante].push(file);
                    })
                    .catch(error => {
                        console.error("An error occurred while creating file:", error);
                    }));
            }));
        }));

        await Promise.all(uploadPromises);

        const cardFilesList = [];

        for (let aplicante in filesUploaded) {
            const properties = []
            for (let file in filesUploaded[aplicante]) {
                const property = {
                    "label": filesUploaded[aplicante][file],
                    "dataType": "STATUS",
                    "value": filesUploaded[aplicante][file] ? "completado" : "No hay propiedades",
                    "optionType": filesUploaded[aplicante][file] ? "SUCCESS" : "DANGER"
                }

                properties.push(
                    {
                        "name": aplicante,
                        "properties": property
                    })
            }

            cardFilesList.push(
                {
                    "name": aplicante,
                    "properties": properties
                })
        }

        
        console.log("filesUploaded", filesUploaded)

        console.log("cardFilesList", JSON.stringify(cardFilesList));

        return cardFilesList;

    } catch (e) {
        console.log(e);
    }
};


const createLinkPdfs = async (hs_object, folder, programas, aplicantes) => {
    const url = `https://app.hubspot.com/files/21669225/?folderId=${folder}`;

    //const checkList = await checkFiles(folder, programa);

    const cardFilesList = await subirPdfs(hs_object, folder, programas, aplicantes);


    const bodyCard = {
        results: [
            {
                objectId: 245,
                title: "Listado de formularios",
                created: "2016-09-15",
                priority: "HIGH",
                project: "API",
                reported_by: "msmith@hubspot.com",
                description:
                    "Customer reported that the APIs are just running too fast. This is causing a problem in that they're so happy.",
                reporter_type: "Account Manager",
                status: "In Progress",
                ticket_type: "Bug",
                updated: "2016-09-28",
                propertyGroups: cardFilesList,
            },
            {
                objectId: 245,
                title: "Link a carpeta",
                link: url,
                created: "2016-09-15",
                priority: "HIGH",
                project: "API",
                reported_by: "msmith@hubspot.com",
                description:
                    "Customer reported that the APIs are just running too fast. This is causing a problem in that they're so happy.",
                reporter_type: "Account Manager",
                status: "In Progress",
                ticket_type: "Bug",
                updated: "2016-09-28",
            },
        ],
    };

    console.log(bodyCard);

    return bodyCard;
};

const createFilesCard = async (req, res) => {
    const folderId = req.query.id_folder ? req.query.id_folder : null;
    const programas = req.query.programa_formularios
        ? req.query.programa_formularios
        : null;
    const aplicantes = req.query.aplicantes_relacionados
        ? req.query.aplicantes_relacionados
        : null;
    const hs_object = req.query.hs_object_id ? req.query.hs_object_id : null;
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
