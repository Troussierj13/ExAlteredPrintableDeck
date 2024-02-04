const fs = require('fs');
const assert = require('assert');
const { PDFDocument } = require('pdf-lib');

const normalizeVector = ({x, y}, { width, height }) => {
    const hA4 = 297;
    const wA4 = 210;

    return {x: x*width/wA4, y: y*height/hA4}
}


// Recursive function to get files
function getFiles(dir, files = []) {
    // Get an array of all files and directories in the passed directory using fs.readdirSync
    const fileList = fs.readdirSync(dir)
    // Create the full path of the file/directory by concatenating the passed directory and file/directory name
    for (const file of fileList) {
        const name = `${dir}/${file}`
        // Check if the current file/directory is a directory using fs.statSync
        if (fs.statSync(name).isDirectory()) {
            // If it is a directory, recursively call the getFiles function with the directory path and the files array
            getFiles(name, files)
        } else {
            // If it is a file, push the full path to the files array
            files.push(name)
        }
    }
    return files
}

const run = async (imagesInTheFolder, nameFile) => {
    const pdfDoc = await PDFDocument.create();

    var row = -1
    var index = 0
    var imagePage;
    for (const pathToImage of imagesInTheFolder) {
        if (index%9 === 0) {
            row = -1;
            imagePage = pdfDoc.addPage();
        }

        if (index%3 === 0) {
            row += 1;
        }

        const size = normalizeVector({x: 62.94, y: 88}, imagePage.getSize())
        const marging = normalizeVector({x: 10.73, y: 17.445}, imagePage.getSize())
        const yy = imagePage.getSize().height-size.y
        const img = await pdfDoc.embedJpg(fs.readFileSync(pathToImage));

        const _x = marging.x + size.x * (index%3)
        const _y = yy - marging.y - size.y * row

        if (index%3 === 0 && row < 2) {
            imagePage.drawLine({
                start: {x: 0, y: _y},
                end: {x: imagePage.getSize().width, y: _y},
                thickness: 0.05
            })
        }
        if (row < 1 && index%3 > 0) {
            imagePage.drawLine({
                start: {x: _x, y: 0},
                end: {x: _x, y: imagePage.getSize().height},
                thickness: 0.05
            })
        }

        imagePage.drawImage(img, {
            x: _x,
            y: _y,
            width: size.x,
            height: size.y
        });

        index++;
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(nameFile+ ".pdf", pdfBytes);
}

const ERRORS = {
    ARGUMENTS: 'Please provide a path to the deck file as a first argument and path to images as the second argument'
};
const pathToImages = process.argv[3];
assert.notEqual(pathToImages, null, ERRORS.ARGUMENTS);

const pathToJson = process.argv[2];
assert.notEqual(pathToJson, null, ERRORS.ARGUMENTS);


try {
    // Note that jsonString will be a <Buffer> since we did not specify an
    // encoding type for the file. But it'll still work because JSON.parse() will
    // use <Buffer>.toString().
    const jsonString = fs.readFileSync(pathToJson);
    const deckTmp = JSON.parse(jsonString);
    const nameFile = deckTmp.name
    const deck = []
    deck.push(pathToImages + '/' + deckTmp.hero + '.jpg')

    const filesInTheFolder = getFiles(pathToImages)

    for (const card of deckTmp.content) {
        deck.push(pathToImages + '/' + card + '.jpg')
    }

    run(deck, nameFile).catch(console.error);

} catch (err) {
    console.log(err);
    return;
}



