/*
  Requirement: Add interactivity and data management to the Admin Portal.

  Instructions:
  1. This file is loaded by the <script src="manage_users.js" defer> tag in manage_users.html.
     The 'defer' attribute guarantees the DOM is fully parsed before this script runs.
  2. Implement the JavaScript functionality as described in the TODO comments.
  3. All data is fetched from and written to the PHP API at '../api/index.php'.
     The local 'users' array is used only as a client-side cache for search and sort.
*/

// --- Global Data Store ---
// This array will be populated with data fetched from the PHP API.
// It acts as a client-side cache so search and sort work without extra network calls.
let users = [];

// --- Element Selections ---
const userTableBody = document.getElementById("user-table-body");
const addUserForm = document.getElementById("add-user-form");
const passwordForm = document.getElementById("password-form");
const searchInput = document.getElementById("search-input");
const tableHeaders = document.querySelectorAll("#user-table thead th");

// --- Functions ---

/**
 * Creates and returns a <tr> element for a given user object.
 */
function createUserRow(user) {
  const tr = document.createElement("tr");

  // Name cell
  const nameTd = document.createElement("td");
  nameTd.textContent = user.name;

  // Email cell
  const emailTd = document.createElement("td");
  emailTd.textContent = user.email;

  // Admin status cell
  const adminTd = document.createElement("td");
  adminTd.textContent = user.is_admin === 1 ? "Yes" : "No";

  // Actions cell
  const actionsTd = document.createElement("td");

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.classList.add("edit-btn");
  editBtn.dataset.id = user.id;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.classList.add("delete-btn");
  deleteBtn.dataset.id = user.id;

  actionsTd.appendChild(editBtn);
  actionsTd.appendChild(deleteBtn);

  // Assemble the row
  tr.appendChild(nameTd);
  tr.appendChild(emailTd);
  tr.appendChild(adminTd);
  tr.appendChild(actionsTd);

  return tr;
}


function renderTable(usersArray) {
  // 1. Clear the table body
  userTableBody.innerHTML = "";

  // 2 & 3. Loop and append a row for each user
  usersArray.forEach(user => {
    const row = createUserRow(user);
    userTableBody.appendChild(row);
  });
}



  async function handleChangePassword(event) {
  event.preventDefault();

  // 2. Get input values
  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  // 3. Client-side validation
  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (newPassword.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  // 4. Send POST request to the API
  try {
    const response = await fetch("../api/index.php?action=change_password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: loggedInUserId,        // the currently logged-in admin's id
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    const data = await response.json();

    // 5. On success
    if (response.ok && data.success) {
      alert("Password updated successfully!");
      document.getElementById("current-password").value = "";
      document.getElementById("new-password").value = "";
      document.getElementById("confirm-password").value = "";
    } else {
      // 6. On failure
      alert(data.message || "An error occurred. Please try again.");
    }

  } catch (error) {
    alert("Network error: " + error.message);
  }
}


async function handleAddUser(event) {
  event.preventDefault();

  // 2. Get input values
  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const password = document.getElementById("default-password").value.trim();
  const is_admin = document.getElementById("is-admin").value;

  // 3. Client-side validation
  if (!name || !email || !password) {
    alert("Please fill out all required fields.");
    return;
  }

  if (password.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  // 4. Send POST request to the API
  try {
    const response = await fetch("../api/index.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, is_admin }),
    });

    const data = await response.json();

    // 5. On success (HTTP 201)
    if (response.status === 201) {
      await loadUsersAndInitialize();

      // 6. Clear the form
      document.getElementById("user-name").value = "";
      document.getElementById("user-email").value = "";
      document.getElementById("default-password").value = "";
      document.getElementById("is-admin").value = "0";

    } else {
      // 7. On failure
      alert(data.message || "An error occurred. Please try again.");
    }

  } catch (error) {
    alert("Network error: " + error.message);
  }
}

async function handleTableClick(event) {
  const target = event.target;
  const id = target.dataset.id;

  // 1 & 2. Handle Delete button
  if (target.classList.contains("delete-btn")) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch("../api/index.php?id=" + id, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // Remove from local array and re-render
        users = users.filter(user => user.id != id);
        renderTable(users);
      } else {
        alert(data.message || "Failed to delete user.");
      }

    } catch (error) {
      alert("Network error: " + error.message);
    }
  }

  // 3. Handle Edit button
  if (target.classList.contains("edit-btn")) {
    const user = users.find(u => u.id == id);
    if (!user) return;

    const newName = prompt("Edit name:", user.name);
    if (newName === null) return; // user cancelled

    const newEmail = prompt("Edit email:", user.email);
    if (newEmail === null) return;

    const newIsAdmin = prompt("Admin? (1 = Yes, 0 = No):", user.is_admin);
    if (newIsAdmin === null) return;

    try {
      const response = await fetch("../api/index.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          name: newName.trim(),
          email: newEmail.trim(),
          is_admin: parseInt(newIsAdmin),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local array and re-render
        users = users.map(u =>
          u.id == id
            ? { ...u, name: newName.trim(), email: newEmail.trim(), is_admin: parseInt(newIsAdmin) }
            : u
        );
        renderTable(users);
      } else {
        alert(data.message || "Failed to update user.");
      }

    } catch (error) {
      alert("Network error: " + error.message);
    }
  }
}

function handleSearch() {
  // 1. Get search term in lowercase
  const term = searchInput.value.toLowerCase().trim();

  // 2. If empty, show all users
  if (!term) {
    renderTable(users);
    return;
  }

  // 3. Filter by name or email
  const filtered = users.filter(user =>
    user.name.toLowerCase().includes(term) ||
    user.email.toLowerCase().includes(term)
  );

  // 4. Render the filtered results
  renderTable(filtered);
}

function handleSort(event) {
  const th = event.currentTarget;

  // 1. Identify which column was clicked
  const cellIndex = th.cellIndex;

  // 2. Map index to property name
  const columnMap = {
    0: "name",
    1: "email",
    2: "is_admin",
  };
  const column = columnMap[cellIndex];
  if (!column) return; // index 3 is "Actions" — not sortable

  // 3. Toggle sort direction
  const currentDir = th.getAttribute("data-sort-dir");
  const newDir = currentDir === "asc" ? "desc" : "asc";
  th.setAttribute("data-sort-dir", newDir);

  // 4 & 5. Sort users array in place
  users.sort((a, b) => {
    if (column === "is_admin") {
      // Numeric comparison
      return newDir === "asc"
        ? a.is_admin - b.is_admin
        : b.is_admin - a.is_admin;
    } else {
      // String comparison
      return newDir === "asc"
        ? a[column].localeCompare(b[column])
        : b[column].localeCompare(a[column]);
    }
  });

  // 6. Re-render the table
  renderTable(users);
}
async function loadUsersAndInitialize() {
  // 1. Send GET request to the API
  try {
    const response = await fetch("../api/index.php");

    // 2. Check if response is ok
    if (!response.ok) {
      console.error("Failed to fetch users:", response.status);
      alert("Failed to load users. Please try again.");
      return;
    }

    // 3. Parse JSON response
    const result = await response.json();

    // 4. Assign data to global users array
    users = result.data;

    // 5. Render the table
    renderTable(users);

  } catch (error) {
    console.error("Network error:", error);
    alert("Network error: " + error.message);
    return;
  }

  // 6. Attach event listeners (once: true prevents duplicates on re-calls)
  if (passwordForm) {
    passwordForm.addEventListener("submit", handleChangePassword, { once: true });
  }

  if (addUserForm) {
    addUserForm.addEventListener("submit", handleAddUser, { once: true });
  }

  if (userTableBody) {
    userTableBody.addEventListener("click", handleTableClick, { once: true });
  }

  if (searchInput) {
    searchInput.addEventListener("input", handleSearch, { once: true });
  }

  tableHeaders.forEach(th => {
    th.addEventListener("click", handleSort, { once: true });
  });
}

// --- Initial Page Load ---
loadUsersAndInitialize();
