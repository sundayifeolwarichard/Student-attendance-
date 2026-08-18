const fs = require('fs');
const mockDataPath = 'src/services/db.ts';
let content = fs.readFileSync(mockDataPath, 'utf8');

const replaceStr = `  getRegistrations: (): CourseRegistration[] => {
    let regs = loadItem<CourseRegistration[]>(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS);
    const courses = db.getCourses();
    const validCourseIds = new Set(courses.map(c => c.id));
    
    // Filter out registrations for courses that no longer exist
    const initialLen = regs.length;
    regs = regs.filter(r => validCourseIds.has(r.courseId));
    
    if (regs.length !== initialLen) {
      saveItem(STORAGE_KEYS.REGISTRATIONS, regs);
    }
    return regs;
  },`;

content = content.replace(`  getRegistrations: (): CourseRegistration[] => {
    return loadItem<CourseRegistration[]>(STORAGE_KEYS.REGISTRATIONS, INITIAL_REGISTRATIONS);
  },`, replaceStr);

fs.writeFileSync(mockDataPath, content);
console.log('Registrations auto-healing logic added.');
