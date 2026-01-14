import type { EventItem, RecurrenceRule } from '../types';

export function parseUCMHtml(html: string): EventItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const events: EventItem[] = [];
  
  const courseWrappers = doc.querySelectorAll('.listViewWrapper');
  
  courseWrappers.forEach(wrapper => {
    // 1. Title
    const titleEl = wrapper.querySelector('.list-view-course-title a');
    const courseCodeEl = wrapper.querySelector('.list-view-subj-course-section');
    const fullTitle = titleEl?.textContent?.trim() || 'Untitled Course';
    const courseCode = courseCodeEl?.textContent?.trim() || '';
    
    // 2. Instructor (Optional - for description)
    const instructorEl = wrapper.querySelector('.listViewInstructorInformation .email');
    const instructor = instructorEl?.textContent?.trim() || '';
    
    // 3. Meeting Information (Can be multiple blocks, but in HTML structure provided, it's lines inside one div?)
    // Looking at the HTML, .listViewMeetingInformation contains blocks of info separated by <br>?
    // Actually it seems to contain a list of spans and divs.
    // Structure:
    // <div class="listViewMeetingInformation">
    //    <span class="meetingTimes">DATE - DATE</span>
    //    <span>...</span>
    //    <div class="list-view-pillbox ...">...</div>
    //    <span>TIME - TIME</span>
    //    ... Type: ... Location: ...
    //    <br>
    //    <span class="meetingTimes">...</span> (Next meeting)
    // </div>
    
    const meetingDiv = wrapper.querySelector('.listViewMeetingInformation');
    if (!meetingDiv) return;
    
    // Split by <br> tags to handle multiple schedules (e.g. Lecture + Exam)
    // Since we are in DOM, we can iterate children.
    // A "meeting block" starts with span.meetingTimes
    
    let currentMeeting: any = {};
    let pendingSave = false;
    
    const saveCurrent = () => {
        if (!currentMeeting.dateRange) return;
        
        // Process currentMeeting into EventItem
        const [startDateStr, endDateStr] = currentMeeting.dateRange.split('--').map((s: string) => s.trim());
        // Date format MM/DD/YYYY
        const parseUSDate = (str: string) => {
            const [m, d, y] = str.split('/').map(Number);
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        };
        
        const startDate = parseUSDate(startDateStr);
        const endDate = parseUSDate(endDateStr);
        
        // Time
        // Format: "12:00 PM - 01:15 PM"
        // remove &nbsp; and extra spaces
        const timeText = currentMeeting.timeStr?.replace(/\u00a0/g, ' ').trim() || '';
        const [startTimeStr, endTimeStr] = timeText.split('-').map((s: string) => s.trim());
        
        const convertTo24 = (time12: string) => {
            if (!time12) return undefined;
            // Handle time string properly. The input might be "12:00 PM" or "01:15 PM" with extra spaces.
            // The split ' ' might produce multiple parts if multiple spaces.
            const parts = time12.split(/\s+/); 
            if (parts.length < 2) return undefined;
            
            // Assuming format is always "HH:MM AM/PM" or "H:MM AM/PM"
            const t = parts[0];
            const period = parts[1]; // AM or PM
            
            if (!t) return undefined; 
            
            const timeParts = t.split(':').map(Number);
            if (timeParts.length < 2) return undefined;
            
            let h = timeParts[0];
            const m = timeParts[1];
            
            if (h === undefined || isNaN(h)) return undefined;
            if (m === undefined || isNaN(m)) return undefined;
            
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };
        
        const startTime = convertTo24(startTimeStr);
        const endTime = convertTo24(endTimeStr);
        
        // Days
        const byWeekday: number[] = [];
        if (currentMeeting.days) {
            currentMeeting.days.forEach((isChecked: boolean, index: number) => {
                if (isChecked) byWeekday.push(index);
            });
        }
        
        // Skip events with no valid time AND no days (like online/TBA courses)
        if (!startTime && byWeekday.length === 0) {
            return;
        }
        
        // Filter out "None" values from location
        let location = '';
        const building = currentMeeting.building && currentMeeting.building !== 'None' ? currentMeeting.building : '';
        const room = currentMeeting.room && currentMeeting.room !== 'None' ? currentMeeting.room : '';
        if (building || room) {
            location = `${building} ${room}`.trim();
        } else if (currentMeeting.locationBase && currentMeeting.locationBase !== 'None') {
            location = currentMeeting.locationBase;
        }
        
        // Description
        let desc = `${courseCode}`;
        if (currentMeeting.type) desc += `\nType: ${currentMeeting.type}`;
        if (instructor) desc += `\nInstructor: ${instructor}`;
        
        // Construct Recurrence
        const recurrence: RecurrenceRule = {
            freq: 'WEEKLY',
            interval: 1,
            byWeekday: byWeekday,
            until: endDate // Inclusive end date
        };
        
        // If it's a single day event (like Exam) or special case?
        // Actually the date range might be a single day.
        // If startDate == endDate, it's a single occurrence (or daily for 1 day).
        // If startDate == endDate, we can set freq=NONE or DAILY count=1.
        // But if it has days set, we should respect them.
        // Example Exam: 05/14/2026 -- 05/14/2026, Thursday.
        
        const item: EventItem = {
            id: crypto.randomUUID(),
            title: `${fullTitle} (${currentMeeting.type || 'Class'})`,
            date: startDate,
            startTime,
            endTime,
            allDay: false,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            location: location || undefined,
            description: desc,
            recurrence,
            createdAt: Date.now()
        };
        
        events.push(item);
    };
    
    Array.from(meetingDiv.childNodes).forEach(node => {
        if (node.nodeName === 'BR') {
            saveCurrent();
            currentMeeting = {};
            pendingSave = false;
            return;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (el.classList.contains('meetingTimes')) {
                currentMeeting.dateRange = el.textContent?.trim();
                pendingSave = true;
            } else if (el.classList.contains('ui-pillbox')) {
                // Days
                const lis = el.querySelectorAll('ul li');
                currentMeeting.days = Array.from(lis).map(li => li.getAttribute('aria-checked') === 'true');
            } else if (el.tagName === 'SPAN' && el.textContent?.includes(':') && (el.textContent.includes('AM') || el.textContent.includes('PM'))) {
                // Time span usually looks like <span>...</span> but in the HTML provided:
                // <span>&nbsp;&nbsp;&nbsp;<span>12</span>:<span>00</span>  PM - ...</span>
                // It might be nested or direct text.
                // The provided HTML shows: <span>&nbsp;&nbsp;&nbsp;<span>12</span>:<span>00</span>  PM - <span>01</span>:<span>15</span>  PM</span>
                currentMeeting.timeStr = el.textContent?.trim();
            } else if (el.classList.contains('bold')) {
                // Label like "Type:", "Location:", "Building:", "Room:"
                const label = el.textContent?.trim().replace(':', '');
                const valueNode = el.nextSibling;
                const value = valueNode?.textContent?.trim() || ''; // Text node after bold span
                
                if (label === 'Type') currentMeeting.type = value;
                if (label === 'Location') currentMeeting.locationBase = value;
                if (label === 'Building') currentMeeting.building = value;
                if (label === 'Room') currentMeeting.room = value;
            }
        }
    });
    
    // Final save if loop finished without BR
    if (pendingSave) {
        saveCurrent();
    }
  });
  
  return events;
}
