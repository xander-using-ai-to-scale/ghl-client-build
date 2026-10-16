Workflows: `STL | Ad Lead - Instant Response`, then `STL | Ad Lead - Follow-Up Ladder` (stops on any reply). Texts are held until A2P is approved. The cadence and the email subject lines follow the source build; the wording is ours and needs the client's approval.

### STL SMS 01 (instant)

Hi {{contact.first_name}}, it's ${tpl.sender_first_name} at ${client.name}. Thanks for asking about your ${template.copy.lead_topic}. When is a good time for a quick call? Or start here, ${template.copy.app_line}: ${tpl.cv.quick_app_url} Reply STOP to opt out

### STL Email 01 (after 1 minute)

**Subject:** {{contact.first_name}}, next step on your ${template.copy.lead_topic}

{{contact.first_name}},

Thanks for reaching out about your ${template.copy.lead_topic}. I'm ${template.sender_name} at ${client.name}.

The next step is simple. If you already know what you need, ${template.copy.app_line}: ${tpl.cv.quick_app_url}

If you'd rather talk first, reply with a good time and I'll call you.

${tpl.sender_first_name}

If you'd rather not hear from us, reply "stop".

### STL SMS 02 (15 minutes, no reply)

{{contact.first_name}}, ${tpl.sender_first_name} again. Happy to work around your day. What time suits a 10-minute call?

### STL Email 02 (next day)

**Subject:** what happens after the app

{{contact.first_name}},

A fair question before you fill anything in: what happens next?

Once your details are in, I look at them myself and get back to you with the next step. No call centre, no ticket number. If we're not the right fit, I'll tell you.

Here's the link again: ${tpl.cv.quick_app_url}. Or reply with a question.

${tpl.sender_first_name}

### STL SMS 03 (day 2)

{{contact.first_name}}, ${tpl.sender_first_name} at ${client.name}. Still happy to help with your ${template.copy.lead_topic}. Reply with a time and I'll call you.

### STL Email 03 (day 4)

**Subject:** the ${template.copy.deal_word} you're working on

{{contact.first_name}},

I haven't been able to reach you, so I'll keep this short.

If your plans changed, no problem. If you're still working on it, reply with one line on what you need and I'll take it from there.

${tpl.sender_first_name}

### STL SMS 04 (day 7, last)

{{contact.first_name}}, ${tpl.sender_first_name} at ${client.name}. I'll leave it here for now. If you want to pick it up again, just reply.

### Internal alerts (to the team, not the lead)

- New lead (email): New ad lead: {{contact.name}} · {{contact.phone}} · {{contact.email}} · Form: {{contact.source}} · Instant SMS + email sent. {{contact.url}}
- New lead (SMS to the owner): New ad lead: {{contact.name}} {{contact.phone}}
- Reply: Reply from {{contact.name}}: {{message.body}} · {{contact.url}}
- Application done: Quick app complete: {{contact.name}}
