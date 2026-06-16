const API_URL = 'http://localhost:4000';
let currentUser = null;
let token = null;

// Initialize app
function init() {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
        token = savedToken;
        showDashboard();
    } else {
        showLogin();
    }
}

function showPage(pageId) {
    document.querySelectorAll('[class*="page"]').forEach(el => el.classList.add('hidden'));
    const page = document.getElementById(pageId);
    if (page) page.classList.remove('hidden');
}

// ==================== AUTH PAGES ====================

function showLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-container">
            <div class="card">
                <h1>Login</h1>
                <div id="loginError" class="error hidden"></div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="loginEmail" placeholder="your@email.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="loginPassword" placeholder="Password">
                </div>
                <button onclick="handleLogin()">Login</button>
                <button class="secondary" onclick="showRegister()">Register</button>
            </div>
        </div>
    `;
}

function showRegister() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-container">
            <div class="card">
                <h1>Register</h1>
                <div id="registerError" class="error hidden"></div>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="registerName" placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="registerEmail" placeholder="your@email.com">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="registerPassword" placeholder="Password">
                </div>
                <button onclick="handleRegister()">Register</button>
                <button class="secondary" onclick="showLogin()">Back to Login</button>
            </div>
        </div>
    `;
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    if (!email || !password) {
        errorDiv.textContent = 'Email and password required';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        console.log('Attempting login to:', `${API_URL}/auth/login`);
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Invalid credentials');
        }

        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showDashboard();
    } catch (err) {
        console.error('Login error:', err);
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const errorDiv = document.getElementById('registerError');

    if (!name || !email || !password) {
        errorDiv.textContent = 'All fields required';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        console.log('Attempting registration to:', `${API_URL}/auth/register`);
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        errorDiv.classList.add('hidden');
        alert('Registration successful! Please login.');
        showLogin();
    } catch (err) {
        console.error('Registration error:', err);
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

// ==================== DASHBOARD ====================

function showDashboard() {
    const app = document.getElementById('app');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    app.innerHTML = `
        <div class="header">
            <h1>🎓 School Attendance System</h1>
            <div class="user-info">
                <span>Welcome, <strong>${user.name || user.email}</strong></span>
                <button class="secondary" onclick="logout()">Logout</button>
            </div>
        </div>

        <div class="card">
            <h2>Main Menu</h2>
            <div class="dashboard-buttons">
                <button onclick="showAddStudent()">➕ Add Students</button>
                <button onclick="showAttendance()">✅ Check Attendance</button>
            </div>
            <div class="dashboard-buttons">
                <button onclick="showCreateClass()">📚 Create Class</button>
                <button onclick="showStudentsList()">📋 View All Students</button>
            </div>
            <div class="dashboard-buttons">
                <button onclick="showReports()" style="grid-column: 1 / -1;">📊 Monthly Reports</button>
            </div>
        </div>
    `;
}

// ==================== CREATE CLASS ====================

async function showCreateClass() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="header">
            <button class="secondary" onclick="showDashboard()">← Back</button>
            <h1>Create/Manage Classes</h1>
        </div>

        <div class="card">
            <h2>Add New Class</h2>
            <div id="classError" class="error hidden"></div>
            <div id="classSuccess" class="success hidden"></div>

            <input type="hidden" id="classId" value="">

            <div class="form-row">
                <div class="form-group">
                    <label>Class Name *</label>
                    <input type="text" id="className" placeholder="e.g. English 101">
                </div>
                <div class="form-group">
                    <label>Grade *</label>
                    <input type="text" id="grade" placeholder="e.g. 10">
                </div>
            </div>

            <div class="form-row full">
                <div class="form-group">
                    <label>Section *</label>
                    <input type="text" id="section" placeholder="e.g. A, B, C">
                </div>
            </div>

            <button onclick="handleSaveClass()">Save Class</button>
            <button class="secondary" onclick="clearClassForm()">Clear</button>
        </div>

        <div class="card">
            <h2>Classes Created</h2>
            <div id="classError2" class="error hidden"></div>
            <div id="classList" class="class-list"></div>
        </div>
    `;

    loadClasses();
}

async function loadClasses() {
    const listDiv = document.getElementById('classList');
    const errorDiv = document.getElementById('classError2');

    try {
        const res = await fetch(`${API_URL}/class`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load classes');

        const classes = await res.json();
        errorDiv.classList.add('hidden');

        if (classes.length === 0) {
            listDiv.innerHTML = '<div class="empty-state">No classes created yet</div>';
            return;
        }

        let html = '';
        classes.forEach(c => {
            html += `
                <div class="class-card">
                    <div class="class-info">
                        <h3>${c.className}</h3>
                        <p>Grade: ${c.grade} | Section: ${c.section}</p>
                        <small>Students: ${c.students.length}</small>
                    </div>
                    <div class="class-actions">
                        <button onclick="editClass(${c.id}, '${c.className}', '${c.grade}', '${c.section}')">Edit</button>
                        <button class="danger" onclick="deleteClass(${c.id})">Delete</button>
                    </div>
                </div>
            `;
        });

        listDiv.innerHTML = html;
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

async function handleSaveClass() {
    const classId = document.getElementById('classId').value;
    const className = document.getElementById('className').value;
    const grade = document.getElementById('grade').value;
    const section = document.getElementById('section').value;

    const errorDiv = document.getElementById('classError');
    const successDiv = document.getElementById('classSuccess');

    if (!className || !grade || !section) {
        errorDiv.textContent = 'All fields are required';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const method = classId ? 'PUT' : 'POST';
        const endpoint = classId ? `${API_URL}/class/${classId}` : `${API_URL}/class`;

        const res = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ className, grade, section })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to save class');

        successDiv.textContent = classId ? 'Class updated successfully!' : 'Class created successfully!';
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');

        setTimeout(() => {
            clearClassForm();
            loadClasses();
        }, 1500);
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

function editClass(id, className, grade, section) {
    document.getElementById('classId').value = id;
    document.getElementById('className').value = className;
    document.getElementById('grade').value = grade;
    document.getElementById('section').value = section;
    document.querySelector('button[onclick="handleSaveClass()"]').textContent = 'Update Class';
    window.scrollTo(0, 0);
}

function clearClassForm() {
    document.getElementById('classId').value = '';
    document.getElementById('className').value = '';
    document.getElementById('grade').value = '';
    document.getElementById('section').value = '';
    document.querySelector('button[onclick="handleSaveClass()"]').textContent = 'Save Class';
    document.getElementById('classError').classList.add('hidden');
    document.getElementById('classSuccess').classList.add('hidden');
}

async function deleteClass(id) {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
        const res = await fetch(`${API_URL}/class/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to delete class');

        alert('Class deleted successfully!');
        loadClasses();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ==================== ADD STUDENT ====================

async function showAddStudent() {
    const app = document.getElementById('app');
    
    // Load classes for dropdown
    let classOptions = '<option value="">-- Select a Class --</option>';
    try {
        const res = await fetch(`${API_URL}/class`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const classes = await res.json();
            classes.forEach(c => {
                classOptions += `<option value="${c.id}">${c.className} - Grade ${c.grade} Section ${c.section}</option>`;
            });
        }
    } catch (err) {
        console.error('Failed to load classes:', err);
    }

    app.innerHTML = `
        <div class="header">
            <button class="secondary" onclick="showDashboard()">← Back</button>
            <h1>Add New Student</h1>
        </div>

        <div class="card">
            <div id="addStudentError" class="error hidden"></div>
            <div id="addStudentSuccess" class="success hidden"></div>

            <div class="form-row">
                <div class="form-group">
                    <label>Last Name *</label>
                    <input type="text" id="lastName" placeholder="Smith">
                </div>
                <div class="form-group">
                    <label>First Name *</label>
                    <input type="text" id="firstName" placeholder="John">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Middle Name</label>
                    <input type="text" id="middleName" placeholder="Michael">
                </div>
                <div class="form-group">
                    <label>Age</label>
                    <input type="number" id="age" placeholder="15">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Birthday</label>
                    <input type="date" id="birthday">
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="text" id="phone" placeholder="+1-234-567-8900">
                </div>
            </div>

            <div class="form-row full">
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" id="address" placeholder="123 Main St, City, State">
                </div>
            </div>

            <div class="form-row full">
                <div class="form-group">
                    <label>Select Class</label>
                    <select id="classId">
                        ${classOptions}
                    </select>
                </div>
            </div>

            <button onclick="handleAddStudent()">Add Student</button>
            <button class="secondary" onclick="showDashboard()">Cancel</button>
        </div>
    `;
}

async function handleAddStudent() {
    const lastName = document.getElementById('lastName').value;
    const firstName = document.getElementById('firstName').value;
    const middleName = document.getElementById('middleName').value;
    const age = document.getElementById('age').value;
    const birthday = document.getElementById('birthday').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const classId = document.getElementById('classId').value;

    const errorDiv = document.getElementById('addStudentError');
    const successDiv = document.getElementById('addStudentSuccess');

    if (!lastName || !firstName) {
        errorDiv.textContent = 'Last Name and First Name are required';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        // First, create the student
        const res = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                lastName, firstName, middleName, age, birthday, phone, address
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to add student');

        // If a class was selected, add student to class
        if (classId) {
            try {
                const classRes = await fetch(`${API_URL}/class/${classId}/students/${data.id}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!classRes.ok) {
                    console.warn('Failed to add student to class');
                }
            } catch (err) {
                console.warn('Error adding student to class:', err);
            }
        }

        successDiv.textContent = 'Student added successfully!';
        successDiv.classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('lastName').value = '';
            document.getElementById('firstName').value = '';
            document.getElementById('middleName').value = '';
            document.getElementById('age').value = '';
            document.getElementById('birthday').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('address').value = '';
            document.getElementById('classId').value = '';
            successDiv.classList.add('hidden');
        }, 2000);
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

// ==================== ATTENDANCE ====================

async function showAttendance() {
    const app = document.getElementById('app');
    const today = new Date().toISOString().split('T')[0];
    
    // Load classes for dropdown
    let classOptions = '<option value="">-- All Students --</option>';
    try {
        const res = await fetch(`${API_URL}/class`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const classes = await res.json();
            classes.forEach(c => {
                classOptions += `<option value="${c.id}">${c.className} - Grade ${c.grade} Section ${c.section}</option>`;
            });
        }
    } catch (err) {
        console.error('Failed to load classes:', err);
    }

    app.innerHTML = `
        <div class="header">
            <button class="secondary" onclick="showDashboard()">← Back</button>
            <h1>Check Attendance</h1>
        </div>

        <div class="card">
            <div class="attendance-container">
                <div class="attendance-controls">
                    <h3>Select Class & Date</h3>
                    
                    <label style="font-weight: 600; margin-bottom: 8px; display: block;">Class</label>
                    <select id="attendanceClass" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 2px solid #ddd; border-radius: 5px;">
                        ${classOptions}
                    </select>
                    
                    <label style="font-weight: 600; margin-bottom: 8px; display: block;">Date</label>
                    <input type="date" id="attendanceDate" value="${today}" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 2px solid #ddd; border-radius: 5px;">
                    
                    <button onclick="loadAttendance()" style="width: 100%; margin-top: 15px;">Load</button>
                    <button onclick="saveAttendance()" style="width: 100%; margin-top: 10px;">Save Attendance</button>
                    <button class="secondary" onclick="showDashboard()" style="width: 100%; margin-top: 10px;">Back</button>
                </div>

                <div>
                    <h3>Students</h3>
                    <div id="attendanceError" class="error hidden"></div>
                    <div id="attendanceList" class="attendance-list"></div>
                </div>
            </div>
        </div>
    `;

    loadAttendance();
}

async function loadAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const classId = document.getElementById('attendanceClass').value;
    const errorDiv = document.getElementById('attendanceError');
    const listDiv = document.getElementById('attendanceList');

    if (!date) {
        errorDiv.textContent = 'Please select a date';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        let url = `${API_URL}/attendance?date=${date}`;
        
        // If a class is selected, get students from that class
        let students = [];
        
        if (classId) {
            // Get students from the selected class
            const classRes = await fetch(`${API_URL}/class/${classId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!classRes.ok) throw new Error('Failed to load class');
            
            const classData = await classRes.json();
            
            // Get attendance records for all class students on this date
            const attendanceRes = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!attendanceRes.ok) throw new Error('Failed to load attendance');
            
            const allAttendance = await attendanceRes.json();
            
            // Filter to only show students in this class
            students = classData.students.map(cs => {
                const attendance = allAttendance.find(a => a.id === cs.student.id);
                return {
                    id: cs.student.id,
                    firstName: cs.student.firstName,
                    lastName: cs.student.lastName,
                    middleName: cs.student.middleName,
                    present: attendance ? attendance.present : false
                };
            });
        } else {
            // Get all students
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to load attendance');

            students = await res.json();
        }

        errorDiv.classList.add('hidden');

        if (students.length === 0) {
            listDiv.innerHTML = '<div class="empty-state">No students in this class or no students added yet</div>';
            return;
        }

        let html = '';
        students.forEach(s => {
            html += `
                <div class="student-item">
                    <input type="checkbox" id="student_${s.id}" ${s.present ? 'checked' : ''}>
                    <label for="student_${s.id}">${s.lastName}, ${s.firstName} ${s.middleName ? s.middleName : ''}</label>
                </div>
            `;
        });

        listDiv.innerHTML = html;
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

async function saveAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const errorDiv = document.getElementById('attendanceError');
    const checkboxes = document.querySelectorAll('#attendanceList input[type="checkbox"]');

    if (checkboxes.length === 0) {
        errorDiv.textContent = 'No students loaded. Please select a date and class first.';
        errorDiv.classList.remove('hidden');
        return;
    }

    const entries = Array.from(checkboxes).map(cb => ({
        studentId: Number(cb.id.split('_')[1]),
        present: cb.checked
    }));

    try {
        const res = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ date, entries })
        });

        if (!res.ok) throw new Error('Failed to save attendance');

        alert('Attendance saved successfully!');
    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    }
}

// ==================== VIEW STUDENTS ====================

async function showStudentsList() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="header">
            <button class="secondary" onclick="showDashboard()">← Back</button>
            <h1>All Students</h1>
        </div>

        <div class="card">
            <div id="studentError" class="error hidden"></div>
            <div id="studentsList"></div>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load students');

        const students = await res.json();

        if (students.length === 0) {
            document.getElementById('studentsList').innerHTML = '<div class="empty-state">No students added yet</div>';
            return;
        }

        let html = '<table><thead><tr><th>ID</th><th>Last Name</th><th>First Name</th><th>Middle Name</th><th>Age</th><th>Birthday</th><th>Phone</th><th>Address</th></tr></thead><tbody>';

        students.forEach(s => {
            html += `
                <tr>
                    <td>${s.id}</td>
                    <td>${s.lastName}</td>
                    <td>${s.firstName}</td>
                    <td>${s.middleName || '-'}</td>
                    <td>${s.age || '-'}</td>
                    <td>${s.birthday ? new Date(s.birthday).toLocaleDateString() : '-'}</td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.address || '-'}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        document.getElementById('studentsList').innerHTML = html;
    } catch (err) {
        document.getElementById('studentError').textContent = err.message;
        document.getElementById('studentError').classList.remove('hidden');
    }
}

// ==================== MONTHLY REPORTS ====================

function showReports() {
    const app = document.getElementById('app');
    const today = new Date();

    app.innerHTML = `
        <div class="header">
            <button class="secondary" onclick="showDashboard()">← Back</button>
            <h1>Monthly Reports</h1>
        </div>

        <div class="card">
            <h3>Select Month and Year</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Month</label>
                    <select id="reportMonth">
                        ${[...Array(12).keys()].map(m => {
                            const month = m + 1;
                            const selected = month === today.getMonth() + 1 ? 'selected' : '';
                            return `<option value="${month}" ${selected}>${new Date(2000, m, 1).toLocaleString('default', { month: 'long' })}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Year</label>
                    <input type="number" id="reportYear" value="${today.getFullYear()}" min="2020">
                </div>
            </div>

            <button onclick="exportAttendanceReport()">📥 Export to Excel</button>
            <button class="secondary" onclick="showDashboard()">Back</button>
        </div>
    `;
}

async function exportAttendanceReport() {
    const month = document.getElementById('reportMonth').value;
    const year = document.getElementById('reportYear').value;

    try {
        const res = await fetch(`${API_URL}/report/monthly?year=${year}&month=${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to generate report');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${year}_${month}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ==================== LOGOUT ====================

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    token = null;
    currentUser = null;
    showLogin();
}

// Initialize
init();
