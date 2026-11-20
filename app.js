/*
 * Muni University Property Maintenance Management System
 * Shared front-end behaviour for the existing HTML pages.
 * Data is stored locally in this browser using localStorage.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "muniRequests";
  const SAMPLE_REQUESTS = [
    { id: "MR001", fullName: "Sample User", category: "Plumbing", location: "Hostel A", description: "Leaking tap in the bathroom", urgency: "High", date: "2026-11-04", status: "Pending" },
    { id: "MR002", fullName: "Sample User", category: "Electrical", location: "Library", description: "Light not working in reading area", urgency: "Medium", date: "2026-11-03", status: "Assigned" },
    { id: "MR003", fullName: "Sample User", category: "Furniture", location: "Lecture Room", description: "Broken chair in Classroom 2", urgency: "Low", date: "2026-11-02", status: "Completed" },
    { id: "MR004", fullName: "Sample User", category: "Plumbing", location: "Hostel B", description: "Blocked toilet drain", urgency: "High", date: "2026-11-04", status: "Pending" },
    { id: "MR005", fullName: "Sample User", category: "Structural", location: "Administration Block", description: "Cracked wall near the entrance", urgency: "Medium", date: "2026-11-01", status: "Assigned" },
    { id: "MR006", fullName: "Sample User", category: "Electrical", location: "Hostel A", description: "Socket sparking in room 12", urgency: "High", date: "2026-10-30", status: "Completed" },
    { id: "MR007", fullName: "Sample User", category: "Furniture", location: "Library", description: "Loose table legs", urgency: "Low", date: "2026-10-29", status: "Pending" },
    { id: "MR008", fullName: "Sample User", category: "Structural", location: "Hostel B", description: "Leaking roof during rain", urgency: "High", date: "2026-10-28", status: "Assigned" },
    { id: "MR009", fullName: "Sample User", category: "Plumbing", location: "Administration Block", description: "Low water pressure in washroom", urgency: "Low", date: "2026-10-27", status: "Completed" },
    { id: "MR010", fullName: "Sample User", category: "Other", location: "Lecture Room", description: "Projector screen stuck", urgency: "Medium", date: "2026-10-26", status: "Pending" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function readRequests() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (error) {
      console.warn("Could not read saved maintenance requests:", error);
    }
    return SAMPLE_REQUESTS.map(request => ({ ...request }));
  }

  function writeRequests(requests) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
      return true;
    } catch (error) {
      console.error("Could not save maintenance requests:", error);
      return false;
    }
  }

  function nextRequestId(requests) {
    const highest = requests.reduce((max, request) => {
      const number = Number(String(request.id || "").replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    return "MR" + String(highest + 1).padStart(3, "0");
  }

  function createRequest(data) {
    const requests = readRequests();
    const request = {
      id: nextRequestId(requests),
      fullName: data.fullName,
      category: data.category,
      location: data.location,
      description: data.description,
      urgency: data.urgency,
      date: new Date().toISOString().slice(0, 10),
      status: "Pending"
    };
    requests.unshift(request);
    writeRequests(requests);
    return request;
  }

  function updateRequestStatus(id, status) {
    const requests = readRequests();
    const request = requests.find(item => item.id === id);
    if (!request) return false;
    request.status = status;
    return writeRequests(requests);
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }

  function showNotice(container, message, type) {
    if (!container) return;
    container.textContent = message;
    container.hidden = false;
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.dataset.noticeType = type || "info";
  }

  function ensureNotice(parent, className) {
    let notice = $("." + className, parent);
    if (!notice) {
      notice = document.createElement("p");
      notice.className = className;
      notice.hidden = true;
      parent.insertBefore(notice, parent.firstChild);
    }
    return notice;
  }

  function getCounts(requests) {
    return requests.reduce((counts, request) => {
      counts.total += 1;
      if (request.status === "Pending") counts.pending += 1;
      else if (request.status === "Assigned") counts.assigned += 1;
      else if (request.status === "Completed") counts.completed += 1;
      return counts;
    }, { total: 0, pending: 0, assigned: 0, completed: 0 });
  }

  // HOME PAGE: use existing navigation classes and anchor IDs.
  function initHomePage() {
    const navLinks = $$(".navbar a[href^='#']");
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        navLinks.forEach(item => item.classList.remove("active"));
        link.classList.add("active");
      });
    });
  }

  // LOGIN PAGE: accept non-empty demo credentials and open the actual user dashboard.
  // This is front-end navigation only; real account verification needs a backend.
  function initLoginPage() {
    const form = $(".login-form");
    const card = $(".login-card");
    if (!form) return;

    const username = $("[name='username']", form);
    const password = $("#password", form);
    const notice = ensureNotice(card || form.parentElement, "js-login-message");

    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const loginName = username ? username.value.trim() : "";
      const loginPassword = password ? password.value : "";
      if (!loginName || !loginPassword) {
        showNotice(notice, "Please enter your username/email and password.", "error");
        return;
      }

      // Keep a display name for the dashboard. Do not store the password.
      const displayName = loginName.includes("@")
        ? loginName.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase())
        : loginName;
      try {
        sessionStorage.setItem("muniCurrentUser", JSON.stringify({ username: loginName, displayName }));
      } catch (error) {
        console.warn("Session storage is unavailable; continuing to dashboard.", error);
      }

      showNotice(notice, "Login submitted. Opening your dashboard...", "success");
      window.location.assign("user-dashboard.html");
    });
  }

  // NEW REQUEST PAGE: bind the actual #maintenanceForm and its existing field IDs.
  function initNewRequestPage() {
    const form = $("#maintenanceForm");
    if (!form) return;
    const fields = ["fullName", "category", "location", "description", "urgency"];
    const labels = {
      fullName: "Full name", category: "Category", location: "Location",
      description: "Problem description", urgency: "Urgency"
    };
    const notice = ensureNotice(form.parentElement, "js-request-message");

    fields.forEach(id => {
      const field = $("#" + id, form);
      if (!field) return;
      field.addEventListener("blur", () => {
        field.setAttribute("aria-invalid", field.value.trim() ? "false" : "true");
      });
      field.addEventListener("input", () => {
        if (field.value.trim()) field.setAttribute("aria-invalid", "false");
      });
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = {};
      let valid = true;
      fields.forEach(id => {
        const field = $("#" + id, form);
        if (!field) return;
        values[id] = field.value.trim();
        const fieldValid = Boolean(values[id]) && (id !== "fullName" || values[id].length >= 3)
          && (id !== "description" || values[id].length >= 10);
        field.setAttribute("aria-invalid", fieldValid ? "false" : "true");
        if (!fieldValid) valid = false;
      });
      if (!valid) {
        showNotice(notice, "Please check the form. Enter a full name (at least 3 characters) and a description (at least 10 characters).", "error");
        return;
      }
      const created = createRequest(values);
      showNotice(notice, "Request submitted. Your reference number is " + created.id + ".", "success");
      form.reset();
      fields.forEach(id => $("#" + id, form)?.setAttribute("aria-invalid", "false"));
    });
  }

  // MY REQUESTS PAGE: bind the actual filters, tbody and summary IDs in my-requests.html.
  function initMyRequestsPage() {
    const tableBody = $("#requestsTable");
    if (!tableBody) return;
    const filterIds = ["filterCategory", "filterLocation", "filterUrgency", "filterStatus"];
    const notice = ensureNotice($("#requests") || tableBody.parentElement, "js-table-message");

    function render() {
      const all = readRequests();
      const filters = Object.fromEntries(filterIds.map(id => [id, $("#" + id)?.value || ""]));
      const filtered = all.filter(request =>
        (!filters.filterCategory || request.category === filters.filterCategory) &&
        (!filters.filterLocation || request.location === filters.filterLocation) &&
        (!filters.filterUrgency || request.urgency === filters.filterUrgency) &&
        (!filters.filterStatus || request.status === filters.filterStatus)
      );
      tableBody.innerHTML = filtered.map(request => {
        const next = request.status === "Pending" ? "Assigned" : request.status === "Assigned" ? "Completed" : "";
        const statusClass = request.status.toLowerCase() + "-status";
        const urgencyClass = request.urgency.toLowerCase();
        return `<tr>
          <td>${escapeHTML(request.id)}</td>
          <td>${escapeHTML(request.category)}</td>
          <td>${escapeHTML(request.location)}</td>
          <td><span class="urgency ${urgencyClass}">${escapeHTML(request.urgency)}</span></td>
          <td>${escapeHTML(formatDate(request.date))}</td>
          <td><span class="status ${statusClass}">${escapeHTML(request.status)}</span></td>
          <td>${next
            ? `<button type="button" class="view-btn" data-request-action="advance" data-request-id="${escapeHTML(request.id)}" data-next-status="${next}">${next === "Assigned" ? "Assign" : "Mark Done"}</button>`
            : '<button type="button" class="view-btn" data-request-action="view" data-request-id="' + escapeHTML(request.id) + '">View</button>'}
          </td>
        </tr>`;
      }).join("");

      const counts = getCounts(all);
      const summaryIds = {
        totalRequests: counts.total,
        pendingRequests: counts.pending,
        assignedRequests: counts.assigned,
        completedRequests: counts.completed
      };
      Object.entries(summaryIds).forEach(([id, value]) => {
        const element = $("#" + id);
        if (element) element.textContent = value;
      });

      let empty = $(".js-empty-requests", tableBody.parentElement);
      if (!filtered.length) {
        if (!empty) {
          empty = document.createElement("p");
          empty.className = "js-empty-requests";
          tableBody.parentElement.appendChild(empty);
        }
        empty.textContent = "No maintenance requests match these filters.";
      } else if (empty) empty.remove();
    }

    filterIds.forEach(id => $("#" + id)?.addEventListener("change", render));
    $("#clearFilters")?.addEventListener("click", () => {
      filterIds.forEach(id => { const control = $("#" + id); if (control) control.value = ""; });
      render();
      showNotice(notice, "Filters cleared.", "success");
    });

    tableBody.addEventListener("click", event => {
      const button = event.target.closest("button[data-request-action]");
      if (!button) return;
      const request = readRequests().find(item => item.id === button.dataset.requestId);
      if (!request) return;
      if (button.dataset.requestAction === "advance") {
        updateRequestStatus(request.id, button.dataset.nextStatus);
        showNotice(notice, request.id + " status updated to " + button.dataset.nextStatus + ".", "success");
        render();
      } else {
        window.alert("Reference: " + request.id + "\nCategory: " + request.category + "\nLocation: " + request.location +
          "\nUrgency: " + request.urgency + "\nStatus: " + request.status + "\nDescription: " + request.description);
      }
    });

    render();
    const requestedStatus = new URLSearchParams(window.location.search).get("status");
    if (requestedStatus) {
      const statusMap = { pending: "Pending", "in-progress": "Assigned", assigned: "Assigned", resolved: "Completed", completed: "Completed" };
      const select = $("#filterStatus");
      if (select && statusMap[requestedStatus.toLowerCase()]) {
        select.value = statusMap[requestedStatus.toLowerCase()];
        render();
      }
    }
  }

  // USER DASHBOARD: update existing statistic cards and recent-requests table.
  function initUserDashboard() {
    const dashboard = $(".dashboard-container");
    if (!dashboard) return;
    const requests = readRequests();
    const counts = getCounts(requests);
    try {
      const currentUser = JSON.parse(sessionStorage.getItem("muniCurrentUser") || "null");
      const welcomeName = $(".welcome-text h1 span", dashboard);
      const userMenuName = $(".user-menu > span", dashboard);
      if (currentUser && currentUser.displayName) {
        if (welcomeName) welcomeName.textContent = currentUser.displayName;
        if (userMenuName) userMenuName.textContent = currentUser.displayName;
      }
    } catch (error) {
      console.warn("Could not read the current session user.", error);
    }
    const statCards = $$(".statistics-grid .stat-card", dashboard);
    statCards.forEach(card => {
      const label = ($(".stat-details p", card)?.textContent || "").trim().toLowerCase();
      const value = $(".stat-details h2", card);
      if (!value) return;
      if (label.includes("my requests")) value.textContent = counts.total;
      else if (label.includes("resolved")) value.textContent = counts.completed;
      else if (label.includes("progress")) value.textContent = counts.assigned;
      else if (label.includes("pending")) value.textContent = counts.pending;
    });

    const recentBody = $(".recent-requests tbody", dashboard);
    if (recentBody) {
      recentBody.innerHTML = requests.slice(0, 5).map(request => {
        const statusLabel = request.status === "Assigned" ? "In Progress" : request.status === "Completed" ? "Resolved" : "Pending";
        const statusClass = request.status === "Assigned" ? "in-progress" : request.status === "Completed" ? "resolved" : "pending";
        return `<tr>
          <td>#${escapeHTML(request.id)}</td>
          <td class="issue-type">${escapeHTML(request.category)}</td>
          <td>${escapeHTML(request.description)}</td>
          <td><span class="status ${statusClass}">${statusLabel}</span></td>
          <td>${escapeHTML(formatDate(request.date))}</td>
        </tr>`;
      }).join("");
    }

    const menuButton = $(".menu-button", dashboard);
    const sidebar = $(".sidebar", dashboard);
    if (menuButton && sidebar) {
      menuButton.setAttribute("aria-expanded", "false");
      const closeSidebar = () => {
        sidebar.classList.remove("is-open");
        sidebar.style.display = "none";
        menuButton.setAttribute("aria-expanded", "false");
      };
      menuButton.addEventListener("click", () => {
        const isOpen = !sidebar.classList.contains("is-open");
        sidebar.classList.toggle("is-open", isOpen);
        if (window.innerWidth <= 600) {
          sidebar.style.display = isOpen ? "block" : "none";
          sidebar.style.position = isOpen ? "fixed" : "";
          sidebar.style.inset = isOpen ? "0 auto 0 0" : "";
          sidebar.style.zIndex = isOpen ? "1000" : "";
          sidebar.style.overflowY = isOpen ? "auto" : "";
        }
        menuButton.setAttribute("aria-expanded", String(isOpen));
      });
      document.addEventListener("click", event => {
        if (window.innerWidth <= 600 && sidebar.classList.contains("is-open") &&
            !sidebar.contains(event.target) && !menuButton.contains(event.target)) closeSidebar();
      });
      window.addEventListener("resize", () => {
        if (window.innerWidth > 600) {
          sidebar.style.display = "";
          sidebar.style.position = "";
          sidebar.style.inset = "";
          sidebar.style.zIndex = "";
          sidebar.style.overflowY = "";
          sidebar.classList.remove("is-open");
          menuButton.setAttribute("aria-expanded", "false");
        } else if (!sidebar.classList.contains("is-open")) {
          sidebar.style.display = "none";
        }
      });
    }
  }

  function init() {
    initHomePage();
    initLoginPage();
    initNewRequestPage();
    initMyRequestsPage();
    initUserDashboard();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
