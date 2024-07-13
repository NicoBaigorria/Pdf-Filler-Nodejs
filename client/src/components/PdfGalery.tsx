/*
import React, { useState, useEffect, ChangeEventHandler } from "react";
import { useLocation } from "react-router-dom";
// @ts-ignore
import * as pdfjs from "pdfjs-dist/build/pdf";
import Modal from "./Modal";
import { Buffer } from "buffer";

// Traer lista de Pdf
function importAll(r: __WebpackModuleApi.RequireContext): {
  [key: string]: any;
} {
  const imports: { [key: string]: any } = {};
  r.keys().forEach((key: string) => {
    const fileNameWithoutExtension = key.replace(/^\.\/|\.\w+$/g, "");
    imports[fileNameWithoutExtension] = r(key);
  });
  return imports;
}

const PdfList = (): Object => {
  const filenames = importAll(
    require.context("../pdfInputs", false, /\.(pdf)$/)
  );
  
  //Object.keys(filenames).forEach((key: string) => {
    //console.log(key);
  //});
  

  return filenames;
};

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Defino Interfaces

// Para los campos Xfa
interface InputObj {
  name: string;
  dataId: string;
  ariaLabel: string;
  xfaOn?: string;
  options?: Array<{ label: string; value: string }>;
  textContent?: string;
  value?: string;
  selected?: boolean;
}

// Para los campos AcroForms
interface AcroNode {
  type: string;
  id: string;
  name: string;
  options?: any[];
  value?: string; // Incluye la propiedad `value` aquí
}

// Para los nodos de xfa
interface XfaNode {
  name: string;
  value?: string;
  attributes: {
    dataId: string;
    "aria-label": string;
    xfaOn?: string;
    value?: string;
    textContent?: string;
    selected?: boolean;
  };
  children?: XfaNode[];
}

// Schema para crear json
interface PropsMapItem {
  dataId: string;
  seccion: string;
  hubspotProperty: string;
  value: string;
  type: string;
  options?: any[]; // Adjust the type as per your actual data
}

// Traer data del ticket de Hubspot
const getTicket = async (id: string) => {
  const accessToken = process.env.REACT_APP_HUBSPOT_API_KEY;

  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  });

  try {
    const url = `http://localhost:3100/consultaPdfs?ticketId=${id}`;
    //const url = `${process.env.REACT_APP_URL_DEV}${process.env.REACT_APP_SERVER_PORT}/consultaPdfs?ticketId=${id}`;
    //const url = `${process.env.REACT_APP_URL_PROD}${process.env.REACT_APP_PRODUCTION_PATH}/consultaPdfs?ticketId=${id}`;

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const dataTicket = await response.json();
    console.log("ticket data", JSON.stringify(dataTicket));

    return dataTicket;
  } catch (error) {
    console.error(error);
  }
};

// Función para agregar filas a tabla que enlista los inputs (el changeHandler es necesario para posteriormente almacenar esos datos para inyectarlos en PdfGallery y modificar el json a descargar o el pdf)
function InputObjTableRow({
  input,
  i,
  changeHandler,
}: {
  input: InputObj;
  i: number;
  changeHandler: ChangeEventHandler;
}) {
  const [modal, setModal] = useState(false);

  //console.log("InputObjTableRow", input)

  return (
    <>
      <tr key={input.dataId} id={`row-${input.dataId}`} className={i % 2 === 0 ? undefined : "bg-gray-50"}>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.dataId}
        </td>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.name === "select" ? (
            <select value={input.value}>
              {Array.isArray(input.options)
                ? input.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                : <option value="">No options available</option>}
            </select>
          ) : input.xfaOn ? (
            <input type="checkbox" checked={!!input.value} />
          ) : (
            <input type="text" value={input.value || ''} onChange={changeHandler} />
          )}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">
          {input.xfaOn ? `toggle (${input.xfaOn})` : input.name}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{input.ariaLabel}</td>
        <td className="px-3 py-2 text-sm text-gray-500">
          <input type="text" onChange={changeHandler}></input>
        </td>
      </tr>

      <Modal open={modal} onClose={() => setModal(false)}>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium leading-4 text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          onClick={() =>
            navigator.clipboard.writeText(
              JSON.stringify(input.options, null, 2)
            )
          }
        >
          Copy Output
        </button>

        <code className={"block bg-gray-100 p-2 mt-4"}>
          <pre>{JSON.stringify(input.options, null, 2)}</pre>
        </code>
      </Modal>
    </>
  );
}

// La función principal
function PdfGalery() {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputs, setInputs] = useState<InputObj[]>([]);
  const [formType, setFormType] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [propiedadesTicket, setPropiedadesTicket] = useState<{
    [key: string]: any;
  }>({});
  const [formulariosRequeridos, setFormulariosRequeridos] = useState<{
    [key: string]: [string];
  }>({});
  const [currentPdf, setCurrentPdf] = useState<string | null>(null); // Nuevo estado para el nombre del PDF actual
  const [showDetail, setShowDetail] = useState(false); // Nuevo estado para controlar la vista

  const location = useLocation();

  // Cuando carga se toma el ID del ticket
  useEffect(() => {
    const files = PdfList();
    setLoading(false);

    const queryParams = new URLSearchParams(location.search);

    const ticketIdParam = queryParams.get("ticketId");

    setTicketId(ticketIdParam);

    console.log(ticketIdParam);
  }, [location]);

  // Cuando se cambia el ticketId se trae la información de Hubspot
  useEffect(() => {
    const fetchTicketData = async (Id: string) => {
      try {
        const PdfsData = await getTicket(Id);
        const ticketProperties = PdfsData.ticketInfo.properties;

        console.log("propiedades de ticket", ticketProperties);
        console.log("pdfs requeridos", PdfsData.formulariosRequeridos);

        setPropiedadesTicket(ticketProperties);
        setFormulariosRequeridos(PdfsData.formulariosRequeridos);
        // Do something with ticketProperties
      } catch (error) {
        console.error("Error fetching ticket data:", error);
      }
    };

    if (ticketId) {
      fetchTicketData(ticketId);
    }
  }, [ticketId]);

  //Función para leer Pdf
  async function loadPdf(pdfUrl: string | Uint8Array, filename: string) {
    console.log("pdfUrl", pdfUrl);
    setCurrentPdf(filename); // Actualizar el nombre del PDF actual
    setShowDetail(true); // Mostrar la vista de detalle
    console.log("Procesando PDF:", filename); // Mostrar en consola

    // Ya cargó el Pdf
    setLoading(true);

    try {
      const source = typeof pdfUrl === "string" ? { url: pdfUrl } : { data: pdfUrl };

      const pdfDocument = await pdfjs.getDocument({
        ...source,
        enableXfa: true,
      }).promise;

      // Json a llenar con la info del Pdf y ticket
      let propsMaps: { [key: string]: PropsMapItem } = {};

      // Si es un Xfa
      if (pdfDocument.allXfaHtml) {
        setFormType("xfa");
        const inputsList = getAllInputs(pdfDocument.allXfaHtml);
        setInputs(inputsList);
        setOutput(JSON.stringify(inputsList, null, 2));

        console.log("inputsList", inputsList);

        let hubspotProperty = "";

        inputsList.forEach((input) => {
          const value = propiedadesTicket[input.dataId] || input.value || "";
          propsMaps[input.dataId] = {
            dataId: input.dataId,
            seccion: input.ariaLabel,
            hubspotProperty: hubspotProperty,
            type: input.name,
            value: value,
          };

          if (input.name === "select") {
            propsMaps[input.dataId].options = input.options;
          }
        });

        console.log("propsMaps", propsMaps);

        // Rellenar datos segun json guardado en matchPropsForms en public
        const schemaHubspotProps = await fetch("./matchPropsForms/" + filename + ".json").then(async resp => {
          const schemaProps = await resp.json()
          console.log("schemaHubspotProps", schemaProps)
          return schemaProps
        }).catch(e => console.log("error schema", e))

        // Se agregan los datos al pdf usando annotationStorage
        
        //Object.keys(schemaHubspotProps).forEach((prop) => {
          //if (schemaHubspotProps[prop].type === "textarea" || schemaHubspotProps[prop].type === "select") {
            //const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            //pdfDocument.annotationStorage.setValue(prop, {
              //value: value,
            //});
            
            //value && console.log("change", prop, value);
          //}
        //});
        
        // Se agregan los datos al pdf usando annotationStorage
        Object.keys(schemaHubspotProps).forEach((prop) => {
          
          if (schemaHubspotProps[prop].type === "textarea" || schemaHubspotProps[prop].type === "select") {
            const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            pdfDocument.annotationStorage.setValue(prop, {
              value: value,
            });
            value && console.log("change", prop, value);
          }
        });


      } else {
        // Si es un acroForm
        setFormType("acro");
        const inputsList = getAllAcroInputs(await pdfDocument.getFieldObjects())
        setInputs(inputsList);
        setOutput(JSON.stringify(await pdfDocument.getFieldObjects(), null, 2));
        console.log("inputsList", inputsList);

        let hubspotProperty = "";

        inputsList.forEach((input) => {
          const value = propiedadesTicket[input.dataId] || input.value || "";
          propsMaps[input.dataId] = {
            dataId: input.dataId,
            seccion: input.ariaLabel,
            hubspotProperty: hubspotProperty,
            type: input.name,
            value: value,
          };

          if (input.name === "select") {
            propsMaps[input.dataId].options = input.options;
          }
        });

        console.log("propsMaps", propsMaps);

        // Rellenar datos segun json guardado en matchPropsForms
        const schemaHubspotProps = await fetch("./matchPropsForms/" + filename + ".json").then(async resp => {
          const schemaProps = await resp.json()
          console.log("schemaHubspotProps", schemaProps)
          return schemaProps
        }).catch(e => console.log("error schema", e))

        // Se agregan los datos al pdf usando annotationStorage
        Object.keys(schemaHubspotProps).forEach((prop) => {
          if (schemaHubspotProps[prop].type === "textarea" || schemaHubspotProps[prop].type === "select") {
            const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            pdfDocument.annotationStorage.setValue(prop, {
              value: value,
            });
            value && console.log("change", prop, value);
          } else {
            const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            pdfDocument.annotationStorage.setValue(prop, {
              value: value,
            });
            value && console.log("change", prop, value);
          }

        });
      }

      //Guardar Pdf modificado
      var result = await pdfDocument.saveDocument();
      var buffer = Buffer.from(result);
      const pdfBlob = new Blob([buffer], { type: "application/pdf" });
      const PdfUrl = URL.createObjectURL(pdfBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = PdfUrl;
      downloadLink.innerHTML = "Descargar";
      downloadLink.download = filename + ".pdf"; // Nombre del pdf

      downloadLink.className =
        "fixed top-0 right-0 m-4 inline-block px-4 py-2 bg-blue-500 text-white font-semibold rounded shadow hover:bg-blue-600";

      document.body.appendChild(downloadLink);

      const jsonString = JSON.stringify(propsMaps);

      const jsonBlob = new Blob([jsonString], { type: "application/json" });
      const jsonUrl = URL.createObjectURL(jsonBlob);

      const meneratemapLink = document.createElement("a");
      meneratemapLink.href = jsonUrl;
      meneratemapLink.innerHTML = "Descargar Mapa Props";
      meneratemapLink.download = filename + ".json"; // Nombre del pdf
      meneratemapLink.className =
        "fixed bottom-0 right-0 m-4 inline-block px-4 py-2 bg-green-500 text-white font-semibold rounded shadow hover:bg-green-600";

      document.body.appendChild(meneratemapLink);
    } catch (e) {
      console.error(e);
      setError("Could not load pdf, please check browser console");
    }

    setLoading(false);
  }

  // Obtener todos los inputs de un AcroForm
  function getAllAcroInputs(baseObj: { [name: string]: AcroNode[] }) {
    const result: InputObj[] = [];
    for (const key in baseObj) {
      for (const node of baseObj[key]) {
        if (!node.type) {
          continue;
        }
        result.push({
          name: node.type,
          dataId: node.id,
          ariaLabel: node.name,
          options: node.options ? node.options : [],
          value: node.value || "", // Maneja la ausencia de `value` aquí
        });
      }
    }
    return result;
  }

  // Obtener todos los inputs de un Xfa
  function getAllInputs(node: XfaNode) {
    const inputNodes = ["input", "textarea", "select"];
    const result: InputObj[] = [];
    if (inputNodes.includes(node.name)) {
      //console.log("nodenodenodenode", node);
      const item: InputObj = {
        name: node.name,
        dataId: node.attributes.dataId,
        value: node.attributes.value,
        textContent: node.attributes.textContent,
        ariaLabel: node.attributes["aria-label"],
        xfaOn: node.attributes.xfaOn,
      };
      if (node.name === "select") {
        let selected = false;
        item.options = [];
        if (Array.isArray(node.children)) {
          node.children.forEach((child) => {
            item.options!.push({
              label: child.value!,
              value: child.attributes.value!,
            });
            child.attributes.selected ? (selected = true) : (selected = false);
          });
        }
        item.selected = selected;
      }
      result.push(item);
    }

    if (Array.isArray(node.children)) {
      result.push(...node.children.flatMap((child) => getAllInputs(child)));
    }

    return result;
  }

  // Función para manejar el botón de volver y limpiar los datos procesados
  function handleBack() {
    setShowDetail(false);
    setInputs([]);
    setOutput("");
    setCurrentPdf(null);
  }

  if (error) {
    return (
      <div>
        <p>Encountered an error:</p>
        <code>
          <pre>{error}</pre>
        </code>
      </div>
    );
  }

  // Change handler para manejar campo HubspotPop en la tabla de información del Pdf
  function changeHandlerPdfData(event: React.ChangeEvent<HTMLInputElement>) {
    console.log("hytrujtyu", event.target.value);
  }

  return (
    <div className={"min-h-screen bg-blue-50 py-12 flex items-center justify-center"}>
      <div className="w-full px-4 flex items-start space-x-8">
        {!showDetail ? (
          <>
            {Object.keys(formulariosRequeridos).map((aplicante: string, index: number) => (
              <div key={`${aplicante}-${index}`}>
                {aplicante}
                <div className="flex flex-col space-y-2 bg-white p-4 shadow-lg rounded-lg">
                  {Array.isArray(formulariosRequeridos[aplicante]) &&
                    formulariosRequeridos[aplicante].map((pdf: string, pdfIndex: number) => (
                      <button
                        key={`${pdf}-${pdfIndex}`}
                        className="bg-gray-200 p-2 rounded shadow hover:bg-gray-300 transition duration-200"
                        onClick={() =>
                          // Traer pdf del aplicante
                          loadPdf(
                            "https://21669225.fs1.hubspotusercontent-na1.net/hubfs/21669225/ARCHIVOS_PRIVADOS/PDF_CANADA/TICKETS_SERVICIOS/" +
                              ticketId +
                              "/" +
                              aplicante +
                              "/" +
                              pdf +
                              ".pdf",
                            pdf
                          )
                        }
                      >
                        {pdf}
                      </button>
                    ))}
                </div>
              </div>
            ))}
            <div className="text-center w-full">
              <div className="text-lg font-semibold">ID: {ticketId}</div>
            </div>
            {currentPdf && ( // Mostrar el nombre del PDF actual si existe
              <div className="text-center w-full mt-4">
                <div className="text-lg font-semibold">
                  Procesando PDF: {currentPdf}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
              onClick={handleBack}
            >
              Volver
            </button>
            {loading && (
              <div className={"max-w-xl mx-auto space-y-4 bg-white p-4 rounded-md shadow-md"}>
                <p>Loading...</p>
              </div>
            )}
            {output && (
              <>
                <div className={"max-w-7xl mx-auto bg-white p-4 rounded-md shadow-md overflow-auto"}>
                  <h2 className={"text-2xl font-medium mb-6"}>{currentPdf} - Inputs ({formType})</h2>

                  <table className="w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          dataId
                        </th>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          Value
                        </th>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          type
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Title
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          HubspotProp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {inputs.map((input, i) => (
                        <InputObjTableRow
                          key={`${input.dataId}-${i}`}
                          input={input}
                          i={i}
                          changeHandler={changeHandlerPdfData}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PdfGalery;
*/



import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
// @ts-ignore
import * as pdfjs from "pdfjs-dist/build/pdf";
import Modal from "./Modal";
import { Buffer } from "buffer";

// Traer lista de Pdf
function importAll(r: __WebpackModuleApi.RequireContext): {
  [key: string]: any;
} {
  const imports: { [key: string]: any } = {};
  r.keys().forEach((key: string) => {
    const fileNameWithoutExtension = key.replace(/^\.\/|\.\w+$/g, "");
    imports[fileNameWithoutExtension] = r(key);
  });
  return imports;
}

const PdfList = (): Object => {
  const filenames = importAll(
    require.context("../pdfInputs", false, /\.(pdf)$/)
  );
  /*
  Object.keys(filenames).forEach((key: string) => {
    console.log(key);
  });
  */

  return filenames;
};

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Defino Interfaces

// Para los campos Xfa
interface InputObj {
  name: string;
  dataId: string;
  ariaLabel: string;
  xfaOn?: string;
  options?: Array<{ label: string; value: string }>;
  textContent?: string;
  value?: string;
  selected?: boolean;
}

// Para los campos AcroForms
interface AcroNode {
  type: string;
  id: string;
  name: string;
  options?: any[];
  value?: string; // Incluye la propiedad `value` aquí
}

// Para los nodos de xfa
interface XfaNode {
  name: string;
  value?: string;
  attributes: {
    dataId: string;
    "aria-label": string;
    xfaOn?: string;
    value?: string;
    textContent?: string;
    selected?: boolean;
  };
  children?: XfaNode[];
}

// Schema para crear json
interface PropsMapItem {
  dataId: string;
  seccion: string;
  hubspotProperty: string;
  value: string;
  type: string;
  options?: any[]; // Adjust the type as per your actual data
}

// Traer data del ticket de Hubspot
const getTicket = async (id: string) => {
  const accessToken = process.env.REACT_APP_HUBSPOT_API_KEY;

  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  });

  try {
    const baseUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3100'
      : 'https://cards.planbimmigration.com/server';

    const url = `${baseUrl}/consultaPdfs?ticketId=${id}`;

    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const dataTicket = await response.json();
    console.log("ticket data", JSON.stringify(dataTicket));

    return dataTicket;
  } catch (error) {
    console.error(error);
  }
};


// Función para agregar filas a tabla que enlista los inputs (el changeHandler es necesario para posteriormente almacenar esos datos para inyectarlos en PdfGallery y modificar el json a descargar o el pdf)
function InputObjTableRow({
  input,
  i,
  changeHandler,
}: {
  input: InputObj;
  i: number;
  changeHandler: React.ChangeEventHandler<HTMLInputElement>;
}) {
  const [modal, setModal] = useState(false);

  //console.log("InputObjTableRow", input)

  return (
    <>
      <tr key={input.dataId} id={`row-${input.dataId}`} className={i % 2 === 0 ? undefined : "bg-gray-50"}>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.dataId}
        </td>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.name === "select" ? (
            <select value={input.value}>
              {Array.isArray(input.options)
                ? input.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))
                : <option value="">No options available</option>}
            </select>
          ) : input.xfaOn ? (
            <input type="checkbox" checked={!!input.value} />
          ) : (
            <input type="text" value={input.value || ''} onChange={changeHandler} />
          )}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">
          {input.xfaOn ? `toggle (${input.xfaOn})` : input.name}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{input.ariaLabel}</td>
        <td className="px-3 py-2 text-sm text-gray-500">
          <input type="text" onChange={changeHandler}></input>
        </td>
      </tr>

      <Modal open={modal} onClose={() => setModal(false)}>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium leading-4 text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          onClick={() =>
            navigator.clipboard.writeText(
              JSON.stringify(input.options, null, 2)
            )
          }
        >
          Copy Output
        </button>

        <code className={"block bg-gray-100 p-2 mt-4"}>
          <pre>{JSON.stringify(input.options, null, 2)}</pre>
        </code>
      </Modal>
    </>
  );
}

// La función principal
function PdfGalery() {
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputs, setInputs] = useState<InputObj[]>([]);
  const [formType, setFormType] = useState("");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [propiedadesTicket, setPropiedadesTicket] = useState<{
    [key: string]: any;
  }>({});
  const [formulariosRequeridos, setFormulariosRequeridos] = useState<{
    [key: string]: [string];
  }>({});
  const [currentPdf, setCurrentPdf] = useState<string | null>(null); // Nuevo estado para el nombre del PDF actual
  const [showDetail, setShowDetail] = useState(false); // Nuevo estado para controlar la vista

  const location = useLocation();

  // Cuando carga se toma el ID del ticket
  useEffect(() => {
    const files = PdfList();
    setLoading(false);

    const queryParams = new URLSearchParams(location.search);

    const ticketIdParam = queryParams.get("ticketId");

    setTicketId(ticketIdParam);

    console.log(ticketIdParam);
  }, [location]);

  // Cuando se cambia el ticketId se trae la información de Hubspot
  useEffect(() => {
    const fetchTicketData = async (Id: string) => {
      try {
        const PdfsData = await getTicket(Id);
        const ticketProperties = PdfsData.ticketInfo.properties;

        console.log("propiedades de ticket", ticketProperties);
        console.log("pdfs requeridos", PdfsData.formulariosRequeridos);

        setPropiedadesTicket(ticketProperties);
        setFormulariosRequeridos(PdfsData.formulariosRequeridos);
        // Do something with ticketProperties
      } catch (error) {
        console.error("Error fetching ticket data:", error);
      }
    };

    if (ticketId) {
      fetchTicketData(ticketId);
    }
  }, [ticketId]);

  //Función para leer Pdf
  async function loadPdf(pdfUrl: string | Uint8Array, filename: string) {
    console.log("pdfUrl", pdfUrl);
    setCurrentPdf(filename); // Actualizar el nombre del PDF actual
    setShowDetail(true); // Mostrar la vista de detalle
    console.log("Procesando PDF:", filename); // Mostrar en consola

    // Ya cargó el Pdf
    setLoading(true);

    try {
      const source = typeof pdfUrl === "string" ? { url: pdfUrl } : { data: pdfUrl };

      const pdfDocument = await pdfjs.getDocument({
        ...source,
        enableXfa: true,
      }).promise;

      // Json a llenar con la info del Pdf y ticket
      let propsMaps: { [key: string]: PropsMapItem } = {};

      // Si es un Xfa
      if (pdfDocument.allXfaHtml) {
        setFormType("xfa");
        const inputsList = getAllInputs(pdfDocument.allXfaHtml);
        setInputs(inputsList);
        setOutput(JSON.stringify(inputsList, null, 2));

        console.log("inputsList", inputsList);

        let hubspotProperty = "";

        inputsList.forEach((input) => {
          const value = propiedadesTicket[input.dataId] || input.value || "";
          propsMaps[input.dataId] = {
            dataId: input.dataId,
            seccion: input.ariaLabel,
            hubspotProperty: hubspotProperty,
            type: input.name,
            value: value,
          };

          if (input.name === "select") {
            propsMaps[input.dataId].options = input.options;
          }
        });

        console.log("propsMaps", propsMaps);

        // Rellenar datos segun json guardado en matchPropsForms en public
        const schemaHubspotProps = await fetch("./matchPropsForms/" + filename + ".json").then(async resp => {
          const schemaProps = await resp.json()
          console.log("schemaHubspotProps", schemaProps)
          return schemaProps
        }).catch(e => console.log("error schema", e))

        // Se agregan los datos al pdf usando annotationStorage
        /*
        Object.keys(schemaHubspotProps).forEach((prop) => {
          if (schemaHubspotProps[prop].type === "textarea" || schemaHubspotProps[prop].type === "select") {
            const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            pdfDocument.annotationStorage.setValue(prop, {
              value: value,
            });
            
            value && console.log("change", prop, value);
          }
        });
        */
        // Se agregan los datos al pdf usando annotationStorage
        Object.keys(schemaHubspotProps).forEach((prop) => {
          
          if (schemaHubspotProps[prop].type === "textarea" || schemaHubspotProps[prop].type === "select") {
            const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            /*
            value === "pais_de_nacimiento_"
              ? pdfDocument.annotationStorage.setValue(prop, { value: value })
              : pdfDocument.annotationStorage.setValue(prop, { value: value });
            */
            pdfDocument.annotationStorage.setValue(prop, {
              value: value,
            });
            value && console.log("change", prop, value);
          }
        });


      } else {
        // Si es un acroForm
        setFormType("acro");
        const inputsList = getAllAcroInputs(await pdfDocument.getFieldObjects())
        setInputs(inputsList);
        setOutput(JSON.stringify(await pdfDocument.getFieldObjects(), null, 2));
        console.log("inputsList", inputsList);

        let hubspotProperty = "";

        inputsList.forEach((input) => {
          const value = propiedadesTicket[input.dataId] || input.value || "";
          propsMaps[input.dataId] = {
            dataId: input.dataId,
            seccion: input.ariaLabel,
            hubspotProperty: hubspotProperty,
            type: input.name,
            value: value,
          };

          if (input.name === "select") {
            propsMaps[input.dataId].options = input.options;
          }
        });

        console.log("propsMaps", propsMaps);

        // Rellenar datos segun json guardado en matchPropsForms
        const schemaHubspotProps = await fetch("./matchPropsForms/" + filename + ".json").then(async resp => {
          const schemaProps = await resp.json()
          console.log("schemaHubspotProps", schemaProps)
          return schemaProps
        }).catch(e => console.log("error schema", e))

        // Se agregan los datos al pdf usando annotationStorage
        Object.keys(schemaHubspotProps).forEach((prop) => {
          if (schemaHubspotProps[prop].type === "textarea" || schemaHubspotProps[prop].type === "select") {
            const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            pdfDocument.annotationStorage.setValue(prop, {
              value: value,
            });
            value && console.log("change", prop, value);
          } else {
            const value = propiedadesTicket[schemaHubspotProps[prop].hubspotProperty];
            pdfDocument.annotationStorage.setValue(prop, {
              value: value,
            });
            value && console.log("change", prop, value);
          }

        });
      }

      //Guardar Pdf modificado
      var result = await pdfDocument.saveDocument();
      var buffer = Buffer.from(result);
      const pdfBlob = new Blob([buffer], { type: "application/pdf" });
      const PdfUrl = URL.createObjectURL(pdfBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = PdfUrl;
      downloadLink.innerHTML = "Descargar";
      downloadLink.download = filename + ".pdf"; // Nombre del pdf

      downloadLink.className =
        "fixed top-0 right-0 m-4 inline-block px-4 py-2 bg-blue-500 text-white font-semibold rounded shadow hover:bg-blue-600";

      document.body.appendChild(downloadLink);

      const jsonString = JSON.stringify(propsMaps);

      const jsonBlob = new Blob([jsonString], { type: "application/json" });
      const jsonUrl = URL.createObjectURL(jsonBlob);

      const meneratemapLink = document.createElement("a");
      meneratemapLink.href = jsonUrl;
      meneratemapLink.innerHTML = "Descargar Mapa Props";
      meneratemapLink.download = filename + ".json"; // Nombre del pdf
      meneratemapLink.className =
        "fixed bottom-0 right-0 m-4 inline-block px-4 py-2 bg-green-500 text-white font-semibold rounded shadow hover:bg-green-600";

      document.body.appendChild(meneratemapLink);
    } catch (e) {
      console.error(e);
      setError("Could not load pdf, please check browser console");
    }

    setLoading(false);
  }

  // Obtener todos los inputs de un AcroForm
  function getAllAcroInputs(baseObj: { [name: string]: AcroNode[] }) {
    const result: InputObj[] = [];
    for (const key in baseObj) {
      for (const node of baseObj[key]) {
        if (!node.type) {
          continue;
        }
        result.push({
          name: node.type,
          dataId: node.id,
          ariaLabel: node.name,
          options: node.options ? node.options : [],
          value: node.value || "", // Maneja la ausencia de `value` aquí
        });
      }
    }
    return result;
  }

  // Obtener todos los inputs de un Xfa
  function getAllInputs(node: XfaNode) {
    const inputNodes = ["input", "textarea", "select"];
    const result: InputObj[] = [];
    if (inputNodes.includes(node.name)) {
      //console.log("nodenodenodenode", node);
      const item: InputObj = {
        name: node.name,
        dataId: node.attributes.dataId,
        value: node.attributes.value,
        textContent: node.attributes.textContent,
        ariaLabel: node.attributes["aria-label"],
        xfaOn: node.attributes.xfaOn,
      };
      if (node.name === "select") {
        let selected = false;
        item.options = [];
        if (Array.isArray(node.children)) {
          node.children.forEach((child) => {
            item.options!.push({
              label: child.value!,
              value: child.attributes.value!,
            });
            child.attributes.selected ? (selected = true) : (selected = false);
          });
        }
        item.selected = selected;
      }
      result.push(item);
    }

    if (Array.isArray(node.children)) {
      result.push(...node.children.flatMap((child) => getAllInputs(child)));
    }

    return result;
  }

  // Función para manejar el botón de volver y limpiar los datos procesados
  function handleBack() {
    setShowDetail(false);
    setInputs([]);
    setOutput("");
    setCurrentPdf(null);
  }

  if (error) {
    return (
      <div>
        <p>Encountered an error:</p>
        <code>
          <pre>{error}</pre>
        </code>
      </div>
    );
  }

  // Change handler para manejar campo HubspotPop en la tabla de información del Pdf
  function changeHandlerPdfData(event: React.ChangeEvent<HTMLInputElement>) {
    console.log("hytrujtyu", event.target.value);
  }

  return (
    <div className={"min-h-screen bg-blue-50 py-12 flex items-center justify-center"}>
      <div className="w-full px-4 flex items-start space-x-8">
        {!showDetail ? (
          <>
            {Object.keys(formulariosRequeridos).map((aplicante: string, index: number) => (
              <div key={`${aplicante}-${index}`}>
                {aplicante}
                <div className="flex flex-col space-y-2 bg-white p-4 shadow-lg rounded-lg">
                  {Array.isArray(formulariosRequeridos[aplicante]) &&
                    formulariosRequeridos[aplicante].map((pdf: string, pdfIndex: number) => (
                      <button
                        key={`${pdf}-${pdfIndex}`}
                        className="bg-gray-200 p-2 rounded shadow hover:bg-gray-300 transition duration-200"
                        onClick={() =>
                          // Traer pdf del aplicante
                          loadPdf(
                            "https://21669225.fs1.hubspotusercontent-na1.net/hubfs/21669225/ARCHIVOS_PRIVADOS/PDF_CANADA/TICKETS_SERVICIOS/" +
                              ticketId +
                              "/" +
                              aplicante +
                              "/" +
                              pdf +
                              ".pdf",
                            pdf
                          )
                        }
                      >
                        {pdf}
                      </button>
                    ))}
                </div>
              </div>
            ))}
            <div className="text-center w-full">
              <div className="text-lg font-semibold">ID: {ticketId}</div>
            </div>
            {currentPdf && ( // Mostrar el nombre del PDF actual si existe
              <div className="text-center w-full mt-4">
                <div className="text-lg font-semibold">
                  Procesando PDF: {currentPdf}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
              onClick={handleBack}
            >
              Volver
            </button>
            {loading && (
              <div className={"max-w-xl mx-auto space-y-4 bg-white p-4 rounded-md shadow-md"}>
                <p>Loading...</p>
              </div>
            )}
            {output && (
              <>
                <div className={"max-w-7xl mx-auto bg-white p-4 rounded-md shadow-md overflow-auto"}>
                  <h2 className={"text-2xl font-medium mb-6"}>{currentPdf} - Inputs ({formType})</h2>

                  <table className="w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          dataId
                        </th>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          Value
                        </th>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          type
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Title
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          HubspotProp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {inputs.map((input, i) => (
                        <InputObjTableRow
                          key={`${input.dataId}-${i}`}
                          input={input}
                          i={i}
                          changeHandler={changeHandlerPdfData}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PdfGalery;
