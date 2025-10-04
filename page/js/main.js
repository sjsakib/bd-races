let allEvents = [];
let filteredEvents = [];

// Load events from JSON file
async function loadEvents() {
  try {
    const response = await fetch("../events.json");
    allEvents = await response.json();

    // Filter out past events - only keep current and future events
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    allEvents = allEvents.filter((event) => {
      const eventDate = parseEventDate(event.date);
      if (!eventDate || isNaN(eventDate)) return true; // Keep events with invalid dates for manual review
      return eventDate >= today;
    });

    // Sort events by date from earliest to latest
    allEvents.sort((a, b) => {
      const dateA = parseEventDate(a.date);
      const dateB = parseEventDate(b.date);
      if (!dateA || isNaN(dateA)) return 1;
      if (!dateB || isNaN(dateB)) return -1;
      return dateA - dateB; // Earliest first
    });
    populateFilterOptions();
    displayEvents(allEvents);
    updateEventCount(allEvents.length);
  } catch (error) {
    console.error("Error loading events:", error);
    document.getElementById("eventsGrid").innerHTML =
      '<div class="no-events">Error loading events. Please check if events.json is available.</div>';
  }
}

// Populate filter dropdowns with unique values
function populateFilterOptions() {
  // Populate distances dynamically from events data
  const distances = [
    ...new Set(
      allEvents
        .map((event) => event.distance)
        .filter((distance) => distance !== null && distance !== undefined),
    ),
  ].sort((a, b) => a - b);

  const distanceFilter = document.getElementById("distanceFilter");
  // Clear existing options except "All Distances"
  distanceFilter.innerHTML = '<option value="">All Distances</option>';

  distances.forEach((distance) => {
    const option = document.createElement("option");
    option.value = distance;

    // Format distance display with special labels for common distances
    let displayText;
    if (distance === 21.1) {
      displayText = `Half Marathon (${distance}K)`;
    } else if (distance === 42.2) {
      displayText = `Marathon (${distance}K)`;
    } else {
      displayText = `${distance}K`;
    }

    option.textContent = displayText;
    distanceFilter.appendChild(option);
  });

  // Populate locations
  const locations = [
    ...new Set(
      allEvents
        .map((event) => event.location?.split(",")[0]?.trim())
        .filter(Boolean),
    ),
  ].sort();
  const locationFilter = document.getElementById("locationFilter");
  locations.forEach((location) => {
    const option = document.createElement("option");
    option.value = location;
    option.textContent = location;
    locationFilter.appendChild(option);
  });

  // Populate tags
  const allTags = allEvents.flatMap((event) =>
    event.tags ? event.tags.split(",").map((tag) => tag.trim()) : [],
  );
  const uniqueTags = [...new Set(allTags)].sort();
  const tagFilter = document.getElementById("tagFilter");
  uniqueTags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
}

// Display events in the grid
function displayEvents(events) {
  const eventsGrid = document.getElementById("eventsGrid");

  if (events.length === 0) {
    eventsGrid.innerHTML =
      '<div class="no-events">No events found matching your criteria.</div>';
    return;
  }

  eventsGrid.innerHTML = events
    .map(
      (event) => `
            <div class="event-card">
                <div class="event-name">${event.name}</div>
                <div class="event-details">
                    <div class="event-detail">
                        <span class="detail-icon">📅</span>
                        ${event.date || "Date TBA"}
                    </div>
                    <div class="event-detail">
                        <span class="detail-icon">📏</span>
                        ${event.distance ? event.distance + "K" : "Distance TBA"}
                    </div>
                    <div class="event-detail">
                        <span class="detail-icon">📍</span>
                        ${event.location || "Location TBA"}
                    </div>
                    <div class="event-detail">
                        <span class="detail-icon">💰</span>
                        ${formatFee(event.fee, event.earlyBirdFee)}
                    </div>
                </div>
                ${
                  event.tags
                    ? `
                    <div class="event-tags">
                        ${event.tags
                          .split(",")
                          .map(
                            (tag) => `<span class="tag">${tag.trim()}</span>`,
                          )
                          .join("")}
                    </div>
                `
                    : ""
                }
                <div class="event-links">
                    ${
                      event.website
                        ? `
                        <a href="https://${event.website}" target="_blank" class="event-link website-link" title="Visit Website">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                        </a>
                    `
                        : ""
                    }
                    ${
                      event.fbLink
                        ? `
                        <a href="${event.fbLink}" target="_blank" class="event-link facebook-link" title="View on Facebook">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                        </a>
                    `
                        : ""
                    }
                </div>
            </div>
        `,
    )
    .join("");
}

// Format fee display
function formatFee(fee, earlyBirdFee) {
  if (!fee && !earlyBirdFee) return "Unknown";
  if (earlyBirdFee && fee) return `৳${earlyBirdFee} (Early) / ৳${fee}`;
  if (fee) return `৳${fee}`;
  if (earlyBirdFee) return `৳${earlyBirdFee} (Early Bird)`;
  return "Unknown";
}

// Update event count
function updateEventCount(count) {
  document.getElementById("eventCount").textContent =
    `${count} event${count !== 1 ? "s" : ""} found`;
}

// Parse date string to Date object (handles various formats)
function parseEventDate(dateString) {
  if (!dateString) return null;

  // Handle date ranges by taking the first date
  let workingDate = dateString;
  if (dateString.includes("-") && dateString.match(/\d+-\d+/)) {
    // Extract first date from range like "14-15 Nov 2025"
    const rangeMatch = dateString.match(/(\d+)-\d+\s+(\w{3})\s+(\d{4})/);
    if (rangeMatch) {
      const [, firstDay, month, year] = rangeMatch;
      workingDate = `${firstDay} ${month} ${year}`;
    }
  }

  // Try different date formats
  const formats = [
    // "21 Dec 2025" format
    /(\d{1,2})\s+(\w{3})\s+(\d{4})/,
    // Standard formats
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  ];

  const monthNames = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11,
  };

  // Try "21 Dec 2025" format first
  const match = workingDate.match(formats[0]);
  if (match) {
    const [, day, month, year] = match;
    const monthNum = monthNames[month];
    if (monthNum !== undefined) {
      return new Date(parseInt(year), monthNum, parseInt(day));
    }
  }

  // Fallback to standard Date parsing
  return new Date(workingDate);
}

// Filter events based on current filter values
function filterEvents() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const distanceFilter = document.getElementById("distanceFilter").value;
  const feeFilter = document.getElementById("feeFilter").value;
  const locationFilter = document.getElementById("locationFilter").value;
  const tagFilter = document.getElementById("tagFilter").value;
  const dateFromFilter = document.getElementById("dateFromFilter").value;
  const dateToFilter = document.getElementById("dateToFilter").value;

  filteredEvents = allEvents.filter((event) => {
    // Filter out past events - only show current and future events
    const eventDate = parseEventDate(event.date);
    if (eventDate && !isNaN(eventDate)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day
      if (eventDate < today) {
        return false;
      }
    }

    // Search filter
    if (
      searchTerm &&
      !event.name.toLowerCase().includes(searchTerm) &&
      !event.location?.toLowerCase().includes(searchTerm)
    ) {
      return false;
    }

    // Distance filter
    if (distanceFilter && event.distance != distanceFilter) {
      return false;
    }

    // Fee filter
    if (feeFilter) {
      const fee = event.fee || event.earlyBirdFee;
      switch (feeFilter) {
        case "unknown":
          if (fee !== null && fee !== undefined) return false;
          break;
        case "0-500":
          if (!fee || fee < 0 || fee > 500) return false;
          break;
        case "500-1000":
          if (!fee || fee < 500 || fee > 1000) return false;
          break;
        case "1000-2000":
          if (!fee || fee < 1000 || fee > 2000) return false;
          break;
        case "2000+":
          if (!fee || fee < 2000) return false;
          break;
      }
    }

    // Location filter
    if (locationFilter && !event.location?.includes(locationFilter)) {
      return false;
    }

    // Tag filter
    if (tagFilter && !event.tags?.includes(tagFilter)) {
      return false;
    }

    // Date range filter
    if (dateFromFilter || dateToFilter) {
      const eventDate = parseEventDate(event.date);
      if (!eventDate || isNaN(eventDate)) return false;

      if (dateFromFilter) {
        const fromDate = new Date(dateFromFilter);
        if (eventDate < fromDate) return false;
      }

      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        // Set to end of day to include events on the to date
        toDate.setHours(23, 59, 59, 999);
        if (eventDate > toDate) return false;
      }
    }

    return true;
  });

  // Sort filtered events by date from earliest to latest
  filteredEvents.sort((a, b) => {
    const dateA = parseEventDate(a.date);
    const dateB = parseEventDate(b.date);
    if (!dateA || isNaN(dateA)) return 1;
    if (!dateB || isNaN(dateB)) return -1;
    return dateA - dateB; // Earliest first
  });

  displayEvents(filteredEvents);
  updateEventCount(filteredEvents.length);
}

// Clear all filters
function clearAllFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("distanceFilter").value = "";
  document.getElementById("feeFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("tagFilter").value = "";
  document.getElementById("dateFromFilter").value = "";
  document.getElementById("dateToFilter").value = "";

  // Sort events by date from most recent to oldest
  displayEvents(allEvents);
  updateEventCount(allEvents.length);
}

// Mobile filter functions
function toggleMobileFilters() {
  const sidebar = document.getElementById("filterSidebar");
  const toggle = document.querySelector(".mobile-menu-toggle");
  const toggleText = document.getElementById("filterToggleText");

  sidebar.classList.toggle("mobile-open");
  toggle.classList.toggle("active");

  if (sidebar.classList.contains("mobile-open")) {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    toggleText.innerHTML =
      '<svg class="icon" style="margin-right: 8px;" viewBox="0 0 24 24"><path d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 0 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg><span>Close</span>';
    toggle.setAttribute("title", "Close Filters");
    sidebar.style.display = "block";

    // Force redraw to ensure scrolling works properly
    setTimeout(() => {
      sidebar.style.opacity = "0.99";
      setTimeout(() => {
        sidebar.style.opacity = "1";
      }, 50);
    }, 0);
  } else {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.height = "";
    toggleText.innerHTML =
      '<svg class="icon" style="margin-right: 8px;" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm2 5h14v2H5v-2zm4 5h6v2H9v-2z"/></svg><span>Filter</span>';
    toggle.setAttribute("title", "Open Filters");
    setTimeout(() => {
      if (!sidebar.classList.contains("mobile-open")) {
        sidebar.style.display = "none";
      }
    }, 300);
  }
}

function closeMobileFilters() {
  const sidebar = document.getElementById("filterSidebar");
  const toggle = document.querySelector(".mobile-menu-toggle");
  const toggleText = document.getElementById("filterToggleText");

  sidebar.classList.remove("mobile-open");
  toggle.classList.remove("active");
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.body.style.height = "";
  toggleText.innerHTML =
    '<svg class="icon" style="margin-right: 8px;" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm2 5h14v2H5v-2zm4 5h6v2H9v-2z"/></svg><span>Filter</span>';
  toggle.setAttribute("title", "Open Filters");

  setTimeout(() => {
    if (!sidebar.classList.contains("mobile-open")) {
      sidebar.style.display = "none";
    }
  }, 300);
}

// Check if the device is a mobile/touch device
function isTouchDevice() {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

// Handle clicks outside the sidebar to close it on mobile
function handleOutsideClick(event) {
  const sidebar = document.getElementById("filterSidebar");
  const toggle = document.querySelector(".mobile-menu-toggle");

  if (
    sidebar.classList.contains("mobile-open") &&
    !sidebar.contains(event.target) &&
    !toggle.contains(event.target)
  ) {
    closeMobileFilters();
  }
}

// Add event listeners when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Add touch-friendly enhancements for mobile devices
  if (isTouchDevice()) {
    const filterSidebar = document.getElementById("filterSidebar");
    filterSidebar.classList.add("touch-device");

    // Add click outside listener for mobile
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("touchend", handleOutsideClick);
  }

  document
    .getElementById("searchInput")
    .addEventListener("input", filterEvents);
  document
    .getElementById("distanceFilter")
    .addEventListener("change", filterEvents);
  document.getElementById("feeFilter").addEventListener("change", filterEvents);
  document
    .getElementById("locationFilter")
    .addEventListener("change", filterEvents);
  document.getElementById("tagFilter").addEventListener("change", filterEvents);
  document
    .getElementById("dateFromFilter")
    .addEventListener("change", filterEvents);
  document
    .getElementById("dateToFilter")
    .addEventListener("change", filterEvents);

  // Load events
  loadEvents();
});
