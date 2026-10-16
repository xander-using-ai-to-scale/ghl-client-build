Every email and text for the partner layer, one section per workflow. Texts go only to contacts with SMS consent, and only once A2P is approved (email only until then). No partner email states the referral terms: they are covered on the intro call. Structure, cadence and subject lines follow the source build's finalized partner copy.

## AFF - Signed Up - AFF Welcome (added to the standard Partner Sign-Up workflow)

**Subject:** welcome aboard

{{contact.first_name}},

Thanks for signing up. Glad to have you.

Here's how it works. When someone you know needs [[WRITE: what your customers come to you for, in a few words]], you send them to me. I take it from there and keep you posted.

Two things to keep handy:

1. Send me a referral (takes about a minute): ${tpl.cv.referral_form_url}
2. A 20-minute call with me: ${tpl.cv.partner_calendar_url}

If you haven't booked the call yet, start there. I'd like to hear who you work with, so I know who to watch for.

${tpl.sender_first_name}

## AFF | Partner Nurture - Every Other Day

Stops on any reply or a booked call.

### AFF - Nurture - Email 1 · Day 0

**Subject:** who to send me

{{contact.first_name}},

The easiest way to think about who to send me: ${template.copy.customer_type}.

[[WRITE: 2 sentences on who is a fit and who is not, in plain words.]]

If you hear [[WRITE: one thing a customer says that tells a partner "this is a referral"]], that's a referral.

Who's the first person that comes to mind?

${tpl.sender_first_name}

### AFF - Nurture - Email 2 · Day 2

**Subject:** what happens after you send one

{{contact.first_name}},

A fair question before you send anyone: what happens to them?

Here's the path. You send the referral through your form. My team reaches out to them, usually by text and email first, and we have a real conversation about what they need. No portal, no ticket number.

You stay in the loop. And the relationship stays yours. They came to me because you sent them, and I don't forget that.

Your referral form, for when the time comes: ${tpl.cv.referral_form_url}

${tpl.sender_first_name}

### AFF - Nurture - Email 3 · Day 4

**Subject:** what to say

{{contact.first_name}},

Most partners tell me the hardest part isn't finding people. It's knowing what to say.

Keep it simple. Something like: "I know someone who [[WRITE: what you do, in 6 words]]. Want me to connect you?"

That's it. You don't need to know prices or details. That's my job. If they say yes, send their name and number through your form and I'll take it from there.

${tpl.sender_first_name}

### AFF - Nurture - Email 4 · Day 6

**Subject:** the deal that got away

{{contact.first_name}},

Here's a story I hear all the time.

[[WRITE: 3 to 4 sentences: a customer goes to the provider they know, it is the wrong kind for what they need, time passes, and they lose the opportunity.]]

Nobody did anything wrong. They just went to the wrong place.

That's the gap you can close for people. One introduction, and they're talking to someone who does this every day.

${tpl.sender_first_name}

### AFF - Nurture - Email 5 · Day 8 (how credit works)

**Subject:** how you get credit

{{contact.first_name}},

A question I get from every partner: how do I make sure a referral counts as mine?

Send it through your form (${tpl.cv.referral_form_url}) and your name is attached to that person from the start. If two people send the same person, the first one in gets the credit.

How partners are paid is in your partner agreement, and I'll walk you through it on our intro call: ${tpl.cv.partner_calendar_url}

${tpl.sender_first_name}

### AFF - Nurture - Email 6 · Day 10

**Subject:** what we ${template.copy.offer_verb}

{{contact.first_name}},

A short list so you know what fits.

${template.copy.offer_line}

[[WRITE: 3 to 5 bullet points, the main things you do. No prices.]]

If you're not sure whether someone fits, send them anyway. I'd rather look than have you guess.

${tpl.sender_first_name}

### AFF - Nurture - Email 7 · Day 12

**Subject:** the easy way

{{contact.first_name}},

If filling in a form feels like one more thing, there's an easier way.

Send a short intro email to your contact and copy me. One line is enough: "${tpl.sender_first_name}, meet Sam. Sam's looking at [[WRITE: a typical need, 3 words]]."

I'll reply to both of you and take it from there. You still get the credit.

Or save this link on your phone for the next time it comes up: ${tpl.cv.referral_form_url}

${tpl.sender_first_name}

### AFF - Nurture - Email 8 · Day 14

**Subject:** one question

{{contact.first_name}},

Last one in this series, so I'll keep it to one question.

Who's one person you talked to this month who might need us?

Just a first name and what they're working on is enough. Reply here and I'll take a look.

${tpl.sender_first_name}

## AFF | Call Booked

### AFF - Call Booked - Confirmation (email, on booking)

**Subject:** you're on my calendar

{{contact.first_name}},

Thanks for booking. Our 20-minute call is set for {{appointment.start_time}}. The details are in your calendar invite.

To make the most of it, think about one or two people you work with who might need us. We'll talk about who you work with, how referrals work, and whether it's a fit for both of us.

If you need to move it, just reply here.

${tpl.sender_first_name}

### AFF call reminder (SMS, 1 hour before; only once A2P is approved)

Hi {{contact.first_name}}, ${tpl.sender_first_name} at ${client.name}. Talk in an hour for our 20-minute call. Need to move it? Reply here.

### AFF - Call Booked - No-show re-offer (email, once)

**Subject:** sorry we missed each other

{{contact.first_name}},

Looks like we missed each other today. It happens.

If you'd still like to talk, grab another time that works: ${tpl.cv.partner_calendar_url}

${tpl.sender_first_name}

## Referral thank-you (not sent by a workflow; for sending by hand)

**Subject:** got your referral, thank you

{{contact.first_name}},

Your referral came through. Thank you.

My team is reaching out to them now, and I'll keep you posted on how it goes. Your name is attached to them in our system, so the credit is yours.

If there's anything I should know about them before we talk, just reply here.

${tpl.sender_first_name}

## AFF | Partner Check-In - 30/60

### AFF - Check-In - Day 30 (only if no referrals yet)

**Subject:** one ${template.copy.customer_word}

{{contact.first_name}},

Quick check-in, now that you've been a partner for a month.

Who's one person you talked to this month who might need us?

They don't need to be ready. Even "my client Sam is thinking about it next year" helps. Reply with a first name and a line about what they're working on, and I'll take it from there.

${tpl.sender_first_name}

### AFF - Check-In - Day 60 (joint email offer)

**Subject:** an idea for your clients

{{contact.first_name}},

Here's a different idea.

If you have a list of clients, I can put together a short email that goes out from both of us. Something useful, with your name on it next to mine.

You read and approve every word before anything goes out. Your clients see that you look out for them, and anyone who needs us knows where to go.

Want me to draft one for you to look at?

${tpl.sender_first_name}

> Whoever offers this owns it: we draft the joint email for any partner who says yes, and the client approves it.

## Reply snippets for the person handling replies (AFF | Reply Router)

### Comp question (the approved no-numbers reply)

{{contact.first_name}}, good question. It depends on the type of partnership, and it's all laid out in the partner agreement. The easiest way is a 20-minute call where I walk you through it: ${tpl.cv.partner_calendar_url}

${tpl.sender_first_name}

### Interested: book a call

{{contact.first_name}}, glad to hear it. The best next step is a 20-minute call so I can learn who you work with: ${tpl.cv.partner_calendar_url}. If none of those times work, send me two that do.

${tpl.sender_first_name}

### Not now

Understood, {{contact.first_name}}, thanks for letting me know. If someone comes your way later, I'm easy to find at ${tpl.cv.sender_phone}.

${tpl.sender_first_name}

### Stop

Done, {{contact.first_name}}. You won't hear from me again.

${tpl.sender_first_name}

> Build note: send the stop confirmation before the DND step (or skip it for SMS, where the carrier's STOP reply already confirms).
