import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const tbody = document.getElementById("tableBody");

const totalRequests = document.getElementById("totalRequests");
const domainCount = document.getElementById("domainCount");
const clubCount = document.getElementById("clubCount");
const todayCount = document.getElementById("todayCount");

const adminEmail = document.getElementById("adminEmail");

const logoutBtn = document.getElementById("logoutBtn");

let requests = [];

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "index.html";
        return;

    }

    adminEmail.innerText = user.email;

    loadRequests();

});

/* ---------------- LOAD DATA ---------------- */

async function loadRequests() {

    console.log("Loading Requests...");

    tbody.innerHTML = "";

    requests = [];

    let domain = 0;
    let club = 0;
    let today = 0;

    const todayDate = new Date().toLocaleDateString("en-IN");

    const snapshot = await getDocs(collection(db, "purchaseRequests"));

    console.log("Documents:", snapshot.size);

    snapshot.forEach((docSnap) => {

        console.log(docSnap.data());

        const d = docSnap.data();

        requests.push({
            id: docSnap.id,
            ...d
        });

        if (d.requestType === "Domain")
            domain++;

        if (d.requestType === "Club")
            club++;

        if (d.createdDate === todayDate)
            today++;

        tbody.innerHTML += `

        <tr>

            <td>${d.createdDate || "-"}</td>

            <td>${d.requestType || "-"}</td>

            <td>${d.department || "-"}</td>

            <td>${d.coordinator?.name || "-"}</td>

            <td>${d.coordinator?.mobile || "-"}</td>

            <td>${d.items ? d.items.length : 0}</td>

            <td>

                <button
                    class="btn btn-primary btn-sm"
                    onclick="viewRequest('${docSnap.id}')">

                    View

                </button>

            </td>

        </tr>

        `;

    });

    totalRequests.innerHTML = requests.length;

    domainCount.innerHTML = domain;

    clubCount.innerHTML = club;

    todayCount.innerHTML = today;

}

const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
    refreshBtn.onclick = loadRequests;
}

/* ---------------- VIEW ---------------- */

window.viewRequest = function (id) {

    const request = requests.find(x => x.id === id);

    if (!request) return;

    let items = "";

    (request.items || []).forEach((item, index) => {

        items += `
        <tr>
            <td>${index + 1}</td>
            <td>${item.category || '-'}</td>
            <td>${item.name || '-'}</td>
            <td>${item.quantity || 0}</td>
        </tr>
        `;

    });

    let pocSection = "";
    if (request.poc && (request.poc.name || request.poc.reg || request.poc.mobile)) {
        pocSection = `
        <hr>
        <h6>POC Details</h6>
        <p><b>Name:</b> ${request.poc.name || '-'}</p>
        <p><b>Reg No:</b> ${request.poc.reg || '-'}</p>
        <p><b>Mobile:</b> ${request.poc.mobile || '-'}</p>
        `;
    }

    document.getElementById("modalContent").innerHTML = `

        <h5>${request.department || 'Department'} (${request.requestType || 'N/A'})</h5>

        <hr>

        <h6>Student Coordinator</h6>

        <p><b>Name:</b> ${request.coordinator?.name || '-'}</p>

        <p><b>Reg No:</b> ${request.coordinator?.reg || '-'}</p>

        <p><b>Mobile:</b> ${request.coordinator?.mobile || '-'}</p>

        ${pocSection}

        <hr>

        <h6>Items Requested (${request.items ? request.items.length : 0})</h6>

        <table class="table table-bordered">

            <thead>

                <tr>

                    <th>No</th>

                    <th>Category</th>

                    <th>Item</th>

                    <th>Qty</th>

                </tr>

            </thead>

            <tbody>

                ${items}

            </tbody>

        </table>

    `;

    new bootstrap.Modal(document.getElementById("viewModal")).show();

}

/* ---------------- EXPORT EXCEL ---------------- */

const excelBtn = document.getElementById("excelBtn");
if (excelBtn) {
    excelBtn.onclick = () => {

        if (typeof XLSX === "undefined") {
            console.error("XLSX library not loaded");
            alert("SheetJS library not loaded");
            return;
        }

        const wb = XLSX.utils.book_new();

        requests.forEach((req, index) => {

            const data = [];

            data.push(["Purchase Requisition"]);
            data.push([]);

            data.push(["Date", req.createdDate || ""]);
            data.push(["Time", req.createdTime || ""]);
            data.push(["Request Type", req.requestType || ""]);
            data.push(["Department / Club", req.department || ""]);

            data.push([]);

            data.push(["Coordinator Name", req.coordinator?.name || ""]);
            data.push(["Coordinator Reg No", req.coordinator?.reg || ""]);
            data.push(["Coordinator Mobile", req.coordinator?.mobile || ""]);

            if (req.requestType === "Club") {

                data.push([]);

                data.push(["POC Name", req.poc?.name || ""]);
                data.push(["POC Reg No", req.poc?.reg || ""]);
                data.push(["POC Mobile", req.poc?.mobile || ""]);

            }

            data.push([]);

            data.push([
                "Item No",
                "Category",
                "Item Name",
                "Quantity"
            ]);

            (req.items || []).forEach((item, i) => {

                data.push([
                    i + 1,
                    item.category || "",
                    item.name || "",
                    item.quantity || 0
                ]);

            });

            const ws = XLSX.utils.aoa_to_sheet(data);

            // Sheet name (max 31 chars in Excel)
            let sheetName =
                (req.department || "Request") + "_" + (index + 1);

            sheetName = sheetName.substring(0, 31);

            XLSX.utils.book_append_sheet(
                wb,
                ws,
                sheetName
            );

        });

        XLSX.writeFile(
            wb,
            "Purchase_Requests.xlsx"
        );

    };
}

/* ---------------- LOGOUT ---------------- */

logoutBtn.onclick = async () => {

    await signOut(auth);

    window.location.href = "index.html";

}