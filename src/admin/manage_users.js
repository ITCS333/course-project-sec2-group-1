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
  adminTd.textContent = Number(user.is_admin) === 1 ? "Yes" : "No";

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
    userTableBody.appendChild(createUserRow(user));
  });
}

function handleChangePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("current-password");
  const newPassword = document.getElementById("new-password");
  const confirmPassword = document.getElementById("confirm-password");

  if (newPassword.value !== confirmPassword.value) {
    alert("Passwords do not match.");
    return;
  }

  if (newPassword.value.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
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

  await fetch("../api/index.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, is_admin })
  });
}

async function handleTableClick(event) {
  const target = event.target;
  const id = target.dataset.id;

  if (target.classList.contains("delete-btn")) {
    await fetch("../api/index.php?id=" + id, {
      method: "DELETE"
    });
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

    await fetch("../api/index.php", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        name: newName.trim(),
        email: newEmail.trim(),
        is_admin: Number(newIsAdmin)
      })
    });
  }
}

function handleSearch() {
  const term = searchInput.value.toLowerCase().trim();

  if (!term) {
    renderTable(users);
    return;
  }

  const filtered = users.filter(function (user) {
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  renderTable(filtered);
}

function handleSort(event) {
  const th = event.currentTarget;
  const columnIndex = th.cellIndex;
  const columns = ["name", "email", "is_admin"];
  const column = columns[columnIndex];

  if (!column) return;

  const currentDir = th.getAttribute("data-sort-dir");
  const newDir = currentDir === "asc" ? "desc" : "asc";

  th.setAttribute("data-sort-dir", newDir);

  users.sort(function (a, b) {
    if (column === "is_admin") {
      return newDir === "asc"
        ? Number(a.is_admin) - Number(b.is_admin)
        : Number(b.is_admin) - Number(a.is_admin);
    }

    return newDir === "asc"
      ? a[column].localeCompare(b[column])
      : b[column].localeCompare(a[column]);
  });

  renderTable(users);
}

async function loadUsersAndInitialize() {
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

  const response = await fetch("../api/index.php");
  const result = await response.json();

  users = result.data || result.users || [];

  renderTable(users);
}

loadUsersAndInitialize();
