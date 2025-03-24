## **1\. Description of the Web App**

**Quran Circle** is a platform enabling users to collaboratively complete Quran readings by dividing the Quran into 30 Juz. Users can create “events,” each containing one or more khatms. When a khatm’s Juz are fully claimed, **Quran Circle** automatically creates a new khatm within the same event. The app is **mobile-friendly** and does not require logins for participants to read and claim. Only those creating or managing events need to log in.

---

## **2\. Product Overview**

1. **Name**: Quran Circle

2. **Purpose**: Facilitate a simple and trust-based way for communities to complete Quran readings in groups, especially for mosques or personal gatherings.

3. **Key Concept**:

   * **Events**: Containers that hold one or more khatms.

   * **Khatms**: Each includes **30 Juz**, with new khatms auto-created once the current is fully claimed.

   * **Mobile-Responsive**: Designed to be accessible on smartphones, tablets, and desktops.

---

## **3\. Goals & Non-Goals**

### **3.1. Goals**

* **Event-Based Organization**

  * Every event has its own unique shareable link.

  * Participants see all available khatms under an event.

* **Juz-Only Reading**

  * Khatms break the Quran into exactly 30 Juz.

* **Automatic Khatm Creation**

  * Once all 30 Juz in a khatm are claimed, a new khatm is automatically spawned.

* **Trust-Based Participation**

  * Guests simply enter their name to claim a Juz.

  * Minimal moderation; the event creator can remove or reset if needed.

* **Mobile-First**

  * Ensures smooth scrolling and tapping on smaller screens.

### **3.2. Non-Goals**

* **Complex Authentication**

  * Only event creators need accounts; guests do not.

* **Hizb or Surah Options**

  * The app focuses on Juz only.

* **Advanced Moderation**

  * No extensive oversight, just minimal name checking.

---

## **4\. User Roles**

1. **Event Creator (Logged-In)**

   * Creates new events.

   * Has the authority to reset claims, rename events, or close them.

2. **Participant (Guest or Logged-In)**

   * Joins via the event link.

   * Claims Juz by entering their name (if a guest) or using their account info.

   * Marks Juz as read.

---

## **5\. Key Features & Requirements**

### **5.1. Event Creation**

* **Logged-in only**.

* **Form Fields**:

  * Event Name (e.g., “Ramadan Nights”), Public/Private toggle, optional deadline.

* **Result**:

  * A unique link (`/event/<eventId>`) for sharing with participants.

### **5.2. Khatm Structure & Auto-Creation**

* **Each Khatm** is exactly 30 Juz.

* When all 30 Juz are claimed, **Quran Circle** automatically generates a new khatm for that event:

  * Inherits main settings (deadline, name pattern, etc.).

  * Labeled as “Khatm \#2,” “Khatm \#3,” etc., for clarity.

### **5.3. Khatm View**

* **Progress Indicators**

  * Show “claimed / 30” and “read / 30.”

* **Juz Grid or List**

  * Each tile represents one Juz.

  * Tappable/clickable to claim or see who claimed it.

* **Claim & Mark Read**

  * Claim with a name if guest; logged-in user’s name auto-fills.

  * Mark as read once finished.

* **Unclaim**

  * Users can unclaim if they made a mistake.

  * Event creator can also unclaim or reassign if necessary.

### **5.4. Event Page**

* **Lists All Khatms** under the event.

* **Mobile-Responsive Layout**

  * Accommodates fewer columns for small screens; easy tapping.

* **Automatic Updates**

  * If the latest khatm is fully claimed, the next one instantly appears for new participants to join.

### **5.5. Public vs. Private Events**

* **Public** events can be discoverable (future expansion if desired).

* **Private** events require the direct link to access.

---

## **6\. Mobile-First Design**

1. **Responsive Layout**

   * Ensure Juz tiles wrap neatly for phone-sized viewports.

2. **Touch-Friendly Controls**

   * Ample spacing on claim/unclaim buttons.

3. **Clear Typographic Hierarchy**

   * Easy-to-read text, consistent sizing across smaller screens.

4. **Language Toggle**

   * English default, with optional Arabic, Turkish, Urdu.

---

## **7\. Data Model (High-Level)**

1. **Events**

   * `eventId`, `name`, `isPublic`, `deadline`, `createdByUserId`

2. **Khatms**

   * `khatmId`, `eventId`, `khatmNumber`, `createdAt`

3. **Juz**

   * `khatmId`, `juzIndex` (1–30), `claimedByName`, `claimedByUserId`, `status` \= “claimed” | “read”

---

## **8\. Moderation & Management**

* **Close Event**

  * The event creator can prevent further claims or new khatms.

* **Remove Inappropriate Claims**

  * Creator can reset a Juz if someone enters an offensive name.

---

## **9\. Success Criteria**

1. **Smooth Mobile Experience**

   * Quick to claim Juz; big enough buttons for comfortable tapping.

2. **No Mandatory Login for Participants**

   * Low barrier to join.

3. **Sequential Khatms**

   * Automatic spawning of new khatms without manual intervention.

4. **Progress Visibility**

   * Clear status on how many Juz are claimed and completed.

5. **Event Management**

   * Event creators can modify event details or moderate as needed.

---

### **Conclusion**

**Quran Circle** provides a user-friendly, trust-based experience for hosting and participating in collective Quran readings, focusing on a **mobile-first** design and seamless creation of new khatms as soon as the current one is fully claimed. The result is an effortless solution for mosques, community groups, and individuals alike.

