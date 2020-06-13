const PDFDocument = require('pdfkit');

// pdfPointsToCm returns the centimeter value 
function mmToPdfPoints(mm) {
    let inch = mm / 25.4;
    let points = inch * 72;
    return points
}

function drawCard(doc, x, y, width, height) {
    doc.moveTo(x, y)
        .lineTo(x + width, y)
        .lineTo(x + width, y + height)
        .lineTo(x, y + height)
        .lineTo(x, y)
        .stroke();
}

// generatePDF generates the PDF and returns its buffer.
async function generatePDF() {
    // All units in mm.
    let width = mmToPdfPoints(210);
    let height = mmToPdfPoints(297);
    let topMargin = mmToPdfPoints(16.9);
    let bottomMargin = mmToPdfPoints(16.9);
    let leftMargin = mmToPdfPoints(24.1);
    let rightMargin = mmToPdfPoints(8.1);
    let margin = mmToPdfPoints(10);

    // Computed units.
    let contentWidth = width - leftMargin - rightMargin;
    let contentHeight = height - topMargin - bottomMargin;
    let sheetWidth = (contentWidth - margin) / 2
    let sheetHeight = (contentHeight - margin) / 2

    return new Promise((resolve, reject) => {
        let doc = new PDFDocument({
            // size: [width, height],
            size: 'a4',
            margins: {
                top: topMargin,
                bottom: bottomMargin,
                left: leftMargin,
                right: rightMargin,
            },
            layout: 'portrait',
            info: {
                Title: 'Bingo Zettel',
                Author: 'SuppKultur',
            }
        });

        // Collect data and resolve promise on success.
        let buffers = [];
        doc.on('data', (buffer) => buffers.push(buffer))
        doc.on('end', () => {
            let buffer = Buffer.concat(buffers);
            resolve(buffer)
        })

        drawCard(doc, leftMargin, topMargin, sheetWidth, sheetHeight)
        drawCard(doc, leftMargin + sheetWidth + margin, topMargin, sheetWidth, sheetHeight)
        drawCard(doc, leftMargin, topMargin + sheetHeight + margin, sheetWidth, sheetHeight)
        drawCard(doc, leftMargin + sheetWidth + margin, topMargin + sheetHeight + margin, sheetWidth, sheetHeight)

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