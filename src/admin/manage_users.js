let users = [];

const userTableBody = document.getElementById("user-table-body");
const addUserForm = document.getElementById("add-user-form");
const passwordForm = document.getElementById("password-form");
const searchInput = document.getElementById("search-input");
const tableHeaders = document.querySelectorAll("#user-table thead th");

function createUserRow(user) {
  const tr = document.createElement("tr");

  const nameTd = document.createElement("td");
  nameTd.textContent = user.name;

  const emailTd = document.createElement("td");
  emailTd.textContent = user.email;

  const adminTd = document.createElement("td");
  adminTd.textContent = user.is_admin === 1 ? "Yes" : "No";

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

  tr.appendChild(nameTd);
  tr.appendChild(emailTd);
  tr.appendChild(adminTd);
  tr.appendChild(actionsTd);

  return tr;
}

function renderTable(usersArray) {
  userTableBody.innerHTML = "";

  usersArray.forEach(function (user) {
    const row = createUserRow(user);
    userTableBody.appendChild(row);
  });
}

async function handleChangePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("current-password").value;
  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (newPassword.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  const response = await fetch("../api/index.php?action=change_password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    })
  });

  const data = await response.json();

  if (data.success) {
    alert("Password updated successfully!");
    passwordForm.reset();
  } else {
    alert(data.message || "An error occurred. Please try again.");
  }
}

async function handleAddUser(event) {
  event.preventDefault();

  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const password = document.getElementById("default-password").value.trim();
  const is_admin = parseInt(document.getElementById("is-admin").value);

  if (!name || !email || !password) {
    alert("Please fill out all required fields.");
    return;
  }

  if (password.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  const response = await fetch("../api/index.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      email: email,
      password: password,
      is_admin: is_admin
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    addUserForm.reset();
    await loadUsersAndInitialize();
  } else {
    alert(data.message || "An error occurred. Please try again.");
  }
}

async function handleTableClick(event) {
  const target = event.target;
  const id = target.dataset.id;

  if (target.classList.contains("delete-btn")) {
    const response = await fetch("../api/index.php?id=" + id, {
      method: "DELETE"
    });

    const data = await response.json();

    if (response.ok && data.success) {
      users = users.filter(function (user) {
        return user.id != id;
      });
      renderTable(users);
    } else {
      alert(data.message || "Failed to delete user.");
    }
  }

  if (target.classList.contains("edit-btn")) {
    const user = users.find(function (u) {
      return u.id == id;
    });

    if (!user) {
      return;
    }

    const newName = prompt("Edit name:", user.name);
    if (newName === null) {
      return;
    }

    const newEmail = prompt("Edit email:", user.email);
    if (newEmail === null) {
      return;
    }

    const newIsAdmin = prompt("Admin? (1 = Yes, 0 = No):", user.is_admin);
    if (newIsAdmin === null) {
      return;
    }

    const response = await fetch("../api/index.php", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        name: newName.trim(),
        email: newEmail.trim(),
        is_admin: parseInt(newIsAdmin)
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      users = users.map(function (u) {
        if (u.id == id) {
          return {
            id: u.id,
            name: newName.trim(),
            email: newEmail.trim(),
            is_admin: parseInt(newIsAdmin)
          };
        }
        return u;
      });

      renderTable(users);
    } else {
      alert(data.message || "Failed to update user.");
    }
  }
}

function handleSearch() {
  const term = searchInput.value.toLowerCase().trim();

  const filteredUsers = users.filter(function (user) {
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  renderTable(filteredUsers);
}

function handleSort(event) {
  const columnIndex = event.currentTarget.cellIndex;

  const columns = ["name", "email", "is_admin"];
  const column = columns[columnIndex];

  if (!column) {
    return;
  }

  users.sort(function (a, b) {
    if (a[column] > b[column]) {
      return 1;
    }

    if (a[column] < b[column]) {
      return -1;
    }

    return 0;
  });

  renderTable(users);
}

async function loadUsersAndInitialize() {
  const response = await fetch("../api/index.php");
  const result = await response.json();

  users = result.data || result.users || [];

  renderTable(users);
}

if (passwordForm) {
  passwordForm.addEventListener("submit", handleChangePassword);
}

if (addUserForm) {
  addUserForm.addEventListener("submit", handleAddUser);
}

if (userTableBody) {
  userTableBody.addEventListener("click", handleTableClick);
}

if (searchInput) {
  searchInput.addEventListener("input", handleSearch);
}

tableHeaders.forEach(function (th) {
  th.addEventListener("click", handleSort);
});

loadUsersAndInitialize();
