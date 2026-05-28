const fs = require('fs');
const path = require('path');

function removeAccents(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.java')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('log.') || line.includes('logger.') || line.includes('System.out')) {
      const cleanLine = removeAccents(line);
      if (cleanLine !== line) {
        lines[i] = cleanLine;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log("Fixed: " + filePath);
  }
}

processDirectory('d:/emprendimiento/antigravity/tiendario/backend/src/main/java');
