---
title: "{{title}}"
author: {{authors}}
year: {% if date %}{{ date | format("YYYY") }}{% else %}{% endif %}
citekey: {{citekey}}
zotero: {{desktopURI}}
pdf: {% set pdfAtt = (attachments or []) | selectattr("pdfURI") | first %}{{ pdfAtt.pdfURI if pdfAtt else "" }}
source-md: "[[]]"
student: 
course: 
status: literature
tags: [literature-note]
date-read: 
---

# {{title}}

> **Zotero:** {% if pdfAtt %}[Open PDF]({{pdfAtt.pdfURI}}) · {% endif %}[Open in Zotero]({{desktopURI}}) · **Cite:** [@{{citekey}}] · **Full text (md):** [[source-md]]

**How I read it** (check one)
- [ ] Read in full
- [ ] Read partially
- [ ] Foraged
- [ ] 😔GenAI read this for me 

**Reference (APA):** {{bibliography}}

## Author information
*Who wrote this? Add the lead author's photo, dates, a short bio, and a link to their university page or Wikipedia.*

- 

## Why I'm reading this

- 

## Summary (in my own words)

- 
- 

## Key ideas/findings/arguments
*Selective - core ideas and findings. If you're copying sentences, stop and write in your own words.*

- 
- 

## How this connects to other sources

*Does this confirm, contradict, or complicate other things you've read? Name the notes.*

- 

## Open questions this raises

- 

## Questions for class discussion

- 

## Quotes worth keeping
*Your Zotero highlights and comments arrive below, with page numbers, each time you click the highlighter-pen icon at the top-right of this note. Edit or trim them freely. Add your own quotes too — if possible, include a page number.*

{% persist "annotations" %}
{%- for a in newAnnotations %}
{%- set pg = a.pageLabel or a.page %}
{%- if a.annotatedText %}

> "{{a.annotatedText | replace("\n", " ")}}"{% if pg %} (p. {{pg}}){% endif %}
{%- if a.comment %}
> — *my note: {{a.comment | replace("\n", "\n> ")}}*
{%- endif %} ^nb-{{a.nbId}}
{%- elif a.imageRelativePath %}

> ![[{{a.imageRelativePath}}]]{% if pg %} (p. {{pg}}){% endif %}
{%- if a.comment %}
> — *my note: {{a.comment | replace("\n", "\n> ")}}*
{%- endif %} ^nb-{{a.nbId}}
{%- elif a.comment %}

> *my note{% if pg %} (p. {{pg}}){% endif %}: {{a.comment | replace("\n", "\n> ")}}* ^nb-{{a.nbId}}
{%- endif %}
{%- endfor %}
{% endpersist %}

> "..." (p. )

## Figures & images
*Screenshots, diagrams, or tables worth keeping. Embed with `![[filename]]`, and caption each one in your own words — why does it matter?*

![[]]

## Permanent note candidates
*Write your own permanent note titles in your own words. These should be "nuggets" — ideas that are interesting to you and/or that you might use in your own work. Checking the box promotes it: a new permanent note gets created automatically and this line becomes a link to it, carrying over any tags you've added above (`literature-note` itself doesn't carry over — the new note is tagged `permanent-note` instead). Want to say more before you promote it? Press Enter then Tab right after the title to add an indented line or two — that carries over into the new note's Core idea too.*

- [ ] 
- [ ] 

## Related notes
- [[]]
