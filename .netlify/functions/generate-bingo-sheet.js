const PDFDocument = require('pdfkit');

async function generatePDF() {
    return new Promise((resolve, reject) => {
        let doc = new PDFDocument;

        // Collect data and resolve promise on success.
        let buffers = [];
        doc.on('data', (buffer) => buffers.push(buffer))
        doc.on('end', () => {
            console.log(buffers)
            let buffer = Buffer.concat(buffers);
            resolve(buffer)
        })

        doc.text('Hello world!')

        doc.end();
    })
}

exports.handler = async (event, context) => {
    let buffer = await generatePDF()
    return {
        isBase64Encoded: true,
        statusCode: 200,
        headers: {
            'Content-Type': 'application/pdf',
        },
        body: buffer.toString('base64'),
    };
};