import fs from 'fs'
import path from 'path';

export const getTicket = async (id) => {
    const accessToken = 'pat-na1-31886066-9adb-4992-930a-91cd28f192ff';

    let properties = "";

    const headers = new Headers({
        'Authorization': `Bearer ${accessToken}`
    });

    try {
        const fileProps = fs.readFileSync("./src/Jsons/ticketProps.json", 'utf8');
        const jsonProps = JSON.parse(fileProps).props;

        console.log(jsonProps);

        jsonProps.forEach(element => {
            properties += "properties=" + element + "&";
        });

        const url = `https://api.hubapi.com/crm/v3/objects/tickets/${id}?${properties}archived=false`;

        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const dataTicket = await response.json();
        console.log(JSON.stringify(dataTicket));

        return dataTicket;
    } catch (error) {
        console.error(error);
    }
};

export const createFolder = async (name) => {
    const myHeaders = new Headers();
    myHeaders.append("content-type", "application/json");
    myHeaders.append("Authorization", "Bearer pat-na1-31886066-9adb-4992-930a-91cd28f192ff");

    const raw = JSON.stringify({
        "parentFolderId": "145506339115",
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
        .then((result) => { return (JSON.parse(result).id) })
        .catch((error) => console.error(error));

    return idNewFolder;
}

export const createFile = async (folder, name, folderId) => {
    const fileUrl = path.join(folder, name);
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer pat-na1-31886066-9adb-4992-930a-91cd28f192ff");

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
        "duplicateValidationScope": "EXACT_FOLDER"
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

export const deleteFolder = (idFolder) => {

    const myHeaders = new Headers();
    myHeaders.append("authorization", "Bearer pat-na1-31886066-9adb-4992-930a-91cd28f192ff");

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

export const updateProperty = async (id, properties) => {
    const url = 'https://api.hubapi.com/crm/v3/objects/tickets/' + id;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer pat-na1-31886066-9adb-4992-930a-91cd28f192ff'
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

