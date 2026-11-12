---
name: igani-social-posts
description: How Igani makes Instagram posts, short videos and hashtags. Use whenever the user asks for a post, slide, carousel image, short product video or hashtags for Igani (CRM, call recording, call analysis, manager view). Covers the visual style, fonts, colours, rendering, export sizes and the rules for content.
---

# Igani social posts: images, videos, hashtags

Everything is drawn as a web page (HTML and CSS) and rendered with Playwright. No design tool is needed. Templates are in `templates/` next to this file; copy one into a scratch folder, edit it, render it.

## Rules (always)
- **Never use the real CRM.** Draw a made-up, polished version of it just for the post. Names, numbers, companies and phone numbers are all fictional (Dana Levi, Yoni Cohen, Maya Levin, Noa, Eli, Ari, Dana, score 74, team average 68).
- **No course wording.** Never mention Jordan Belfort, the course, "three tens" or "Straight Line". Say "control of the call" if the method name is needed.
- **Less detail, more legitimacy.** Prefer 3 to 4 large, clear elements per post over dense tables and tiny text. One big number, one big ring, one waveform. Short human headlines ("Every lead. One place.").
- **No invented claims.** No fake customer counts, revenue, percentages that imply results, or testimonials.
- Don't put real people, emails or phone numbers in an image. The owner's email is private.
- Ask one question at a time if something is unclear, and offer a recommendation.

## Style
- **Slides 1 and 2 (light):** canvas `#eef6fe`, headline blue `#2a57be`, logo top left, page number top right, grey footer "2026 © Igani All Right Reserved" and an outlined arrow button.
- **CRM posts (dark, the current look):** near-black canvas `#0e0e0e`/`#111`, cards `#181818` to `#111` with a 1px `#242424` border and a faint white top highlight, orange accent `#ec5c13` (light `#f07832`), text `#ededed`, green `#6fe3a0` for "up", red `#ff8f84` for REC. Soft orange glows in the corners.
- **Fonts:** big headlines in **League Spartan** (800, uppercase for the big blue headline); small grey text in **Arial** (`Arial, "Liberation Sans"`); numbers and timers in **DM Mono**. Load League Spartan and DM Mono from Google Fonts.
- **Logo:** `templates/logo-white.png` on dark, `templates/logo-blue.png` on light. The white one has the mark's dark oval at 16% opacity.
- **Transition post** ("What we built", `templates/transition-post.html`): left side light blue with the blue headline, right side fades into the dark CRM look with cards cut off at the right edge. Used as the post before the CRM posts.

## Formats
- Image post: portrait 726×900 css (about 4:5). Render at deviceScaleFactor 2 for 1452×1800, or 4 for the 2904×3600 master.
- Instagram upload copy: downscale the master to 1080 wide with LANCZOS, save JPEG quality 97, subsampling 0.
- Gradients (the fade) can band after Instagram compresses them: add about 2% film grain over the fade and the dark side before exporting.
- Video: 540×675 css at deviceScaleFactor 2 = 1080×1350, 30 fps, **7 seconds maximum**, H.264 MP4, no sound.

## Process: image
1. Copy a template to a scratch folder, with `logo-white.png` / `logo-blue.png` next to it.
2. Edit the text and tiles. Keep four tiles at most: Custom CRM, Call recording, Automatic call analysis, Manager view.
3. Render with `templates/render-image.js` (change the html file name in it): `node render-image.js`. Use `render-image-4x.js` for the master.
4. Look at the PNG. Fix overflow, clipped text, overlaps. A CSS class named `.g` or similar can collide with other classes, so keep names unique.
5. Send the files to the user. Do not push images to the repo unless asked.

## Process: video (scrolling through the CRM)
1. `templates/crm-scroll-video.html` exposes `window.render(t)`, which draws the page at second `t`: it scrolls in keyframes (`K` array: [time, scroll position]), counts numbers up, plays a waveform and fills the score ring and team bars.
2. `templates/record-video.js` steps `t` from 0 to 7 s in 1/30 s increments and saves a JPEG per frame, then:
   `ffmpeg -framerate 30 -i f/%04d.jpg -c:v libx264 -pix_fmt yuv420p -crf 15 -preset slow -movflags +faststart out.mp4`
3. Check a contact sheet of frames at 0, 1.5, 2.3, 3.7, 4.7, 5.7 and 6.8 seconds. Check the duration is 7.00 s.

## Hashtags
Give four, well known and relevant: `#CRM #Sales #SalesTips #SmallBusiness`. They cover product, topic, advice audience and business owners. Choose from general knowledge and say that post counts were not checked. Change one or two to fit the post (for example `#SalesCoaching` for call analysis, `#Startups`, `#B2B`). Only four unless asked.

## Delivery
Send images and videos with the file tool (render inline for images and video). Say what's on it in a few lines, note that all names and numbers are made up, and offer one or two small changes (colour, wording, size).
