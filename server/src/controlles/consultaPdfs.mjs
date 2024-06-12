import fs from "fs";
import { getTicket } from "../services/hubspot.mjs";

const consultaPdfs = async (req, res) => {
  try {
    const ticketId = req.query.ticketId;

    console.log(ticketId);

    const ticketInfo = await getTicket(ticketId);

    const idFolder = ticketInfo.properties.id_folder;

    const aplicantes = ticketInfo.properties.aplicantes_relacionados;

    let aplicantesList = aplicantes.split(";");

    let programas = ticketInfo.properties.proceso_migratorio;

    programas = programas.replace("+", " ");

    let programasRequeridos = programas.split(";");

    const planesListaPath = "./src/Jsons/planesForm.json";

    const planesLista = await JSON.parse(fs.readFileSync(planesListaPath));

    //RECORRO LISTA DE PROGRAMAS SOLICITADOS

    let result = {};

    //POR CADA PROGRAMA REQUERIDO REVISAR PlanesLista Y REVISAR SI EL FORMULARIO SE ENCUENTRA EN CADA APLICANTES CONTENIDO Y USAR ESE VALOR PARA NAVEGAR POR
    // listaPdfs y si coinciden agregar a result con propiedad como el nombre de del formulario y un true de valor sino un false

    aplicantesList.map(aplicante => result[aplicante] = [])

    programasRequeridos.map((programa) => {
      for (let form in planesLista[programa]) {
        try {
          console.log("check parametros", programa, form);
          console.log("check", planesLista[programa][form]["aplicantes"]);
          planesLista[programa][form]["aplicantes"].map((aplicante) => {
            console.log("sdgsdfgsd", aplicante)
            if( aplicante == "TODOS"){
                for(let item in result){ 
                    result[item].push(form)
                }
            } else {
                if(result[aplicante]) result[aplicante].push(form)
            }
          });
        } catch (e) {
          console.log(e);
        }
      }
    });

    console.log("programas requeridos",result)

    const dataToSend = {
        "ticketInfo": ticketInfo,
        "formulariosRequeridos": result
    }

    res.status(200).send(JSON.stringify(dataToSend));
  } catch (e) {
    console.log(e);
    res.status(400).send("error");
  }
};

export default consultaPdfs;
