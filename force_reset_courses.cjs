const fs = require('fs');
const mockDataPath = 'src/services/db.ts';
let content = fs.readFileSync(mockDataPath, 'utf8');

const replaceStr = `  getCourses: (): Course[] => {
    const loaded = loadItem<Course[]>(STORAGE_KEYS.COURSES, INITIAL_COURSES);
    if (loaded.length < 40) {
        saveItem(STORAGE_KEYS.COURSES, INITIAL_COURSES);
        return INITIAL_COURSES;
    }
    return loaded;
  },`;

content = content.replace(`  getCourses: (): Course[] => {
    return loadItem<Course[]>(STORAGE_KEYS.COURSES, INITIAL_COURSES);
  },`, replaceStr);

fs.writeFileSync(mockDataPath, content);
console.log('Forced reset for courses implemented.');
