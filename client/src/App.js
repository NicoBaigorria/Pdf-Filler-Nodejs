import logo from './logo.svg';
import './App.css';


function InputObjTableRow({ input, i }) {
  
  const [modal, setModal] = useState(false);

  return (
    <>
      <tr className={i % 2 === 0 ? undefined : 'bg-gray-50'}>
        <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.dataId}
        </td>
         <td className="py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
          {input.textContent}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">
          {input.name === 'select' ? (
            <>
              <button
                className={'text-indigo-600 hover:text-indigo-800'}
                onClick={() => setModal(true)}
              >
                {input.name}
              </button>
            </>
          ) : input.xfaOn ? (
            `toggle (${input.xfaOn})`
          ) : (
            input.name
          )}
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{input.ariaLabel}</td>
      </tr>

      <Modal open={modal} onClose={() => setModal(false)}>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium leading-4 text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          onClick={() =>
            navigator.clipboard.writeText(
              JSON.stringify(input.options, null, 2),
            )
          }
        >
          Copy Output
        </button>

        <code className={'block bg-gray-100 p-2 mt-4'}>
          <pre>{JSON.stringify(input.options, null, 2)}</pre>
        </code>
      </Modal>
    </>
  );
}


function App() {
  const [url, setUrl] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [inputs, setInputs] = useState([]);
  const [formType, setFormType] = useState('');

  function onFileChange(e) {
    const file = e.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      if (!e.target?.result) {
        return setError('Failed to read PDF');
      }
      loadPdf(new Uint8Array(e.target.result));
    };
    fileReader.readAsArrayBuffer(file);
  }

  async function onSubmit(e) {
    e.preventDefault();
    loadPdf(url);
  }

  async function loadPdf(pdfUrl) {
    setLoading(true);

    try {
      const source =
        typeof pdfUrl === 'string' ? { url: pdfUrl } : { data: pdfUrl };

      const pdfDocument = await pdfjs.getDocument({
        ...source,
        enableXfa: true,
      }).promise;

      if (pdfDocument.allXfaHtml) {
        setFormType('xfa');
        setInputs(getAllInputs(pdfDocument.allXfaHtml));
        setOutput(JSON.stringify(pdfDocument.allXfaHtml, null, 2));
        
        // TODO: move to a different function
        // Filler test IMM1294e
        pdfDocument.annotationStorage.setValue('FamilyName31585', { value: 'Test Surname2' });
        pdfDocument.annotationStorage.setValue('GivenName31586', { value: 'TestName2' });

        var result = await pdfDocument.saveDocument();
        var buffer = Buffer.from(result);
        const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = 'downloaded.pdf'; // Specify the desired filename
        
        // Automatically trigger the download by simulating a click
        downloadLink.style.display = 'none'; // Hide the link
        document.body.appendChild(downloadLink);
        downloadLink.click();

        URL.revokeObjectURL(pdfUrl);

      } else {
        setFormType('acro');
        setInputs(getAllAcroInputs(await pdfDocument.getFieldObjects()));
        setOutput(JSON.stringify(await pdfDocument.getFieldObjects(), null, 2));
        
        // Filler test using IMM56456
        pdfDocument.annotationStorage.setValue('691R', { value: 'Test Surname' });
        pdfDocument.annotationStorage.setValue('694R', { value: 'TestName' });
        
        var result = await pdfDocument.saveDocument();
        var buffer = Buffer.from(result);
        const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = 'downloaded.pdf'; // Specify the desired filename
        
        // Automatically trigger the download by simulating a click
        downloadLink.style.display = 'none'; // Hide the link
        document.body.appendChild(downloadLink);
        downloadLink.click();

         URL.revokeObjectURL(pdfUrl);

    }
    } catch (e) {
      console.error(e);
      setError('Could not load pdf, please check browser console');
    }

    setLoading(false);
  }

  function getAllAcroInputs(baseObj) {
    const result = [];
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

  function getAllInputs(node) {
    const inputNodes = ['input', 'textarea', 'select'];
    const result = [];
    if (inputNodes.includes(node.name)) {
      const item = {
        name: node.name,
        dataId: node.attributes.dataId,
        value: node.attributes.value,
        textContent: node.attributes.textContent,
        ariaLabel: node.attributes['aria-label'],
        xfaOn: node.attributes.xfaOn,
      };
      if (node.name === 'select') {
        item.options =
          node.children?.map(child => ({
            label: child.value?child.value:null,
            value: child.attributes.value?child.attributes.value:null,
          })) || [];
      }
      result.push(item);
    }

    if ('children' in node) {
      result.push(...node.children.flatMap(child => getAllInputs(child)));
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

  return (
    <div className={'min-h-screen bg-blue-50 py-12'}>
      <div className="space-y-8 px-4">
        {!loading && !output ? (
          <form
            onSubmit={onSubmit}
            className={
              'max-w-xl mx-auto space-y-4 bg-white p-4 rounded-md shadow-md'
            }
          >
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700"
              >
                PDF Url:
              </label>
              <div className="mt-1">
                <input
                  type="url"
                  id="url"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://example.com/secrets-to-the-universe.pdf"
                  value={url}
                  onChange={e => setUrl(e.currentTarget.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="file"
                className="block text-sm font-medium text-gray-700"
              >
                Or upload a pdf
              </label>
              <div className="mt-1">
                <input
                  id={'file'}
                  type={'file'}
                  accept={'application/pdf'}
                  onChange={onFileChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                disabled={loading}
              >
                Parse PDF
              </button>
            </div>
          </form>
        ) : null}

        {loading && (
          <div
            className={
              'max-w-xl mx-auto space-y-4 bg-white p-4 rounded-md shadow-md'
            }
          >
            <p>Loading...</p>
          </div>
        )}

        {output && (
          <>
            <div
              className={'max-w-xl mx-auto bg-white p-4 rounded-md shadow-md'}
            >
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium leading-4 text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => navigator.clipboard.writeText(output)}
                >
                  Copy Output
                </button>

                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 leading-4 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => setShowOutput(!showOutput)}
                >
                  {showOutput ? 'Hide Output' : 'Show Output'}
                </button>
              </div>

              <code
                className={`block ${
                  showOutput ? '' : 'max-h-[400px] overflow-hidden'
                } mt-6 bg-gray-100 p-2`}
              >
                <pre>{output}</pre>
              </code>
            </div>

            <div
              className={
                'max-w-7xl mx-auto bg-white p-4 rounded-md shadow-md overflow-auto'
              }
            >
              <h2 className={'text-2xl font-medium mb-6'}>
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
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Title
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {inputs.map((input, i) => (
                    <InputObjTableRow
                      key={`${input.dataId}-${i}`}
                      input={input}
                      i={i}
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

export default App;
