import fs from 'fs'

const getTicket = async (id) => {
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

        const url = `https://api.hubapi.com/crm/v3/objects/tickets/${id}?${ properties }archived=false`;

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

export default getTicket;
