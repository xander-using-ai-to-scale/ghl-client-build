Workflow `AFF | Outreach - ${item.name}`, for ${item.audience}: people whose clients become your customers. Email 1 has no links. Email 2 goes three days later as a reply in the same thread, Email 3 four days after that, Email 4 five days after that. Texts only with SMS consent and A2P. Queue only contacts with a company name.

### AFF - Outreach ${item.name} - Email 1

**Subject:** your ${template.copy.customer_word} clients

{{contact.first_name}},

When one of your clients tells you they need [[WRITE: what your customers come to you for]], who do you point them to?

A lot of people say [[WRITE: the usual default, e.g. "their bank" or "whoever they used last time"]]. That works until it doesn't.

I'm ${template.sender_name} at ${client.name}. ${template.copy.offer_line}

Would it be useful for {{contact.company_name}} to have a name to give them?

${tpl.sender_first_name}

### SMS 1 (consented only)

Hi {{contact.first_name}}, ${template.sender_name}, ${client.name}. Who do your clients call when they need [[WRITE: the need, 4 words]]? Reply STOP to opt out

### AFF - Outreach ${item.name} - Email 2 (reply in thread)

**Subject:** re: your ${template.copy.customer_word} clients

{{contact.first_name}},

Following up. Your clients trust you, so I know a referral from you isn't something you hand out lightly.

Here's what happens if you do. I reach out, we talk about what they need, and I keep you posted. No pressure on them, and nothing changes in how they work with you.

Is this something that comes up with your clients?

${tpl.sender_first_name}

### AFF - Outreach ${item.name} - Email 3

**Subject:** worth 20 minutes?

{{contact.first_name}},

If you work with even a few ${template.copy.customer_type}, it's worth knowing someone who does this every day.

Here's 20 minutes on my calendar if you'd like to talk it through: ${tpl.cv.partner_calendar_url}

${tpl.sender_first_name}

### AFF - Outreach ${item.name} - Email 4 (last)

**Subject:** last note

{{contact.first_name}},

Last note from me.

If a client ever asks you about [[WRITE: the need, a few words]], I'm at ${tpl.cv.sender_phone}, or just reply here.

If you'd rather I not write again, just say so and I won't.

${tpl.sender_first_name}

### SMS 4 (last, consented only)

{{contact.first_name}}, ${tpl.sender_first_name} at ${client.name} again. If a client needs [[WRITE: the need, 4 words]], reply here. If you'd rather I not text, just say so.
