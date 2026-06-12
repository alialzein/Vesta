import { describe, expect, it } from 'vitest';
import { meetingLinesForChat, toEventView, type GraphEvent } from '@/lib/graph/calendar';

function ev(over: Partial<GraphEvent> = {}): GraphEvent {
  return {
    id: 'e1',
    subject: 'Project sync',
    start: { dateTime: '2026-06-12T07:30:00.0000000', timeZone: 'UTC' },
    end: { dateTime: '2026-06-12T08:00:00.0000000', timeZone: 'UTC' },
    organizer: { emailAddress: { name: 'Maya Chen', address: 'Maya@Cedars.com' } },
    attendees: [
      { emailAddress: { name: 'Ali', address: 'ali@me.com' }, type: 'required' },
      { emailAddress: { name: 'Sam', address: 'SAM@x.io' }, type: 'optional' },
    ],
    isOnlineMeeting: true,
    onlineMeeting: { joinUrl: 'https://teams.microsoft.com/l/xyz' },
    location: { displayName: 'Room 4' },
    ...over,
  };
}

describe('toEventView', () => {
  it('maps a Graph event: UTC instants, lowercased emails, join link', () => {
    const v = toEventView(ev());
    expect(v.subject).toBe('Project sync');
    // Graph's 7-decimal "local" string (we request UTC) becomes a real instant.
    expect(v.startIso).toBe('2026-06-12T07:30:00Z');
    expect(v.endIso).toBe('2026-06-12T08:00:00Z');
    expect(v.organizerEmail).toBe('maya@cedars.com');
    expect(v.attendees).toEqual([
      { name: 'Ali', email: 'ali@me.com' },
      { name: 'Sam', email: 'sam@x.io' },
    ]);
    expect(v.isOnline).toBe(true);
    expect(v.joinUrl).toContain('teams.microsoft.com');
  });

  it('survives sparse events', () => {
    const v = toEventView({ id: 'e2' });
    expect(v.subject).toBe('(no subject)');
    expect(v.startIso).toBe('');
    expect(v.attendees).toEqual([]);
    expect(v.joinUrl).toBeNull();
  });
});

describe('meetingLinesForChat', () => {
  it('renders manager-local times with organizer + attendee count', () => {
    // 07:30 UTC = 10:30 in Beirut (+03).
    const lines = meetingLinesForChat([toEventView(ev())], 'Asia/Beirut');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('10:30–11:00 Project sync');
    expect(lines[0]).toContain('organizer Maya Chen');
    expect(lines[0]).toContain('2 attendees');
    expect(lines[0]).toContain('online meeting');
  });

  it('falls back to the location when not an online meeting', () => {
    const offline = toEventView(ev({ isOnlineMeeting: false, onlineMeeting: null }));
    const lines = meetingLinesForChat([offline], 'UTC');
    expect(lines[0]).toContain('Room 4');
  });
});
