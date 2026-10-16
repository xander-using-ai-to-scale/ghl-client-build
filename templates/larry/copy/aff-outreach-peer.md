Workflow `AFF | Outreach - ${item.name}`, for ${item.audience}: businesses in your field who turn away work that you take. Email 1 has no links. Email 2 goes three days later as a reply in the same thread, Email 3 four days after that, Email 4 five days after that. Texts only with SMS consent and A2P. Queue only contacts with a company name.

### AFF - Outreach ${item.name} - Email 1

**Subject:** the deals you turn away

{{contact.first_name}},

Quick question. When a client comes to you wanting [[WRITE: the kind of job these partners cannot do, in a few words]], where do you send them?

Most ${item.audience} I talk to don't have a good answer. It doesn't fit what they do, so the client walks, and sometimes the relationship goes with them.

That's the part I handle. I'm ${template.sender_name} at ${client.name}. [[WRITE: one sentence on what you take on, and that their core clients stay with them.]]

Would it help {{contact.company_name}} to have someone to hand those to?

${tpl.sender_first_name}

### SMS 1 (consented only)

Hi {{contact.first_name}}, ${template.sender_name}, ${client.name}. Where do you send the clients who don't fit what you do? Reply STOP to opt out

### AFF - Outreach ${item.name} - Email 2 (reply in thread)

**Subject:** re: the deals you turn away

{{contact.first_name}},

Following up with an example.

[[WRITE: 2 sentences: a client of theirs needs something outside what they do, and it is squarely what you do.]]

You send them over, I take care of them, and I keep you posted. When they need you again, they come back to you.

Worth a quick reply to see if it fits?

${tpl.sender_first_name}

### AFF - Outreach ${item.name} - Email 3

**Subject:** a simple setup

{{contact.first_name}},

Here's how it works with the ${item.audience} who send me work.

You send the client through a short form or a quick intro email. My team reaches out, and I keep you in the loop. Your name stays on that client.

If you'd like to see whether it's worth your time, here's 20 minutes on my calendar: ${tpl.cv.partner_calendar_url}

${tpl.sender_first_name}

### AFF - Outreach ${item.name} - Email 4 (last)

**Subject:** last note

{{contact.first_name}},

Last note from me.

If something ever lands on your desk that you can't place, I'm easy to reach at ${tpl.cv.sender_phone}, or just reply here.

If you'd rather I not write again, just say so and I won't.

${tpl.sender_first_name}

### SMS 4 (last, consented only)

{{contact.first_name}}, ${tpl.sender_first_name} at ${client.name} again. If something comes up you can't place, reply here. If you'd rather I not text, just say so.
