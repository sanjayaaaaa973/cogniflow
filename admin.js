import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const tbody = document.getElementById("tableBody");

const totalRequests = document.getElementById("totalRequests");
const domainCount = document.getElementById("domainCount");
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

function getFilteredRequests() {
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedType = filterTypeSelect ? filterTypeSelect.value : "";

    return requests.filter((d) => {
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
}

function renderTable() {
    tbody.innerHTML = "";

    const filteredRequests = getFilteredRequests();

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
            <td style="white-space: nowrap;">
                <button
                    class="btn btn-primary btn-sm me-1"
                    onclick="viewRequest('${d.id}')">
                    View
                </button>
                <button
                    class="btn btn-danger btn-sm"
                    onclick="deleteRequest('${d.id}')">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        </tr>
        `;
    });
}

/* ---------------- DELETE REQUEST ---------------- */

window.deleteRequest = async function (id) {
    const reqToDelete = requests.find(r => r.id === id);
    const deptName = reqToDelete ? (reqToDelete.department || "Request") : "this request";

    if (!confirm(`Are you sure you want to delete "${deptName}"?`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, "purchaseRequests", id));
        await loadRequests();
    } catch (err) {
        console.error("Error deleting request:", err);
        alert("Failed to delete request: " + err.message);
    }
};

if (searchInput) searchInput.addEventListener("input", renderTable);
if (filterTypeSelect) filterTypeSelect.addEventListener("change", renderTable);

async function loadRequests() {

    console.log("Loading Requests...");

    tbody.innerHTML = "";

    requests = [];

    let domain = 0;
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

        if (d.requestType === "Domain" || !d.requestType)
            domain++;

        if (d.createdDate === todayDate)
            today++;

    });

    totalRequests.innerHTML = requests.length;
    domainCount.innerHTML = domain;
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
            <td>${item.unit || 'pcs'}</td>
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

                    <th>Unit</th>

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

        // ===== REQUEST TYPE & DOMAIN =====
        let y = 58;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Request Type :', 15, y);
        doc.setFont('helvetica', 'normal');
        doc.text(data.requestType || 'Domain', 45, y);

        doc.setFont('helvetica', 'bold');
        doc.text('Domain :', 115, y);
        doc.setFont('helvetica', 'normal');
        doc.text(data.department || 'N/A', 145, y);

        y += 12;

        // ===== COORDINATOR SECTION =====
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
            item.quantity,
            item.unit || 'pcs'
        ]);

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: y,
                head: [['Item No', 'Category', 'Item Name', 'Quantity', 'Unit']],
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
                    0: { cellWidth: 18, halign: 'center' },
                    1: { cellWidth: 35, halign: 'left' },
                    2: { cellWidth: 70, halign: 'left' },
                    3: { cellWidth: 25, halign: 'center' },
                    4: { cellWidth: 25, halign: 'center' },
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
            doc.text('Category', 32, tableY);
            doc.text('Item Name', 68, tableY);
            doc.text('Quantity', 145, tableY);
            doc.text('Unit', 175, tableY);
            doc.line(15, tableY + 2, 195, tableY + 2);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);

            rows.forEach((row) => {
                tableY += 6;
                doc.text(String(row[0]), 15, tableY);
                doc.text(String(row[1]), 32, tableY);
                doc.text(String(row[2]), 68, tableY);
                doc.text(String(row[3]), 145, tableY);
                doc.text(String(row[4]), 175, tableY);
            });
        }

        // ===== SIGNATURES (DRAWN ON LAST PAGE AFTER TABLE FINISHES) =====
        const finalPage = doc.internal.getNumberOfPages();
        doc.setPage(finalPage);

        let lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y;
        let signY1 = lastTableY + 20;

        if (signY1 + 45 > 280) {
            doc.addPage();
            const newFinalPage = doc.internal.getNumberOfPages();
            doc.setPage(newFinalPage);
            if (page2Template || page1Template) {
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.35 }));
                doc.addImage(page2Template || page1Template, "PNG", 0, 0, 210, 297);
                doc.restoreGraphicsState();
            }
            signY1 = 50;
        } else {
            signY1 = Math.max(signY1, 215);
        }

        const signY2 = signY1 + 25;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);

        const deptLabel = data.department ? data.department.toUpperCase() : 'N/A';

        // Row 1 (2 Signatures)
        doc.line(20, signY1, 80, signY1);
        doc.text('Student Organiser', 50, signY1 + 6, { align: 'center' });
        doc.text(`(${deptLabel})`, 50, signY1 + 11, { align: 'center' });

        doc.line(130, signY1, 190, signY1);
        doc.text('Faculty Co-ordinator / Organiser', 160, signY1 + 6, { align: 'center' });

        // Row 2 (3 Signatures)
        doc.line(15, signY2, 60, signY2);
        doc.text('Faculty Organiser', 37.5, signY2 + 6, { align: 'center' });
        doc.text('(PURCHASE)', 37.5, signY2 + 11, { align: 'center' });

        doc.line(82.5, signY2, 127.5, signY2);
        doc.text('Co-Convenor', 105, signY2 + 6, { align: 'center' });
        doc.text('(PURCHASE)', 105, signY2 + 11, { align: 'center' });

        doc.line(150, signY2, 195, signY2);
        doc.text('Convenor', 172.5, signY2 + 6, { align: 'center' });

        doc.save(`purchase-requisition-${data.department || 'request'}-${Date.now()}.pdf`);
    } catch (error) {
        console.error(error);
        alert('PDF generation failed. Please try again.');
    }
};

/* ---------------- EXPORT EXCEL ---------------- */

const DEFAULT_DOMAINS = [
    'Campus Decoration',
    'Design & Printing',
    'Documentation',
    'E-sports and creative techno sports ideas',
    'Events',
    'Finance',
    'General Enquiry',
    'Guest Care - Men',
    'Guest Care - Women',
    'Halls & Refreshments',
    'International Participants',
    'Premium Events',
    'Press & Media',
    'Pro-Events',
    'Publicity & Marketing',
    'Purchase',
    'Registration & Reception',
    'Sales',
    'Sponsorship & MoU',
    'Stalls',
    'Transport & Logistics',
    'Web & Tech'
];

function getCleanSheetName(name, usedNames) {
    let clean = name.replace(/[\\/?*\[\]:]/g, "").trim();
    if (!clean) clean = "Sheet";
    if (clean.length > 31) {
        clean = clean.substring(0, 31).trim();
    }
    let uniqueName = clean;
    let counter = 1;
    while (usedNames.has(uniqueName.toLowerCase())) {
        const suffix = `_${counter}`;
        const maxLen = 31 - suffix.length;
        uniqueName = clean.substring(0, maxLen) + suffix;
        counter++;
    }
    usedNames.add(uniqueName.toLowerCase());
    return uniqueName;
}

const excelBtn = document.getElementById("excelBtn");
if (excelBtn) {
    excelBtn.onclick = () => {

        if (typeof XLSX === "undefined") {
            console.error("XLSX library not loaded");
            alert("SheetJS library not loaded");
            return;
        }

        const presentRequests = getFilteredRequests();

        // Build list of all domains to create sheets for:
        // Start with default domains, plus any other departments present in active requests
        const allDomains = [...DEFAULT_DOMAINS];
        presentRequests.forEach((req) => {
            const dept = req.department ? req.department.trim() : "";
            if (dept && !allDomains.some(d => d.toLowerCase() === dept.toLowerCase())) {
                allDomains.push(dept);
            }
        });

        // Group requests by domain (case-insensitive key matching)
        const requestsByDomain = {};
        allDomains.forEach(domain => {
            requestsByDomain[domain] = [];
        });

        presentRequests.forEach((req) => {
            const dept = req.department ? req.department.trim() : "Other";
            const matchedDomain = allDomains.find(d => d.toLowerCase() === dept.toLowerCase()) || dept;
            if (!requestsByDomain[matchedDomain]) {
                requestsByDomain[matchedDomain] = [];
            }
            requestsByDomain[matchedDomain].push(req);
        });

        const wb = XLSX.utils.book_new();
        const usedSheetNames = new Set();

        allDomains.forEach((domainName) => {
            const domainRequests = requestsByDomain[domainName] || [];
            const data = [];

            // Sort domain requests chronologically by time ascending (oldest first, newer below)
            domainRequests.sort((a, b) => {
                let tA = 0;
                let tB = 0;
                if (a.createdAt) {
                    if (typeof a.createdAt.toMillis === 'function') tA = a.createdAt.toMillis();
                    else if (a.createdAt.seconds) tA = a.createdAt.seconds * 1000;
                }
                if (b.createdAt) {
                    if (typeof b.createdAt.toMillis === 'function') tB = b.createdAt.toMillis();
                    else if (b.createdAt.seconds) tB = b.createdAt.seconds * 1000;
                }
                return tA - tB;
            });

            // Table Headers
            data.push([
                "S.No",
                "Date",
                "Time",
                "Request Type",
                "Student Organiser",
                "Reg No",
                "Mobile",
                "Item No",
                "Category",
                "Item Name",
                "Qty",
                "Unit"
            ]);

            if (domainRequests.length === 0) {
                data.push(["-", "-", "-", "-", "-", "-", "-", "-", "-", "No orders placed", 0, "-"]);
            } else {
                domainRequests.forEach((req, idx) => {
                    const sNo = idx + 1;
                    const date = req.createdDate || "";
                    const time = req.createdTime || "";
                    const reqType = req.requestType || "Domain";
                    const convenor = req.coordinator?.name || "";
                    const regNo = req.coordinator?.reg || "";
                    const mobile = req.coordinator?.mobile || "";

                    const items = req.items || [];

                    if (items.length === 0) {
                        data.push([
                            sNo,
                            date,
                            time,
                            reqType,
                            convenor,
                            regNo,
                            mobile,
                            "-",
                            "-",
                            "No items listed",
                            0,
                            "-"
                        ]);
                    } else {
                        items.forEach((item, itemIdx) => {
                            if (itemIdx === 0) {
                                // First item of the request displays request metadata
                                data.push([
                                    sNo,
                                    date,
                                    time,
                                    reqType,
                                    convenor,
                                    regNo,
                                    mobile,
                                    itemIdx + 1,
                                    item.category || "",
                                    item.name || "",
                                    item.quantity || 0,
                                    item.unit || "pcs"
                                ]);
                            } else {
                                // Subsequent items leave request metadata blank for clean tabular view
                                data.push([
                                    "",
                                    "",
                                    "",
                                    "",
                                    "",
                                    "",
                                    "",
                                    itemIdx + 1,
                                    item.category || "",
                                    item.name || "",
                                    item.quantity || 0,
                                    item.unit || "pcs"
                                ]);
                            }
                        });
                    }

                    // Blank row spacing between requests
                    data.push([]);
                });
            }

            const ws = XLSX.utils.aoa_to_sheet(data);

            // Column width settings for Excel formatting
            ws['!cols'] = [
                { wch: 6 },  // S.No
                { wch: 12 }, // Date
                { wch: 14 }, // Time
                { wch: 14 }, // Request Type
                { wch: 20 }, // Convenor
                { wch: 15 }, // Reg No
                { wch: 15 }, // Mobile
                { wch: 8 },  // Item No
                { wch: 16 }, // Category
                { wch: 30 }, // Item Name
                { wch: 8 },  // Qty
                { wch: 10 }  // Unit
            ];

            const sheetName = getCleanSheetName(domainName, usedSheetNames);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, "Purchase_Requests.xlsx");
    };
}

/* ---------------- LOGOUT ---------------- */

logoutBtn.onclick = async () => {

    await signOut(auth);

    window.location.href = "index.html";

}