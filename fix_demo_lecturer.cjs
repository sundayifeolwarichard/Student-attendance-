const fs = require('fs');
const mockDataPath = 'src/services/mockData.ts';
let content = fs.readFileSync(mockDataPath, 'utf8');

// Update lecturer 1 courses
content = content.replace("assignedCourseIds: ['course_csc401', 'course_csc403', 'course_csc405']", "assignedCourseIds: ['course_com311', 'course_com411']");

// Update COM 311 and COM 411 to point to Dr. Demo Lecturer
content = content.replace(
  "{ id: 'course_com311', code: 'COM 311', title: 'Operating Systems I', units: 3, department: 'Computer Science', level: 'HND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' }",
  "{ id: 'course_com311', code: 'COM 311', title: 'Operating Systems I', units: 3, department: 'Computer Science', level: 'HND I', semester: 'First Semester', academicSession: '2025/2026', lecturerId: 'lecturer_1', lecturerName: 'Dr. Demo Lecturer' }"
);

content = content.replace(
  "{ id: 'course_com411', code: 'COM 411', title: 'Software Engineering', units: 3, department: 'Computer Science', level: 'HND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: '', lecturerName: '' }",
  "{ id: 'course_com411', code: 'COM 411', title: 'Software Engineering', units: 3, department: 'Computer Science', level: 'HND II', semester: 'First Semester', academicSession: '2025/2026', lecturerId: 'lecturer_1', lecturerName: 'Dr. Demo Lecturer' }"
);

fs.writeFileSync(mockDataPath, content);
console.log('Demo lecturer updated.');
