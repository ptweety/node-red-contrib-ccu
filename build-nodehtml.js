const fs = require('fs').promises;
// const path = require('node:path');

const nodeSrcRoot = 'src/nodes-html';
const nodeDestRoot = 'nodes';

const processFile = node => new Promise((resolve, reject) => {
    const template = {
        start: '<script type="text/javascript">\n',
        middle: '</script>\n\n',
        end: '',
    };

    const nodeEditor = `${nodeSrcRoot}/${node}/editor.js`;
    const nodeMain = `${nodeSrcRoot}/${node}/main.html`;
    const nodeHTML = `${nodeDestRoot}/${node}.html`;

    fs.access(nodeEditor)
        .then(() => fs.access(nodeMain))
        .then(() => fs.writeFile(nodeHTML, template.start))
        .then(() =>
            fs.readFile(nodeEditor)
                .then(content => fs.appendFile(nodeHTML, content).catch(error => console.log(error))),
        )
        .then(() => fs.appendFile(nodeHTML, template.middle))
        .then(() =>
            fs.readFile(nodeMain)
                .then(content => fs.appendFile(nodeHTML, content).catch(error => console.log(error))),
        )
        .then(() => fs.appendFile(nodeHTML, template.end))
        .then(() => resolve())
        .catch(error => reject(error));
});

console.log(
    '[\u001B[90m%s\u001B[0m] nodeSrcRoot: \'\u001B[36m%s\u001B[37m\'',
    new Date().toLocaleTimeString(undefined, {hourCycle: 'h23'}),
    nodeSrcRoot,
);

console.log(
    '[\u001B[90m%s\u001B[0m] nodeDestRoot: \'\u001B[36m%s\u001B[37m\'',
    new Date().toLocaleTimeString(undefined, {hourCycle: 'h23'}),
    nodeDestRoot,
);

fs.readdir(nodeSrcRoot, {withFileTypes: true}).then(files => {
    for (const file of files) {
        if (file.isDirectory) {
            processFile(file.name)
                .then(() =>
                    console.log(
                        '\u001B[37m[\u001B[90m%s\u001B[37m] \'\u001B[36m%s\u001B[37m\' written',
                        new Date().toLocaleTimeString(undefined, {hourCycle: 'h23'}),
                        file.name,
                    ))
                .catch(error =>
                    console.log(
                        `\u001B[37m[\u001B[90m%s\u001B[37m] \u001B[31mERROR\u001B[0m: ${error.code}, ${error.syscall} '${error.path}'`,
                        new Date().toLocaleTimeString(undefined, {hourCycle: 'h23'}),
                    ));
        }
    }
});

