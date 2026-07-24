<!-- 
================================================================================
[AI INSTRUCTIONS - AUTOMATIC PROCESSING PROCEDURE]
When the user requests "create new article based on this template" (or similar):

1. READ THIS TEMPLATE:
   - Extract all metadata values from the frontmatter below.
   - If `date` is empty or blank, automatically use today's date (YYYY-MM-DD).
   - `slug` defines the output filename: `content/posts/<slug>.mdx`.
   - Normalize image paths (e.g. convert `public/images/foo.jpg` to `/images/foo.jpg`).

2. FORMAT & COMPILE THE MDX CONTENT:
   - Convert any inline HTML markup (`<h3>`, `<hr>`, etc.) into clean MDX Markdown (`###`, `---`).
   - Replace image placeholders (such as `[画像1]`, `[画像2]`) with standard MDX image markup (`![Alt](</images/...>)`).
   - Format URLs and hyperlinks cleanly.
   - Clean up temporary editor instructions or notes (e.g. apply strike-through `~~text~~` where requested).

3. SAVE & VERIFY:
   - Save the finalized MDX article to `content/posts/<slug>.mdx`.
   - Run `npx velite` to validate and compile the content into `.velite/posts.json`.

4. RESET TEMPLATE:
   - Overwrite `ARTICLE_TEMPLATE.md` to reset it back to this empty blank template state.
================================================================================
-->

---
title: ""
date: "" # YYYY-MM-DD (If blank, today's date will be used)
author: ""
discord: ""
tags: [] # e.g. ["グッズ紹介", "ボーマス"]
description: ""
slug: "" # e.g. "vocaloidmas63" (Used as filename content/posts/<slug>.mdx)
cover: "" # Cover image path, e.g. "public/images/.../cover.jpg"
images:
  - image 1: "" # e.g. "public/images/.../img1.jpg"
  - image 2: ""
  - image 3: ""
---

# 記事本文 / Content

<!--
Paste your article draft below.
- You can use [画像1], [画像2] placeholders in the text where you want images placed.
- Raw text or HTML formatting will be automatically converted to clean MDX.
-->
