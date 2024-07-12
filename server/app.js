const express = require("express");
const fs = require("fs");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const accessToken = process.env.HUBSPOT_API_KEY;

app.use(express.json());

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

const date = DateNow();

const createFile = async (folder, name, folderId) => {
    const fileUrl =  folder + "/" + name;
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${accessToken}`);

    const fileBuffer = await fs.promises.readFile(fileUrl);

    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });

    const formdata = new FormData();
    formdata.append("file", blob, name);
    formdata.append("folderId", folderId);
    formdata.append("options", JSON.stringify({
        "access": "PRIVATE",
        "ttl": "P2W",
        "overwrite": false,
        "duplicateValidationStrategy": "NONE",
        "duplicateValidationScope": "EXACT_FOLDER",
        "overwrite":true
    }));

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: formdata,
        redirect: "follow"
    };

    try {
        const response = await fetch("https://api.hubapi.com/files/v3/files", requestOptions);
        const result = await response.text();
        console.log(result);
    } catch (error) {
        console.error(error);
    }
};

 const deleteFolder = (idFolder) => {

    const myHeaders = new Headers();
    myHeaders.append("authorization", `Bearer ${accessToken}`);

    const requestOptions = {
        method: "DELETE",
        headers: myHeaders,
        redirect: "follow"
    };

    fetch("https://api.hubapi.com/files/v3/folders/"+idFolder, requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((error) => console.error(error));

}

 const updateProperty = async (id, properties) => {
    const url = 'https://api.hubapi.com/crm/v3/objects/tickets/' + id;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };

    const body = JSON.stringify({
        properties: properties
    });

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log(responseData);
        console.log('Propiedades actualizadas//', body);
    } catch (error) {
        console.error(error.message);
    }
}

const createFolder = async (name, idFolder = "145506339115") => {
    const myHeaders = new Headers();
    myHeaders.append("content-type", "application/json");
    myHeaders.append("Authorization", `Bearer ${accessToken}`);

    const raw = JSON.stringify({
        "parentFolderId": idFolder,
        "name": name
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };

    const idNewFolder = await fetch("https://api.hubapi.com/files/v3/folders", requestOptions)
        .then((response) => response.text())
        .then(async (result) => { 
            console.log("cvbcvxbcvb", await JSON.parse(result).id)
            return (await JSON.parse(result).id)
         })
        .catch((error) => console.error(error));

        console.log("ghfjfghfgh", idNewFolder)

    return idNewFolder;
}


const checkFiles = async (folder, programas, hs_object, aplicantes) => {
    const urlFolder = `https://api.hubapi.com/files/v3/folders/PDF-Gobierno_de_Canada/PDF-API/${hs_object}`;
    const urlFiles = `https://api.hubapi.com/files/v3/files/search?parentFolderId=`;

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

        console.log("resultresultresult",result)


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


const createLinkPdfs = async (hs_object, folder, programas, aplicantes) => {
    const url = `https://app.hubspot.com/files/21669225/?folderId=${folder}`;

    console.log("ghjgjghjgh", folder)

       const result = await checkFiles(folder, programas, hs_object, aplicantes)


        const bodyCard = {
            results: [
                {
                    objectId: 245,
                    title: "Link a carpeta",
                    link: url,
                    created: date,
                    priority: "HIGH",
                    project: "API",
                    reported_by: "PDF Api",
                    description: "Estado Archivo",
                    reporter_type: "Account Manager",
                    status: "In Progress",
                    ticket_type: "Bug",
                    updated: date,
                },
                ...result
                
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
    const folderId = req.query.id_folder ? req.query.id_folder : await createFolder(hs_object);

    console.log("bnmbnmbn",folderId)

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
                    created: date,
                    priority: "HIGH",
                    project: "API",
                    reported_by: "PDF Api",
                    description: "Faltan Parametros",
                    reporter_type: "Account Manager",
                    status: "In Progress",
                    ticket_type: "Bug",
                    updated: date,
                },
            ],
        };

        res.status(200);
        res.send(result);
    }
};

app.get('/exampleCard', (req, res) => {
   /* const bodyCard = {
        "results": [{
            "objectId": 245,
            "title": "Form Checklist",
            "created": "2016-09-15",
            "priority": "HIGH",
            "project": "API",
            "reported_by": "msmith@hubspot.com",
            "description": "Please review the status of each form.",
            "reporter_type": "Account Manager",
            "status": "In Progress",
            "ticket_type": "Bug",
            "updated": "2016-09-22",
        }]
    };
    */
    
    const bodyCard = {
   "results":[
      {
         "objectId":245,
         "title":"PRINCIPAL",
         "created": date,
         "priority":"HIGH",
         "project":"API",
         "reported_by":"PDF API",
         "description":"Estado Archivo",
         "reporter_type":"Account Manager",
         "status":"In Progress",
         "ticket_type":"Bug",
         "updated": date,
         "properties":[
            {
               "label":true,
               "dataType":"STATUS",
               "value":"completado",
               "optionType":"SUCCESS"
            }
         ]
      },
      {
         "objectId":245,
         "title":"Link a carpeta",
         "link":"https://app.hubspot.com/files/21669225/?folderId=167248674705",
         "created": date,
         "priority":"HIGH",
         "project":"API",
         "reported_by":"PDF API",
         "description":"Estado Archivo",
         "reporter_type":"Account Manager",
         "status":"In Progress",
         "ticket_type":"Bug",
         "updated": date
      }
   ]
}
    
    res.status(200).send(bodyCard);
});

app.use('/getlink', createFilesCard);



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
                        uploadPromises.push(processFolder(folder, folderAplicante, file, HubspotFolders["PRINCIPAL"]));
                    } else {
                        uploadPromises.push(processFolder(folder, folderAplicante, file, idFolderAplicante));
                    }
                }
            }));
        }));
        

        await Promise.all(uploadPromises);

        console.log("filesUploaded",filesUploaded)
    
        return(filesUploaded)

    } catch (e) {
        console.log(e);
        
        return(e)
    }
};

const updatePdfs = async (req, res) => {
   
   const programas = req.query.proceso_migratorio
        ? req.query.proceso_migratorio
        : null;
    const aplicantes = req.query.aplicantes_relacionados
        ? req.query.aplicantes_relacionados
        : null;
    const hs_object = req.query.hs_object_id ? req.query.hs_object_id : null;
    const folderId = await createFolder(hs_object);
   
   if (folderId && programas && aplicantes) {
   
   try{
        const result = await subirPdfs(hs_object, folderId, programas, aplicantes)
    
        res.status(200).send(result);
   }catch(e){
       res.status(460).send(e);
   }
    
   }else{
        res.status(400).send("FALTAN PARAMETROS");
   }
};

app.use('/updatePdfs', updatePdfs);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
