
// =============================================
// MYFOLIO - STUDENT PORTFOLIO MANAGEMENT SYSTEM
// JavaScript Frontend
// =============================================

const API = "/api";

let currentUser = null;
let projects = [];
let editingProjectId = null;


// =============================================
// 1. API CONNECTION
// =============================================

async function apiRequest(endpoint, method = "GET", data = null) {

    const options = {
        method: method,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(API + endpoint, options);

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || "Something went wrong.");
    }

    return result;
}


// =============================================
// 2. NOTIFICATION MESSAGE
// =============================================

function showToast(message) {

    const toast = document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(function () {
        toast.classList.remove("show");
    }, 3000);
}


function showAuthMessage(message, isError = false) {

    const element = document.getElementById("authMessage");

    element.textContent = message;

    element.style.color = isError ? "#dc2626" : "#16a34a";
}


// =============================================
// 3. SCREEN AND MODAL FUNCTIONS
// =============================================

function showLoginScreen() {

    document.getElementById("authScreen").classList.remove("hidden");

    document.getElementById("appScreen").classList.add("hidden");
}


function showDashboard() {

    document.getElementById("authScreen").classList.add("hidden");

    document.getElementById("appScreen").classList.remove("hidden");
}


function openModal(id) {

    document.getElementById(id).classList.remove("hidden");
}


function closeModal(id) {

    document.getElementById(id).classList.add("hidden");
}


// =============================================
// 4. LOGIN AND REGISTRATION
// =============================================

const registerForm = document.getElementById("registerForm");

const loginForm = document.getElementById("loginForm");

const switchText = document.getElementById("switchText");


// Show login form

function showLoginForm() {

    registerForm.classList.add("hidden");

    loginForm.classList.remove("hidden");

    document.getElementById("authTitle").textContent = "Welcome Back";

    document.getElementById("authSubtitle").textContent =
        "Login to manage your portfolio.";

    switchText.innerHTML =
        'Don\'t have an account? <button id="showRegister" class="text-button" type="button">Register</button>';

    document.getElementById("showRegister").addEventListener(
        "click",
        showRegisterForm
    );

    showAuthMessage("");
}


// Show registration form

function showRegisterForm() {

    loginForm.classList.add("hidden");

    registerForm.classList.remove("hidden");

    document.getElementById("authTitle").textContent =
        "Create your portfolio";

    document.getElementById("authSubtitle").textContent =
        "Build a simple space to showcase your journey.";

    switchText.innerHTML =
        'Already have an account? <button id="showLogin" class="text-button" type="button">Log in</button>';

    document.getElementById("showLogin").addEventListener(
        "click",
        showLoginForm
    );

    showAuthMessage("");
}


// Initial login button

document.getElementById("showLogin").addEventListener(
    "click",
    showLoginForm
);


// Registration submission

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const formData = new FormData(registerForm);

    const userData = {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password")
    };

    try {

        const result = await apiRequest(
            "/register",
            "POST",
            userData
        );

        registerForm.reset();

        showLoginForm();

        showAuthMessage(
            result.message || "Account created! Please log in."
        );

    } catch (error) {

        showAuthMessage(error.message, true);

    }

});


// Login submission

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const formData = new FormData(loginForm);

    const loginData = {
        email: formData.get("email"),
        password: formData.get("password")
    };

    try {

        showAuthMessage("Logging in...");

        await apiRequest(
            "/login",
            "POST",
            loginData
        );

        await loadPortfolio();

    } catch (error) {

        showAuthMessage(error.message, true);

    }

});


// =============================================
// 5. LOAD USER AND DASHBOARD
// =============================================

async function loadPortfolio() {

    try {

        const result = await apiRequest("/me");

        currentUser = result.user;

        if (!currentUser) {
            throw new Error("User information could not be loaded.");
        }

        showDashboard();

        displayProfile();

        await loadProjects();

    } catch (error) {

        console.error("Dashboard loading error:", error);

        currentUser = null;

        showLoginScreen();

        showAuthMessage(
            "Could not load your dashboard: " + error.message,
            true
        );

    }

}


// =============================================
// 6. DISPLAY PROFILE INFORMATION
// =============================================

function displayProfile() {

    if (!currentUser) return;

    const name = currentUser.name || "Student";

    const firstName = name.split(" ")[0];

    const initial = name.charAt(0).toUpperCase();


    // Sidebar information

    document.getElementById("sideName").textContent = name;

    document.getElementById("sideAvatar").textContent = initial;


    // Top avatar

    document.getElementById("topAvatar").textContent = initial;


    // Welcome heading

    document.getElementById("welcomeHeading").textContent =
        "Welcome Back, " + firstName;


    // Hero section

    const heroName = document.getElementById("heroName");

    heroName.textContent = name;

    const dot = document.createElement("span");

    dot.textContent = ".";

    heroName.appendChild(dot);


    document.getElementById("heroHeadline").textContent =
        currentUser.headline || "Student | Aspiring Professional";


    document.getElementById("heroAbout").textContent =
        currentUser.about || "Your introduction will appear here. Add a few lines about yourself.";


    document.getElementById("heroMonogram").textContent = initial;


    // Education

    document.getElementById("educationText").textContent =
        currentUser.education || "Add your education";


    // Contact

    document.getElementById("contactText").textContent =
        currentUser.contact || "Add contact information";


    // Skills

    displaySkills();


    // Footer

    document.getElementById("footerName").textContent = name;

    document.getElementById("year").textContent =
        new Date().getFullYear();

}


// =============================================
// 7. DISPLAY SKILLS
// =============================================

function displaySkills() {

    const skillList = document.getElementById("skillList");

    skillList.innerHTML = "";


    // MongoDB stores skills as an array

    const skills = Array.isArray(currentUser.skills)
        ? currentUser.skills
        : [];


    if (skills.length === 0) {

        skillList.textContent = "Add skills to your profile";

        return;

    }


    skills.forEach(function (skill) {

        const span = document.createElement("span");

        span.textContent = skill;

        span.style.display = "inline-block";

        span.style.padding = "5px 9px";

        span.style.margin = "3px";

        span.style.borderRadius = "6px";

        span.style.background = "#eeedff";

        span.style.color = "#584bd0";

        span.style.fontSize = "12px";

        skillList.appendChild(span);

    });

}


// =============================================
// 8. EDIT PROFILE
// =============================================

document.getElementById("editProfileButton").addEventListener(
    "click",
    function () {

        if (!currentUser) return;

        const form = document.getElementById("profileForm");


        form.elements.namedItem("name").value =
            currentUser.name || "";


        form.elements.namedItem("headline").value =
            currentUser.headline || "";


        form.elements.namedItem("about").value =
            currentUser.about || "";


        form.elements.namedItem("education").value =
            currentUser.education || "";


        // Convert skills array into a comma-separated string

        const skills = Array.isArray(currentUser.skills)
            ? currentUser.skills
            : [];

        form.elements.namedItem("skills").value =
            skills.join(", ");


        form.elements.namedItem("contact").value =
            currentUser.contact || "";


        openModal("profileModal");

    }
);


// Save profile

document.getElementById("profileForm").addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const formData = new FormData(this);


        const profileData = {

            name: formData.get("name"),

            headline: formData.get("headline"),

            about: formData.get("about"),

            education: formData.get("education"),

            // Convert comma-separated skills into an array

            skills: formData.get("skills")
                .split(",")
                .map(function (skill) {
                    return skill.trim();
                })
                .filter(Boolean),

            contact: formData.get("contact")

        };


        try {

            const result = await apiRequest(
                "/profile",
                "PUT",
                profileData
            );


            currentUser = result.user;

            displayProfile();

            closeModal("profileModal");

            showToast("Profile updated successfully!");

        } catch (error) {

            showToast(error.message);

        }

    }
);


// =============================================
// 9. LOAD PROJECTS
// =============================================

async function loadProjects() {

    try {

        const result = await apiRequest("/projects");

        projects = result.projects || [];

        displayProjects();

    } catch (error) {

        console.error("Project loading error:", error);

        showToast(error.message);

    }

}


// =============================================
// 10. DISPLAY PROJECTS
// =============================================

function displayProjects() {

    const projectGrid = document.getElementById("projectGrid");

    projectGrid.innerHTML = "";


    // Display message when there are no projects

    if (projects.length === 0) {

        const empty = document.createElement("div");

        empty.className = "empty-project";

        empty.innerHTML = `
            <span>✧</span>
            <h3>Your projects will live here.</h3>
            <p>Add your first project to get started.</p>
        `;

        projectGrid.appendChild(empty);

        return;

    }


    // Display each project

    projects.forEach(function (project) {

        const card = document.createElement("article");

        card.className = "project-card";


        const title = document.createElement("h3");

        title.textContent = project.title || "Untitled Project";


        const description = document.createElement("p");

        description.textContent = project.description || "";


        card.appendChild(title);

        card.appendChild(description);


        // Technologies used

        if (project.technology) {

            const technology = document.createElement("div");

            technology.className = "project-technology";

            technology.textContent =
                "Technologies: " + project.technology;

            card.appendChild(technology);

        }


        // Project link

        if (project.link) {

            const link = document.createElement("a");

            link.href = project.link;

            link.textContent = "View Project ↗";

            link.target = "_blank";

            link.rel = "noopener noreferrer";

            link.style.display = "inline-block";

            link.style.marginTop = "12px";

            link.style.color = "#7165e8";

            link.style.fontSize = "13px";

            card.appendChild(link);

        }


        // Project buttons

        const actions = document.createElement("div");

        actions.className = "project-actions";


        const editButton = document.createElement("button");

        editButton.className = "edit-button";

        editButton.textContent = "Edit";

        editButton.addEventListener("click", function () {

            editProject(project);

        });


        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-button";

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function () {

            // Server returns project.id, not project._id

            deleteProject(project.id);

        });


        actions.appendChild(editButton);

        actions.appendChild(deleteButton);

        card.appendChild(actions);

        projectGrid.appendChild(card);

    });

}


// =============================================
// 11. ADD PROJECT
// =============================================

document.getElementById("addProjectButton").addEventListener(
    "click",
    function () {

        const form = document.getElementById("projectForm");

        form.reset();

        editingProjectId = null;

        document.getElementById("projectModalTitle").textContent =
            "Add a Project";

        openModal("projectModal");

    }
);


// =============================================
// 12. SAVE PROJECT
// =============================================

document.getElementById("projectForm").addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const formData = new FormData(this);


        const projectData = {

            title: formData.get("title"),

            description: formData.get("description"),

            technology: formData.get("technology"),

            link: formData.get("link")

        };


        try {

            if (editingProjectId) {

                // Update existing project

                await apiRequest(
                    "/projects/" + editingProjectId,
                    "PUT",
                    projectData
                );

                showToast("Project updated successfully!");

            } else {

                // Add new project

                await apiRequest(
                    "/projects",
                    "POST",
                    projectData
                );

                showToast("Project added successfully!");

            }


            closeModal("projectModal");

            editingProjectId = null;

            await loadProjects();

        } catch (error) {

            showToast(error.message);

        }

    }
);


// =============================================
// 13. EDIT PROJECT
// =============================================

function editProject(project) {

    const form = document.getElementById("projectForm");


    // Server returns the project ID as "id"

    editingProjectId = project.id;


    form.elements.namedItem("projectId").value =
        project.id || "";


    form.elements.namedItem("title").value =
        project.title || "";


    form.elements.namedItem("description").value =
        project.description || "";


    form.elements.namedItem("technology").value =
        project.technology || "";


    form.elements.namedItem("link").value =
        project.link || "";


    document.getElementById("projectModalTitle").textContent =
        "Edit Project";


    openModal("projectModal");

}


// =============================================
// 14. DELETE PROJECT
// =============================================

async function deleteProject(id) {

    const confirmation = confirm(
        "Are you sure you want to delete this project?"
    );

    if (!confirmation) return;


    try {

        await apiRequest(
            "/projects/" + id,
            "DELETE"
        );

        showToast("Project deleted successfully!");

        await loadProjects();

    } catch (error) {

        showToast(error.message);

    }

}


// =============================================
// 15. CLOSE MODALS
// =============================================

document.querySelectorAll("[data-close]").forEach(
    function (button) {

        button.addEventListener("click", function () {

            const modalId = button.getAttribute("data-close");

            closeModal(modalId);

        });

    }
);


// Close modal when clicking outside

document.querySelectorAll(".modal").forEach(
    function (modal) {

        modal.addEventListener("click", function (event) {

            if (event.target === modal) {

                closeModal(modal.id);

            }

        });

    }
);


// =============================================
// 16. DARK MODE
// =============================================

const themeButton = document.getElementById("themeButton");


function applySavedTheme() {

    const savedTheme = localStorage.getItem("myfolioTheme");

    if (savedTheme === "dark") {

        document.body.classList.add("dark-mode");

        themeButton.textContent = "☀";

    } else {

        document.body.classList.remove("dark-mode");

        themeButton.textContent = "◐";

    }

}


themeButton.addEventListener("click", function () {

    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");


    localStorage.setItem(
        "myfolioTheme",
        isDark ? "dark" : "light"
    );


    themeButton.textContent = isDark ? "☀" : "◐";

});


applySavedTheme();


// =============================================
// 17. LOGOUT
// =============================================

document.getElementById("logoutButton").addEventListener(
    "click",
    async function () {

        try {

            await apiRequest("/logout", "POST");

            currentUser = null;

            projects = [];

            editingProjectId = null;

            showLoginScreen();

            showRegisterForm();

            showAuthMessage("You have logged out successfully.");

        } catch (error) {

            showToast(error.message);

        }

    }
);


// =============================================
// 18. SIDEBAR NAVIGATION
// =============================================

document.querySelectorAll(".side-link[href^='#']").forEach(
    function (link) {

        link.addEventListener("click", function () {

            document.querySelectorAll(".side-link[href^='#']").forEach(
                function (item) {

                    item.classList.remove("active");

                }
            );

            link.classList.add("active");

        });

    }
);


// =============================================
// 19. START MYFOLIO
// =============================================

// Check whether a user is already logged in

loadPortfolio();
