/* My Digital Library by Robiul Hosen — Phase 1
   Client-side only. Book lists/search/home come from data/index.json
   (light records, fast on phones); a book's full A–Z details load from
   data/chunks/part-NNN.json only when its page opens. Reviews + likes
   are public via Firebase Firestore (Google login) — one thread per book. */
(function () {
  "use strict";

  var view = document.getElementById("view");
  var BOOKS = [];   /* light index records */
  var FULL = {};    /* full book records by id, loaded from chunks */
  var currentUser = null;  /* Firebase user, set by setupAuth */
  var PER_PAGE = 12;
  var state = { q: "", title: "", author: "", category: "", language: "", year: "",
                sort: "az", page: 1 };
  var NA = "তথ্য নেই";
  /* ---------- language: Bangla / English UI toggle (owner, 2026-11-25) ----------
     The site UI (menus, buttons, headings, labels) switches between Bangla
     and English; book titles, authors and descriptions are content and
     stay exactly as they are. The choice is saved on the phone. */
  var LANG_KEY = "mdl-lang";
  var LANG = "bn";
  try {
    var _sl = localStorage.getItem(LANG_KEY);
    if (_sl === "en" || _sl === "bn") LANG = _sl;
  } catch (e) {}
  var STR = {
    "na": { bn: "তথ্য নেই", en: "No info" },
    "now": { bn: "এখনই", en: "Just now" },
    "theme.light": { bn: "লাইট", en: "Light" },
    "theme.dark": { bn: "ডার্ক", en: "Dark" },
    "user": { bn: "ব্যবহারকারী", en: "User" },
    "auth.login": { bn: "Google দিয়ে লগইন", en: "Sign in with Google" },
    "auth.logout": { bn: "লগআউট", en: "Sign out" },
    "nav.home": { bn: "হোম", en: "Home" },
    "nav.books": { bn: "সব বই", en: "All Books" },
    "nav.categories": { bn: "বিভাগ", en: "Categories" },
    "nav.authors": { bn: "লেখক", en: "Authors" },
    "nav.about": { bn: "আমাদের সম্পর্কে", en: "About Us" },
    "header.followers": { bn: "Followed", en: "Followed" },
    "header.visits": { bn: "Visited", en: "Visited" },
    "footer.about": { bn: "ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন — সবার জন্য উন্মুক্ত একটি অনলাইন লাইব্রেরি।", en: "Digital Library by Robiul Hosen — an open online library for everyone." },
    "footer.library": { bn: "লাইব্রেরি", en: "Library" },
    "footer.policy": { bn: "নীতিমালা", en: "Policies" },
    "footer.contact": { bn: "যোগাযোগ", en: "Contact" },
    "footer.request": { bn: "বইয়ের অনুরোধ করুন", en: "Request a Book" },
    "footer.privacy": { bn: "গোপনীয়তা নীতি", en: "Privacy Policy" },
    "footer.terms": { bn: "ব্যবহারের শর্তাবলি", en: "Terms of Use" },
    "footer.copyright": { bn: "কপিরাইট নীতি", en: "Copyright Policy" },
    "footer.copy": { bn: "ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন। সর্বস্বত্ব সংরক্ষিত।", en: "Digital Library by Robiul Hosen. All rights reserved." },
    "footer.fbTitle": { bn: "সাইট সম্পর্কে মতামত দিন", en: "Share Your Feedback About the Site" },
    "footer.fbPh": { bn: "আপনার মতামত লিখুন...", en: "Write your feedback..." },
    "footer.fbName": { bn: "আপনার নাম (ঐচ্ছিক)", en: "Your name (optional)" },
    "footer.fbSend": { bn: "মতামত পাঠান", en: "Send Feedback" },
    "footer.visits": { bn: "মোট ভিজিট:", en: "Total visits:" },
    "hero.h1": { bn: "জ্ঞান অন্বেষণের<br><em>নতুন ঠিকানা</em>", en: "A <em>New Home</em> for Exploring Knowledge" },
    "hero.sub": { bn: "বাংলা থেকে বিশ্বসাহিত্য — বই খুঁজুন, বই সম্পর্কে জানুন এবং বৈধ উৎস থেকে পড়ুন বা ডাউনলোড করুন।", en: "From Bangla to world literature — search books, learn about them, and read or download from legal sources." },
    "hero.ph": { bn: "বইয়ের নাম, লেখক বা বিষয় লিখুন...", en: "Write a book name, author or topic..." },
    "hero.search": { bn: "খুঁজুন", en: "Search" },
    "hero.share": { bn: "লাইব্রেরি শেয়ার করুন ↗", en: "Share Library ↗" },
    "hero.followNews": { bn: "🔔 নতুন বইয়ের খবর পান", en: "🔔 Get New Book Updates" },
    "hero.followedNews": { bn: "🔔 ফলো করা হয়েছে ✓ — বন্ধ করতে চাপুন", en: "🔔 Following ✓ — tap to stop" },
    "hero.follow": { bn: "Follow", en: "Follow" },
    "hero.followed": { bn: "Following", en: "Following" },
    "hero.install": { bn: "📲 অ্যাপ ইনস্টল করুন", en: "📲 Install App" },
    "hero.adv": { bn: "উন্নত অনুসন্ধান (Advanced Search) ⌄", en: "Advanced Search ⌄" },
    "adv.title": { bn: "বইয়ের নাম", en: "Book Name" },
    "adv.author": { bn: "লেখক", en: "Author" },
    "adv.category": { bn: "বিভাগ", en: "Category" },
    "adv.language": { bn: "ভাষা", en: "Language" },
    "adv.year": { bn: "প্রকাশের বছর", en: "Publication Year" },
    "adv.phTitle": { bn: "শিরোনাম", en: "Title" },
    "adv.phAuthor": { bn: "লেখকের নাম", en: "Author name" },
    "adv.phYear": { bn: "যেমন ১৯৪১", en: "e.g. 1941" },
    "adv.allCat": { bn: "সব বিভাগ", en: "All Categories" },
    "adv.allLang": { bn: "সব ভাষা", en: "All Languages" },
    "adv.go": { bn: "অনুসন্ধান করুন", en: "Search" },
    "stats.total": { bn: "মোট বই", en: "Total Books" },
    "stats.bn": { bn: "বাংলা বই", en: "Bangla Books" },
    "stats.en": { bn: "ইংরেজি বই", en: "English Books" },
    "stats.free": { bn: "ফ্রি ডাউনলোডযোগ্য", en: "Free to Download" },
    "sec.onePerCat": { bn: "সব বিষয় থেকে একটি করে", en: "One from Every Subject" },
    "sec.onePerCatSub": { bn: "প্রতিটি বিষয় থেকে একটি করে বাছাই করা বই — এক নজরে সব ধরণের বই দেখে নিন।", en: "One picked book from every subject — see all kinds of books at a glance." },
    "sec.top": { bn: "টপ বই", en: "Top Books" },
    "sec.topSub": { bn: "সবচেয়ে বেশি ডাউনলোড হওয়া বই — ১ নম্বর সবচেয়ে জনপ্রিয়।", en: "The most downloaded books — #1 is the most popular." },
    "sec.editors": { bn: "সম্পাদকের পছন্দ", en: "Editor's Choice" },
    "sec.editorsSub": { bn: "লাইব্রেরির পক্ষ থেকে বাছাই করা সেরা বই।", en: "The best books picked by the library." },
    "sec.series": { bn: "সিরিজ", en: "Series" },
    "sec.seriesSub": { bn: "একই সিরিজের বইগুলো একসাথে — একটা পড়লে বাকিগুলোও পাবেন।", en: "Books of the same series together — read one, find the rest." },
    "sec.featured": { bn: "বিশেষভাবে নির্বাচিত বই", en: "Featured Books" },
    "sec.recent": { bn: "সম্প্রতি যুক্ত বই", en: "Recently Added Books" },
    "sec.favs": { bn: "পছন্দের বই", en: "Saved Books" },
    "sec.favsSub": { bn: "আপনার ফোনে সংরক্ষিত — লগইন লাগে না।", en: "Saved on your phone — no login needed." },
    "sec.authors": { bn: "জনপ্রিয় লেখক", en: "Popular Authors" },
    "sec.categories": { bn: "বিভাগ", en: "Categories" },
    "sec.languages": { bn: "ভাষা", en: "Languages" },
    "sec.freeLegal": { bn: "ফ্রি ও বৈধ বই", en: "Free and Legal Books" },
    "sec.freeLegalBody": { bn: "এই লাইব্রেরির <b>{n}টি</b> বই Internet Archive ও Standard Ebooks থেকে বৈধভাবে ফ্রি ডাউনলোড করা যায়। কপিরাইটযুক্ত বইয়ের ক্ষেত্রে শুধু অনুমোদিত পড়া, ধার বা কেনার লিংক দেওয়া হয় — PDF দেওয়া হয় না।", en: "The library's <b>{n}</b> books can be legally downloaded for free from Internet Archive and Standard Ebooks. For copyrighted books, only approved reading, borrowing or buying links are given — no PDF." },
    "see.allCats": { bn: "সব বিভাগ →", en: "All Categories →" },
    "see.all": { bn: "সব দেখুন →", en: "See All →" },
    "see.allBooks": { bn: "সব বই দেখুন →", en: "See All Books →" },
    "see.allAuthors": { bn: "সব লেখক →", en: "All Authors →" },
    "author.books": { bn: "টি বই", en: " books" },
    "lang.bengali": { bn: "বাংলা", en: "Bengali" },
    "lang.arabic": { bn: "আরবি", en: "Arabic" },
    "lang.urdu": { bn: "উর্দু", en: "Urdu" },
    "books.title": { bn: "সব বই", en: "All Books" },
    "books.sub": { bn: "মোট {n}টি বই — নাম, লেখক, বিভাগ, ভাষা বা বছর দিয়ে খুঁজুন।", en: "Total {n} books — search by name, author, category, language or year." },
    "books.qLabel": { bn: "খুঁজুন (নাম / লেখক / বিষয় — বাংলায় বা Banglish-এ)", en: "Search (name / author / topic — in Bangla or Banglish)" },
    "books.qPh": { bn: "যেমন: রবীন্দ্রনাথ, কুরআন — বা Banglish-এ: poddoja, hamlet", en: "e.g. Rabindranath, Quran — or in Banglish: poddoja, hamlet" },
    "books.catLabel": { bn: "বিভাগ", en: "Category" },
    "books.langLabel": { bn: "ভাষা", en: "Language" },
    "books.sortLabel": { bn: "সাজান", en: "Sort" },
    "books.yearLabel": { bn: "বছর", en: "Year" },
    "books.yearPh": { bn: "যেমন ১৯৪১", en: "e.g. 1941" },
    "sort.az": { bn: "A–Z (নাম অনুযায়ী)", en: "A–Z (by Name)" },
    "sort.za": { bn: "Z–A", en: "Z–A" },
    "sort.newest": { bn: "নতুন আগে", en: "Newest First" },
    "sort.oldest": { bn: "পুরনো আগে", en: "Oldest First" },
    "sort.author": { bn: "লেখক অনুযায়ী", en: "By Author" },
    "sort.top": { bn: "টপ র‍্যাংকিং অনুযায়ী", en: "By Top Rank" },
    "sort.language": { bn: "ভাষা অনুযায়ী", en: "By Language" },
    "sort.category": { bn: "বিভাগ অনুযায়ী", en: "By Category" },
    "books.allCat": { bn: "সব বিভাগ", en: "All Categories" },
    "books.allLang": { bn: "সব ভাষা", en: "All Languages" },
    "results.info": { bn: "{n}টি বই পাওয়া গেছে · পৃষ্ঠা {p} / {t}", en: "{n} books found · Page {p} / {t}" },
    "results.prev": { bn: "← আগের পৃষ্ঠা", en: "← Previous Page" },
    "results.next": { bn: "পরের পৃষ্ঠা →", en: "Next Page →" },
    "results.page": { bn: "পৃষ্ঠা {p} / {t}", en: "Page {p} / {t}" },
    "results.none": { bn: "খুঁজে পাওয়া যায়নি — এই জনপ্রিয় বইগুলো দেখতে পারেন", en: "Not found — you may like these popular books" },
    "results.noneSub": { bn: "নামটি বাংলায় বা Banglish-এ লিখে আবার চেষ্টা করুন (যেমন: poddoja, hamlet, tirmizi)।", en: "Try writing the name in Bangla or Banglish (e.g. poddoja, hamlet, tirmizi)." },
    "grid.empty": { bn: "কোনো বই পাওয়া যায়নি। অন্য শব্দ দিয়ে খুঁজুন।", en: "No books found. Try another word." },
    "tag.buy": { bn: "কিনে পড়ুন", en: "Buy to Read" },
    "tag.free": { bn: "ফ্রি ডাউনলোড", en: "Free Download" },
    "tag.nodl": { bn: "শুধু অনলাইনে পড়ুন", en: "Read Online Only" },
    "card.fav": { bn: "পছন্দের বই", en: "Saved Book" },
    "cover.altSuffix": { bn: "বইয়ের প্রচ্ছদ", en: "book cover" },
    "cover.view": { bn: "প্রচ্ছদ বড় করে দেখুন", en: "View cover in full size" },
    "cover.tap": { bn: "বড় করে দেখতে চাপ দিন", en: "Tap to view larger" },
    "cover.hint": { bn: "বড় করে দেখতে প্রচ্ছদে চাপ দিন", en: "Tap the cover to view it larger" },
    "cover.close": { bn: "✕ বন্ধ করুন", en: "✕ Close" },
    "cover.aria": { bn: "বইয়ের প্রচ্ছদ", en: "Book cover" },
    "dl.pdf": { bn: "PDF ডাউনলোড ⬇", en: "Download PDF ⬇" },
    "dl.epub": { bn: "EPUB ডাউনলোড ⬇", en: "Download EPUB ⬇" },
    "dl.txt": { bn: "টেক্সট পড়ুন ↗", en: "Read Text ↗" },
    "dl.any": { bn: "PDF / টেক্সট ডাউনলোড ⬇", en: "Download PDF / Text ⬇" },
    "share.copy": { bn: "লিংক কপি করুন", en: "Copy Link" },
    "share.igNote": { bn: "ইনস্টাগ্রামে শেয়ার করতে লিংক কপি করে ইনস্টাগ্রাম অ্যাপে পেস্ট করুন, অথবা ফোনের শেয়ার মেনু থেকে ইনস্টাগ্রাম বেছে নিন।", en: "To share on Instagram, copy the link and paste it in the Instagram app, or choose Instagram from your phone's share menu." },
    "ad.tib": { bn: "<b>খাঁটি আতর — Tīb Perfumes</b><br>৩ মিলি আতর মাত্র ১২০৳ থেকে · অর্ডার করতে ক্লিক করুন", en: "<b>Pure Attar — Tīb Perfumes</b><br>3 ml attar from only ৳120 · Click to order" },
    "book.notFound": { bn: "এই বইটি পাওয়া যায়নি।", en: "This book was not found." },
    "book.loading": { bn: "বইয়ের বিস্তারিত তথ্য লোড হচ্ছে…", en: "Loading book details…" },
    "book.availFree": { bn: "অনলাইনে পড়া ও ফ্রি ডাউনলোড করা যায়", en: "Can be read online and downloaded for free" },
    "book.availBuy": { bn: "এই বইয়ের ফ্রি PDF নেই — কিনে পড়া যায় (নিচে কেনার লিংক দেওয়া আছে)", en: "No free PDF for this book — it can be bought (buy link below)" },
    "book.availRead": { bn: "অনলাইনে পড়া যায় (উৎসের নিয়ম অনুযায়ী)", en: "Can be read online (as per the source's rules)" },
    "row.id": { bn: "বইয়ের আইডি", en: "Book ID" },
    "row.title": { bn: "বইয়ের নাম", en: "Book Name" },
    "row.altTitle": { bn: "বিকল্প শিরোনাম", en: "Alternative Title" },
    "row.author": { bn: "লেখক", en: "Author" },
    "row.editor": { bn: "সম্পাদক", en: "Editor" },
    "row.translator": { bn: "অনুবাদক", en: "Translator" },
    "row.publisher": { bn: "প্রকাশক", en: "Publisher" },
    "row.year": { bn: "প্রকাশের বছর", en: "Publication Year" },
    "row.isbn": { bn: "ISBN", en: "ISBN" },
    "row.language": { bn: "ভাষা", en: "Language" },
    "row.country": { bn: "দেশ", en: "Country" },
    "row.subject": { bn: "বিষয়", en: "Subject" },
    "row.category": { bn: "বিভাগ", en: "Category" },
    "row.subcategory": { bn: "উপবিভাগ", en: "Subcategory" },
    "row.description": { bn: "বিবরণ", en: "Description" },
    "row.pages": { bn: "পৃষ্ঠা সংখ্যা", en: "Page Count" },
    "row.edition": { bn: "সংস্করণ", en: "Edition" },
    "row.source": { bn: "মূল উৎস", en: "Original Source" },
    "row.read": { bn: "পড়ার লিংক", en: "Read Link" },
    "row.download": { bn: "ডাউনলোড লিংক", en: "Download Link" },
    "row.buy": { bn: "কেনার লিংক", en: "Buy Link" },
    "row.copyright": { bn: "কপিরাইট অবস্থা", en: "Copyright Status" },
    "row.avail": { bn: "প্রাপ্যতা", en: "Availability" },
    "row.pagesUnit": { bn: " পৃষ্ঠা", en: " pages" },
    "row.readLabel": { bn: "অনলাইনে পড়ুন ↗", en: "Read Online ↗" },
    "row.dlLabel": { bn: "ডাউনলোড করুন ⬇", en: "Download ⬇" },
    "row.buyLabel": { bn: "কিনুন ↗", en: "Buy ↗" },
    "row.copyrightPd": { bn: "পাবলিক ডোমেইন / বিনামূল্যে পাওয়া যায়", en: "Public domain / freely available" },
    "row.dlNone": { bn: "ফ্রি ডাউনলোড ফাইল যাচাই করা যায়নি", en: "Free download file could not be verified" },
    "book.authorLine": { bn: "লেখক: ", en: "Author: " },
    "book.back": { bn: "← ফিরে যান", en: "← Go Back" },
    "book.read": { bn: "অনলাইনে পড়ুন ↗", en: "Read Online ↗" },
    "book.buy": { bn: "কিনুন ↗", en: "Buy ↗" },
    "book.source": { bn: "মূল উৎস দেখুন ↗", en: "View Original Source ↗" },
    "book.share": { bn: "শেয়ার করুন ↗", en: "Share ↗" },
    "book.favOn": { bn: "★ পছন্দের বইয়ে আছে", en: "★ Saved" },
    "book.favOff": { bn: "☆ পছন্দের বইয়ে রাখুন", en: "☆ Save This Book" },
    "book.buyNotice": { bn: "এই বইটি নতুন ও কপিরাইটযুক্ত, তাই এর ফ্রি PDF এখানে দেওয়া হয় না। উপরের “কিনুন” বোতাম থেকে আসল বইটি কিনে পড়তে পারবেন।", en: "This book is new and copyrighted, so its free PDF is not given here. You can buy the real book using the “Buy” button above." },
    "book.dlNotice": { bn: "এই বইয়ের ফ্রি ডাউনলোড ফাইল এই মুহূর্তে যাচাই করা যায়নি, তাই ডাউনলোড বোতাম দেখানো হয়নি। উপরের “অনলাইনে পড়ুন” লিংক থেকে উৎসের নিয়ম অনুযায়ী পড়তে পারবেন।", en: "This book's free download file could not be verified right now, so no download button is shown. You can read it through the “Read Online” link above, as per the source's rules." },
    "book.seriesMore": { bn: " সিরিজের আরও বই", en: " — More Books in This Series" },
    "book.reviews": { bn: "পাঠকের মতামত (রিভিউ)", en: "Reader Reviews" },
    "book.reviewsNote": { bn: "রিভিউ লিখতে ও লাইক দিতে Google দিয়ে লগইন করুন। আপনার নাম ও মতামত সবার দেখার জন্য প্রকাশ্যে থাকবে।", en: "Sign in with Google to write a review or like one. Your name and opinion will be publicly visible." },
    "rev.loadFail": { bn: "রিভিউ লোড করা যায়নি — ইন্টারনেট চেক করে পেজটি রিফ্রেশ করুন।", en: "Reviews could not be loaded — check the internet and refresh the page." },
    "rev.loadFail2": { bn: "রিভিউ লোড করা যায়নি — পরে আবার চেষ্টা করুন।", en: "Reviews could not be loaded — try again later." },
    "rev.loading": { bn: "রিভিউ লোড হচ্ছে…", en: "Loading reviews…" },
    "rev.noRating": { bn: "এখনো কেউ রেটিং দেয়নি — প্রথম রেটিং আপনিই দিন।", en: "No one has rated yet — be the first to rate." },
    "rev.ratings": { bn: "টি রেটিং", en: " ratings" },
    "rev.none": { bn: "এই বইয়ে এখনো কোনো রিভিউ নেই — প্রথম রিভিউ আপনিই লিখুন।", en: "No reviews for this book yet — write the first review." },
    "rev.reader": { bn: "পাঠক", en: "Reader" },
    "rev.reply": { bn: "উত্তর দিন", en: "Reply" },
    "rev.delete": { bn: "মুছুন", en: "Delete" },
    "rev.replyPh": { bn: "উত্তর লিখুন...", en: "Write a reply..." },
    "rev.replySend": { bn: "উত্তর পাঠান", en: "Send Reply" },
    "rev.loginNote": { bn: "রিভিউ লিখতে Google দিয়ে লগইন করুন — উপরের “Google দিয়ে লগইন” বোতামে চাপ দিন।", en: "Sign in with Google to write a review — tap the “Sign in with Google” button above." },
    "rev.writePh": { bn: "বইটি কেমন লেগেছে? আপনার মতামত লিখুন...", en: "How did you like the book? Write your opinion..." },
    "rev.send": { bn: "রিভিউ পাঠান", en: "Send Review" },
    "rev.sendFail": { bn: "রিভিউ পাঠানো যায়নি — পরে আবার চেষ্টা করুন।", en: "Review could not be sent — try again later." },
    "rev.likeLogin": { bn: "লাইক দিতে Google দিয়ে লগইন করুন।", en: "Sign in with Google to like." },
    "rev.replyLogin": { bn: "উত্তর দিতে Google দিয়ে লগইন করুন।", en: "Sign in with Google to reply." },
    "rev.delConfirm": { bn: "এই রিভিউটি মুছে ফেলবেন?", en: "Delete this review?" },
    "series.title": { bn: " সিরিজ", en: " Series" },
    "series.books": { bn: "টি বই", en: " books" },
    "cats.title": { bn: "বিভাগ", en: "Categories" },
    "cats.sub": { bn: "বিভাগে ক্লিক করলে ওই বিভাগের বই দেখতে পাবেন।", en: "Tap a category to see its books." },
    "authors.title": { bn: "লেখক", en: "Authors" },
    "authors.sub": { bn: " জন লেখক — নামে ক্লিক করলে তাঁদের বই দেখতে পাবেন।", en: " authors — tap a name to see their books." },
    "about.title": { bn: "আমাদের সম্পর্কে", en: "About Us" },
    "about.p1": { bn: "<b>My Digital Library by Robiul Hosen</b> — সবার জন্য উন্মুক্ত একটি ডিজিটাল লাইব্রেরি। এখানে বাংলা ও বিশ্বের বইয়ের তথ্য, বৈধ পড়া ও ডাউনলোডের লিংক এক জায়গায় পাওয়া যায়।", en: "<b>My Digital Library by Robiul Hosen</b> — an open digital library for everyone. Here you will find information about Bangla and world books, plus legal reading and download links, all in one place." },
    "about.p2": { bn: "আমাদের লক্ষ্য: ধাপে ধাপে বাংলাদেশের নামকরা বই, বিশ্বসাহিত্য, ইতিহাস, দর্শন, বিজ্ঞান, ধর্ম ও গবেষণার বইয়ের একটি বড় সংগ্রহ তৈরি করা — সব বই বাংলায়, যাতে সবাই পড়তে পারে।", en: "Our goal: to gradually build a large collection of Bangladesh's famous books, world literature, history, philosophy, science, religion and research — all books in Bangla, so everyone can read them." },
    "about.p3": { bn: "বইয়ের তথ্য সংগ্রহ করা হয় Internet Archive, Project Gutenberg ও Standard Ebooks-এর মতো বৈধ উন্মুক্ত উৎস থেকে। কপিরাইটযুক্ত বইয়ের PDF এখানে দেওয়া হয় না।", en: "Book information is collected from legal open sources such as Internet Archive, Project Gutenberg and Standard Ebooks. Download links for copyrighted books are not given here." },
    "about.edu": { bn: "শিক্ষা:", en: "Education:" },
    "about.contact": { bn: "যোগাযোগ:", en: "Contact:" },
    "about.portfolio": { bn: "পুরো পোর্টফোলিও দেখুন", en: "See Full Portfolio" },
    "privacy.title": { bn: "গোপনীয়তা নীতি", en: "Privacy Policy" },
    "privacy.p1": { bn: "এই ওয়েবসাইট আপনার কোনো অ্যাকাউন্ট, পাসওয়ার্ড বা ব্যক্তিগত তথ্য সংগ্রহ করে না।", en: "This website does not collect any of your accounts, passwords or personal information." },
    "privacy.p2": { bn: "রিভিউ লেখার সময় আপনি যে নাম ও মতামত দেন, তা সবার দেখার জন্য প্রকাশ্যে থাকে। রিভিউ দিতে Google দিয়ে লগইন করতে হয় — আপনার Gmail ঠিকানা অন্য পাঠকদের দেখানো হয় না, শুধু আপনার নাম ও ছবি দেখা যায়।", en: "The name and opinion you give when writing a review are publicly visible to everyone. Writing a review needs Google sign-in — your Gmail address is not shown to other readers, only your name and photo." },
    "terms.title": { bn: "ব্যবহারের শর্তাবলি", en: "Terms of Use" },
    "terms.p1": { bn: "এই লাইব্রেরির বইয়ের তথ্য ও লিংক শুধু পড়া ও শেখার জন্য। বইয়ের ফাইলগুলো সংশ্লিষ্ট উৎসের (Internet Archive / Standard Ebooks) নিয়ম মেনে ব্যবহার করবেন।", en: "The book information and links in this library are only for reading and learning. Use the book files according to the rules of their source (Internet Archive / Standard Ebooks)." },
    "terms.p2": { bn: "এখান থেকে পাওয়া কোনো বই বাণিজ্যিকভাবে বিক্রি বা পুনঃপ্রকাশ করা যাবে না।", en: "No book found here may be sold commercially or republished." },
    "terms.p3": { bn: "রিভিউ লেখার সময় ভদ্র ভাষা ব্যবহার করুন; আপত্তিকর মন্তব্য মুছে ফেলা হতে পারে।", en: "Use polite language when writing reviews; offensive comments may be removed." },
    "copyright.title": { bn: "কপিরাইট নীতি", en: "Copyright Policy" },
    "copyright.p1": { bn: "এই সাইটে শুধু পাবলিক ডোমেইন বা বিনামূল্যে বৈধভাবে পাওয়া যায় এমন বইয়ের ডাউনলোড লিংক দেওয়া হয়।", en: "This site only gives download links for public-domain books or books legally available for free." },
    "copyright.p2": { bn: "কপিরাইটযুক্ত বইয়ের ক্ষেত্রে ডাউনলোড বোতাম দেখানো হয় না — শুধু অনুমোদিত পড়া, ধার বা কেনার লিংক দেওয়া হয়।", en: "For copyrighted books, no download button is shown — only approved reading, borrowing or buying links are given." },
    "copyright.p3": { bn: "কোনো বইয়ের কপিরাইট নিয়ে আপত্তি থাকলে যোগাযোগ পাতা থেকে জানান — যাচাই করে লিংক সরিয়ে নেওয়া হবে।", en: "If you object to any book's copyright, let us know from the Contact page — the link will be removed after verification." },
    "contact.title": { bn: "যোগাযোগ", en: "Contact" },
    "contact.p1": { bn: "লাইব্রেরি সম্পর্কে মতামত, বইয়ের অনুরোধ বা ভুল তথ্য জানাতে Facebook পেজে বার্তা পাঠান।", en: "To share feedback about the library, request a book or report wrong information, send a message to the Facebook page." },
    "contact.p2": { bn: "Facebook: <b>রবিউল</b> (facebook.com — Robiul Hosen)", en: "Facebook: <b>রবিউল</b> (facebook.com — Robiul Hosen)" },
    "contact.p3": { bn: "নতুন বইয়ের অনুরোধ করলে আমরা বৈধ উৎস যাচাই করে তালিকায় যুক্ত করার চেষ্টা করব।", en: "When you request a new book, we will check a legal source and try to add it to the list." },
    "req.title": { bn: "বইয়ের অনুরোধ", en: "Request a Book" },
    "req.desc": { bn: "যে বইটি লাইব্রেরিতে চান, তার নাম জানান — আমরা খুঁজে যুক্ত করার চেষ্টা করব।", en: "Tell us the name of the book you want in the library — we will try to find it and add it." },
    "req.book": { bn: "বইয়ের নাম", en: "Book Name" },
    "req.author": { bn: "লেখকের নাম", en: "Author Name" },
    "req.name": { bn: "আপনার নাম", en: "Your Name" },
    "req.gmail": { bn: "আপনার Gmail (ঐচ্ছিক)", en: "Your Gmail (optional)" },
    "req.more": { bn: "আরও কিছু জানাতে চান?", en: "Anything else to tell us?" },
    "req.phBook": { bn: "যেমন: পথের পাঁচালী", en: "e.g. Pather Panchali" },
    "req.phAuthor": { bn: "জানা থাকলে লিখুন", en: "Write if you know it" },
    "req.phMore": { bn: "বইটি সম্পর্কে আর কিছু জানাতে চাইলে লিখুন", en: "Write anything else about the book" },
    "req.send": { bn: "অনুরোধ পাঠান", en: "Send Request" },
    "req.note": { bn: "আপনার অনুরোধ সরাসরি লাইব্রেরির তালিকায় যাবে।", en: "Your request will go directly to the library's list." },
    "req.sending": { bn: "পাঠানো হচ্ছে…", en: "Sending…" },
    "req.ok": { bn: "ধন্যবাদ! আপনার অনুরোধ পেয়েছি — বইটি খুঁজে যুক্ত করার চেষ্টা করব।", en: "Thank you! We received your request — we will try to find the book and add it." },
    "req.again": { bn: "আরেকটি অনুরোধ করুন", en: "Request Another Book" },
    "req.allBooks": { bn: "সব বই দেখুন", en: "See All Books" },
    "req.err": { bn: "পাঠানো যায়নি। সরাসরি ফর্মে লিখুন।", en: "Could not be sent. Write directly in the form." },
    "req.formOpen": { bn: "গুগল ফর্ম খুলুন", en: "Open Google Form" },
    "app.loadFail": { bn: "দুঃখিত, বইয়ের তালিকা লোড করা যায়নি।", en: "Sorry, the book list could not be loaded." },
    "app.retry": { bn: "আবার চেষ্টা করুন", en: "Try Again" },
    "app.loading": { bn: "লাইব্রেরি লোড হচ্ছে…", en: "Loading library…" },
    "app.copyDone": { bn: "কপি হয়েছে ✓", en: "Copied ✓" },
    "app.copyLink": { bn: "লিংক কপি করুন", en: "Copy Link" },
    "app.favOn": { bn: "★ পছন্দের বইয়ে আছে", en: "★ Saved" },
    "app.favOff": { bn: "☆ পছন্দের বইয়ে রাখুন", en: "☆ Save This Book" },
    "fb.ok": { bn: "ধন্যবাদ! আপনার মতামত পৌঁছে গেছে।", en: "Thank you! Your feedback has been received." },
    "fb.fail": { bn: "মতামত পাঠানো যায়নি — পরে আবার চেষ্টা করুন।", en: "Feedback could not be sent — try again later." },
    "install.dismissed": { bn: "আপনি ইনস্টল বাতিল করেছেন, তাই Chrome সরাসরি বোতাম আর দেখাবে না। মেনু (⋮) → “Add to Home screen” চাপ দিয়ে বসান।", en: "You cancelled the install, so Chrome will not show the direct button again. Use Menu (⋮) → “Add to Home screen” to install." },
    "install.ios": { bn: "<b>iPhone-এ অ্যাপ বসাতে:</b><br>১. নিচের Share (⬆️) বোতামে চাপ দিন<br>২. “Add to Home Screen” বেছে নিন<br>৩. Add চাপ দিন — অ্যাপ হোম স্ক্রিনে চলে আসবে।", en: "<b>To install the app on iPhone:</b><br>1. Tap the Share (⬆️) button below<br>2. Choose “Add to Home Screen”<br>3. Tap Add — the app will appear on your Home Screen." },
    "install.manual": { bn: "<b>সরাসরি ইনস্টল বোতাম না এলে</b> (আগে বসানো থাকলে বা একবার বাতিল করলে Chrome আর দেখায় না):<br>Chrome মেনু (⋮) → “Add to Home screen” / “Install app” চাপ দিন।", en: "<b>If the direct install button does not appear</b> (Chrome hides it if the app is already installed or was cancelled once):<br>Chrome Menu (⋮) → “Add to Home screen” / “Install app”." }
  };

  function t(k) { var e = STR[k]; return e ? (e[LANG] || e.bn) : k; }
  function fmt(n, opts) {
    try { return Number(n == null ? 0 : n).toLocaleString(LANG === "en" ? "en-US" : "bn-BD", opts || {}); }
    catch (e) { return String(n); }
  }
  function tf(k, map) {
    var s = t(k);
    for (var key in map) s = s.split("{" + key + "}").join(map[key]);
    return s;
  }
  function setLang(l) {
    if (l !== "bn" && l !== "en") return;
    LANG = l;
    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}
    NA = t("na");
    applyStaticI18n();
    try { setTheme(document.documentElement.getAttribute("data-theme") || "light"); } catch (e) {}
    route();
  }
  function applyStaticI18n() {
    document.documentElement.setAttribute("lang", LANG);
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n"));
      if (v) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var v = t(el.getAttribute("data-i18n-ph"));
      if (v) el.setAttribute("placeholder", v);
    });
    var lb = document.getElementById("langBtn");
    if (lb) lb.textContent = LANG === "bn" ? "EN" : "বাংলা";
  }

  NA = t("na");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* Download-button label from the real file type + size. Plain .txt
     files open inside the browser instead of downloading, so they are
     honestly labelled "টেক্সট পড়ুন", not "ডাউনলোড". */
  function fmtSize(bytes) {
    if (!bytes) return "";
    var mb = bytes / 1048576;
    var txt = mb >= 1
      ? fmt(mb, { maximumFractionDigits: 1 }) + " MB"
      : fmt(Math.max(1, Math.round(bytes / 1024))) + " KB";
    return " (" + txt + ")";
  }
  function dlLabel(b) {
    var fmt = b.downloadFormat || "";
    if (fmt === "PDF") return t("dl.pdf") + fmtSize(b.downloadSize);
    if (fmt === "EPUB") return t("dl.epub") + fmtSize(b.downloadSize);
    if (fmt === "TXT") return t("dl.txt");
    return t("dl.any");
  }
  /* Card price: removed 2026-11-21 at the owner's request — the OCR-extracted
     printed prices were mostly wrong, so no price is shown anywhere. */
  function cardPrice(b) {
    return "";
  }
  function firstLetter(t) {
    t = (t || "").trim();
    return t ? t.charAt(0) : "?";
  }
  function langLabel(l) {
    return l === "Bengali" ? t("lang.bengali") : l === "English" ? "English" : l === "Arabic" ? t("lang.arabic") : l === "Urdu" ? t("lang.urdu") : (l || NA);
  }
  /* ---------- no-suggest rule (owner, 2026-11-25) ----------
     Qawmi and Awami League books stay on the site as normal books and
     are always findable by search, but they are NEVER promoted: not in
     Top Books, not in any home suggestion section (one-per-category,
     Editor's Choice, Featured, Recently Added, Series chips, Popular
     Authors), not in the no-results recommendations, and not in the
     top-rank sort. Search results, category/author browse, series pages
     and book detail pages show them normally. */
  var NO_SUGGEST = ["কওমি", "qawmi", "পটিয়া", "patiya", "হাটহাজারী", "hathazari",
    "দেওবন্দ", "deoband", "দারুল উলূম", "দারুল উলুম", "darul uloom",
    "মাসিক আত-তাওহীদ", "মাসিক আত-তাওহিদ", "monthly at-tawheed",
    "আওয়ামী লীগ", "আওয়ামীলীগ", "আওয়ামী লিগ", "awami league", "আওয়ামী", "awami",
    "শেখ হাসিনা", "sheikh hasina", "বঙ্গবন্ধু", "bangabandhu"];
  function isNoSuggest(b) {
    if (!b) return false;
    var s = ((b.title || "") + " " + (b.author || "") + " " + (b.series || "")).toLowerCase();
    for (var i = 0; i < NO_SUGGEST.length; i++) {
      if (s.indexOf(NO_SUGGEST[i]) !== -1) return true;
    }
    return false;
  }
  function topRankOf(b) {
    return (b.topRank && !isNoSuggest(b)) ? b.topRank : 999;
  }
  function byId(id) { return BOOKS.find(function (b) { return b.id === id; }); }

  /* ---------- direct download via the Cloudflare Worker ----------
     archive.org links go through the Worker, which returns the file with
     Content-Disposition: attachment — so tapping Download saves the file
     instead of opening archive.org. Other sources stay direct. */
  var WORKER = "https://mdl-download.hosenrobiul43.workers.dev/";
  function dlUrl(b) {
    var u = b.downloadUrl || "";
    if (u.indexOf("https://archive.org/download/") === 0) {
      return WORKER + "?u=" + encodeURIComponent(u);
    }
    return u;
  }

  /* ---------- share (no account needed) ----------
     Phone: the native share sheet (Facebook, Instagram, WhatsApp and
     everything installed). Desktop/other browsers: a small panel with
     direct share links + copy link. Instagram has no web share link,
     so it is reached through the phone's native sheet or copy link. */
  function siteUrl() { return location.origin + location.pathname + "#/"; }
  function bookUrl(b) { return location.origin + location.pathname + "#/book/" + encodeURIComponent(b.id); }
  function sharePanelHtml(title, text, url) {
    var u = encodeURIComponent(url);
    var txt = encodeURIComponent(title + " — " + text);
    return '<div class="share-panel" hidden>' +
      '<a class="share-opt" href="https://www.facebook.com/sharer/sharer.php?u=' + u + '" target="_blank" rel="noopener">Facebook</a>' +
      '<a class="share-opt" href="https://wa.me/?text=' + txt + "%20" + u + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<a class="share-opt" href="https://t.me/share/url?url=' + u + "&text=" + txt + '" target="_blank" rel="noopener">Telegram</a>' +
      '<a class="share-opt" href="https://twitter.com/intent/tweet?text=' + txt + "&url=" + u + '" target="_blank" rel="noopener">X</a>' +
      '<button class="share-opt" type="button" data-copy="' + esc(url) + '">' + t("share.copy") + '</button>' +
      '<p class="small muted">' + t("share.igNote") + '</p></div>';
  }
  /* Row of social share icons under the hero share button, so visitors can
     see at a glance where they can share (Facebook, Instagram, WhatsApp,
     Messenger). Facebook + WhatsApp open their web share links directly;
     Instagram + Messenger open the phone's native share sheet (they have no
     web share link), falling back to the share panel on desktop. */
  function shareIconsHtml() {
    var url = siteUrl();
    var u = encodeURIComponent(url);
    var txt = encodeURIComponent("ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন — বাংলা ও বিশ্বের বই, ফ্রি পড়ুন ও ডাউনলোড করুন");
    var fbSvg = '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#1877F2"/><text x="24" y="34" text-anchor="middle" font-size="30" font-weight="bold" fill="#fff" font-family="Arial, Helvetica, sans-serif">f</text></svg>';
    var igSvg = '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><defs><linearGradient id="mdlIgGrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset=".5" stop-color="#d62976"/><stop offset="1" stop-color="#4f5bd5"/></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="13" fill="url(#mdlIgGrad)"/><rect x="13" y="13" width="22" height="22" rx="6" fill="none" stroke="#fff" stroke-width="2.6"/><circle cx="24" cy="24" r="5" fill="none" stroke="#fff" stroke-width="2.6"/><circle cx="32.5" cy="15.5" r="2" fill="#fff"/></svg>';
    var waSvg = '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#25D366"/><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="#fff" transform="translate(6,6) scale(1.5)"/></svg>';
    var msSvg = '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#0084FF"/><path d="M27 8 L15 26 h7 L21 40 L34 21 h-7 z" fill="#fff"/></svg>';
    return '<div class="share-icons" id="siteShareIcons">' +
      '<a class="share-ic" href="https://www.facebook.com/sharer/sharer.php?u=' + u + '" target="_blank" rel="noopener" aria-label="Facebook">' + fbSvg + '</a>' +
      '<button class="share-ic" type="button" data-native-share="1" aria-label="Instagram">' + igSvg + '</button>' +
      '<a class="share-ic" href="https://wa.me/?text=' + txt + '%20' + u + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + waSvg + '</a>' +
      '<button class="share-ic" type="button" data-native-share="1" aria-label="Messenger">' + msSvg + '</button>' +
      '</div>';
  }
  function doShare(title, text, url, panel) {
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function () {});
    } else if (panel) {
      panel.hidden = !panel.hidden;
    }
  }

  /* ---------- bookmarks (saved on the phone, no login) ---------- */
  var FAV_KEY = "mdl-favs";
  function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
  }
  function isFav(id) { return getFavs().indexOf(id) !== -1; }
  function toggleFav(id) {
    var favs = getFavs();
    var i = favs.indexOf(id);
    if (i === -1) favs.push(id); else favs.splice(i, 1);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
    return i === -1;
  }

  /* ---------- install (Add to Home Screen) ----------
     Android/PC Chrome: beforeinstallprompt gives a one-tap install.
     iPhone Safari: Apple allows no install button — show the manual
     Share → Add to Home Screen steps instead. Already installed: the
     button stays hidden. */
  var deferredInstall = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  var isInstalled = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredInstall = e;
    var b = document.getElementById("installBtn");
    if (b) b.hidden = false;
  });
  window.addEventListener("appinstalled", function () {
    deferredInstall = null;
    var b = document.getElementById("installBtn");
    if (b) b.hidden = true;
  });
  function onInstallClick() {
    var panel = document.getElementById("installPanel");
    if (deferredInstall) {
      var p = deferredInstall;
      deferredInstall = null;
      p.prompt();
      p.userChoice.then(function (choice) {
        if (choice && choice.outcome === "dismissed" && panel) {
          panel.innerHTML = "<p>" + t("install.dismissed") + "</p>";
          panel.hidden = false;
        }
      });
      return;
    }
    if (!panel) return;
    if (isIOS) {
      panel.innerHTML = "<p>" + t("install.ios") + "</p>";
    } else {
      panel.innerHTML = "<p>" + t("install.manual") + "</p>";
    }
    panel.hidden = !panel.hidden;
  }

  /* ---------- theme ---------- */
  var themeBtn = document.getElementById("themeBtn");
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("mdl-theme", t); } catch (e) {}
    themeBtn.textContent = t === "dark" ? "☀️ " + STR["theme.light"][LANG] : "🌙 " + STR["theme.dark"][LANG];
  }
  try {
    var saved = localStorage.getItem("mdl-theme");
    if (saved) setTheme(saved); else setTheme("light");
  } catch (e) { setTheme("light"); }
  themeBtn.addEventListener("click", function () {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  var langBtn = document.getElementById("langBtn");
  if (langBtn) langBtn.addEventListener("click", function () {
    setLang(LANG === "bn" ? "en" : "bn");
  });
  document.getElementById("menuBtn").addEventListener("click", function () {
    document.getElementById("topnav").classList.toggle("open");
  });

  /* ---------- optional Google login (never gates content) ---------- */
  function setupAuth() {
    var box = document.getElementById("authBox");
    if (!box || typeof firebase === "undefined" || !firebase.auth) return;
    var auth = firebase.auth();
    var provider = new firebase.auth.GoogleAuthProvider();
    function renderUser(user) {
      currentUser = user || null;
      if (user) {
        var name = user.displayName || user.email || t("user");
        var photo = user.photoURL ? '<img class="auth-avatar" src="' + esc(user.photoURL) + '" alt="" onerror="this.style.display=\'none\'">' : "";
        box.innerHTML = photo + '<span class="auth-name">' + esc(name) + '</span> <button class="btn btn-ghost btn-sm" id="logoutBtn" type="button">' + t("auth.logout") + '</button>';
        var lo = document.getElementById("logoutBtn");
        if (lo) lo.addEventListener("click", function () { auth.signOut(); });
      } else {
        box.innerHTML = '<button class="btn btn-ghost btn-sm" id="loginBtn" type="button">' + t("auth.login") + '</button>';
        var li = document.getElementById("loginBtn");
        if (li) li.addEventListener("click", function () { auth.signInWithPopup(provider).catch(function () {}); });
      }
    }
    auth.onAuthStateChanged(renderUser);
  }
  setupAuth();
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- data (light index + on-demand full chunks) ---------- */
  function loadBooks() {
    return fetch("data/index.json").then(function (r) {
      if (!r.ok) throw new Error("index.json লোড হয়নি");
      return r.json();
    }).then(function (data) {
      BOOKS = data;
      route();
    }).catch(function () {
      view.innerHTML = '<p class="empty">' + t("app.loadFail") + '</p><p style="text-align:center"><button class="btn" type="button" data-retry="1">' + t("app.retry") + '</button></p>';
    });
  }
  /* Full A–Z record for one book: from the chunk file its index record
     points to (rec.ci). Chunk files are cached by the service worker. */
  function getFull(id) {
    if (FULL[id]) return Promise.resolve(FULL[id]);
    var rec = byId(id);
    if (!rec) return Promise.resolve(null);
    var part = "data/chunks/part-" + String(rec.ci || 0).padStart(3, "0") + ".json";
    return fetch(part).then(function (r) {
      if (!r.ok) throw new Error("chunk লোড হয়নি");
      return r.json();
    }).then(function (list) {
      list.forEach(function (b) { FULL[b.id] = b; });
      return FULL[id] || rec;
    }).catch(function () { return rec; });
  }

  /* ---------- shared pieces ---------- */
  function coverHtml(b, big) {
    var cls = "cover" + (big ? " big" : "") + (b.coverUrl ? " has-img" : "");
    var img = b.coverUrl
      ? '<img class="cover-img" src="' + esc(b.coverUrl) + '" alt="' + esc(b.title) + ' ' + t("cover.altSuffix") + '" loading="lazy" onerror="this.remove()">'
      : "";
    /* Detail page only: the big cover opens the fullscreen viewer.
       Card covers stay plain — cards navigate to the detail page. */
    var viewAttr = (big && b.coverUrl)
      ? ' data-cover-view="' + esc(b.coverUrl) + '" data-cover-title="' + esc(b.title) + '" role="button" tabindex="0" aria-label="' + t("cover.view") + '" title="' + t("cover.tap") + '"'
      : "";
    return '<div class="' + cls + '"' + viewAttr + '>' + img +
      '<span class="letter">' + esc(firstLetter(b.title)) + "</span>" +
      '<span class="cover-lang">' + esc(langLabel(b.language)) + "</span></div>";
  }

  /* ---------- cover viewer (lightbox) ----------
     Detail page only: tapping the big cover shows the full-resolution
     cover (coverUrl, not a thumbnail) in a fullscreen overlay.
     Close: ✕ button, tap outside the image, or Esc. Cards keep
     navigating to the detail page — a viewer on cards would fight
     the card tap, so cards do not open it. */
  var coverViewer = null;
  function openCover(url, title) {
    if (!coverViewer) {
      coverViewer = document.createElement("div");
      coverViewer.className = "cover-viewer";
      coverViewer.id = "coverViewer";
      coverViewer.hidden = true;
      coverViewer.innerHTML = '<div class="cover-viewer-box" role="dialog" aria-modal="true" aria-label="' + t("cover.aria") + '">' +
        '<img class="cover-viewer-img" alt="">' +
        '<p class="cover-viewer-cap"></p>' +
        '<button class="btn btn-primary cover-viewer-close" type="button">' + t("cover.close") + '</button></div>';
      document.body.appendChild(coverViewer);
      coverViewer.addEventListener("click", function (e) {
        if (e.target === coverViewer || e.target.closest(".cover-viewer-close")) closeCover();
      });
    }
    var img = coverViewer.querySelector(".cover-viewer-img");
    img.src = url;
    img.alt = (title || "") + " " + t("cover.altSuffix");
    coverViewer.querySelector(".cover-viewer-cap").textContent = title || "";
    coverViewer.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeCover() {
    if (!coverViewer) return;
    coverViewer.hidden = true;
    document.body.style.overflow = "";
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && coverViewer && !coverViewer.hidden) { closeCover(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-cover-view]")) {
      e.preventDefault();
      var cv = e.target.closest("[data-cover-view]");
      openCover(cv.getAttribute("data-cover-view"), cv.getAttribute("data-cover-title"));
    }
  });
  function cardHtml(b) {
    var tags = '<span class="tag">' + esc(langLabel(b.language)) + "</span>" +
      '<span class="tag">' + esc(b.category || "অন্যান্য") + "</span>" +
      (b.buyLink
        ? '<span class="tag buy">' + t("tag.buy") + '</span>'
        : (b.downloadUrl
          ? '<span class="tag free">' + t("tag.free") + '</span>'
          : '<span class="tag nodl">' + t("tag.nodl") + '</span>'));
    return '<article class="book-card" data-book="' + esc(b.id) + '">' +
      (b.topRank ? '<span class="rank-badge">' + fmt(b.topRank) + "</span>" : "") +
      '<button class="fav-btn' + (isFav(b.id) ? " on" : "") + '" data-fav="' + esc(b.id) + '" aria-label="' + t("card.fav") + '">' + (isFav(b.id) ? "★" : "☆") + "</button>" +
      coverHtml(b) +
      '<div class="book-body"><h3>' + esc(b.title) + "</h3>" +
      '<p class="author">' + esc(b.author || NA) + "</p>" +
      cardPrice(b) +
      '<div class="book-meta">' + tags + "</div></div></article>";
  }
  function gridHtml(list) {
    if (!list.length) return '<p class="empty">' + t("grid.empty") + '</p>';
    return '<div class="book-grid">' + list.map(cardHtml).join("") + "</div>";
  }
  function adSlotHtml() {
    return '<div class="ad-slot ad-tib"><span>ADVERTISEMENT</span>' +
      '<a href="https://www.facebook.com/61560391032591" target="_blank" rel="noopener">' +
      '<img src="assets/tib-perfumes-logo.png" alt="Tīb Perfumes">' +
      '<span class="ad-tib-text">' + t("ad.tib") + '</span></a></div>';
  }
  function heroHtml() {
    return '<section class="hero" style="margin:0 -16px;padding-left:16px;padding-right:16px;">' +
      '<span class="eyebrow">A WORLD OF KNOWLEDGE, ONE LIBRARY</span>' +
      "<h1>" + t("hero.h1") + "</h1>" +
      "<p>" + t("hero.sub") + "</p>" +
      '<form class="search-big" id="heroSearch">' +
      '<div class="search-box"><span class="search-icon" aria-hidden="true">🔍</span><input id="heroQ" type="search" placeholder="' + t("hero.ph") + '" autocomplete="off"></div>' +
      '<button class="btn btn-primary" type="submit">' + t("hero.search") + '</button></form>' +
      '<div class="hero-share"><button class="btn btn-ghost" id="shareSiteBtn" type="button">' + t("hero.share") + '</button>' +
      ' <button class="btn btn-ghost" id="followBtn" type="button">' + t("hero.followNews") + '</button>' +
      ' <button class="btn btn-follow" id="siteLikeBtn" type="button"><span id="siteLikeLabel">' + t("hero.follow") + '</span></button>' +
      ' <button class="btn btn-ghost" id="installBtn" type="button" hidden>' + t("hero.install") + '</button></div>' +
      shareIconsHtml() +
      '<div id="siteSharePanel"></div>' +
      '<div id="installPanel" class="share-panel" hidden></div>' +
      '<button class="adv-toggle" id="advToggle" type="button">' + t("hero.adv") + '</button>' +
      '<div class="filters adv-panel" id="advPanel">' +
      '<div><label>' + t("adv.title") + '</label><input id="fTitle" type="text" placeholder="' + t("adv.phTitle") + '"></div>' +
      '<div><label>' + t("adv.author") + '</label><input id="fAuthor" type="text" placeholder="' + t("adv.phAuthor") + '"></div>' +
      '<div><label>' + t("adv.category") + '</label><select id="fCategory"></select></div>' +
      '<div><label>' + t("adv.language") + '</label><select id="fLanguage"></select></div>' +
      '<div><label>' + t("adv.year") + '</label><input id="fYear" type="number" min="1000" max="2026" placeholder="' + t("adv.phYear") + '"></div>' +
      '<div><label>&nbsp;</label><button class="btn btn-navy" id="advGo" type="button">' + t("adv.go") + '</button></div>' +
      "</div></section>";
  }

  /* ---------- home ---------- */
  function renderHome() {
    var total = BOOKS.length;
    var bn = BOOKS.filter(function (b) { return b.language === "Bengali"; }).length;
    var en = BOOKS.filter(function (b) { return b.language === "English"; }).length;
    var ar = BOOKS.filter(function (b) { return b.language === "Arabic"; }).length;
    var ur = BOOKS.filter(function (b) { return b.language === "Urdu"; }).length;
    var free = BOOKS.filter(function (b) { return b.downloadUrl; }).length;
    var top = BOOKS.filter(function (b) { return b.topRank && !isNoSuggest(b); }).sort(function (a, b) { return a.topRank - b.topRank; }).slice(0, 12);
    var featured = BOOKS.filter(function (b) { return b.featured && !isNoSuggest(b); }).slice(0, 12);
    var recent = BOOKS.filter(function (b) { return !isNoSuggest(b); }).sort(function (a, b) { return b.addedOrder - a.addedOrder; }).slice(0, 12);
    var counts = {};
    BOOKS.forEach(function (b) {
      if (isNoSuggest(b)) return;
      var a = (b.author || "").trim();
      if (a && a !== NA) counts[a] = (counts[a] || 0) + 1;
    });
    var authors = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 10);
    var cats = categoryCounts();
    var byCat = {};
    BOOKS.forEach(function (b) {
      if (isNoSuggest(b)) return;
      var c = b.category || "অন্যান্য";
      var cur = byCat[c];
      if (!cur) { byCat[c] = b; return; }
      var cr = cur.topRank || 999999, br = b.topRank || 999999;
      if (br < cr || (br === cr && b.addedOrder < cur.addedOrder)) byCat[c] = b;
    });
    var CAT_PICK = {
      "Science": "ia-perelman-physics-for-entertainment-1-bengali-mir-1987",
      "Environment": "ia-story-of-a-naturalist-prokritibider-kahini-piotr-manteifel_202512",
      "Political Science": "ia-rajnitikosh",
      "Law": "ia-beng-1-1872",
      "Business & Management": "ia-dli.bengal.10689.2209",
      "Economics": "ia-hsc-economy-1st-paper-chapter-1",
      "Education": "ia-ghore-boshe-spoken-english-munzereen-shahid",
      "Geography": "ia-nctb_2010_class-9-10_secondary-geography"
    };
    var onePerCat = cats.map(function (c) {
      var id = CAT_PICK[c.name];
      if (id) {
        var f = BOOKS.filter(function (b) { return b.id === id; })[0];
        if (f && !isNoSuggest(f)) return f;
      }
      return byCat[c.name];
    }).filter(function (b) { return !!b; });

    var h = heroHtml() + adSlotHtml();
    h += '<section class="block"><div class="stats">' +
      '<div class="stat"><b>' + fmt(total) + '</b><span>' + t("stats.total") + '</span></div>' +
      '<div class="stat"><b>' + fmt(bn) + '</b><span>' + t("stats.bn") + '</span></div>' +
      '<div class="stat"><b>' + fmt(en) + '</b><span>' + t("stats.en") + '</span></div>' +
      '<div class="stat"><b>' + fmt(free) + '</b><span>' + t("stats.free") + '</span></div>' +
      "</div></section>";

    if (onePerCat.length) {
      h += '<section class="block"><div class="section-head"><h2>' + t("sec.onePerCat") + '</h2><a class="link" href="#/categories">' + t("see.allCats") + '</a></div><p class="muted">' + t("sec.onePerCatSub") + '</p>' + gridHtml(onePerCat) + "</section>";
    }
    h += '<section class="block"><div class="section-head"><h2>' + t("sec.top") + '</h2><a class="link" href="#/books?sort=top">' + t("see.all") + '</a></div><p class="muted">' + t("sec.topSub") + '</p>' + gridHtml(top) + "</section>";
    var editors = BOOKS.filter(function (b) { return b.editorsChoice && !isNoSuggest(b); }).slice(0, 12);
    if (editors.length) {
      h += '<section class="block"><div class="section-head"><h2>' + t("sec.editors") + '</h2><a class="link" href="#/books">' + t("see.allBooks") + '</a></div><p class="muted">' + t("sec.editorsSub") + '</p>' + gridHtml(editors) + "</section>";
    }
    var series = seriesCounts();
    if (series.length) {
      h += '<section class="block"><div class="section-head"><h2>' + t("sec.series") + '</h2></div><p class="muted">' + t("sec.seriesSub") + '</p><div class="chip-grid">' +
        series.map(function (s) {
          return '<button class="chip" data-series="' + esc(s.name) + '">' + esc(s.name) + " <small>(" + fmt(s.n) + ")</small></button>";
        }).join("") + "</div></section>";
    }
    h += '<section class="block"><div class="section-head"><h2>' + t("sec.featured") + '</h2><a class="link" href="#/books">' + t("see.allBooks") + '</a></div>' + gridHtml(featured) + "</section>";
    h += '<section class="block"><div class="section-head"><h2>' + t("sec.recent") + '</h2><a class="link" href="#/books?sort=newest">' + t("see.all") + '</a></div>' + gridHtml(recent) + "</section>";
    var favs = BOOKS.filter(function (b) { return isFav(b.id); });
    if (favs.length) {
      h += '<section class="block"><div class="section-head"><h2>' + t("sec.favs") + '</h2></div><p class="muted">' + t("sec.favsSub") + '</p>' + gridHtml(favs) + "</section>";
    }
    h += '<section class="block"><div class="section-head"><h2>' + t("sec.authors") + '</h2><a class="link" href="#/authors">' + t("see.allAuthors") + '</a></div><div class="author-list">' +
      authors.map(function (a) {
        return '<div class="author-item" data-author="' + esc(a) + '"><b>' + esc(a) + "</b><span>" + fmt(counts[a]) + t("author.books") + "</span></div>";
      }).join("") + "</div></section>";
    h += '<section class="block"><div class="section-head"><h2>' + t("sec.categories") + '</h2><a class="link" href="#/categories">' + t("see.allCats") + '</a></div><div class="chip-grid">' +
      cats.map(function (c) {
        return '<button class="chip" data-cat="' + esc(c.name) + '">' + esc(c.name) + " <small>(" + fmt(c.n) + ")</small></button>";
      }).join("") + "</div></section>";
    h += '<section class="block"><div class="section-head"><h2>' + t("sec.languages") + '</h2></div><div class="chip-grid">' +
      '<button class="chip" data-lang="Bengali">' + t("lang.bengali") + " <small>(" + fmt(bn) + ")</small></button>" +
      '<button class="chip" data-lang="English">English <small>(' + fmt(en) + ")</small></button>" +
      '<button class="chip" data-lang="Arabic">' + t("lang.arabic") + " <small>(" + fmt(ar) + ")</small></button>" +
      '<button class="chip" data-lang="Urdu">' + t("lang.urdu") + " <small>(" + fmt(ur) + ")</small></button>" +
      "</div></section>";
    h += '<section class="block"><div class="section-head"><h2>' + t("sec.freeLegal") + '</h2></div>' +
      "<p>" + tf("sec.freeLegalBody", { n: fmt(free) }) + "</p></section>";

    view.innerHTML = h;
    bindHome();
  }

  function seriesCounts() {
    var counts = {};
    BOOKS.forEach(function (b) {
      if (b.series && !isNoSuggest(b)) counts[b.series] = (counts[b.series] || 0) + 1;
    });
    return Object.keys(counts).filter(function (s) { return counts[s] >= 2; })
      .map(function (s) { return { name: s, n: counts[s] }; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  function categoryCounts() {
    var order = ["Bangladesh Studies", "Chattogram Studies", "Chandanaish Studies",
      "World History", "Bangladesh History", "Islamic Studies", "Religion & Philosophy",
      "Political Science", "International Relations", "Economics", "Sociology",
      "Literature", "Poetry", "Novels", "Short Stories", "Biography & Autobiography",
      "Science", "Technology", "Computer Science", "Mathematics", "Physics", "Chemistry",
      "Biology", "Geography", "Environment", "Education", "Psychology", "Law",
      "Business & Management", "Agriculture", "Arts & Culture", "Travel & Exploration",
      "Children's Books", "Reference Books", "Research Papers", "Academic Textbooks", "চাকরির প্রস্তুতি", "অনার্স ১ম বর্ষ", "অন্যান্য"];
    var counts = {};
    BOOKS.forEach(function (b) { var c = b.category || "অন্যান্য"; counts[c] = (counts[c] || 0) + 1; });
    return order.filter(function (c) { return counts[c]; })
      .map(function (c) { return { name: c, n: counts[c] }; });
  }

  function bindHome() {
    var hs = document.getElementById("heroSearch");
    if (hs) hs.addEventListener("submit", function (e) {
      e.preventDefault();
      state = { q: document.getElementById("heroQ").value.trim(), title: "", author: "",
                category: "", language: "", year: "", sort: "az", page: 1 };
      location.hash = "#/books";
    });
    var shareBtn = document.getElementById("shareSiteBtn");
    var shareBox = document.getElementById("siteSharePanel");
    if (shareBtn && shareBox) {
      shareBox.innerHTML = sharePanelHtml("ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন", "বাংলা ও বিশ্বের বই — ফ্রি পড়ুন ও ডাউনলোড করুন", siteUrl());
      shareBtn.addEventListener("click", function () {
        doShare("ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন", "বাংলা ও বিশ্বের বই — ফ্রি পড়ুন ও ডাউনলোড করুন", siteUrl(), shareBox.querySelector(".share-panel"));
      });
      /* Instagram + Messenger icons: no web share link, so open the phone's
         native share sheet (it lists Instagram, Messenger and the rest);
         on desktop fall back to the share panel with links + copy. */
      var nativeBtns = document.querySelectorAll("#siteShareIcons [data-native-share]");
      for (var ni = 0; ni < nativeBtns.length; ni++) {
        nativeBtns[ni].addEventListener("click", function () {
          doShare("ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন", "বাংলা ও বিশ্বের বই — ফ্রি পড়ুন ও ডাউনলোড করুন", siteUrl(), shareBox.querySelector(".share-panel"));
        });
      }
    }
    /* Follow button: the prompt appears ONLY when the visitor taps it —
       never automatically, so readers are not annoyed. */
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function (OneSignal) {
        var fb = document.getElementById("followBtn");
        if (!fb) return;
        function refreshFollow() {
          var on = false;
          try { on = OneSignal.User.PushSubscription.optedIn; } catch (e) {}
          fb.textContent = on ? t("hero.followedNews") : t("hero.followNews");
        }
        refreshFollow();
        fb.addEventListener("click", async function () {
          try {
            if (OneSignal.User.PushSubscription.optedIn) await OneSignal.User.PushSubscription.optOut();
            else await OneSignal.Slidedown.promptPush();
          } catch (e) {}
          setTimeout(refreshFollow, 800);
        });
      });
    }
    var ib = document.getElementById("installBtn");
    if (ib) {
      if (isInstalled) ib.hidden = true;
      else if (deferredInstall || isIOS) ib.hidden = false;
      ib.addEventListener("click", onInstallClick);
    }
    var slb = document.getElementById("siteLikeBtn");
    if (slb) {
      slb.addEventListener("click", toggleSiteLike);
      renderSiteStats();
    }
    var advT = document.getElementById("advToggle");
    var p = document.getElementById("advPanel");
    if (advT && p) {
      fillSelect(document.getElementById("fCategory"), categoryCounts().map(function (c) { return c.name; }), t("adv.allCat"));
      fillSelect(document.getElementById("fLanguage"), ["Bengali", "English", "Arabic", "Urdu"], t("adv.allLang"));
      advT.addEventListener("click", function () { p.classList.toggle("open"); });
      document.getElementById("advGo").addEventListener("click", function () {
        state = { q: "", title: document.getElementById("fTitle").value.trim(),
                  author: document.getElementById("fAuthor").value.trim(),
                  category: document.getElementById("fCategory").value,
                  language: document.getElementById("fLanguage").value,
                  year: document.getElementById("fYear").value.trim(),
                  sort: "az", page: 1 };
        location.hash = "#/books";
      });
    }
  }
  function fillSelect(sel, values, allLabel) {
    if (!sel) return;
    sel.innerHTML = '<option value="">' + esc(allLabel) + "</option>" +
      values.map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(langLabel(v)) + "</option>";
      }).join("");
  }

  /* ---------- Banglish search: many visitors type Roman Bangla
     ("poddoja", "hamlet", "tirmizi"). normQ folds the query the same way
     the generator folded each book's Roman title/author (rt/ra): ph->f,
     q->k, z->j, v->b, doubled letters collapsed, spaces dropped. skel()
     compares consonant skeletons (vowels stripped) for looser matches. */
  function normQ(s) {
    s = (s || "").toLowerCase().replace(/ph/g, "f").replace(/q/g, "k").replace(/z/g, "j").replace(/v/g, "b");
    var out = "", prev = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (!/[a-z0-9]/.test(ch)) continue;
      if (ch === prev) continue;
      out += ch; prev = ch;
    }
    return out;
  }
  function skel(s) { return (s || "").replace(/[aeiou]/g, ""); }

  /* Skeleton coverage of the best single word in a field: a short word
     that is mostly the query outranks a long field that merely contains
     the same consonants somewhere (an author name, or two titles glued
     into one search string). Returns 0 when no word matches. */
  function skelWord(field, qs) {
    var words = (field || "").split(/[^a-z0-9]+/);
    var best = 0;
    for (var i = 0; i < words.length; i++) {
      var ws = skel(words[i]);
      if (ws && ws.indexOf(qs) !== -1) best = Math.max(best, qs.length / ws.length);
    }
    return best;
  }

  /* romanizeBn(): Bangla query -> Latin letters, mirroring the generator's
     romanize() (same char map and conjunct rules). Lets a Bangla query find
     books whose title/author are in Roman letters ("রমেশ শিল" finds
     "Ganakabiyal Ramesh Shil O Tanr Gaan"; "শাজরা" finds "Shajra Sharif").
     Without this, Bangla queries only matched Bangla-script titles, so the
     8,733 Roman-titled Bengali books were invisible to Bangla search. */
  var ROMAN_CONJ = {"ক্ষ": "kh", "জ্ঞ": "gg", "দ্ম": "dd", "হ্ম": "hm", "ঙ্ক": "nk", "ঙ্গ": "ng", "স্ব": "sh"};
  var ROMAN_CHAR = {
    "অ": "o", "আ": "a", "ই": "i", "ঈ": "i", "উ": "u", "ঊ": "u", "ঋ": "ri", "এ": "e",
    "ঐ": "oi", "ও": "o", "ঔ": "ou", "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
    "চ": "ch", "ছ": "ch", "জ": "j", "ঝ": "jh", "ঞ": "n", "ট": "t", "ঠ": "th", "ড": "d",
    "ঢ": "dh", "ণ": "n", "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n", "প": "p",
    "ফ": "ph", "ব": "b", "ভ": "bh", "ম": "m", "য": "j", "র": "r", "ল": "l", "শ": "sh",
    "ষ": "sh", "স": "s", "হ": "h", "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t", "ং": "ng",
    "ঃ": "h", "ঁ": "n", "়": "", "া": "a", "ি": "i", "ী": "i", "ু": "u", "ূ": "u",
    "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou", "্": "", "ৰ": "r", "ৠ": "ri",
    "ৡ": "li", "ৢ": "ri", "ৣ": "ri", "ৱ": "w", "ঽ": "", "০": "0", "১": "1", "২": "2",
    "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  /* A Bangla consonant letter (not a vowel, vowel sign, hasanta or
     other mark). Used for the inherent-"a" rule below. */
  var BN_VOWELS = "অআইঈউঊঋএঐওঔ";
  var BN_SIGNS = "ািীুূৃেৈোৌ";
  var BN_MARKS = "ংঃঁ়্ঽ";
  function isConsBn(ch) {
    if (!ch) return false;
    if (BN_VOWELS.indexOf(ch) !== -1) return false;
    if (BN_SIGNS.indexOf(ch) !== -1) return false;
    if (BN_MARKS.indexOf(ch) !== -1) return false;
    if (ch >= "০" && ch <= "৯") return false;
    return ROMAN_CHAR[ch] !== undefined;
  }
  function romanizeBn(text) {
    if (!text) return "";
    /* Two-codepoint nukta forms (য+়, ড+়, ঢ+়) -> single codepoints,
       same trap as the Devdas filename bug. */
    text = text.split("য়").join("য়").split("ড়").join("ড়").split("ঢ়").join("ঢ়");
    var out = "", i = 0;
    while (i < text.length) {
      var hit = null, conj;
      for (conj in ROMAN_CONJ) {
        if (text.indexOf(conj, i) === i) { hit = ROMAN_CONJ[conj]; i += conj.length; break; }
      }
      if (hit !== null) { out += hit; if (isConsBn(text[i])) out += "a"; continue; }
      var ch = text[i];
      /* য-ফলা (consonant + ্ + য) is "y", not "j" (বিদ্যা = "bidya"). */
      if (ch === "্" && i + 1 < text.length && text[i + 1] === "য") { out += "y"; i += 2; continue; }
      out += (ROMAN_CHAR[ch] !== undefined ? ROMAN_CHAR[ch] : ch);
      /* Inherent "a": রমেশ -> "ramesh" (not "rmesh"), so the query matches
         English-style transliterations in Roman titles. */
      if (isConsBn(ch) && isConsBn(text[i + 1])) out += "a";
      i += 1;
    }
    return out;
  }

  /* ---------- browse ---------- */
  function applyFilters() {
    var list = BOOKS.slice();
    var q = state.q.toLowerCase();
    var qn = normQ(state.q);
    /* Bangla query romanized ("রমেশ শিল" -> "rameshshil"). For a Latin
       query this equals qn, so the extra level below is harmless. */
    var qr = normQ(romanizeBn(state.q));
    if (q) list = list.filter(function (b) {
      var hay = ((b.title || "") + " " + (b.author || "") + " " + (b.category || "")).toLowerCase();
      if (hay.indexOf(q) !== -1) { b._m = 0; b._c = 1; return true; }
      if (!qn && !qr) return false;
      if (qn || qr) {
        var rhay = ((b.rt || "") + " " + (b.ra || "")).toLowerCase();
        if (qn && rhay.indexOf(qn) !== -1) { b._m = 1; b._c = 1; return true; }
        if (qr && rhay.indexOf(qr) !== -1) { b._m = 1; b._c = 1; return true; }
      }
      /* Bangla query, Roman-titled book: match the romanized query against
         the book's own Latin title/author (normalized once, cached). */
      if (qr) {
        if (b._lt === undefined) b._lt = normQ((b.title || "") + " " + (b.author || ""));
        if (b._lt.indexOf(qr) !== -1) { b._m = 1; b._c = 1; return true; }
      }
      if (qn.length >= 3) {
        var qs = skel(qn);
        // Skeleton match per field (not across the title+author boundary,
        // which joins unrelated letters into false positives). _c is the
        // coverage (query skeleton / field skeleton): a short title that
        // is mostly the query (e.g. আমি পদ্মজা for "poddoja") outranks a
        // long title that merely contains the same consonants.
        if (qs.length >= 3) {
          var ct = skelWord(b.rt || "", qs), ca = skelWord(b.ra || "", qs);
          if (ct > 0) { b._m = 2; b._c = ct; return true; }
          if (ca > 0) { b._m = 2; b._c = ca; return true; }
        }
      }
      if (qr && qr.length >= 3) {
        var qsR = skel(qr);
        if (qsR.length >= 3) {
          var ctR = skelWord(b.rt || "", qsR), caR = skelWord(b.ra || "", qsR);
          if (ctR > 0) { b._m = 2; b._c = ctR; return true; }
          if (caR > 0) { b._m = 2; b._c = caR; return true; }
        }
      }
      if (qr && qr.length >= 3) {
        var qs2 = skel(qr);
        if (qs2.length >= 3) {
          if (b._ltT === undefined) b._ltT = normQ(b.title || "");
          if (b._ltA === undefined) b._ltA = normQ(b.author || "");
          var ct2 = skel(b._ltT), ca2 = skel(b._ltA);
          if (ct2.indexOf(qs2) !== -1) { b._m = 2; b._c = qs2.length / Math.max(1, ct2.length); return true; }
          if (ca2.indexOf(qs2) !== -1) { b._m = 2; b._c = qs2.length / Math.max(1, ca2.length); return true; }
        }
      }
      return false;
    });
    if (state.title) list = list.filter(function (b) { return (b.title || "").toLowerCase().indexOf(state.title.toLowerCase()) !== -1; });
    if (state.author) list = list.filter(function (b) { return (b.author || "").toLowerCase().indexOf(state.author.toLowerCase()) !== -1; });
    if (state.category) list = list.filter(function (b) { return b.category === state.category; });
    if (state.language) list = list.filter(function (b) { return b.language === state.language; });
    if (state.year) list = list.filter(function (b) { return String(b.year || "") === String(state.year); });
    var s = state.sort;
    list.sort(function (a, b) {
      if (s === "az") return (a.title || "").localeCompare(b.title || "", "bn");
      if (s === "za") return (b.title || "").localeCompare(a.title || "", "bn");
      if (s === "newest") return (b.year || 0) - (a.year || 0) || (b.addedOrder - a.addedOrder);
      if (s === "oldest") return (a.year || 99999) - (b.year || 99999) || (a.addedOrder - b.addedOrder);
      if (s === "author") return (a.author || "").localeCompare(b.author || "", "bn");
      if (s === "top") return topRankOf(a) - topRankOf(b) || (a.title || "").localeCompare(b.title || "", "bn");
      if (s === "language") return (a.language || "").localeCompare(b.language || "");
      if (s === "category") return (a.category || "").localeCompare(b.category || "", "bn");
      return 0;
    });
    // Best matches first when searching: direct hits, then Roman (Banglish)
    // hits, then loose skeleton hits (best coverage first). sort() is
    // stable, so the chosen order (A-Z, top-ranked, ...) is kept inside
    // each group.
    if (q) list.sort(function (a, b) { return (a._m || 0) - (b._m || 0) || (b._c || 0) - (a._c || 0); });
    return list;
  }

  function booksShellHtml() {
    return '<section class="block"><h2>' + t("books.title") + '</h2>' +
      '<p class="muted">' + tf("books.sub", { n: fmt(BOOKS.length) }) + '</p>' +
      '<div class="filters">' +
      '<div class="full"><label>' + t("books.qLabel") + '</label><div class="search-box"><span class="search-icon" aria-hidden="true">🔍</span><input id="bQ" type="search" value="' + esc(state.q) + '" placeholder="' + t("books.qPh") + '"></div></div>' +
      '<div><label>' + t("books.catLabel") + '</label><select id="bCat"></select></div>' +
      '<div><label>' + t("books.langLabel") + '</label><select id="bLang"></select></div>' +
      '<div><label>' + t("books.sortLabel") + '</label><select id="bSort">' +
        '<option value="az">' + t("sort.az") + '</option>' +
        '<option value="za">' + t("sort.za") + '</option>' +
        '<option value="newest">' + t("sort.newest") + '</option>' +
        '<option value="oldest">' + t("sort.oldest") + '</option>' +
        '<option value="author">' + t("sort.author") + '</option>' +
        '<option value="top">' + t("sort.top") + '</option>' +
        '<option value="language">' + t("sort.language") + '</option>' +
        '<option value="category">' + t("sort.category") + '</option>' +
      "</select></div>" +
      '<div><label>' + t("books.yearLabel") + '</label><input id="bYear" type="number" min="1000" max="2026" value="' + esc(state.year) + '" placeholder="' + t("books.yearPh") + '"></div>' +
      "</div>" +
      '<div id="bookResults"></div>' +
      "</section>";
  }

  /* The search box + filters are built ONCE (the shell); every keystroke
     only refreshes #bookResults below. Rebuilding the whole view on each
     keystroke destroyed the input element, so the phone keyboard closed
     after every letter and the user had to tap the box again. */
  function renderBooks() {
    if (!document.getElementById("bQ")) {
      view.innerHTML = booksShellHtml();
      fillSelect(document.getElementById("bCat"), categoryCounts().map(function (c) { return c.name; }), t("books.allCat"));
      fillSelect(document.getElementById("bLang"), ["Bengali", "English", "Arabic", "Urdu"], t("books.allLang"));
      document.getElementById("bCat").value = state.category;
      document.getElementById("bLang").value = state.language;
      document.getElementById("bSort").value = state.sort;
      var deb;
      document.getElementById("bQ").addEventListener("input", function (e) {
        clearTimeout(deb);
        deb = setTimeout(function () { state.q = e.target.value.trim(); state.page = 1; updateBookResults(); }, 300);
      });
      document.getElementById("bCat").addEventListener("change", function (e) { state.category = e.target.value; state.page = 1; updateBookResults(); });
      document.getElementById("bLang").addEventListener("change", function (e) { state.language = e.target.value; state.page = 1; updateBookResults(); });
      document.getElementById("bSort").addEventListener("change", function (e) { state.sort = e.target.value; state.page = 1; updateBookResults(); });
      document.getElementById("bYear").addEventListener("change", function (e) { state.year = e.target.value.trim(); state.page = 1; updateBookResults(); });
    } else {
      /* Route changed the state (e.g. #/category/...) while the shell was
         already on screen: sync the control values without rebuilding
         them — setting .value never steals focus or closes the keyboard. */
      var qEl = document.getElementById("bQ");
      if (qEl.value !== state.q) qEl.value = state.q;
      document.getElementById("bCat").value = state.category;
      document.getElementById("bLang").value = state.language;
      document.getElementById("bSort").value = state.sort;
      document.getElementById("bYear").value = state.year;
    }
    updateBookResults();
  }

  function updateBookResults() {
    var list = applyFilters();
    if (state.q && !list.length) logMissedSearch(state.q);
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    // No results: recommend the top books instead of leaving an empty page.
    var recHtml = "";
    if (state.q && !list.length) {
      var recs = BOOKS.filter(function (b) { return b.topRank && !isNoSuggest(b); }).sort(function (a, b) { return a.topRank - b.topRank; }).slice(0, 6);
      if (recs.length) recHtml = '<div class="block"><h3>' + t("results.none") + '</h3><p class="muted">' + t("results.noneSub") + '</p>' + gridHtml(recs) + "</div>";
    }
    var h = '<p class="result-info">' + tf("results.info", { n: fmt(list.length), p: fmt(state.page), t: fmt(pages) }) + "</p>" +
      gridHtml(slice) +
      recHtml +
      '<div class="pagination">' +
      '<button class="btn btn-ghost btn-sm" id="prevPg" ' + (state.page <= 1 ? "disabled" : "") + ">" + t("results.prev") + "</button>" +
      "<span>" + tf("results.page", { p: fmt(state.page), t: fmt(pages) }) + "</span>" +
      '<button class="btn btn-ghost btn-sm" id="nextPg" ' + (state.page >= pages ? "disabled" : "") + ">" + t("results.next") + "</button>" +
      "</div>" +
      adSlotHtml();
    var box = document.getElementById("bookResults");
    if (box) box.innerHTML = h;
    var pv = document.getElementById("prevPg"), nx = document.getElementById("nextPg");
    if (pv) pv.addEventListener("click", function () { if (state.page > 1) { state.page--; updateBookResults(); window.scrollTo(0, 0); } });
    if (nx) nx.addEventListener("click", function () { state.page++; updateBookResults(); window.scrollTo(0, 0); });
  }

  /* ---------- missed searches ----------
     A visitor searched for a book we don't have: save the query in
     Firestore (collection "missed_searches") so the owner can see what
     readers want and add those books as buy-only listings with details.
     Once per query per visit, so one person can't flood the list.
     Rules (published in the Firebase console): anyone may create a
     {q, createdAt} doc; nobody may read/update/delete from the site —
     the owner reads them in the console. */
  var loggedMisses = {};
  function logMissedSearch(q) {
    q = (q || "").trim();
    if (!q || q.length < 2 || q.length > 100 || loggedMisses[q]) return;
    loggedMisses[q] = true;
    var db = fsdb();
    if (!db) return;
    try {
      db.collection("missed_searches").add({
        q: q,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- reviews + likes (Firebase Firestore) ----------
     Google login (already on the site) is enough — no GitHub account.
     Reviews live in the "reviews" collection:
     {bookId, uid, name, photo, text, rating 1-5, likes:[uid...],
      parentId (null = top-level review, else a reply), createdAt}.
     Firestore rules (published in the Firebase console) let anyone read,
     signed-in users create their own, anyone signed-in toggle a like,
     and only the author edit/delete their own. */
  function fsdb() {
    if (typeof firebase === "undefined" || !firebase.firestore) return null;
    try { return firebase.firestore(); } catch (e) { return null; }
  }

  /* ---------- site stats: visits + likes + feedback (Firestore, free Spark) ----------
     Counter counts every visit (same person re-entering counts again); one
     increment per browser session so in-site navigation does not inflate it.
     Likes: one per browser (localStorage browser id), no login needed.
     Feedback: public create-only; only the owner reads it in the console. */
  var SITE_STATS_DOC = "main";
  var SITE_BROWSER_KEY = "mdl-browser-id";
  var SITE_VISIT_KEY = "mdl-visit-counted";
  var siteStats = null;
  function bnNum(n) {
    var s = String(n == null ? 0 : n);
    if (LANG === "en") return s;
    return s.replace(/[0-9]/g, function (d) { return "০১২৩৪৫৬৭৮৯"[+d]; });
  }
  function browserId() {
    try {
      var id = localStorage.getItem(SITE_BROWSER_KEY);
      if (!id) {
        id = "b-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(SITE_BROWSER_KEY, id);
      }
      return id;
    } catch (e) { return "b-anon"; }
  }
  function siteStatsRef() {
    var db = fsdb();
    return db ? db.collection("site_stats").doc(SITE_STATS_DOC) : null;
  }
  function renderSiteStats() {
    var vc = document.getElementById("visitCount");
    if (vc) vc.textContent = siteStats ? bnNum(siteStats.visits || 0) : "…";
    var hv = document.getElementById("headerVisitCount");
    if (hv) hv.textContent = siteStats ? bnNum(siteStats.visits || 0) : "…";
    var btn = document.getElementById("siteLikeBtn");
    if (btn) {
      var liked = !!(siteStats && siteStats.likers && siteStats.likers.indexOf(browserId()) !== -1);
      btn.classList.toggle("liked", liked);
      var c = document.getElementById("siteLikeCount");
      if (c) c.textContent = bnNum(siteStats ? (siteStats.likes || 0) : 0);
      var hc = document.getElementById("headerLikeCount");
      if (hc) hc.textContent = bnNum(siteStats ? (siteStats.likes || 0) : 0);
      var lbl = document.getElementById("siteLikeLabel");
      if (lbl) lbl.textContent = liked ? t("hero.followed") : t("hero.follow");
    }
  }
  function initSiteStats() {
    var form = document.getElementById("siteFeedbackForm");
    if (form) form.addEventListener("submit", submitSiteFeedback);
    var ref = siteStatsRef();
    if (!ref) { renderSiteStats(); return; }
    ref.get().then(function (snap) {
      siteStats = snap.exists ? snap.data() : { visits: 0, likes: 0, likers: [] };
      renderSiteStats();
      var counted = false;
      try { counted = sessionStorage.getItem(SITE_VISIT_KEY) === "1"; } catch (e) {}
      if (counted) return;
      try { sessionStorage.setItem(SITE_VISIT_KEY, "1"); } catch (e) {}
      var FV = firebase.firestore.FieldValue;
      if (snap.exists) {
        ref.update({ visits: FV.increment(1) }).then(function () {
          siteStats.visits = (siteStats.visits || 0) + 1;
          renderSiteStats();
        }).catch(function () {});
      } else {
        ref.set({ visits: 1, likes: 0, likers: [] }).then(function () {
          siteStats.visits = 1;
          renderSiteStats();
        }).catch(function () {});
      }
    }).catch(function () { renderSiteStats(); });
  }
  function toggleSiteLike() {
    var ref = siteStatsRef();
    if (!ref || typeof firebase === "undefined" || !firebase.firestore) return;
    var id = browserId();
    var FV = firebase.firestore.FieldValue;
    function likedNow() {
      return !!(siteStats && siteStats.likers && siteStats.likers.indexOf(id) !== -1);
    }
    if (!siteStats) {
      siteStats = { visits: 1, likes: 1, likers: [id] };
      renderSiteStats();
      ref.set({ visits: 1, likes: 1, likers: [id] }).then(function () {
        siteStats = { visits: 1, likes: 1, likers: [id] };
        renderSiteStats();
      }).catch(function () { initSiteStats(); });
      return;
    }
    if (likedNow()) {
      siteStats.likes = Math.max(0, (siteStats.likes || 0) - 1);
      siteStats.likers = siteStats.likers.filter(function (x) { return x !== id; });
      renderSiteStats();
      ref.update({ likes: FV.increment(-1), likers: FV.arrayRemove(id) }).catch(function () { initSiteStats(); });
    } else {
      siteStats.likes = (siteStats.likes || 0) + 1;
      siteStats.likers = (siteStats.likers || []).concat([id]);
      renderSiteStats();
      ref.update({ likes: FV.increment(1), likers: FV.arrayUnion(id) }).catch(function () { initSiteStats(); });
    }
  }
  function submitSiteFeedback(e) {
    e.preventDefault();
    var textEl = document.getElementById("siteFeedbackText");
    var nameEl = document.getElementById("siteFeedbackName");
    var msg = document.getElementById("siteFeedbackMsg");
    var text = textEl ? textEl.value.trim() : "";
    if (!text) return;
    if (text.length > 1000) text = text.slice(0, 1000);
    var db = fsdb();
    function done(ok) {
      if (!msg) return;
      msg.hidden = false;
      msg.textContent = ok ? t("fb.ok") : t("fb.fail");
      if (ok) {
        if (textEl) textEl.value = "";
        if (nameEl) nameEl.value = "";
      }
    }
    if (!db) { done(false); return; }
    db.collection("site_feedback").add({
      text: text,
      name: nameEl ? nameEl.value.trim().slice(0, 60) : "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () { done(true); }).catch(function () { done(false); });
  }
  function starsHtml(n) {
    n = Math.max(0, Math.min(5, Math.round(n || 0)));
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }
  function reviewTime(ts) {
    if (!ts || !ts.toDate) return t("now");
    try { return ts.toDate().toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return ""; }
  }
  function reviewAvatar(r) {
    if (r.photo) return '<img class="rev-ava" src="' + esc(r.photo) + '" alt="">';
    return '<span class="rev-ava">' + esc((r.name || "?").charAt(0)) + "</span>";
  }
  var reviewState = { bookId: null, list: [], replyTo: null, rating: 5 };
  function loadReviews(bookId) {
    reviewState.bookId = bookId;
    reviewState.list = [];
    reviewState.replyTo = null;
    var box = document.getElementById("reviewsBox");
    var db = fsdb();
    if (!box) return;
    if (!db) {
      box.innerHTML = '<p class="muted">' + t("rev.loadFail") + '</p>';
      return;
    }
    box.innerHTML = '<p class="muted">' + t("rev.loading") + '</p>';
    db.collection("reviews").where("bookId", "==", bookId).get()
      .then(function (snap) {
        var list = [];
        snap.forEach(function (d) {
          var r = d.data(); r._id = d.id; list.push(r);
        });
        list.sort(function (a, b) {
          var ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
          var tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
          return tb - ta;
        });
        reviewState.list = list;
        renderReviews();
      })
      .catch(function () {
        box.innerHTML = '<p class="muted">' + t("rev.loadFail2") + '</p>';
      });
  }
  function renderReviews() {
    var box = document.getElementById("reviewsBox");
    var avg = document.getElementById("reviewAvg");
    if (!box) return;
    var top = reviewState.list.filter(function (r) { return !r.parentId; });
    if (avg) {
      var rated = top.filter(function (r) { return r.rating; });
      if (rated.length) {
        var mean = rated.reduce(function (s, r) { return s + r.rating; }, 0) / rated.length;
        avg.innerHTML = '<span class="rev-stars">' + starsHtml(mean) + '</span> <b>' +
          fmt(mean, { maximumFractionDigits: 1 }) + "</b> (" +
          fmt(rated.length) + t("rev.ratings") + ")";
      } else {
        avg.innerHTML = '<span class="muted">' + t("rev.noRating") + '</span>';
      }
    }
    if (!reviewState.list.length) {
      box.innerHTML = '<p class="muted">' + t("rev.none") + '</p>';
    } else {
      box.innerHTML = top.map(reviewHtml).join("");
    }
    renderReviewForm();
  }
  function reviewHtml(r) {
    var me = currentUser && currentUser.uid === r.uid;
    var liked = currentUser && (r.likes || []).indexOf(currentUser.uid) !== -1;
    var n = (r.likes || []).length;
    var replies = reviewState.list.filter(function (x) { return x.parentId === r._id; });
    var h = '<div class="review" data-rev="' + esc(r._id) + '">' +
      '<div class="rev-head">' + reviewAvatar(r) +
      '<b>' + esc(r.name || t("rev.reader")) + "</b>" +
      (r.rating ? '<span class="rev-stars">' + starsHtml(r.rating) + "</span>" : "") +
      '<span class="muted small">' + esc(reviewTime(r.createdAt)) + "</span></div>" +
      '<p class="rev-text">' + esc(r.text) + "</p>" +
      '<div class="rev-actions">' +
      '<button class="btn btn-ghost btn-sm' + (liked ? " liked" : "") + '" data-like="' + esc(r._id) + '" type="button">' +
      (liked ? "❤️" : "🤍") + " " + fmt(n) + "</button>" +
      '<button class="btn btn-ghost btn-sm" data-reply="' + esc(r._id) + '" type="button">' + t("rev.reply") + '</button>' +
      (me ? '<button class="btn btn-ghost btn-sm" data-del-review="' + esc(r._id) + '" type="button">' + t("rev.delete") + '</button>' : "") +
      "</div>";
    if (reviewState.replyTo === r._id) {
      h += '<div class="rev-reply-form"><textarea id="replyText" rows="2" placeholder="' + t("rev.replyPh") + '"></textarea>' +
        '<button class="btn btn-navy btn-sm" id="replySend" type="button">' + t("rev.replySend") + '</button></div>';
    }
    if (replies.length) {
      h += '<div class="rev-replies">' + replies.map(reviewHtml).join("") + "</div>";
    }
    return h + "</div>";
  }
  function renderReviewForm() {
    var f = document.getElementById("reviewForm");
    if (!f) return;
    if (!currentUser) {
      f.innerHTML = '<p class="muted">' + t("rev.loginNote") + '</p>';
      return;
    }
    f.innerHTML = '<div class="rev-form"><div class="rev-stars-pick">' +
      [1, 2, 3, 4, 5].map(function (n) {
        return '<button class="star-pick' + (n <= reviewState.rating ? " on" : "") + '" data-star="' + n + '" type="button">★</button>';
      }).join("") + '</div>' +
      '<textarea id="reviewText" rows="3" placeholder="' + t("rev.writePh") + '"></textarea>' +
      '<button class="btn btn-primary btn-sm" id="reviewSend" type="button">' + t("rev.send") + '</button></div>';
    var send = document.getElementById("reviewSend");
    if (send) send.addEventListener("click", function () { submitReview(null); });
    var rs = document.getElementById("replySend");
    if (rs) rs.addEventListener("click", function () { submitReview(reviewState.replyTo); });
  }
  function submitReview(parentId) {
    var db = fsdb();
    if (!db || !currentUser) return;
    var ta = document.getElementById(parentId ? "replyText" : "reviewText");
    if (!ta) return;
    var text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    var data = {
      bookId: reviewState.bookId,
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email || t("rev.reader"),
      photo: currentUser.photoURL || "",
      text: text,
      rating: parentId ? 0 : (reviewState.rating || 5),
      likes: [],
      parentId: parentId || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    db.collection("reviews").add(data).then(function () {
      reviewState.replyTo = null;
      loadReviews(reviewState.bookId);
    }).catch(function () {
      alert(t("rev.sendFail"));
    });
  }

  function renderBook(id) {
    var light = byId(id);
    if (!light) { view.innerHTML = '<p class="empty">' + t("book.notFound") + '</p>'; return; }
    view.innerHTML = '<p class="empty">' + t("book.loading") + '</p>';
    window.scrollTo(0, 0);
    getFull(id).then(function (b) { renderBookFull(b || light); });
  }
  function renderBookFull(b) {
    function linkOrNA(url, label) {
      return url
        ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || url) + "</a>"
        : NA;
    }
    var avail = b.availability === "free-download"
      ? t("book.availFree")
      : (b.availability === "buy-only"
        ? t("book.availBuy")
        : t("book.availRead"));
    /* Full A–Z details. Every value is real data from the source; anything
       unknown shows "তথ্য নেই" — nothing is guessed. No price is shown:
       the OCR-extracted printed prices were mostly wrong, so prices were
       removed entirely on 2026-11-21. */
    var rows = [
      [t("row.id"), esc(b.sourceId || b.id)],
      [t("row.title"), esc(b.title)],
      [t("row.altTitle"), esc(b.altTitle) || NA],
      [t("row.author"), esc(b.author) || NA],
      [t("row.editor"), esc(b.editor) || NA],
      [t("row.translator"), esc(b.translator) || NA],
      [t("row.publisher"), esc(b.publisher) || NA],
      [t("row.year"), b.year ? String(b.year) : NA],
      [t("row.isbn"), esc(b.isbn) || NA],
      [t("row.language"), esc(langLabel(b.language))],
      [t("row.country"), esc(b.country) || NA],
      [t("row.subject"), esc(b.subject) || NA],
      [t("row.category"), esc(b.category || "অন্যান্য")],
      [t("row.subcategory"), esc(b.subcategory) || NA],
      [t("row.description"), esc(b.description) || NA],
      [t("row.pages"), b.pageCount ? fmt(b.pageCount) + t("row.pagesUnit") : NA],
      [t("row.edition"), esc(b.edition) || NA],
      [t("row.source"), esc(b.source) || NA],
      [t("row.read"), linkOrNA(b.readUrl, t("row.readLabel"))],
      [t("row.download"), b.downloadUrl ? linkOrNA(b.downloadUrl, t("row.dlLabel")) : t("row.dlNone")],
      [t("row.buy"), b.buyLink ? linkOrNA(b.buyLink, t("row.buyLabel")) : NA],
      [t("row.copyright"), b.copyright === "public-domain" ? t("row.copyrightPd") : NA],
      [t("row.avail"), avail]
    ];
    var seriesHtml = "";
    if (b.series) {
      var sibs = BOOKS.filter(function (x) { return x.series === b.series && x.id !== b.id && (!isNoSuggest(x) || isNoSuggest(b)); });
      if (sibs.length) {
        seriesHtml = '<div class="reviews"><h3>' + esc(b.series) + t("book.seriesMore") + '</h3>' + gridHtml(sibs.slice(0, 12)) + "</div>";
      }
    }
    var h = '<button class="back-link" id="backBtn">' + t("book.back") + '</button>' +
      '<div class="details">' + coverHtml(b, true) +
      (b.coverUrl ? '<p class="small muted cover-hint">' + t("cover.hint") + '</p>' : "") +
      "<h2>" + esc(b.title) + "</h2>" +
      '<p class="muted">' + t("book.authorLine") + esc(b.author || NA) + "</p>" +
      "<dl>" + rows.map(function (r) {
        return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>";
      }).join("") + "</dl>" +
      '<div class="actions">' +
      '<a class="btn btn-navy" href="' + esc(b.readUrl) + '" target="_blank" rel="noopener">' + t("book.read") + '</a>' +
      (b.downloadUrl
        ? '<a class="btn btn-primary" href="' + esc(dlUrl(b)) + '" download>' + esc(dlLabel(b)) + "</a>"
        : "") +
      (b.buyLink
        ? '<a class="btn btn-primary" href="' + esc(b.buyLink) + '" target="_blank" rel="noopener">' + t("book.buy") + '</a>'
        : "") +
      '<a class="btn btn-ghost" href="' + esc(b.readUrl) + '" target="_blank" rel="noopener">' + t("book.source") + '</a>' +
      '<button class="btn btn-ghost" id="shareBtn" type="button">' + t("book.share") + '</button>' +
      '<button class="btn btn-ghost" id="favBtn" data-fav="' + esc(b.id) + '" type="button">' + (isFav(b.id) ? t("book.favOn") : t("book.favOff")) + "</button>" +
      "</div>" +
      sharePanelHtml(b.title, "ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন", bookUrl(b)) +
      (b.buyLink
        ? '<div class="notice">' + t("book.buyNotice") + '</div>' 
        : (b.downloadUrl ? "" :
        '<div class="notice">' + t("book.dlNotice") + '</div>')) +
      '<div class="reviews"><h3>' + t("book.reviews") + '</h3>' +
      '<p class="small muted">' + t("book.reviewsNote") + '</p>' +
      '<div id="reviewAvg"></div><div id="reviewForm"></div><div id="reviewsBox"></div></div>' +
      seriesHtml + "</div>";
    view.innerHTML = h;
    document.getElementById("backBtn").addEventListener("click", function () { history.back(); });
    var dShareBtn = document.getElementById("shareBtn");
    if (dShareBtn) dShareBtn.addEventListener("click", function () {
      doShare(b.title, "ডিজিটাল লাইব্রেরি বাই রবিউল হোসেন — " + (b.author || ""), bookUrl(b), document.querySelector(".share-panel"));
    });
    loadReviews(b.id);
  }

  function renderSeries(name) {
    var list = BOOKS.filter(function (b) { return b.series === name; });
    view.innerHTML = '<section class="block"><h2>' + esc(name) + t("series.title") + '</h2>' +
      '<p class="muted">' + fmt(list.length) + t("series.books") + '</p>' + gridHtml(list) + "</section>";
    window.scrollTo(0, 0);
  }

  /* ---------- simple pages ---------- */
  function renderCategories() {
    var cats = categoryCounts();
    view.innerHTML = '<section class="block"><h2>' + t("cats.title") + '</h2><p class="muted">' + t("cats.sub") + '</p><div class="chip-grid">' +
      cats.map(function (c) {
        return '<button class="chip" data-cat="' + esc(c.name) + '">' + esc(c.name) + " <small>(" + fmt(c.n) + ")</small></button>";
      }).join("") + "</div></section>";
  }
  function renderAuthors() {
    var counts = {};
    BOOKS.forEach(function (b) {
      var a = (b.author || "").trim();
      if (a && a !== NA) counts[a] = (counts[a] || 0) + 1;
    });
    var authors = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    view.innerHTML = '<section class="block"><h2>' + t("authors.title") + '</h2><p class="muted">' + fmt(authors.length) + t("authors.sub") + '</p><div class="author-list">' +
      authors.map(function (a) {
        return '<div class="author-item" data-author="' + esc(a) + '"><b>' + esc(a) + "</b><span>" + fmt(counts[a]) + t("author.books") + "</span></div>";
      }).join("") + "</div></section>";
  }
  function infoPage(title, bodyHtml) {
    view.innerHTML = '<div class="info-page"><h2>' + esc(title) + "</h2>" + bodyHtml + "</div>";
    window.scrollTo(0, 0);
  }
  function renderAbout() {
    infoPage(t("about.title"),
      "<p>" + t("about.p1") + "</p>" +
      "<p>" + t("about.p2") + "</p>" +
      "<p>" + t("about.p3") + "</p>" +
      "<h3>About Robiul Hosen</h3>" +
      '<div class="owner-card"><img class="owner-photo" src="assets/robiul-hosen.jpg" alt="রবিউল হোসেন">' +
      '<div class="owner-info"><h3>রবিউল হোসেন</h3>' +
      '<p class="owner-titles">Student | Educator | Content Writer | Digital Enthusiast</p>' +
      '<p class="owner-intro">I am a Political Science student, educator, and aspiring professional passionate about education, knowledge sharing, writing, and digital innovation.</p>' +
      '<p class="owner-tagline">“Learning Today, Leading Tomorrow.”</p>' +
      '<p class="owner-role">Founder &amp; Editor, My Digital Library<br>BSS (Hons.) in Political Science, Chattogram College<br>Instructor, Propel Coaching Center</p>' +
      "<p><b>" + t("about.edu") + "</b> BSS (Hons.) রাষ্ট্রবিজ্ঞান, চট্টগ্রাম কলেজ (চলমান)</p>" +
      '<p><b>' + t("about.contact") + '</b> <a href="mailto:hosenrobiul43@gmail.com">hosenrobiul43@gmail.com</a> · <a href="https://www.facebook.com/61564301917226" target="_blank" rel="noopener">Facebook: রবিউল</a> · <a href="https://github.com/hosenrobiul43-ship-it" target="_blank" rel="noopener">GitHub</a></p><p><a class="btn btn-primary" href="https://muse.ai/s/robiul-hosen-xwn6xkxzxqhxqyxsxu/RklTWRtsi3EoMw2QEzEOfyKPql_4cEKMzuHi2DZePME" target="_blank" rel="noopener">' + t("about.portfolio") + '</a></p>' + '</div></div>');
  }
  function renderPrivacy() {
    infoPage(t("privacy.title"),
      "<p>" + t("privacy.p1") + "</p>" +
      "<p>" + t("privacy.p2") + "</p>");
  }
  function renderTerms() {
    infoPage(t("terms.title"),
      "<p>" + t("terms.p1") + "</p>" +
      "<p>" + t("terms.p2") + "</p>" +
      "<p>" + t("terms.p3") + "</p>");
  }
  function renderCopyright() {
    infoPage(t("copyright.title"),
      "<p>" + t("copyright.p1") + "</p>" +
      "<p>" + t("copyright.p2") + "</p>" +
      "<p>" + t("copyright.p3") + "</p>");
  }
  function renderRequest() {
    var T = t("req.title");
    var D = t("req.desc");
    var L_BOOK = t("req.book");
    var L_AUTHOR = t("req.author");
    var L_NAME = t("req.name");
    var L_GMAIL = t("req.gmail");
    var L_MORE = t("req.more");
    view.innerHTML = '<section class="block"><h2>' + T + '</h2>' +
      '<p class="muted">' + D + '</p>' +
      '<form id="reqForm" class="req-form">' +
      '<label>' + L_BOOK + ' <span class="req-star">*</span><input name="book" required placeholder="' + t("req.phBook") + '"></label>' +
      '<label>' + L_AUTHOR + '<input name="author" placeholder="' + t("req.phAuthor") + '"></label>' +
      '<label>' + L_NAME + '<input name="name" placeholder="' + L_NAME + '"></label>' +
      '<label>' + L_GMAIL + '<input name="gmail" type="email" placeholder="example@gmail.com"></label>' +
      '<label>' + L_MORE + '<textarea name="more" rows="3" placeholder="' + t("req.phMore") + '"></textarea></label>' +
      '<button class="btn btn-primary" type="submit">' + t("req.send") + '</button>' +
      '<p class="muted small">' + t("req.note") + '</p>' +
      '</form><div id="reqMsg"></div></section>';
    var f = document.getElementById("reqForm");
    var msg = document.getElementById("reqMsg");
    var btn = f.querySelector("button[type=submit]");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(f);
      var body = new URLSearchParams();
      body.set("entry.1454025096", fd.get("book") || "");
      body.set("entry.737359454", fd.get("author") || "");
      body.set("entry.1902805564", fd.get("name") || "");
      body.set("entry.100932459", fd.get("gmail") || "");
      body.set("entry.1438929822", fd.get("more") || "");
      btn.disabled = true;
      msg.innerHTML = '<p class="muted">' + "\u09aa\u09be\u09a0\u09be\u09a8\u09cb \u09b9\u099a\u09cd\u099b\u09c7\u2026" + '</p>';
      fetch("https://docs.google.com/forms/d/e/1FAIpQLSeTKSSGgF-CFoPenX0WCYOlqJKv8SJgIyeeh4-fs73ljH4MXg/formResponse", { method: "POST", mode: "no-cors", body: body })
        .then(function () {
          f.style.display = "none";
          msg.innerHTML = '<div class="req-ok"><b>' + "\u09a7\u09a8\u09cd\u09af\u09ac\u09be\u09a6! \u0986\u09aa\u09a8\u09be\u09b0 \u0985\u09a8\u09c1\u09b0\u09cb\u09a7 \u09aa\u09c7\u09df\u09c7\u099b\u09bf \u2014 \u09ac\u0987\u099f\u09bf \u0996\u09c1\u0981\u099c\u09c7 \u09af\u09c1\u0995\u09cd\u09a4 \u0995\u09b0\u09be\u09b0 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09ac\u0964" + '</b><p><button class="btn btn-ghost" data-req-again>' + "\u0986\u09b0\u09c7\u0995\u099f\u09bf \u0985\u09a8\u09c1\u09b0\u09cb\u09a7 \u0995\u09b0\u09c1\u09a8" + '</button> <a class="btn btn-primary" href="#/books">' + "\u09b8\u09ac \u09ac\u0987 \u09a6\u09c7\u0996\u09c1\u09a8" + '</a></p></div>';
          var ag = msg.querySelector("[data-req-again]");
          if (ag) ag.addEventListener("click", function () { renderRequest(); });
          window.scrollTo(0, 0);
        })
        .catch(function () {
          btn.disabled = false;
          msg.innerHTML = '<div class="req-err">' + "\u09aa\u09be\u09a0\u09be\u09a8\u09cb \u09af\u09be\u09df\u09a8\u09bf\u0964 \u09b8\u09b0\u09be\u09b8\u09b0\u09bf \u09ab\u09cb\u09b0\u09cd\u09ae\u09c7 \u09b2\u09bf\u0996\u09c1\u09a8\u0964" + ' <a href="https://forms.gle/gZtvVqZdGpMn6WEh7" target="_blank" rel="noopener">' + "\u0997\u09c1\u0997\u09b2 \u09ab\u09cb\u09b0\u09cd\u09ae \u0996\u09c1\u09b2\u09c1\u09a8" + '</a></div>';
        });
    });
    window.scrollTo(0, 0);
  }
  function renderContact() {
    infoPage(t("contact.title"),
      "<p>" + t("contact.p1") + "</p>" +
      "<p>" + t("contact.p2") + "</p>" +
      "<p>" + t("contact.p3") + "</p>");
  }

  /* ---------- router ---------- */
  function route() {
    var hash = location.hash || "#/";
    var parts = hash.replace(/^#\/?/, "").split("/");
    var page = parts[0] || "";
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === (page === "" ? "home" : page));
    });
    if (page === "") renderHome();
    else if (page === "books") {
      var q = new URLSearchParams(hash.split("?")[1] || "");
      if (q.get("sort")) state.sort = q.get("sort");
      renderBooks();
    }
    else if (page === "book") renderBook(decodeURIComponent(parts[1] || ""));
    else if (page === "series") renderSeries(decodeURIComponent(parts[1] || ""));
    else if (page === "category") {
      state = { q: "", title: "", author: "", category: decodeURIComponent(parts[1] || ""),
                language: "", year: "", sort: "az", page: 1 };
      renderBooks();
    }
    else if (page === "author") {
      state = { q: "", title: "", author: decodeURIComponent(parts[1] || ""),
                category: "", language: "", year: "", sort: "az", page: 1 };
      renderBooks();
    }
    else if (page === "categories") renderCategories();
    else if (page === "authors") renderAuthors();
    else if (page === "about") renderAbout();
    else if (page === "privacy") renderPrivacy();
    else if (page === "terms") renderTerms();
    else if (page === "copyright") renderCopyright();
    else if (page === "contact") renderContact();
    else if (page === "request") renderRequest();
    else renderHome();
    var nav = document.getElementById("topnav");
    if (nav) nav.classList.remove("open");
  }

  /* ---------- global clicks (delegation) ---------- */
  document.addEventListener("click", function (e) {
    var rt = e.target.closest("[data-retry]");
    if (rt) {
    view.innerHTML = '<p class="empty">' + t("app.loading") + '</p>';
      loadBooks();
      return;
    }
    var cp = e.target.closest("[data-copy]");
    if (cp) {
      var url = cp.getAttribute("data-copy");
      var done = function () {
    cp.textContent = t("app.copyDone");
    setTimeout(function () { cp.textContent = t("app.copyLink"); }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else {
        var ta = document.createElement("textarea");
        ta.value = url; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        document.body.removeChild(ta); done();
      }
      return;
    }
    var fv = e.target.closest("[data-fav]");
    if (fv) {
      var added = toggleFav(fv.getAttribute("data-fav"));
      if (fv.id === "favBtn") fv.textContent = added ? t("app.favOn") : t("app.favOff");
      else { fv.textContent = added ? "★" : "☆"; fv.classList.toggle("on", added); }
      return;
    }
    var cv = e.target.closest("[data-cover-view]");
    if (cv) { openCover(cv.getAttribute("data-cover-view"), cv.getAttribute("data-cover-title")); return; }
    var card = e.target.closest("[data-book]");
    if (card) { location.hash = "#/book/" + encodeURIComponent(card.getAttribute("data-book")); return; }
    var cat = e.target.closest("[data-cat]");
    if (cat) { location.hash = "#/category/" + encodeURIComponent(cat.getAttribute("data-cat")); return; }
    var au = e.target.closest("[data-author]");
    if (au) { location.hash = "#/author/" + encodeURIComponent(au.getAttribute("data-author")); return; }
    var lg = e.target.closest("[data-lang]");
    if (lg) {
      state = { q: "", title: "", author: "", category: "", language: lg.getAttribute("data-lang"), year: "", sort: "az", page: 1 };
      location.hash = "#/books";
      return;
    }
    var sr = e.target.closest("[data-series]");
    if (sr) { location.hash = "#/series/" + encodeURIComponent(sr.getAttribute("data-series")); return; }
    var st = e.target.closest("[data-star]");
    if (st) {
      reviewState.rating = parseInt(st.getAttribute("data-star"), 10) || 5;
      renderReviewForm();
      return;
    }
    var lk = e.target.closest("[data-like]");
    if (lk) {
      if (!currentUser) { alert(t("rev.likeLogin")); return; }
      var db = fsdb();
      if (!db) return;
      var rid = lk.getAttribute("data-like");
      var ref = db.collection("reviews").doc(rid);
      ref.get().then(function (d) {
        if (!d.exists) return;
        var likes = d.data().likes || [];
        var has = likes.indexOf(currentUser.uid) !== -1;
        var op = has
          ? firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
          : firebase.firestore.FieldValue.arrayUnion(currentUser.uid);
        return ref.update({ likes: op });
      }).then(function () { loadReviews(reviewState.bookId); })
      .catch(function () {});
      return;
    }
    var rp = e.target.closest("[data-reply]");
    if (rp) {
      if (!currentUser) { alert(t("rev.replyLogin")); return; }
      reviewState.replyTo = rp.getAttribute("data-reply");
      renderReviews();
      var rt = document.getElementById("replyText");
      if (rt) rt.focus();
      return;
    }
    var dl = e.target.closest("[data-del-review]");
    if (dl) {
      var db2 = fsdb();
      if (!db2 || !currentUser) return;
      if (!confirm(t("rev.delConfirm"))) return;
      db2.collection("reviews").doc(dl.getAttribute("data-del-review")).delete()
        .then(function () { loadReviews(reviewState.bookId); })
        .catch(function () {});
      return;
    }
  });
  window.addEventListener("hashchange", route);

  loadBooks();
  initSiteStats();
  applyStaticI18n();
})();
