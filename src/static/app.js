document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");
  const loggedInInfo = document.getElementById("logged-in-info");
  const usernameDisplay = document.getElementById("username-display");
  const authNotice = document.getElementById("auth-notice");

  let authToken = localStorage.getItem("authToken") || "";
  let isAuthenticated = false;

  // Check authentication status on load
  checkAuth();

  // Login button click
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  // Logout button click
  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch(`/logout?token=${encodeURIComponent(authToken)}`, {
        method: "POST",
      });

      if (response.ok) {
        authToken = "";
        localStorage.removeItem("authToken");
        isAuthenticated = false;
        updateAuthUI();
        showMessage("Logged out successfully", "success");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        localStorage.setItem("authToken", authToken);
        isAuthenticated = true;
        updateAuthUI();
        loginModal.classList.add("hidden");
        loginForm.reset();
        showMessage("Login successful!", "success");
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Check authentication status
  async function checkAuth() {
    if (!authToken) {
      isAuthenticated = false;
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch(`/check_auth?token=${encodeURIComponent(authToken)}`);
      const result = await response.json();
      isAuthenticated = result.authenticated;
      
      if (!isAuthenticated) {
        authToken = "";
        localStorage.removeItem("authToken");
      }
      
      updateAuthUI();
    } catch (error) {
      console.error("Error checking auth:", error);
      isAuthenticated = false;
      updateAuthUI();
    }
  }

  // Update UI based on authentication status
  function updateAuthUI() {
    if (isAuthenticated) {
      loginBtn.classList.add("hidden");
      loggedInInfo.classList.remove("hidden");
      authNotice.classList.add("hidden");
      signupForm.querySelector("button[type='submit']").disabled = false;
      usernameDisplay.textContent = "Logged in as Teacher";
    } else {
      loginBtn.classList.remove("hidden");
      loggedInInfo.classList.add("hidden");
      authNotice.classList.remove("hidden");
      signupForm.querySelector("button[type='submit']").disabled = true;
    }
    
    // Update delete buttons visibility
    updateDeleteButtons();
  }

  // Update delete buttons based on auth
  function updateDeleteButtons() {
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach((button) => {
      if (!isAuthenticated) {
        button.style.display = "none";
      } else {
        button.style.display = "inline-block";
      }
    });
  }

  // Show message helper
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
      
      // Update delete buttons visibility
      updateDeleteButtons();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isAuthenticated) {
      showMessage("Please login as a teacher to unregister students", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&token=${encodeURIComponent(authToken)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      showMessage("Please login as a teacher to register students", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&token=${encodeURIComponent(authToken)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
