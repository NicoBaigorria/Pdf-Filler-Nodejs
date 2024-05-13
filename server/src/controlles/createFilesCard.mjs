import fs from "fs";
import {
    getTicket,
    createFolder,
    createFile,
    deleteFolder,
    updateProperty,
} from "../services/hubspot.mjs";


const checkFiles = async (folder, programas, hs_object, aplicantes) => {
    const urlFolder = `https://api.hubapi.com/files/v3/folders/PDF-Gobierno_de_Canada/PDF-API/${hs_object}`;

    console.log("dfghfdhdhgfhgf", urlFolder)

    const accessToken = "pat-na1-31886066-9adb-4992-930a-91cd28f192ff";

    const headers = new Headers({
        Authorization: `Bearer ${accessToken}`,
    });

    const response = await fetch(urlFolder, {
        method: "GET",
        headers: headers,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();

    console.log("carpetas hubspot", responseData)

    let aplicantesList = aplicantes.split(";");

    await aplicantesList.map(async aplicante => {

        await fetch(urlFolder+"/"+aplicante, {
            method: "GET",
            headers: headers,
        }).then(async response =>{

            const responseAplicanteFolder = await response.json()

            const parentFolderId = responseAplicanteFolder.id

            const filesAplicante = await fetch(urlFolder+parentFolderId, {
                method: "GET",
                headers: headers,
            })

            console.log("vbnvbnbvn", filesAplicante)

        }).catch(e => console.log("carpeta de aplicante " + aplicante + " no encontrado" , e));

    })

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
                try{
                await Promise.all(listaProgramas[programa][pdf].aplicantes.map(async (aplicante) => {
                    processingPromises.push(await createFillFolder(folder, aplicante, pdf));
                }));
                } catch (e){
                    console.log("error al agregar folder : ",e)
                }
            }
        }));

        await Promise.all(processingPromises);

       // await deleteFolder(folderID);
       let folderId = folderID;
       
        if(!folderID){
           folderId = await createFolder(hs_object);
        }

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

    const bodyCardResult = await subirPdfs(hs_object, folder, programas, aplicantes).then(async (cardFilesList)=>{

        await checkFiles(folder, programas, hs_object, aplicantes)


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

    }) 

    return bodyCardResult;

};

const createFilesCard = async (req, res) => {
    const programas = req.query.proceso_migratorio
        ? req.query.proceso_migratorio
        : null;
    const aplicantes = req.query.aplicantes_relacionados
        ? req.query.aplicantes_relacionados
        : null;
    const hs_object = req.query.hs_object_id ? req.query.hs_object_id : null;
    const folderId = req.query.id_folder ? req.query.id_folder : await createFolder(hs_object);

    console.log(folderId)

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
