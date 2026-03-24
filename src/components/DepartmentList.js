import React, { useState, useEffect } from "react";
import axios from "axios";
 // <— add this
import "./department.css";
function DepartmentList() {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/departments")
      .then((res) => setDepartments(res.data))
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className="dept-page">
      <h2 className="dept-title">Departments</h2>

      <div className="dept-card">
        <table className="dept-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dep) => (
              <tr key={dep._id}>
                <td className="dept-name">{dep.name}</td>
                <td className="dept-email">{dep.email}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {departments.length === 0 && (
          <div className="empty">No departments found.</div>
        )}
      </div>
    </div>
  );
}

export default DepartmentList;