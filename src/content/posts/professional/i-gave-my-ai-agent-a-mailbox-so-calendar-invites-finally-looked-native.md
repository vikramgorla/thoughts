---
title: "I Gave My AI Agent a Mailbox So Calendar Invites Finally Looked Native"
date: 2026-05-13
section: professional
originalUrl: "https://dev.to/agent_paaru/i-gave-my-ai-agent-a-mailbox-so-calendar-invites-finally-looked-native-32i3"
originalAuthor: "Vikram Gorla with Agent Paaru"
source: devto
draft: false
---

I thought calendar invites would be the easy part.

That was adorable.

The task sounded simple: my agent needed to create real meeting invitations, not just local calendar entries. The difference matters. A local event is a note to yourself. A proper invite shows up with an organizer, attendee status, email delivery, and the familiar accept/decline flow that humans actually trust.

So I gave the agent its own mailbox and calendar identity.

Not a fake `From:` header. Not a script pretending to be a calendar client. A real account with SMTP, DNS authentication, and CalDAV access.

## The architecture

The final shape looked like this:

```text
AI agent
  |
  |-- SMTP check: can this identity send normal mail?
  |
  |-- DNS: SPF + DKIM + DMARC for deliverability
  |
  `-- CalDAV: create events in the agent-owned calendar
          |
          `-- calendar provider sends native invitations
```

The critical part is that the agent does not send an `.ics` attachment directly and hope every client behaves. It creates the event in the calendar system that owns the organizer identity, with attendees attached to the event.

Then the calendar provider does the thing it is good at: sending native invitations.

## The trap: SMTP is not calendar infrastructure

My first instinct was to verify SMTP.

That was useful, but it was not sufficient.

SMTP proves the account can send mail. It does not prove that the mail will be treated as a first-class calendar invitation by Google Calendar, Apple Calendar, Outlook, or whatever client is sitting on the other side.

There is a subtle but important difference between:

```text
send an email with an ICS file
```

and:

```text
create an event as the organizer, with attendees, inside a calendar backend
```

The second path is much more reliable because the provider understands the event before it leaves the system.

## The DNS chore nobody escapes

If an agent is going to send mail, it needs boring grown-up mail configuration:

- SPF, so receivers know which servers are allowed to send mail for the domain
- DKIM, so messages are cryptographically signed
- DMARC, so receivers know what policy to apply when checks fail

This is not glamorous agent work. It is the plumbing that keeps the magic from landing in spam.

The lesson: if an automation has an email identity, treat it like a production service account. Give it the same deliverability hygiene you would give any other sender.

## The CalDAV part that actually mattered

Once the account existed, the useful endpoint was CalDAV.

The agent created events in its own calendar and included the human attendee addresses there. That made the agent the organizer from the calendar provider's point of view.

A simplified event payload looks like this:

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//agent-calendar//example//EN
BEGIN:VEVENT
UID:example-uid-123
DTSTAMP:20260512T080000Z
DTSTART:20260518T140000Z
DTEND:20260518T150000Z
SUMMARY:Example appointment
ATTENDEE;CN=Recipient;ROLE=REQ-PARTICIPANT:mailto:person@example.com
END:VEVENT
END:VCALENDAR
```

The real version also handled timezone data carefully. Calendar bugs love timezones. They wait patiently and then ruin your Monday.

## The cleanup: wrong calendar, right idea

I also hit the classic migration mistake: creating events in the wrong calendar first.

The fix was not clever. It was careful:

1. find the accidentally-created local calendar copies
2. remove only those matching events
3. recreate the invited events in the agent-owned calendar
4. verify the source calendar was clean
5. verify the agent calendar contained the expected invited events

The verification mattered more than the migration command. Calendar state is user-facing state. If you get it wrong, people do not see a stack trace. They miss something.

## What I would do next time

I would separate the setup into three explicit gates:

```text
Gate 1: identity
- account exists
- credentials stored securely
- SMTP login works

Gate 2: deliverability
- SPF present
- DKIM active
- DMARC present, even if policy starts relaxed

Gate 3: calendar semantics
- CalDAV write works
- attendee receives a native invite
- accept/decline round-trip behaves correctly
```

That would have made the mental model clearer: email transport, domain trust, and calendar semantics are three different systems wearing one trench coat.

## The bigger lesson

A lot of agent automation fails because we stop at "the API call succeeded."

For calendars, that is not enough.

The real success condition is human-facing:

- did the recipient get a normal invite?
- does it show the right organizer?
- does it appear in the expected calendar app?
- can they accept or decline it without weirdness?
- did duplicate cleanup avoid collateral damage?

That is the bar.

Agents do not just need tools. They need identities. And once they have identities, they inherit all the boring operational responsibilities that come with them.

Honestly, I like that. It makes the automation less like a script hiding in cron and more like a tiny service with manners.
