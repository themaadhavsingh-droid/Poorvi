POORVI SCHOOL ASSISTANT — MOBILE VERSION
=========================================

Ye Android mobile ke liye PWA/web-app hai. Isse Chrome mein khola ja sakta hai aur HTTPS website par "Add to Home screen" karke app jaisa install kiya ja sakta hai.

IMPORTANT: AI analysis ke liye Google Gemini Free Tier ki API key chahiye. Is project mein OpenAI API ya OpenAI billing nahi hai.

FEATURES
--------
• WhatsApp screenshot / photo
• School diary photo
• School circular PDF
• Copied WhatsApp text
• Voice input (Chrome Android par)
• Hindi summary + spoken Hindi
• Homework / Test / Dates / Bring / Submit / Urgent alag sections
• Aaj ke tasks checklist
• History browser mein locally save
• Installed PWA par WhatsApp Share -> Poorvi Assistant target support

SETUP
-----
1. Is folder ko kisi HTTPS static hosting par upload karo (GitHub Pages, Cloudflare Pages ya Netlify jaise free static host).
2. Website phone mein Chrome par kholo.
3. Settings -> Gemini API key save karo.
4. "Add to Home screen" karo.
5. WhatsApp message ko screenshot/copy karke app mein bhejo, ya installed PWA mein Share -> Poorvi Assistant use karo.

FREE NOTE
---------
Google Gemini API ka Free Tier available hai, lekin usage limits hoti hain. Is project ka code paid model ya billing ko force nahi karta. Google ki current documentation ke hisaab se Gemini 3.8 Flash ke Free Tier par input/output free of charge hai.

SECURITY NOTE
-------------
API key browser mein local storage mein save hoti hai. Is personal-use version ko private device par use karo. Public production deployment ke liye backend proxy/secret management better hai.

LIMITATION
----------
App WhatsApp ke private/group chats ko khud open karke background mein read nahi karta. WhatsApp se screenshot, copied text, Export Chat ya Share ke through material dena zaroori hai.
