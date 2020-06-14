const PDFDocument = require('pdfkit');

// pdfPointsToCm returns the centimeter value 
function mmToPdfPoints(mm) {
    let inch = mm / 25.4;
    let points = inch * 72;
    return points
}

// randomNumber returns a natural number between min and max (inclusive).
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min)
}

function drawCard(doc, x, y, width, height, margin) {
    let dashLength = mmToPdfPoints(3);
    let dashSpace = mmToPdfPoints(4)
    let numberSize = mmToPdfPoints(8);
    let innerY = margin * 3 + mmToPdfPoints(22);
    let maxInnerHeight = height - innerY;
    let maxInnerWidth = width - margin - margin;
    var innerHeight, innerWidth;
    if (maxInnerHeight > maxInnerWidth) {
        innerHeight = maxInnerWidth
        innerWidth = maxInnerWidth
    } else {
        innerHeight = maxInnerHeight
        innerWidth = maxInnerHeight
    }
    let boxSize = innerHeight / 5;

    // Draw outer, dashed box.
    doc.moveTo(x, y)
        .lineTo(x + width, y)
        .lineTo(x + width, y + height)
        .lineTo(x, y + height)
        .lineTo(x, y)
        .dash(dashLength, { space: dashSpace })
        .stroke();

    // Draw SuppKultur logo.
    doc.image('assets/logo.png', x + margin, y + margin, {
        width: innerWidth
    })

    // Draw inner box.
    doc.moveTo(x + margin, y + innerY)
        .lineTo(x + margin + innerWidth, y + innerY)
        .lineTo(x + margin + innerWidth, y + innerY + innerHeight)
        .lineTo(x + margin, y + innerY + innerHeight)
        .lineTo(x + margin, y + innerY)
        .undash()
        .stroke();

    // Draw grid and numbers.
    for (var i = 0; i < 4; i++) {
        doc.moveTo(x + margin + boxSize * (i + 1), y + innerY)
            .lineTo(x + margin + boxSize * (i + 1), y + innerY + innerHeight)
            .stroke();

        doc.moveTo(x + margin, y + innerY + boxSize * (i + 1))
            .lineTo(x + margin + innerWidth, y + innerY + boxSize * (i + 1))
            .stroke();
    }

    // Calculate numbers.
    let numbers = [[], [], [], [], []];
    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 5; j++) {
            var num
            while (true) {
                num = randomNumber(i * 15 + 1, i * 15 + 15)
                if (!numbers[i].includes(num)) {
                    break
                }
            }
            numbers[i][j] = num
        }
    }

    // Draw numbers.
    doc.fontSize(numberSize)
    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 5; j++) {
            // We have to access the array per column, that's why we do [j][i].
            let num = numbers[i][j]

            // Now let's figure out where to put this.
            doc.font('Helvetica-Bold')
                .fillColor('black')
                .text(`${num}`, x + margin + i * boxSize, y + innerY + j * boxSize + (boxSize - numberSize) / 2 + mmToPdfPoints(1), {
                    width: boxSize,
                    align: 'center',
                })
        }
    }

    // Draw footer.
    let footerSize = mmToPdfPoints(5);
    doc.fontSize(footerSize);
    let linkText = "suppkultur.org";
    let linkX = x + margin;
    let linkY = (y + height) - margin - footerSize;
    doc.font('Helvetica')
        .fillColor('#b95c27')
        .text(linkText, linkX, linkY, {
            width: innerWidth,
            align: 'right',
        });

    // Add link
    let linkWidth = doc.widthOfString(linkText);
    let linkHeight = doc.currentLineHeight();
    doc.link(linkX + innerWidth - linkWidth, linkY, linkWidth, linkHeight, 'https://suppkultur.org/');
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
    let sheetMargin = mmToPdfPoints(10);
    let margin = mmToPdfPoints(5);

    // Computed units.
    let contentWidth = width - leftMargin - rightMargin;
    let contentHeight = height - topMargin - bottomMargin;
    let sheetWidth = (contentWidth - sheetMargin) / 2
    let sheetHeight = (contentHeight - sheetMargin) / 2

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

        drawCard(doc, leftMargin, topMargin, sheetWidth, sheetHeight, margin)
        // drawCard(doc, leftMargin + sheetWidth + sheetMargin, topMargin, sheetWidth, sheetHeight, margin)
        // drawCard(doc, leftMargin, topMargin + sheetHeight + sheetMargin, sheetWidth, sheetHeight, margin)
        // drawCard(doc, leftMargin + sheetWidth + sheetMargin, topMargin + sheetHeight + sheetMargin, sheetWidth, sheetHeight, margin)

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