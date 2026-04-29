let users = [];

const userTableBody = document.getElementById("user-table-body");
const addUserForm = document.getElementById("add-user-form");
const passwordForm = document.getElementById("password-form");
const searchInput = document.getElementById("search-input");
const tableHeaders = document.querySelectorAll("#user-table thead th");

function createUserRow(user) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${user.name}</td>
    <td>${user.email}</td>
    <td>${Number(user.is_admin) === 1 ? "Yes" : "No"}</td>
    <td>
      <button class="edit-btn" data-id="${user.id}">Edit</button>
      <button class="delete-btn" data-id="${user.id}">Delete</button>
    </td>
  `;

  return tr;
}

function renderTable(usersArray) {
  if (!userTableBody) return;

  userTableBody.innerHTML = "";

  usersArray.forEach(function (user) {
    userTableBody.appendChild(createUserRow(user));
  });
}

async function loadUsersAndInitialize() {
  try {
    const response = await fetch("../api/index.php");
    const result = await response.json();

    users = result.data || result.users || result || [];

    renderTable(users);
  } catch (error) {
    users = [];
    renderTable(users);
  }
}

async function handleAddUser(event) {
  event.preventDefault();

  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const password = document.getElementById("default-password").value.trim();
  const is_admin = Number(document.getElementById("is-admin").value);

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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: name,
      email: email,
      password: password,
      is_admin: is_admin
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    if (addUserForm) addUserForm.reset();
    await loadUsersAndInitialize();
  } else {
    alert(data.message || "An error occurred. Please try again.");
  }
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    })
  });

  const data = await response.json();

  if (response.ok && data.success) {
    alert("Password updated successfully!");
    if (passwordForm) passwordForm.reset();
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
    }
  }

  if (target.classList.contains("edit-btn")) {
    const user = users.find(function (u) {
      return u.id == id;
    });

    if (!user) return;

    const newName = prompt("Edit name:", user.name);
    if (newName === null) return;

    const newEmail = prompt("Edit email:", user.email);
    if (newEmail === null) return;

    const newIsAdmin = prompt("Admin? (1 = Yes, 0 = No):", user.is_admin);
    if (newIsAdmin === null) return;

    const response = await fetch("../api/index.php", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: user.id,
        name: newName.trim(),
        email: newEmail.trim(),
        is_admin: Number(newIsAdmin)
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      user.name = newName.trim();
      user.email = newEmail.trim();
      user.is_admin = Number(newIsAdmin);
      renderTable(users);
    }
  }
}

function handleSearch() {
  const term = searchInput.value.toLowerCase().trim();

  const filtered = users.filter(function (user) {
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  renderTable(filtered);
}

function handleSort(event) {
  const columnIndex = event.currentTarget.cellIndex;
  const columns = ["name", "email", "is_admin"];
  const column = columns[columnIndex];

  if (!column) return;

  users.sort(function (a, b) {
    if (a[column] > b[column]) return 1;
    if (a[column] < b[column]) return -1;
    return 0;
  });

  renderTable(users);
}

if (addUserForm) {
  addUserForm.addEventListener("submit", handleAddUser);
}

if (passwordForm) {
  passwordForm.addEventListener("submit", handleChangePassword);
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

window.users = users;
window.createUserRow = createUserRow;
window.renderTable = renderTable;
window.loadUsersAndInitialize = loadUsersAndInitialize;
window.handleAddUser = handleAddUser;
window.handleChangePassword = handleChangePassword;
window.handleTableClick = handleTableClick;
window.handleSearch = handleSearch;
window.handleSort = handleSort;

loadUsersAndInitialize();
