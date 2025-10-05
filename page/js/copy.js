// Function to copy events list in LLM-friendly format
function copyEventsToClipboard() {
    const events = filteredEvents.length > 0 ? filteredEvents : allEvents;

    console.log("Copying events:", events.length);

    if (events.length === 0) {
        alert("No events to copy");
        return;
    }

    let text = `Running Events in Bangladesh (${events.length} events)\n`;
    text += `Generated on: ${new Date().toLocaleDateString()}\n\n`;

    events.forEach((event, index) => {
        text += `${index + 1}. ${event.name}\n`;
        text += `   📅 Date: ${event.date || "TBA"}\n`;
        text += `   📏 Distance: ${event.distance ? event.distance + "K" : "TBA"}\n`;
        text += `   📍 Location: ${event.location || "TBA"}\n`;
        text += `   💰 Fee: ${formatFeeForCopy(event.fee, event.earlyBirdFee)}\n`;
        if (event.tags) {
            text += `   🏷️ Type: ${event.tags}\n`;
        }
        if (event.responseCount) {
            text += `   👥 Responses: ${event.responseCount}\n`;
        }
        if (event.website) {
            text += `   🌐 Website: https://${event.website}\n`;
        }
        text += "\n";
    });

    text += `\nTotal Events: ${events.length}`;

    console.log(
        "Generated text preview:",
        text.substring(0, 200) + "...",
    );

    navigator.clipboard
        .writeText(text)
        .then(() => {
            console.log("Copy successful");
            // Show success feedback
            const btn = document.querySelector(".copy-list-btn");
            const originalText = btn.innerHTML;
            btn.innerHTML = `<svg class="icon-sm" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copied!`;
            btn.style.background = "#28a745";
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = "";
            }, 2000);
        })
        .catch((err) => {
            console.error("Failed to copy: ", err);
            alert("Failed to copy to clipboard. Please try again.");
        });
}

// Helper function for formatting fee in copy format
function formatFeeForCopy(fee, earlyBirdFee) {
    if (fee === null || fee === undefined) {
        return "TBA";
    }

    if (fee === 0) {
        return "Free";
    }

    let feeText = `৳${fee}`;
    if (
        earlyBirdFee !== null &&
        earlyBirdFee !== undefined &&
        earlyBirdFee !== fee
    ) {
        feeText += ` (Early bird: ৳${earlyBirdFee})`;
    }

    return feeText;
}
