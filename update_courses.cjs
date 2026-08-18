const fs = require('fs');

const mockDataPath = 'src/services/mockData.ts';
let content = fs.readFileSync(mockDataPath, 'utf8');

const coursesStart = content.indexOf('export const INITIAL_COURSES: Course[] = [');
const registrationsStart = content.indexOf('export const INITIAL_REGISTRATIONS: CourseRegistration[] = [');

const newCourses = `export const INITIAL_COURSES: Course[] = [
  // ND I Courses
  { id: 'course_com111', code: 'COM 111', title: 'Introduction to Computing', units: 3, department: 'Computer Science', level: 'ND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com112', code: 'COM 112', title: 'Introduction to Digital Electronics', units: 2, department: 'Computer Science', level: 'ND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com113', code: 'COM 113', title: 'Introduction to Programming', units: 3, department: 'Computer Science', level: 'ND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_mth111', code: 'MTH 111', title: 'Logic and Linear Algebra', units: 2, department: 'Computer Science', level: 'ND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_gns101', code: 'GNS 101', title: 'Use of English I', units: 2, department: 'Computer Science', level: 'ND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },

  // ND II Courses
  { id: 'course_com211', code: 'COM 211', title: 'Object Oriented Programming', units: 3, department: 'Computer Science', level: 'ND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com212', code: 'COM 212', title: 'Introduction to Systems Programming', units: 2, department: 'Computer Science', level: 'ND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com213', code: 'COM 213', title: 'Commercial Programming Language', units: 3, department: 'Computer Science', level: 'ND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com214', code: 'COM 214', title: 'File Organization and Management', units: 2, department: 'Computer Science', level: 'ND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com215', code: 'COM 215', title: 'Computer Packages I', units: 3, department: 'Computer Science', level: 'ND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },

  // HND I Courses
  { id: 'course_com311', code: 'COM 311', title: 'Operating Systems I', units: 3, department: 'Computer Science', level: 'HND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com312', code: 'COM 312', title: 'Database Design I', units: 3, department: 'Computer Science', level: 'HND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com313', code: 'COM 313', title: 'Computer Programming Using C++', units: 3, department: 'Computer Science', level: 'HND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com314', code: 'COM 314', title: 'Computer Architecture', units: 3, department: 'Computer Science', level: 'HND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com315', code: 'COM 315', title: 'Python Programming', units: 3, department: 'Computer Science', level: 'HND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },

  // HND II Courses
  { id: 'course_com411', code: 'COM 411', title: 'Software Engineering', units: 3, department: 'Computer Science', level: 'HND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com412', code: 'COM 412', title: 'Computer Networks', units: 3, department: 'Computer Science', level: 'HND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com413', code: 'COM 413', title: 'Project Management', units: 2, department: 'Computer Science', level: 'HND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com414', code: 'COM 414', title: 'Compiler Construction', units: 3, department: 'Computer Science', level: 'HND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
  { id: 'course_com415', code: 'COM 415', title: 'Data Communication and Networks', units: 3, department: 'Computer Science', level: 'HND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' },
];\n\n`;

content = content.substring(0, coursesStart) + newCourses + content.substring(registrationsStart);
fs.writeFileSync(mockDataPath, content);
console.log('Courses updated successfully.');
