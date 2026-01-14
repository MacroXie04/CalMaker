import { describe, it, expect, beforeAll } from 'vitest';
import { parseUCMHtml } from '../ucmParser';

// Mock DOMParser for Node.js environment
beforeAll(() => {
  // happy-dom provides DOMParser
});

describe('UCM HTML Parser', () => {
  describe('basic parsing', () => {
    it('returns empty array for empty HTML', () => {
      const events = parseUCMHtml('');
      expect(events).toEqual([]);
    });

    it('returns empty array for HTML without course wrappers', () => {
      const html = '<div>No courses here</div>';
      const events = parseUCMHtml(html);
      expect(events).toEqual([]);
    });
  });

  describe('course parsing', () => {
    it('extracts course title', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Computer Science 101</a></div>
          <div class="list-view-subj-course-section">CSE 101-01</div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.title).toContain('Computer Science 101');
    });

    it('extracts meeting times', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Math 101</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>10:30 AM - 11:45 AM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.startTime).toBe('10:30');
      expect(events[0]?.endTime).toBe('11:45');
    });

    it('extracts weekdays from pillbox', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Physics 101</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>02:00 PM - 03:15 PM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      // Monday = 1, Wednesday = 3
      expect(events[0]?.recurrence.byWeekday).toContain(1);
      expect(events[0]?.recurrence.byWeekday).toContain(3);
    });

    it('extracts location information', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Chemistry 101</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
            <span class="bold">Building:</span> Science Hall
            <span class="bold">Room:</span> 205
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.location).toContain('Science Hall');
      expect(events[0]?.location).toContain('205');
    });

    it('sets correct recurrence until date', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Biology 101</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>11:00 AM - 12:00 PM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.date).toBe('2024-01-15');
      expect(events[0]?.recurrence.until).toBe('2024-05-15');
    });
  });

  describe('multiple meeting blocks', () => {
    it('parses multiple meeting types (lecture + exam)', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Engineering 101</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
            <br>
            <span class="meetingTimes">05/20/2024 -- 05/20/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>02:00 PM - 04:00 PM</span>
            <span class="bold">Type:</span> Final Exam
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBe(2);
      expect(events.some(e => e.title.includes('Lecture'))).toBe(true);
      expect(events.some(e => e.title.includes('Final Exam'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles courses without time (TBA)', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Online Course</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <span class="bold">Type:</span> Online
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      // Should skip events without time and days
      expect(events.length).toBe(0);
    });

    it('filters out "None" location values', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Test Course</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="false"></li>
                <li aria-checked="true"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
                <li aria-checked="false"></li>
              </ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
            <span class="bold">Building:</span> None
            <span class="bold">Room:</span> None
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.location).toBeFalsy();
    });

    it('handles invalid date format gracefully', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Bad Date Course</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">invalid-date -- also-invalid</span>
            <div class="ui-pillbox">
              <ul>
                <li aria-checked="true"></li>
              </ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      // Should skip events with invalid dates
      expect(events.length).toBe(0);
    });
  });

  describe('event properties', () => {
    it('generates unique IDs for each event', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Course A</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul><li aria-checked="true"></li></ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Course B</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul><li aria-checked="true"></li></ul>
            </div>
            <span>10:00 AM - 11:00 AM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBe(2);
      expect(events[0]?.id).not.toBe(events[1]?.id);
    });

    it('sets allDay to false for timed events', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Timed Course</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul><li aria-checked="true"></li></ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.allDay).toBe(false);
    });

    it('sets recurrence freq to WEEKLY', () => {
      const html = `
        <div class="listViewWrapper">
          <div class="list-view-course-title"><a>Weekly Course</a></div>
          <div class="listViewMeetingInformation">
            <span class="meetingTimes">01/15/2024 -- 05/15/2024</span>
            <div class="ui-pillbox">
              <ul><li aria-checked="true"></li></ul>
            </div>
            <span>09:00 AM - 10:00 AM</span>
            <span class="bold">Type:</span> Lecture
          </div>
        </div>
      `;
      const events = parseUCMHtml(html);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]?.recurrence.freq).toBe('WEEKLY');
    });
  });
});
