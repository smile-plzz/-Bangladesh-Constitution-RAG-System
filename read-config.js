const fs = require('fs');
const spec = JSON.parse(fs.readFileSync('project-spec.json', 'utf-8'));
console.log(`${spec.url} ${spec.output_file}`);
