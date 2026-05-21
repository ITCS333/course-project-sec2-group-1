const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageContainer = document.getElementById("message-container");

function displayMessage(message, type) {
  messageContainer.textContent = message;
  messageContainer.className = type;
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!isValidEmail(email)) {
    displayMessage("Invalid email format.", "error");
    return;
  }

  if (!isValidPassword(password)) {
    displayMessage("Password must be at least 8 characters.", "error");
    return;
  }

  try {
    const response = await fetch("api/index.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {
      displayMessage("Login successful!", "success");

      setTimeout(function () {
        if (Number(result.user.is_admin) === 1) {
          window.location.href = "../admin/admin.html";
        } else {
          window.location.href = "../../index.html";
        }
      }, 800);
    } else {
      displayMessage(result.message, "error");
    }
  } catch (error) {
    displayMessage("Login failed. Please try again.", "error");
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}
