import React, { useState, useEffect, ChangeEventHandler } from "react";
import { useLocation } from "react-router-dom";
// @ts-ignore
import * as pdfjs from "pdfjs-dist/build/pdf";
import Modal from "./Modal";
import { Buffer } from "buffer";
import fileProps from "../Jsons/ticketProps.json";

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

  Object.keys(filenames).forEach((key: string) => {
    console.log(key);
  });

  return filenames;
};

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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

interface AcroNode {
  type: string;
  id: string;
  name: string;
}

interface PropsMapItem {
  dataId: string;
  seccion: string;
  hubspotProperty: string;
  value: string;
  type: string;
  options?: any[]; // Adjust the type as per your actual data
}

const getTicket = async (id: string) => {
  const accessToken = "pat-na1-31886066-9adb-4992-930a-91cd28f192ff";

  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
  });

  try {
    const url = `http://localhost:3600/consultaPdfs?ticketId=${id}`;

    console.log("datos consulta tickets ", url);

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

  return (
    <>
      <tr className={i % 2 === 0 ? undefined : "bg-gray-50"}>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.dataId}
        </td>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.name === "select" ? (
            <select>
              {input.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              )) || <option value="">No options available</option>}
            </select>
          ) : input.xfaOn ? (
            <input type="checkbox" value={input.value} />
          ) : (
            <input type="text" value={input.textContent} />
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

function PdfGalery() {
  const [url, setUrl] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [inputs, setInputs] = useState<InputObj[]>([]);
  const [formType, setFormType] = useState("");
  const [pdfList, setPdfList] = useState<{ [key: string]: any }>({});
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [propiedadesTicket, setPropiedadesTicket] = useState<{
    [key: string]: any;
  }>({});
  const [formulariosRequeridos, setFormulariosRequeridos] = useState<{
    [key: string]: [string];
  }>({});
  const [propsMapHubspot, setPropsMapHubspot] = useState<{
    [key: string]: PropsMapItem;
  }>({});

  const location = useLocation();

  useEffect(() => {
    const files = PdfList();
    setPdfList(files);
    setLoading(false);

    const queryParams = new URLSearchParams(location.search);

    const ticketIdParam = queryParams.get("ticketId");

    setTicketId(ticketIdParam);

    console.log(ticketIdParam);
  }, [location]);

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

  async function loadPdf(pdfUrl: string | Uint8Array, filename: string) {
    console.log("pdfUrl", pdfUrl);

    setLoading(true);

    try {
      const source =
        typeof pdfUrl === "string" ? { url: pdfUrl } : { data: pdfUrl };

      const pdfDocument = await pdfjs.getDocument({
        ...source,
        enableXfa: true,
      }).promise;

      let propsMaps: { [key: string]: PropsMapItem } = {};

      if (pdfDocument.allXfaHtml) {
        setFormType("xfa");
        const inputsList = getAllInputs(pdfDocument.allXfaHtml);
        setInputs(inputsList);
        setOutput(JSON.stringify(inputsList, null, 2));

        console.log("inputsList", inputsList);

        let hubspotProperty = "";

        inputsList.map((input) => {
          propsMaps[input.dataId] = {
            dataId: input.dataId,
            seccion: input.ariaLabel,
            hubspotProperty: hubspotProperty,
            type: input.name,
            value: input.value ? input.value : "",
          };

          if (input.name === "select")
            propsMaps[input.dataId].options = input.options;
        });

        console.log("propsMaps", propsMaps);

        setPropsMapHubspot(propsMaps);

        // Rellenar datos segun json guardado en matchPropsForms

        const schemaHubspotProps = await fetch("./matchPropsForms/" + filename + ".json").then( async resp => {
          const schemaProps = await resp.json()
          console.log("sschemaHubspotProps", schemaProps)
          return schemaProps
        })

        pdfDocument.annotationStorage.setValue("FamilyName31626", {
          value: "fasfasf",
        });
        
        for (let prop in schemaHubspotProps) {

            if (
              schemaHubspotProps[prop].type === "textarea"
            ){
              pdfDocument.annotationStorage.setValue(prop, {
                value: schemaHubspotProps[prop].value,
              });
            console.log("change", prop, schemaHubspotProps[prop].value);
            }
          
        }
      } else {
        setFormType("acro");
        setInputs(getAllAcroInputs(await pdfDocument.getFieldObjects()));
        setOutput(JSON.stringify(await pdfDocument.getFieldObjects(), null, 2));

        // Filler test using IMM56456
        pdfDocument.annotationStorage.setValue("691R", {
          value: "Test Surname",
        });
        pdfDocument.annotationStorage.setValue("694R", { value: "TestName" });
      }

      var result = await pdfDocument.saveDocument();
      var buffer = Buffer.from(result);
      const pdfBlob = new Blob([buffer], { type: "application/pdf" });
      const PdfUrl = URL.createObjectURL(pdfBlob);

      const downloadLink = document.createElement("a");
      downloadLink.href = PdfUrl;
      downloadLink.innerHTML = "Descargar";
      downloadLink.download = filename + ".pdf"; // Specify the desired filename

      downloadLink.className =
        "fixed top-0 right-0 m-4 inline-block px-4 py-2 bg-blue-500 text-white font-semibold rounded shadow hover:bg-blue-600";

      document.body.appendChild(downloadLink);

      const jsonString = JSON.stringify(propsMaps);

      const jsonBlob = new Blob([jsonString], { type: "application/json" });
      const jsonUrl = URL.createObjectURL(jsonBlob);

      const meneratemapLink = document.createElement("a");
      meneratemapLink.href = jsonUrl;
      meneratemapLink.innerHTML = "Descargar Mapa Props";
      meneratemapLink.download = filename + ".json"; // Specify the desired filename

      meneratemapLink.className =
        "fixed bottom-0 right-0 m-4 inline-block px-4 py-2 bg-green-500 text-white font-semibold rounded shadow hover:bg-green-600";

      document.body.appendChild(meneratemapLink);
    } catch (e) {
      console.error(e);
      setError("Could not load pdf, please check browser console");
    }

    setLoading(false);
  }

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
          options: [],
        });
      }
    }
    return result;
  }

  function getAllInputs(node: XfaNode) {
    const inputNodes = ["input", "textarea", "select"];
    const result: InputObj[] = [];
    if (inputNodes.includes(node.name)) {
      console.log("nodenodenodenode", node);
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
        node.children?.map((child) => {
          item.options?.push({
            label: child.value!,
            value: child.attributes.value!,
          });
          child.attributes.selected ? (selected = true) : (selected = false);
        });

        item.selected = selected;
      }
      result.push(item);
    }

    if ("children" in node) {
      result.push(...node.children!.flatMap((child) => getAllInputs(child)));
    }

    return result;
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

  function changeHandlerPdfData() {
    console.log("afas");
  }

  return (
    <div
      className={
        "min-h-screen bg-blue-50 py-12 flex items-center justify-center"
      }
    >
      <div className="w-full px-4 flex items-start space-x-8">
        {!loading && !output && pdfList ? (
          <>
            {Object.keys(formulariosRequeridos).map((aplicante: string) => (
              <div>
                {aplicante}
                <div className="flex flex-col space-y-2 bg-white p-4 shadow-lg rounded-lg">
                  {formulariosRequeridos[aplicante].map((pdf: string) => (
                    <button
                      key={pdf}
                      className="bg-gray-200 p-2 rounded shadow hover:bg-gray-300 transition duration-200"
                      onClick={() =>
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
          </>
        ) : null}

        {loading && (
          <div
            className={
              "max-w-xl mx-auto space-y-4 bg-white p-4 rounded-md shadow-md"
            }
          >
            <p>Loading...</p>
          </div>
        )}

        {output && (
          <>
            <div
              className={
                "max-w-7xl mx-auto bg-white p-4 rounded-md shadow-md overflow-auto"
              }
            >
              <h2 className={"text-2xl font-medium mb-6"}>
                Inputs ({formType})
              </h2>

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
                      className="px-3 pl-4 py-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
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
      </div>
    </div>
  );
}

export default PdfGalery;
