const fs = require('fs');
const mockDataPath = 'src/services/db.ts';
let content = fs.readFileSync(mockDataPath, 'utf8');

const replaceStr = `  getStudents: (): StudentProfile[] => {
    let students = loadItem<StudentProfile[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    // Auto-heal logic: if a student's enrolled courses are empty or contain invalid IDs, re-enroll them
    const courses = db.getCourses();
    let needsSave = false;
    
    students = students.map(student => {
      const validCourses = student.enrolledCourseIds.filter(cid => courses.some(c => c.id === cid));
      if (validCourses.length === 0 && courses.length > 0) {
        // Find courses for their level
        const levelCourses = courses.filter(c => c.level === student.level);
        if (levelCourses.length > 0) {
          student.enrolledCourseIds = levelCourses.map(c => c.id);
          needsSave = true;
        }
      } else if (validCourses.length !== student.enrolledCourseIds.length) {
        student.enrolledCourseIds = validCourses;
        needsSave = true;
      }
      return student;
    });

    if (needsSave) {
      saveItem(STORAGE_KEYS.STUDENTS, students);
    }
    return students;
  },`;

content = content.replace(`  getStudents: (): StudentProfile[] => {
    return loadItem<StudentProfile[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  },`, replaceStr);

fs.writeFileSync(mockDataPath, content);
console.log('Student auto-healing logic added.');
