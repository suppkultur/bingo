const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const sizeOf = require('image-size');

// pdfPointsToCm returns the centimeter value 
function mmToPdfPoints(mm) {
    const inch = mm / 25.4;
    const points = inch * 72;
    return points
}

// randomNumber returns a natural number between min and max (inclusive).
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min)
}

function drawCard(doc, x, y, width, height, horizontalMargin) {
    const dashLength = mmToPdfPoints(3);
    const dashSpace = mmToPdfPoints(4)
    const numberSize = mmToPdfPoints(8);
    const footerSize = mmToPdfPoints(5);
    const imagePath = require.resolve("./logo.png");
    const imageSize = sizeOf(imagePath);
    const maxInnerWidth = width - horizontalMargin * 2;
    const imageHeight = (imageSize.height / imageSize.width) * maxInnerWidth;
    const verticalMargin = (height - imageHeight - footerSize - maxInnerWidth) / 4;
    const innerY = imageHeight + verticalMargin * 2;
    const maxInnerHeight = height - innerY;
    var innerHeight, innerWidth;
    if (maxInnerHeight > maxInnerWidth) {
        innerHeight = maxInnerWidth
        innerWidth = maxInnerWidth
    } else {
        innerHeight = maxInnerHeight
        innerWidth = maxInnerHeight
    }
    const boxSize = innerHeight / 5;

    // Draw outer, dashed box.
    doc.moveTo(x, y)
        .lineTo(x + width, y)
        .lineTo(x + width, y + height)
        .lineTo(x, y + height)
        .lineTo(x, y)
        .dash(dashLength, { space: dashSpace })
        .stroke();

    // Draw SuppKultur logo.
    doc.image(imagePath, x + horizontalMargin, y + verticalMargin, {
        width: innerWidth
    });

    // Draw inner box.
    doc.moveTo(x + horizontalMargin, y + innerY)
        .lineTo(x + horizontalMargin + innerWidth, y + innerY)
        .lineTo(x + horizontalMargin + innerWidth, y + innerY + innerHeight)
        .lineTo(x + horizontalMargin, y + innerY + innerHeight)
        .lineTo(x + horizontalMargin, y + innerY)
        .undash()
        .stroke();

    // Draw grid.
    for (var i = 0; i < 4; i++) {
        doc.moveTo(x + horizontalMargin + boxSize * (i + 1), y + innerY)
            .lineTo(x + horizontalMargin + boxSize * (i + 1), y + innerY + innerHeight)
            .stroke();

        doc.moveTo(x + horizontalMargin, y + innerY + boxSize * (i + 1))
            .lineTo(x + horizontalMargin + innerWidth, y + innerY + boxSize * (i + 1))
            .stroke();
    }

    // Calculate numbers.
    const numbers = [[], [], [], [], []];
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            let num
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
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            // We have to access the array per column, that's why we do [j][i].
            const num = numbers[i][j]

            // Now let's figure out where to put this.
            doc.font('Helvetica-Bold')
                .fillColor('black')
                .text(`${num}`, x + horizontalMargin + i * boxSize, y + innerY + j * boxSize + (boxSize - numberSize) / 2 + mmToPdfPoints(1), {
                    width: boxSize,
                    align: 'center',
                })
        }
    }

    // Draw footer.
    doc.fontSize(footerSize);
    const linkText = "suppkultur.org";
    const linkX = x + horizontalMargin;
    const linkY = y + innerY + innerHeight + verticalMargin;
    doc.font('Helvetica')
        .fillColor('#b95c27')
        .text(linkText, linkX, linkY, {
            width: innerWidth,
            align: 'right',
        });

    // Add link
    const linkWidth = doc.widthOfString(linkText);
    const linkHeight = doc.currentLineHeight();
    doc.link(linkX + innerWidth - linkWidth, linkY, linkWidth, linkHeight, 'https://suppkultur.org/');
}

// generatePDF generates the PDF and returns its buffer.
async function generatePDF(count) {
    // All units in mm.
    const width = mmToPdfPoints(210);
    const height = mmToPdfPoints(297);
    const topMargin = mmToPdfPoints(16.9);
    const bottomMargin = mmToPdfPoints(16.9);
    const leftMargin = mmToPdfPoints(24.1);
    const rightMargin = mmToPdfPoints(8.1);
    const sheetMargin = mmToPdfPoints(10);
    const margin = mmToPdfPoints(5);

    // Computed units.
    const contentWidth = width - leftMargin - rightMargin;
    const contentHeight = height - topMargin - bottomMargin;
    const sheetWidth = (contentWidth - sheetMargin) / 2
    const sheetHeight = (contentHeight - sheetMargin) / 2

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
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
        const buffers = [];
        doc.on('data', (buffer) => buffers.push(buffer))
        doc.on('end', () => {
            const buffer = Buffer.concat(buffers);
            resolve(buffer)
        })

        drawCard(doc, leftMargin, topMargin, sheetWidth, sheetHeight, margin)
        if (count > 1) {
            drawCard(doc, leftMargin + sheetWidth + sheetMargin, topMargin, sheetWidth, sheetHeight, margin)
        }
        if (count > 2) {
            drawCard(doc, leftMargin, topMargin + sheetHeight + sheetMargin, sheetWidth, sheetHeight, margin)
        }
        if (count > 3) {
            drawCard(doc, leftMargin + sheetWidth + sheetMargin, topMargin + sheetHeight + sheetMargin, sheetWidth, sheetHeight, margin)
        }

        doc.end();
    })
}

exports.handler = async (event, context) => {
    const count = event.queryStringParameters.count || 1;

    if (process.env.ANALYTICS_URL) {
        const method = process.env.ANALYTICS_METHOD || 'POST';
        const url = new URL(process.env.ANALYTICS_URL);
        // These parameters are specifically for goatcounter.com.
        url.searchParams.append('p', `/.netlify/functions/suppkultur-bingo?count=${count}`)
        url.searchParams.append('t', 'suppkultur-bingo.pdf');
        // We need to await bc Netlify may kill our function before we can
        // send the request.
        await fetch(url.toString(), {
            method: method,
            headers: {
                'user-agent': event.headers['user-agent'],
                'x-forwarded-for': event.headers['x-forwarded-for'],
            },
        })
    }

    const buffer = await generatePDF(count)
    return {
        isBase64Encoded: true,
        statusCode: 200,
        headers: {
            'Content-Type': 'application/pdf',
        },
        body: buffer.toString('base64'),
    };
};
