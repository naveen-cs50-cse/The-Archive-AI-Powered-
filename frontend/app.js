// import cleanup from "../backend/clean.js";

// Deploy-friendly API endpoint configuration:
// set window.API_BASE_URL in index.html or host env variables at build time.

const API_BASE = "https://the-archive-ai-powered-iicx.onrender.com";
const API_PATH = `${API_BASE}/api`;

function toggleLoading(show) {
    document.getElementById("loader").style.display = show ? "flex" : "none";
}
async function shownotes() {
    toggleLoading(true);
    try {
        const res = await fetch(`${API_PATH}/notes`,{
            method: 'GET',
            headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
        });
        const data = await res.json();
        
        const notes = document.getElementById("notes2");
        notes.innerText = "";
        
        data.forEach((e) => {
            const div = document.createElement('div');

            div.style.border = "1px solid #ccc";
            div.style.padding = "8px";
            div.style.margin = "5px";

            div.innerText = e.content;
            notes.append(div);

            console.log(div);
        });
    }
    catch (err) {
        console.log("adding notes err : ", err);
    } finally {
        toggleLoading(false);
    }

}

async function addnotes() {
    let text = document.getElementById("input").value.trim();
    if (!text)
        return
    try {
        toggleLoading(true);

        const res = await fetch(`${API_PATH}/write`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ text })
        })
        // document.querySelector("textarea").innerText=""
        document.getElementById("input").value = "";

        const msg = await res.json()
        console.log(msg);
    }
    catch (err) {
        console.log("notes adding error", err)
    } finally {
        toggleLoading(false);
    }

}


async function querysearch() {

    let text = document.getElementById("query").value;
    if (!text) {
        return
    }

    try {
        toggleLoading(true);
        let notes2 = document.getElementById("notes2");

        const loadingDiv = document.createElement("div");
        loadingDiv.className = "card";
        loadingDiv.innerText = "🤖 Thinking...";
        notes2.append(loadingDiv);


        const res = await fetch(`${API_PATH}/query`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ text })
        })
        const data = await res.json();
        console.log("data:", data);
        console.log("answer:", data.answer);

        notes2.removeChild(loadingDiv);

        notes2.innerHTML = "";
        // console.log("data from gpt : ",data.answer)

        // AI Answer
        const answerDiv = document.createElement("div");
        answerDiv.className = "card";

        typeText(answerDiv, data.answer);

        function typeText(element, text, speed = 5) {

            let i = 0;
            element.innerText = "🤖 ";

            function typing() {
                if (i < text.length) {
                    element.innerText += text[i];
                    i++;
                    setTimeout(typing, speed);
                } else {
                    // AFTER typing → render markdown properly
                    element.innerHTML = "🤖 " + marked.parse(text);
                }
            }

            typing();
        }
        notes2.append(answerDiv);

        // Sources
        // data.sources.forEach(e => {
        //     const div = document.createElement("div");
        //     div.className = "card";
        //     div.innerText = "📄 " + e.text;
        //     notes2.append(div);
        // });

        // return
        // const results = await res.json();

        // // const notes2=document.getElementById("notes2");
        // notes2.innerText = '';

        // results.forEach((e) => {

        //     const div = document.createElement('div');

        //     div.className = "card";

        //     div.innerText = e.text;
        //     notes2.append(div);

        //     // console.log(div);

        // })
    }
    catch (err) {
        console.log(err);
    } finally {
        toggleLoading(false);
    }


}

async function clean() {
    fetch(`${API_PATH}/reset`);
    alert("Reset Done")
    window.location.reload()
}



// ─── AUTH STATE ───────────────────────────────────────────────
let currentTab = "login";

function switchTab(tab) {
    currentTab = tab;
    document.getElementById("authError").style.display = "none";

    if (tab === "login") {
        document.getElementById("nameField").style.display = "none";
        document.getElementById("tabLogin").style.borderBottom = "3px solid var(--ink)";
        document.getElementById("tabLogin").style.opacity = "1";
        document.getElementById("tabSignup").style.borderBottom = "3px solid transparent";
        document.getElementById("tabSignup").style.opacity = "0.5";
        document.getElementById("authSubmitBtn").innerText = "Enter the Archive";
    } else {
        document.getElementById("nameField").style.display = "block";
        document.getElementById("tabSignup").style.borderBottom = "3px solid var(--ink)";
        document.getElementById("tabSignup").style.opacity = "1";
        document.getElementById("tabLogin").style.borderBottom = "3px solid transparent";
        document.getElementById("tabLogin").style.opacity = "0.5";
        document.getElementById("authSubmitBtn").innerText = "Register";
    }
}

async function handleAuth() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value.trim();
    const name = document.getElementById("authName").value.trim();
    const errorEl = document.getElementById("authError");

    if (!email || !password) {
        errorEl.innerText = "Please fill in all fields.";
        errorEl.style.display = "block";
        return;
    }

    if (currentTab === "signup" && !name) {
        errorEl.innerText = "Please enter your name.";
        errorEl.style.display = "block";
        return;
    }

    try {
        const endpoint = currentTab === "login" ? "/auth/login" : "/auth/signup";
        const body = currentTab === "login"
            ? { email, password }
            : { name, email, password };

        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (!res.ok) {
            errorEl.innerText = data.error || "Something went wrong.";
            errorEl.style.display = "block";
            return;
        }

        // Save token to localStorage
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userName", data.name);

        // Hide modal
        document.getElementById("authModal").style.display = "none";

    } catch (err) {
        errorEl.innerText = "Could not connect to server.";
        errorEl.style.display = "block";
    }
}

// ─── CHECK AUTH ON PAGE LOAD ──────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (token) {
        document.getElementById("authModal").style.display = "none";
    }
});