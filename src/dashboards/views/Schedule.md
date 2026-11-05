## Tech Talk Hub — New Global Scheduling System

We'll turn the calendar into a complete class scheduling and management system while keeping the existing Supabase + React + FullCalendar stack.

### 1. Tutor availability
- Tutors create **one-hour class slots**.
- Every slot has a compulsory **15-minute break** afterward.
- Prevent overlapping slots and double bookings.
- Display accurate free slots, booked classes, and tutor workload.

### 2. Automatic trial assignment
- When a trial student books a date and time, the system checks tutor availability.
- If a tutor is available, automatically assign the tutor and schedule the trial.
- If nobody is available, leave the trial unassigned and **bubble it to the top of the admin's unassigned list**.
- Admins can manually assign or reassign tutors.

### 3. Subscribed student bookings
- Students can view the calendar and request available slots.
- The assigned tutor can accept or reject each booking.
- Accepted bookings become confirmed classes.
- Rejected bookings trigger an **admin notification** and return to the scheduling workflow for resolution.
- Prevent two students from booking the same tutor's slot.

### 4. Permanent student meeting links
- Generate a personal meeting link for each student, incorporating their name where the meeting provider supports it.
- Keep that link consistent from the trial class throughout their course.
- Store the link against the student, rather than generating a new one for every class.

**Important:** Generating actual meeting rooms requires a supported provider, such as Google Meet or Zoom, and potentially its API. We should not simply construct a URL and assume it creates a valid meeting.

### 5. Admin controls
- Change the tutor assigned to any booked class.
- View unassigned trials and rejected bookings at the top.
- Merge **up to two students into one class**, where appropriate.
- Keep students unassigned until an administrator resolves scheduling conflicts or approves a suitable arrangement.
- Prevent accidental double bookings and conflicting assignments.

### 6. Manage classes directly from the calendar

**Tutors can:**
- Join a class.
- Start and end a class.
- View the student's details.
- Access class materials.
- Upload class recordings.

**Students can:**
- Join their confirmed classes.
- Access their class materials and available recordings.

**Admins can:**
- Monitor class status.
- Reassign tutors.
- Review recordings and scheduling issues.

### 7. Accurate reporting and notifications
- Count actual free slots and booked classes, excluding breaks.
- Track completed, ongoing, cancelled, and upcoming classes separately.
- Notify admins when tutors reject bookings or scheduling issues require intervention.
- Handle database errors properly and avoid partially completed assignments.

### How we should implement this

I recommend three layers:

1. **React calendar:** Scheduling interface, booking requests, class controls, and student details.
2. **Supabase:** Persistent records, booking status, notifications, meeting links, and class materials.
3. **Database safeguards:** Prevent double bookings, enforce permissions, and handle assignments reliably.

**One important decision before coding:** Which meeting platform do you use for your classes — **Google Meet, Zoom, or manually created meeting links?**

This determines how we implement permanent meeting links and whether we can automatically create meeting rooms.