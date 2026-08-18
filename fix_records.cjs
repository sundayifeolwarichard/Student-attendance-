const fs = require('fs');
const mockDataPath = 'src/services/mockData.ts';
let content = fs.readFileSync(mockDataPath, 'utf8');

// I already did global replace on `course_csc401` -> `course_com411`
// Let's just check if there's any left.
