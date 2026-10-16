Two sequences, each a text and an email on day 0, an email on day 3, a text on day 7 and an email on day 14. Email-only segments skip the texts. Any reply stops the sequence and goes to `REACT | Reply Router`. `{{contact.react_context}}` is the one-line phrase set per contact during tagging ("the duplex on Elm Street", "your kitchen remodel"); check it reads well in a sentence. The structure and the subject lines follow the source build's approved copy.

## Sequence "its-me": "It's ${tpl.sender_first_name}"

For past customers, lost quotes and unfinished applications.

### SMS Day 0

{{contact.first_name}}, it's ${template.sender_name} at ${client.name}. We last spoke when you were working on {{contact.react_context}}. How did it turn out, and what are you working on now? (Reply STOP to opt out)

### Email Day 0

**Subject:** it's ${tpl.sender_first_name}

{{contact.first_name}},

Most ${template.copy.customer_type} I've worked with don't need us every month. They need us the week something comes up, and that week is never convenient.

We last talked when you were working on {{contact.react_context}}. I've been thinking about the people I worked with around that time and wanted to check in. How did it go?

[[WRITE: 2 to 3 sentences on a pattern you see a lot: someone needs you, calls whoever they used last time, waits, and loses out. End with the point: it is about who is ready when they are.]]

I'd like to be that call for you. ${template.copy.offer_line} And I pick up the phone.

So, what's next on your plate? Even a one-line answer helps.

If you'd rather not hear from me, reply "no" and I won't write again.

${tpl.sender_first_name}

P.S. If you already have a ${template.copy.deal_word} in mind, ${template.copy.app_line}: ${tpl.cv.quick_app_url}

### Email Day 3

**Subject:** re: it's ${tpl.sender_first_name}

{{contact.first_name}},

Here's a pattern I've watched play out more times than I can count.

[[WRITE: 2 to 3 sentences: a good opportunity shows up, the paperwork or the back-and-forth starts, and by the time it is ready someone else has it. The ones who win are the ones whose provider already knows them.]]

That's the easiest thing I can offer you right now. When you're ready, ${template.copy.app_line}: ${tpl.cv.quick_app_url}. Once it's in, when your next ${template.copy.deal_word} shows up we can talk about it, not paperwork.

Or skip the form and just reply with what you're looking at. I read every reply myself.

If the timing isn't right, reply "no" and I won't write again.

${tpl.sender_first_name}

### SMS Day 7

{{contact.first_name}}, ${tpl.sender_first_name} again. Not trying to fill your inbox. If a ${template.copy.deal_word} or a question comes up, reply here and I'll take it from there. If not, all good.

### Email Day 14

**Subject:** whenever you're ready

{{contact.first_name}},

Last note from me, and then I'll leave you alone.

Timing changes fast. Something that wasn't there last month shows up on a Tuesday, and suddenly you need someone who already knows you and answers the phone.

When that happens, I'm here. ${template.copy.offer_line} You can start anytime at ${tpl.cv.quick_app_url}, or reach me directly at ${tpl.cv.sender_phone}.

If you ever want to talk something through, even just to sanity-check the numbers, reply to this email. No pressure either way.

${tpl.sender_first_name}

## Sequence "check-in": "Check-in"

For old ad leads, and long-inactive contacts (email only).

### SMS Day 0

Hi {{contact.first_name}}, ${tpl.sender_first_name} with ${client.name}. You reached out a while back about ${template.copy.lead_topic}. Still looking, or all set? Either answer helps. (Reply STOP to opt out)

### Email Day 0

**Subject:** checking in

{{contact.first_name}},

You reached out to us a while back about ${template.copy.lead_topic}, and I don't think we ever properly connected. That's on me.

I've been going through my list, and I keep seeing the same story. Someone gets interested, fills in a form, and then life happens. Plans change, a quote comes in from somewhere else, or nobody follows up at the right moment. They move on, and nobody really finds out what they needed.

So I'd rather ask than assume. Are you still looking?

If you are, I'd like to hear what you're working on. ${template.copy.offer_line} If you're not, that's useful to know too.

A one-word answer is perfect: yes, no, or later.

If you'd rather not hear from me, reply "no" and I won't write again.

${tpl.sender_first_name}

P.S. If you already have a ${template.copy.deal_word} in mind, ${template.copy.app_line}: ${tpl.cv.quick_app_url}

### Email Day 3

**Subject:** one more

{{contact.first_name}},

Most people I talk to don't need us today. What they need is to know who to call when the right moment shows up, because that's when time runs short.

The ones who move fastest have already done the boring part. We know them, their basics are on file, and the conversation starts with what they need.

If you want to be in that spot, ${template.copy.app_line}: ${tpl.cv.quick_app_url}. No commitment. It just means we're ready when you are.

If you'd rather talk first, reply with what you're looking at and I'll get back to you myself.

If the timing isn't right, reply "no" and I won't write again.

${tpl.sender_first_name}

### SMS Day 7

{{contact.first_name}}, ${tpl.sender_first_name} again. If something comes up, the link stays live: ${tpl.cv.quick_app_url}. Otherwise I'll check back in a couple of months.

### Email Day 14

**Subject:** in case the timing changed

{{contact.first_name}},

Last one from me for now.

Timing changes fast. Maybe you weren't ready when you first reached out. Maybe it fell through, or you went another way. That's all normal.

If it changes, I'm here. ${template.copy.offer_line} You can start anytime at ${tpl.cv.quick_app_url}, or reach me directly at ${tpl.cv.sender_phone} or by replying to this email.

Either way, I hope it's going well.

${tpl.sender_first_name}

## Re-entry check-in (60 days after the sequence or a "not now")

Not reviewed in the source build either: have the client read it.

**Subject:** checking back in

{{contact.first_name}},

A couple of months ago the timing wasn't right, so I said I'd check back. Has anything changed?

If you have a ${template.copy.deal_word} in mind, ${template.copy.app_line}: ${tpl.cv.quick_app_url}. Or just reply.

If you'd rather I stop writing, reply "no".

${tpl.sender_first_name}
