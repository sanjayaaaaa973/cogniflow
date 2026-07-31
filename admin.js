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
let selectedRequest = null;

/* ---------------- AUTH ---------------- */

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "index.html";
        return;

    }

    adminEmail.innerText = user.email;

    loadRequests();

});

/* ---------------- LOAD & FILTER DATA ---------------- */

const searchInput = document.getElementById("search");
const filterTypeSelect = document.getElementById("filterType");

function renderTable() {
    tbody.innerHTML = "";

    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedType = filterTypeSelect ? filterTypeSelect.value : "";

    const filteredRequests = requests.filter((d) => {
        // Filter by Type ("Domain" or "Club")
        if (selectedType && selectedType !== "All" && d.requestType !== selectedType) {
            return false;
        }

        // Filter by Search text across all relevant fields
        if (searchTerm) {
            const matchesDate = (d.createdDate || "").toLowerCase().includes(searchTerm);
            const matchesType = (d.requestType || "").toLowerCase().includes(searchTerm);
            const matchesDept = (d.department || "").toLowerCase().includes(searchTerm);
            const matchesCoordName = (d.coordinator?.name || "").toLowerCase().includes(searchTerm);
            const matchesCoordReg = (d.coordinator?.reg || "").toLowerCase().includes(searchTerm);
            const matchesCoordMobile = (d.coordinator?.mobile || "").toLowerCase().includes(searchTerm);
            const matchesPocName = (d.poc?.name || "").toLowerCase().includes(searchTerm);
            const matchesPocReg = (d.poc?.reg || "").toLowerCase().includes(searchTerm);
            const matchesPocMobile = (d.poc?.mobile || "").toLowerCase().includes(searchTerm);

            const matchesItem = (d.items || []).some(item =>
                (item.name || "").toLowerCase().includes(searchTerm) ||
                (item.category || "").toLowerCase().includes(searchTerm)
            );

            return matchesDate || matchesType || matchesDept || matchesCoordName ||
                matchesCoordReg || matchesCoordMobile || matchesPocName ||
                matchesPocReg || matchesPocMobile || matchesItem;
        }

        return true;
    });

    if (filteredRequests.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-muted py-4">No matching requests found</td>
        </tr>
        `;
        return;
    }

    filteredRequests.forEach((d) => {
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
                    onclick="viewRequest('${d.id}')">
                    View
                </button>
            </td>
        </tr>
        `;
    });
}

if (searchInput) searchInput.addEventListener("input", renderTable);
if (filterTypeSelect) filterTypeSelect.addEventListener("change", renderTable);

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

    });

    totalRequests.innerHTML = requests.length;
    domainCount.innerHTML = domain;
    clubCount.innerHTML = club;
    todayCount.innerHTML = today;

    renderTable();
}

const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
    refreshBtn.onclick = loadRequests;
}

/* ---------------- VIEW ---------------- */

window.viewRequest = function (id) {

    const request = requests.find(x => x.id === id);

    if (!request) return;

    selectedRequest = request;

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

        <h6>Student Organizer</h6>

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

/* ---------------- PDF GENERATION ---------------- */

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", () => {
        if (!selectedRequest) return;
        generateAdminPDF(selectedRequest);
    });
}

const darkenImage = (img, amount = 50) => {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, data[i] - amount);
                data[i + 1] = Math.max(0, data[i + 1] - amount);
                data[i + 2] = Math.max(0, data[i + 2] - amount);
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        } catch (err) {
            reject(err);
        }
    });
};

const generateAdminPDF = async (data) => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('PDF library is not available.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    try {
        // ===== LOAD TEMPLATES =====
        const templatePaths = ['images/purchase-template.png', 'images/purchase-template.png.png'];
        let templateImg = null;

        for (const templatePath of templatePaths) {
            const img = new Image();
            img.src = templatePath;

            await new Promise((resolve) => {
                img.onload = () => {
                    templateImg = img;
                    resolve();
                };
                img.onerror = resolve;
            });

            if (templateImg) break;
        }

        let page1Template = null;
        let page2Template = null;

        if (templateImg) {
            const darkenedDataUrl = await darkenImage(templateImg, 55);
            page1Template = darkenedDataUrl;
            page2Template = darkenedDataUrl;
        }

        if (page1Template) {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.35 }));
            doc.addImage(page1Template, 'PNG', 0, 0, 210, 297);
            doc.restoreGraphicsState();
        } else {
            doc.setFillColor(245, 247, 250);
            doc.rect(0, 0, 210, 297, 'F');
        }

        // ===== DATE =====
        const today = data.createdDate || new Date().toLocaleDateString('en-IN');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Date : ${today}`, 190, 42, { align: 'right' });

        // ===== REQUEST TYPE & DOMAIN/CLUB with TIGHT SPACING =====
        let y = 58;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Request Type :', 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(data.requestType || 'N/A', 45, y);

        doc.setFont('helvetica', 'bold');
        if (data.requestType === 'Domain') {
            doc.text('Domain :', 115, y);
            doc.setFont('helvetica', 'normal');
            doc.text(data.department || 'N/A', 145, y);
        } else {
            doc.text('Club :', 115, y);
            doc.setFont('helvetica', 'normal');
            doc.text(data.department || 'N/A', 130, y);
        }

        y += 12;

        // ===== COORDINATOR & POC SECTION =====
        if (data.requestType === 'Domain') {
            doc.setFont('helvetica', 'bold');
            doc.text('Student Organizer :', 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(data.coordinator?.name || 'N/A', 60, y);

            y += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Reg No :', 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(data.coordinator?.reg || 'N/A', 40, y);

            y += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Mobile :', 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(data.coordinator?.mobile || 'N/A', 40, y);

        } else {
            doc.setFont('helvetica', 'bold');
            doc.text('Student Organizer', 15, y);

            let yLeft = y + 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Name :', 15, yLeft);
            doc.setFont('helvetica', 'normal');
            doc.text(data.coordinator?.name || 'N/A', 35, yLeft);

            yLeft += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Reg No :', 15, yLeft);
            doc.setFont('helvetica', 'normal');
            doc.text(data.coordinator?.reg || 'N/A', 35, yLeft);

            yLeft += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Mobile :', 15, yLeft);
            doc.setFont('helvetica', 'normal');
            doc.text(data.coordinator?.mobile || 'N/A', 35, yLeft);

            let yRight = y;
            doc.setFont('helvetica', 'bold');
            doc.text('POC', 115, yRight);

            yRight += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Name :', 115, yRight);
            doc.setFont('helvetica', 'normal');
            doc.text(data.poc?.name || 'N/A', 135, yRight);

            yRight += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Reg No :', 115, yRight);
            doc.setFont('helvetica', 'normal');
            doc.text(data.poc?.reg || 'N/A', 135, yRight);

            yRight += 7;
            doc.setFont('helvetica', 'bold');
            doc.text('Mobile :', 115, yRight);
            doc.setFont('helvetica', 'normal');
            doc.text(data.poc?.mobile || 'N/A', 135, yRight);

            y = Math.max(yLeft, yRight) + 5;
        }

        // ===== LIGHT HORIZONTAL DIVIDER =====
        y += 4;
        doc.setDrawColor(180);
        doc.line(15, y, 195, y);
        y += 8;

        // ===== ITEMS TABLE =====
        const rows = (data.items || []).map((item, index) => [
            index + 1,
            item.category || 'N/A',
            item.name,
            item.quantity
        ]);

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: y,
                head: [['Item No', 'Category', 'Item Name', 'Quantity']],
                body: rows,
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    textColor: [30, 30, 30],
                },
                headStyles: {
                    fillColor: [0, 184, 170],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center',
                },
                columnStyles: {
                    0: { cellWidth: 20, halign: 'center' },
                    1: { cellWidth: 40, halign: 'left' },
                    2: { cellWidth: 80, halign: 'left' },
                    3: { cellWidth: 30, halign: 'center' },
                },
                margin: { top: 45, left: 15, right: 15, bottom: 20 },
                didDrawPage: function (data) {
                    const page = doc.internal.getNumberOfPages();
                    if (page > 1) {
                        data.cursor.y = 45;
                    }
                    if (page1Template) {
                        doc.saveGraphicsState();
                        doc.setGState(new doc.GState({ opacity: 0.35 }));
                        if (page === 1) {
                            doc.addImage(
                                page1Template,
                                "PNG",
                                0,
                                0,
                                210,
                                297
                            );
                        } else {
                            doc.addImage(
                                page2Template || page1Template,
                                "PNG",
                                0,
                                0,
                                210,
                                297
                            );
                        }
                        doc.restoreGraphicsState();
                    }
                }
            });
        } else {
            let tableY = y;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Item No', 15, tableY);
            doc.text('Category', 35, tableY);
            doc.text('Item Name', 75, tableY);
            doc.text('Quantity', 160, tableY);
            doc.line(15, tableY + 2, 195, tableY + 2);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            rows.forEach((row) => {
                tableY += 6;
                doc.text(String(row[0]), 15, tableY);
                doc.text(String(row[1]), 35, tableY);
                doc.text(String(row[2]), 75, tableY);
                doc.text(String(row[3]), 160, tableY);
            });
        }

        // ===== SIGNATURES (DRAWN ON LAST PAGE AFTER TABLE FINISHES) =====
        const finalPage = doc.internal.getNumberOfPages();
        doc.setPage(finalPage);

        let lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y;
        let signY = lastTableY + 30;

        if (signY > 265) {
            doc.addPage();
            const newFinalPage = doc.internal.getNumberOfPages();
            doc.setPage(newFinalPage);
            if (page2Template || page1Template) {
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.35 }));
                doc.addImage(page2Template || page1Template, "PNG", 0, 0, 210, 297);
                doc.restoreGraphicsState();
            }
            signY = 50;
        }

        signY = Math.max(signY, 230);

        doc.line(15, signY, 60, signY);
        doc.line(82, signY, 127, signY);
        doc.line(149, signY, 194, signY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);

        // Left
        doc.text('Faculty Organiser', 37.5, signY + 7, { align: 'center' });
        const deptLabel = data.department ? data.department.toUpperCase() : 'N/A';
        doc.text(`(${deptLabel})`, 37.5, signY + 13, { align: 'center' });

        // Middle
        doc.text('Faculty Organiser', 104.5, signY + 7, { align: 'center' });
        doc.text('(PURCHASE)', 104.5, signY + 13, { align: 'center' });

        // Right
        doc.text('Co-Convenor', 171.5, signY + 7, { align: 'center' });

        doc.save(`purchase-requisition-${data.department || 'request'}-${Date.now()}.pdf`);
    } catch (error) {
        console.error(error);
        alert('PDF generation failed. Please try again.');
    }
};

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