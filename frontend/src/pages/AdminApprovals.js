import React, { useState, useEffect } from "react";

function AdminApprovals() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    // Example dummy data (replace with backend later)
    const pendingUsers = [
      { id: 1, name: "Teacher John", role: "Teacher" },
      { id: 2, name: "Employee Sarah", role: "Employee" }
    ];
    setRequests(pendingUsers);
  }, []);

  const handleApprove = (id) => {
    setRequests(requests.filter((user) => user.id !== id));
    alert("Approved Successfully");
  };

  return (
    <div>
      <h2>Pending Approvals</h2>

      {requests.length === 0 ? (
        <p>No Pending Requests</p>
      ) : (
        requests.map((user) => (
          <div key={user.id} style={{ marginBottom: "10px" }}>
            <span>{user.name} - {user.role}</span>
            <button onClick={() => handleApprove(user.id)}>
              Approve
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default AdminApprovals;
