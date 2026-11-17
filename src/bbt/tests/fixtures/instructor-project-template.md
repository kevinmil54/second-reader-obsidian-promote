---
type: project
project: <% await tp.system.prompt("Project slug (must match the folder name and the project: property of every note in it)") %>
output-type: <% await tp.system.suggester(["talk","article","book-chapter","grant","course","personal","other"],["talk","article","book-chapter","grant","course","personal","other"]) %>
status: <% await tp.system.suggester(["Active","Stalled","Completed"],["Active","Stalled","Completed"]) %>
synthesis: []
draft: ""
created: <% tp.date.now("YYYY-MM-DD") %>
tags: [project]
---

# <% tp.file.title.replace(/^Project - /, "") %>

## What this is for

- 

## Central claim



## Outline

1. 

## Notes I'm drawing on

- 

## To check

- 

## Tasks

- [ ] 

## Draft

Other notes in this project:

```dataview
TABLE type AS "Type", status AS "Status"
FROM "Projects"
WHERE project = this.project AND file.name != this.file.name
SORT type ASC, file.name ASC
```

## Source material

Permanent notes that link to this note but are not linked here yet:

```dataview
LIST WITHOUT ID link(file.path, default(title, file.name))
FROM "Permanent notes"
WHERE contains(file.outlinks, this.file.link) AND !contains(this.file.outlinks, file.link)
SORT file.name ASC
```

Synthesis notes (from the `synthesis` property):

```dataview
LIST
FROM "Synthesis notes"
WHERE contains(this.synthesis, file.link)
```
