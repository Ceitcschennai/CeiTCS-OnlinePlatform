require('dotenv').config();
const mongoose = require('mongoose');
const Assignment = require('./models/Assignment');
const Employee = require('./models/Employee');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  }
  
  const studentId = '6a26a03cde18b874c38a1c05';
  const employee = await Employee.findById(studentId);
  console.log('employee found:', !!employee);
  if (employee) {
    console.log('courseCode:', employee.courseCode);
    console.log('enrolledSubjects:', JSON.stringify(employee.enrolledSubjects));
  }
  
  let studentCourseCodes = [];
  if (employee) {
    if (employee.courseCode) studentCourseCodes.push(employee.courseCode);
    if (Array.isArray(employee.enrolledSubjects)) {
      employee.enrolledSubjects.forEach(subject => {
        if (subject.courseCode) studentCourseCodes.push(subject.courseCode);
      });
    }
  }
  console.log('studentCourseCodes:', studentCourseCodes);
  
  let query = {};
  if (studentCourseCodes.length > 0) {
    query.courseCode = { $in: studentCourseCodes };
  }
  console.log('query:', JSON.stringify(query));
  
  const assignments = await Assignment.find(query).sort({ dueDate: 1 });
  console.log('assignments count (filtered):', assignments.length);
  
  console.log('=== FILTERED ASSIGNMENTS ===');
  for (const assignment of assignments) {
    console.log('---');
    console.log('assignment id:', assignment._id);
    console.log('assignment title:', assignment.title);
    console.log('assignment courseCode:', assignment.courseCode);
    console.log('submissions count:', assignment.submissions.length);
    for (const sub of assignment.submissions) {
      console.log('  sub.studentId type:', typeof sub.studentId);
      console.log('  sub.studentId value:', sub.studentId);
      console.log('  sub.studentId.toString():', sub.studentId.toString());
      console.log('  matches?', sub.studentId.toString() === studentId);
    }
    const studentSubmissions = assignment.submissions.filter(
      sub => sub.studentId.toString() === studentId
    );
    const latestSubmission = studentSubmissions.length > 0
      ? studentSubmissions[studentSubmissions.length - 1]
      : null;
    
    const status = latestSubmission
      ? (latestSubmission.resubmissionStatus === 'Resubmission Required' ? 'Resubmission Required' : 'Submitted')
      : 'Pending';
    
    console.log('studentSubmissions count:', studentSubmissions.length);
    console.log('latestSubmission resubmissionStatus:', latestSubmission ? latestSubmission.resubmissionStatus : 'N/A');
    console.log('computed status:', status);
  }
  
  await mongoose.disconnect();
  
  // Need to reconnect
  await mongoose.connect(process.env.MONGODB_URI);
  const allAssignments = await Assignment.find({}).sort({ dueDate: 1 });
  console.log('=== ALL ASSIGNMENTS ===');
  console.log('all assignments count:', allAssignments.length);
  for (const assignment of allAssignments) {
    const studentSubmissions = assignment.submissions.filter(
      sub => sub.studentId.toString() === studentId
    );
    if (studentSubmissions.length > 0 || !assignment.courseCode) {
      console.log('---');
      console.log('assignment id:', assignment._id);
      console.log('assignment title:', assignment.title);
      console.log('assignment courseCode:', assignment.courseCode || 'NONE');
      console.log('studentSubmissions count:', studentSubmissions.length);
    }
  }
  
  await mongoose.disconnect();
}

test();
