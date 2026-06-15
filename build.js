const { main: generateManifest } = require('./scripts/generate-manifest');
const fs = require('fs');
const path = require('path');

function copyHtmlFiles() {
    const files = ['index.html', 'travel.html'];
    files.forEach(file => {
        const srcPath = path.join('./src', file);
        const destPath = path.join('./', file);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`📋 Copied ${file} to root`);
        }
    });
}

if (require.main === module) {
    copyHtmlFiles();
    generateManifest();
}
