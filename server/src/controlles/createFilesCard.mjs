import fs from "fs";
import {
    getTicket,
    createFolder,
    createFile,
    deleteFolder,
    updateProperty,
} from "../services/hubspot.mjs";


const checkFiles = async (folder, programas, hs_object, aplicantes) => {
    const urlFiles = `https://api.hubapi.com/files/v3/files/search?parentFolderId=`;
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
                }
    
                const responseAplicanteFolderData = await responseAplicanteFolder.json();
                const parentFolderId = responseAplicanteFolderData.id;
    
                const filesAplicante = await fetch(urlFiles + parentFolderId, {
                    method: "GET",
                    headers: headers,
                });
    
                if (!filesAplicante.ok) {
                    throw new Error(`Error fetching files for aplicante ${aplicante}`);
                }
    
                const filesAplicanteData = await filesAplicante.json();
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

        
    
    let programasRequeridos = programas.split(";");

    //console.log(programasRequqeridos)

    const planesListaPath = "./src/Jsons/planesForm.json";

    const planesLista = await JSON.parse(fs.readFileSync(planesListaPath));

    //RECORRO LISTA DE PROGRAMAS SOLICITADOS

    let result = {};

    //POR CADA PROGRAMA REQUERIDO REVISAR PlanesLista Y REVISAR SI EL FORMULARIO SE ENCUENTRA EN CADA APLICANTES CONTENIDO Y USAR ESE VALOR PARA NAVEGAR POR
    // listaPdfs y si coinciden agregar a result con propiedad como el nombre de del formulario y un true de valor sino un false 

    programasRequeridos.map(programa => {
       for( let form in planesLista[programa]){
        //console.log("check",planesLista[programa][form].aplicantes)
        planesLista[programa][form].aplicantes.map( aplicante =>{
            if(listaPdfs[aplicante]){
                if(!result[aplicante]) result[aplicante] = {}
                listaPdfs[aplicante].includes(form)
                    ? result[aplicante][form]= true 
                    : result[aplicante][form]= false
            }
        })
       }
    })

    //console.log("resultresultresult",result)


    const cardFilesList = [];

        for (let aplicante in result) {
            const properties = []
            for (let file in result[aplicante]) {
                const property = {
                    "label": result[aplicante][file],
                    "dataType": "STATUS",
                    "value": result[aplicante][file] ? "completado" : "No hay propiedades",
                    "optionType": result[aplicante][file] ? "SUCCESS" : "DANGER"
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

        console.log("cardFilesList",cardFilesList)

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
       // let aplicantesList = aplicantes.split(";");

        await Promise.all(programasRequeridos.map(async (programa) => {
            for (let pdf in listaProgramas[programa]) {
                await Promise.all(listaProgramas[programa][pdf].aplicantes.map(async (aplicante) => {
                    processingPromises.push(await createFillFolder(folder, aplicante, pdf));
                }));
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

    //const cardFilesList = await subirPdfs(hs_object, folder, programas, aplicantes);

    
    const result = await checkFiles(folder, programas, hs_object, aplicantes)


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
                propertyGroups: result,
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
