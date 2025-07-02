// NASM Course Content Scraper
// 
// Usage:
//   node nasm-scraper.js                 # Start from section 1 (full scrape)
//   node nasm-scraper.js 3               # Start from section 3
//   node nasm-scraper.js --start-section=4  # Start from section 4
//   node nasm-scraper.js 3 5             # Start from section 3, chapter 5
//   node nasm-scraper.js --start-section=3 --start-chapter=5  # Start from section 3, chapter 5
//   node nasm-scraper.js 3 5 2           # Start from section 3, chapter 5, lesson 2
//   node nasm-scraper.js --start-section=3 --start-chapter=5 --start-lesson=2  # Start from section 3, chapter 5, lesson 2
//
// NASM Navigation Hierarchy:
// Section (li.nav-item#section-X)
// ├── Section Objectives (button[data-target="#section-X-objectives"])
// └── Chapters (button[data-target*="section-X-objective"][data-target$="-assets"])
//     └── Lessons (button.nav-link within expanded chapter containers)
//
// Cursor Rules Applied:
// 1. Content Extraction Zero-Length Debug Rule: Always inspect DOM structure first before building complex detection logic
// 2. Document Heading Hierarchy Context Rule: Analyze document heading structure before assigning heading levels to maintain semantic hierarchy
// 3. NASM Page Architecture Pattern - UPDATED WITH CRITICAL ACCORDION ASSUMPTIONS:
//    - Main content in .col.content.main, key terms in .col-md-4.content.side.right .content-accordion.keyterm
//    - CRITICAL: Navigation uses accordion behavior - expanding one chapter collapses others
//    - CRITICAL: Must process chapter-by-chapter, re-expanding before clicking each lesson
//    - CRITICAL: Lesson buttons exist in collapsed chapters but become inaccessible
//    - CRITICAL: isVisible() checks fail for accordion content - use non-hidden selector instead
//    - CRITICAL: Clicking lessons closes sidebar automatically (predictable behavior)
//
// Key Detection Patterns:
// - Video content: className.includes('content-video') (simple > complex)
// - Callouts: className.includes('content-callout') with intelligent heading hierarchy
// - Key terms: Extracted separately from sidebar to avoid duplication
// - Sidebar: Closes when lesson or outer content is clicked
//
// Navigation Structure Context:
// - Sections: <li class="nav-item" id="section-X"> with <button class="nav-link"> to expand
// - Chapters: <button class="nav-link" data-target="#section-X-objective-Y-assets"> within sections
// - Lessons: <button class="nav-link"> within expanded chapter containers
// - Expansion state: aria-expanded="true/false" indicates if section/chapter is expanded
// - Hidden lessons: Use :not([hidden]) selector to find visible lesson buttons




const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const delay = ms => new Promise(res => setTimeout(res, ms));
const email = process.env.NASM_EMAIL;
const password = process.env.NASM_PASSWORD;

if (!email || !password) {
  console.error("❌ NASM_EMAIL and NASM_PASSWORD must be set in .env");
  process.exit(1);
}

const sectionMeta = {
  1: { chapters: [1, 2], weight: 10 },
  2: { chapters: [3, 4], weight: 15 },
  3: { chapters: [5, 6, 7, 8, 9, 10], weight: 15 },
  4: { chapters: [11, 12], weight: 16 },
  5: { chapters: [13, 14, 15, 16, 17, 18, 19, 20], weight: 24 },
  6: { chapters: [21, 22, 23], weight: 20 },
};

const sectionObjectives = {
  1: ["Adhering to professional standards and business development practices."],
  2: ["Applying exercise psychology and behavioral coaching."],
  3: ["Understanding anatomy, physiology, movement science, metabolism, nutrition, and supplementation."],
  4: ["Performing and interpreting client fitness assessments."],
  5: ["Instructing and demonstrating proper exercise techniques."],
  6: ["Designing exercise programs based on assessments and client needs."],
};

// Parse command-line arguments for starting section
const args = process.argv.slice(2);
let startSection = 1;
let startChapter = null;
let startLesson = null;

const startSectionArg = args.find(arg => arg.startsWith('--start-section='));
const startChapterArg = args.find(arg => arg.startsWith('--start-chapter='));
const startLessonArg = args.find(arg => arg.startsWith('--start-lesson='));

if (startSectionArg) {
  startSection = parseInt(startSectionArg.split('=')[1]);
}
if (startChapterArg) {
  startChapter = parseInt(startChapterArg.split('=')[1]);
}
if (startLessonArg) {
  startLesson = parseInt(startLessonArg.split('=')[1]);
}

// Handle positional arguments: node nasm-scraper.js 3 5 2 (section 3, chapter 5, lesson 2)
if (args.length > 0 && !args[0].startsWith('--') && !isNaN(parseInt(args[0]))) {
  startSection = parseInt(args[0]);
  if (args.length > 1 && !args[1].startsWith('--') && !isNaN(parseInt(args[1]))) {
    startChapter = parseInt(args[1]);
    if (args.length > 2 && !args[2].startsWith('--') && !isNaN(parseInt(args[2]))) {
      startLesson = parseInt(args[2]);
    }
  }
}

// Validate start section
if (startSection < 1 || startSection > 6) {
  console.error("❌ Start section must be between 1 and 6");
  console.log("Usage: node nasm-scraper.js [section] [chapter] [lesson]");
  console.log("   or: node nasm-scraper.js --start-section=3 --start-chapter=5 --start-lesson=2");
  console.log("Examples:");
  console.log("  node nasm-scraper.js 3        # Start from section 3");
  console.log("  node nasm-scraper.js 3 5      # Start from section 3, chapter 5");
  console.log("  node nasm-scraper.js 3 5 2    # Start from section 3, chapter 5, lesson 2");
  process.exit(1);
}

// Validate start chapter if provided
if (startChapter !== null) {
  const allChapters = Object.values(sectionMeta).flatMap(meta => meta.chapters);
  const minChapter = Math.min(...allChapters);
  const maxChapter = Math.max(...allChapters);
  
  if (startChapter < minChapter || startChapter > maxChapter) {
    console.error(`❌ Start chapter must be between ${minChapter} and ${maxChapter}`);
    process.exit(1);
  }
  
  // Validate that the chapter exists in the specified section
  const sectionChapters = sectionMeta[startSection]?.chapters || [];
  if (!sectionChapters.includes(startChapter)) {
    console.error(`❌ Chapter ${startChapter} does not exist in Section ${startSection}`);
    console.log(`Section ${startSection} contains chapters: ${sectionChapters.join(', ')}`);
    process.exit(1);
  }
}

// Validate start lesson if provided
if (startLesson !== null) {
  if (startChapter === null) {
    console.error("❌ You must specify a chapter when specifying a lesson");
    process.exit(1);
  }
  if (startLesson < 1) {
    console.error("❌ Start lesson must be 1 or greater");
    process.exit(1);
  }
}

if (startLesson !== null) {
  console.log(`🎯 Starting from Section ${startSection}, Chapter ${startChapter}, Lesson ${startLesson}`);
} else if (startChapter !== null) {
  console.log(`🎯 Starting from Section ${startSection}, Chapter ${startChapter}`);
} else if (startSection > 1) {
  console.log(`🎯 Starting from Section ${startSection} (skipping sections 1-${startSection - 1})`);
} else {
  console.log("🎯 Starting from Section 1 (full scrape)");
}

function cleanTextContent(text) {
    // Remove video artifacts that may have slipped through
    text = text.replace(/On screen video\./gi, '');
    text = text.replace(/\b\d{2}:\d{2}\b/g, ''); // Remove timestamps
    text = text.replace(/GO LIVE/gi, '');
    text = text.replace(/FacebookTwitter\/XEmailEmbedSpeedNormalAutoplay/gi, '');
    text = text.replace(/undefined#video_[a-f0-9-]+/gi, '');
    
    // Remove CSS and styling artifacts
    text = text.replace(/#video_[a-f0-9-]+[^}]+}/g, '');
    text = text.replace(/\.amp-[^}]+}/g, '');
    text = text.replace(/video::cue[^}]+}/g, '');
    text = text.replace(/rgba\([^)]+\)/g, '');
    text = text.replace(/font-[^;]+;/g, '');
    text = text.replace(/color:[^;]+;/g, '');
    text = text.replace(/(text-shadow|background-color):[^;]+;/g, '');
    
    // Remove poster URLs and lecture references
    text = text.replace(/Poster:\s*https?:\/\/[^\s\n]+/gi, '');
    text = text.replace(/nasm_cpt\d+_lecture_[^\s\n]+/gi, '');
    
    // Remove standalone figure references (handled in images section)
    text = text.replace(/^(FIGURE|TABLE)\s+[\d\w.-]+[^\n]*$/gmi, '');
    
    // Remove any remaining CSS-like patterns
    text = text.replace(/[.#][a-zA-Z0-9_-]+\s*\{[^}]*\}/g, '');
    
    // Clean up whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.replace(/^\s*$/gm, '');
    
    return text.trim();
  }
  
  async function isButtonExpanded(button) {
    if (!button) return false;
    
    const ariaExpanded = await button.getAttribute('aria-expanded');
    
    // Button is expanded if aria-expanded is trues
    return ariaExpanded === 'true';
  }

  
  
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🔐 Logging in...");
  await page.goto('https://nasmu.nasm.org/course/view.php?idnumber=10600');
  await page.getByPlaceholder('Username/Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[type="submit"]'),
  ]);
  console.log("✅ Logged in.");

  await page.waitForSelector('a.btn.btn-block.btn-lg.btn-primary');
  const [coursePage] = await Promise.all([
    context.waitForEvent('page'),
    page.click('a.btn.btn-block.btn-lg.btn-primary'),
  ]);

  await coursePage.waitForURL(/https:\/\/pages-delivery\.nasm\.org\//);
  await coursePage.waitForLoadState('networkidle');
  console.log("🎯 Course launched.");

  const expectedStartUrl = 'https://pages-delivery.nasm.org/s/1/o/0/a/1/p/1';
  console.log(`🔍 Current URL after launch: ${coursePage.url()}`);
  
  if (!coursePage.url().startsWith(expectedStartUrl)) {
    console.warn("⚠️ Not on first lesson, navigating manually...");
    await coursePage.goto(expectedStartUrl);
    await delay(1000);
    console.log(`🔍 URL after manual navigation: ${coursePage.url()}`);
  }

  // Open sidebar to access navigation structure
  await ensureSidebarOpen(coursePage);

  const sectionEls = (await coursePage.$$('li.nav-item[id^="section-"]')).slice(1, -1);
  console.log(`📋 Found ${sectionEls.length} sections to process`);

  for (let s = 0; s < sectionEls.length; s++) {
    const sectionId = s + 1;
    const meta = sectionMeta[sectionId];
    const objectives = sectionObjectives[sectionId];
    if (!meta) {
      console.log(`⚠️  No metadata found for section ${sectionId}, skipping...`);
      continue;
    }

    // Skip sections before the specified start section
    if (sectionId < startSection) {
      console.log(`⏭️  Skipping Section ${sectionId} (starting from Section ${startSection})`);
      continue;
    }

    // Ensure sidebar is open for section navigation
    await ensureSidebarOpen(coursePage);

    // Debug: Check if section element is still valid
    const sectionEl = sectionEls[s];
    const isAttached = await sectionEl.evaluate(el => el.isConnected);
    const isVisible = await sectionEl.isVisible();
    console.log(`🔍 Section ${sectionId} element - attached: ${isAttached}, visible: ${isVisible}`);
    
    if (!isAttached) {
      console.log(`❌ Section ${sectionId} element is stale, refetching...`);
      const freshSectionEl = await coursePage.$(`li.nav-item#section-${sectionId}`);
      if (!freshSectionEl) {
        console.log(`❌ Could not find section ${sectionId}, skipping...`);
        continue;
      }
      sectionEls[s] = freshSectionEl; // Update with fresh element
    }

    // Extract section title from the navigation element
    const sectionTitle = await sectionEls[s].$eval('.nav-link-title.small', el => el.textContent.trim()).catch(() => 'Unknown Section');
    
    console.log(`\n🎯 Processing Section ${sectionId}: ${sectionTitle} (Weight: ${meta.weight}%, Chapters: ${meta.chapters.join(', ')})`);
    
    // Check if section is already expanded
    const sectionButton = await sectionEls[s].$('button.nav-link');
    const sectionIsExpanded = await isButtonExpanded(sectionButton);
    
    if (!sectionIsExpanded) {
      console.log(`🖱️  Clicking to expand section ${sectionId}...`);
      await sectionEls[s].click();
      await delay(800);
      console.log(`✅ Expanded section ${sectionId}`);
    } else {
      console.log(`ℹ️  Section ${sectionId} already expanded`);
    }

    const toggle = await coursePage.$(`button[data-target="#section-${sectionId}-objectives"]`);
    if (toggle) {
      // Check if objectives are already expanded
      const objectivesIsExpanded = await isButtonExpanded(toggle);
      
      if (!objectivesIsExpanded) {
        await toggle.click();
        await delay(800);
        console.log(`✅ Expanded section ${sectionId} objectives`);
      } else {
        console.log(`ℹ️  Section ${sectionId} objectives already expanded`);
      }
    } else {
      console.log(`⚠️  No toggle button found for section ${sectionId}`);
    }

    const lessonButtons = await getVisibleLessonButtons(coursePage, sectionId);
    console.log(`📚 Processing ${lessonButtons.length} lessons in section ${sectionId}`);
    
    let currentChapter = null;
    let lessonIndexInChapter = 0;
    
    for (let i = 0; i < lessonButtons.length; i++) {
      const lessonObj = lessonButtons[i];
      
      // Ensure we're back on the navigation page with sidebar open
      await ensureSidebarOpen(coursePage);
      
      // Re-find the chapter button (elements may be stale after navigation)
      const chapterButton = await coursePage.$(`button[data-target="${lessonObj.chapterTarget}"]`);
      if (!chapterButton) {
        console.log(`❌ Could not find chapter button for ${lessonObj.chapterTitle}, skipping lesson`);
        continue;
      }
      
      // Re-expand the chapter for this lesson (accordion behavior)
      const chapterIsExpanded = await isButtonExpanded(chapterButton);
      if (!chapterIsExpanded) {
        console.log(`📖 Re-expanding chapter: ${lessonObj.chapterTitle}`);
        await chapterButton.click();
        await delay(600);
      }
      
      // Re-find the specific lesson button by ID
      const btn = await coursePage.$(`button#${lessonObj.lessonId}`);
      if (!btn) {
        console.log(`❌ Could not find lesson button with ID ${lessonObj.lessonId}, skipping`);
        continue;
      }
      
      // Extract lesson metadata from the re-found button
      const lessonMain = await btn.$eval('.nav-link-title.main', el => el.textContent.trim()).catch(() => lessonObj.lessonText);
      
      const lessonNumberMatch = lessonMain.match(/(?:Lesson|Chapter)\s+(\d+)/i);
      const lessonNumber = lessonNumberMatch ? parseInt(lessonNumberMatch[1]) : i + 1; // Fallback to sequential
      
      const lessonTitle = await btn.$eval('.nav-link-title.small', el => el.textContent.trim()).catch(() => 'Unknown Lesson');
      
      console.log(`\n📖 Checking lesson ${i + 1}: "${lessonMain}" - "${lessonTitle}"`);
        
      // Only skip actual quizzes, tests, and reviews - not content lessons
      if (/quiz|test|review|practice|knowledge check/i.test(lessonMain)) {
        console.log(`⏭️  Skipping "${lessonMain}" (quiz/test/review/practice)`);
        continue;
      }

      const chapterNum = meta.chapters[lessonObj.chapterIndex] ?? (meta.chapters[0] + lessonObj.chapterIndex);
      
      // Track lesson index within current chapter
      if (currentChapter !== chapterNum) {
        currentChapter = chapterNum;
        lessonIndexInChapter = 1;
      } else {
        lessonIndexInChapter++;
      }
      
      console.log(`📘 Processing Section ${sectionId} Chapter ${chapterNum} Lesson ${lessonNumber}: ${lessonTitle} (Chapter Lesson ${lessonIndexInChapter})`);
    
      // Skip chapters before the specified start chapter
      if (startChapter !== null && chapterNum < startChapter) {
        console.log(`⏭️  Skipping Chapter ${chapterNum} (starting from Chapter ${startChapter})`);
        continue;
      }
      
      // Skip lessons before the specified start lesson within the target chapter
      if (startLesson !== null && chapterNum === startChapter && lessonIndexInChapter < startLesson) {
        console.log(`⏭️  Skipping Chapter ${chapterNum} Lesson ${lessonIndexInChapter} (starting from Lesson ${startLesson})`);
        continue;
      }
      
      // If we've specified a start chapter, only process lessons in that chapter and beyond
      if (startLesson !== null && chapterNum < startChapter) {
        console.log(`⏭️  Skipping Chapter ${chapterNum} (before target Chapter ${startChapter})`);
        continue;
      }
      
      await btn.click(); // This automatically closes sidebar
      await delay(1200);
      console.log(`✅ Clicked on lesson: ${lessonMain}`);

      // Wait for the lesson page to fully load
      await coursePage.waitForLoadState('networkidle');
      await delay(3000); // Longer delay to ensure page navigation is ready
      
      // Verify we're actually on the correct lesson by checking page content
      const currentUrl = coursePage.url();
      console.log(`🔍 Current URL after lesson click: ${currentUrl}`);
      
      // Try to get lesson title from the page content to verify we're on correct lesson
      try {
        await coursePage.waitForSelector('h1, h2, .lesson-title, .page-title', { timeout: 5000 });
        const pageTitle = await coursePage.$eval('h1, h2, .lesson-title, .page-title', el => el.textContent.trim()).catch(() => 'No title found');
        console.log(`📖 Page title: "${pageTitle}"`);
        
        // Check if the page title matches our expected lesson
        if (!pageTitle.toLowerCase().includes(lessonTitle.toLowerCase().split(' ')[0])) {
          console.log(`⚠️  WARNING: Page title "${pageTitle}" doesn't match expected lesson "${lessonTitle}"`);
          console.log(`🔄 Attempting to reload the correct lesson...`);
          
          // Try clicking the lesson button again
          await ensureSidebarOpen(coursePage);
          const chapterButton2 = await coursePage.$(`button[data-target="${lessonObj.chapterTarget}"]`);
          if (chapterButton2) {
            const chapterIsExpanded2 = await isButtonExpanded(chapterButton2);
            if (!chapterIsExpanded2) {
              await chapterButton2.click();
              await delay(600);
            }
            const btn2 = await coursePage.$(`button#${lessonObj.lessonId}`);
            if (btn2) {
              await btn2.click();
              await delay(2000);
              console.log(`🔄 Re-clicked lesson button`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Could not verify lesson title: ${error.message}`);
      }

      // Ensure we start from page 1 (lesson may default to last accessed page)
      console.log(`🔄 Checking for page navigation...`);
      try {
        // Wait a bit more for page buttons to appear
        await coursePage.waitForSelector('button.page-link[title^="Page"]', { timeout: 5000 }).catch(() => {
          console.log(`ℹ️  No page navigation found (single page lesson)`);
        });
        
        const page1Btn = await coursePage.$('button.page-link[title="Page 1"]');
        if (page1Btn && await page1Btn.isVisible()) {
          console.log(`🔄 Navigating to page 1 to start from beginning...`);
          await page1Btn.click({ timeout: 5000 }); // Shorter timeout for page nav
          await delay(1000);
          console.log(`✅ Navigated to page 1`);
        } else {
          console.log(`ℹ️  No page 1 button found or not visible (likely single page lesson)`);
        }
      } catch (error) {
        console.log(`⚠️  Could not navigate to page 1: ${error.message} (continuing anyway)`);
      }

      const outputDir = path.join('staging-outputs', 'nasm-dump', `section-${sectionId}`, `chapter-${chapterNum}`, `lesson-${lessonNumber}`);
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created directory: ${outputDir}`);

      const maxPage = await getMaxPage(coursePage);
      console.log(`📄 Found ${maxPage} pages to scrape`);
      
      if (maxPage === 0) {
        console.log(`⚠️  No pages found for this lesson, skipping...`);
        continue;
      }
      
      for (let p = 1; p <= maxPage; p++) {
        console.log(`\n🔄 Scraping page ${p} of ${maxPage}...`);
        const content = await navigateAndScrapePage(coursePage, p);
        if (!content) {
          console.log(`❌ No content found on page ${p}`);
          continue;
        }
        
        const { text, html, images, keyTerms } = content;
        
        // Validate content before saving
        if (!text || text.trim().length === 0) {
          console.log(`⚠️  Page ${p} has no text content (HTML: ${html.length} chars)`);
          if (html.length > 0) {
            console.log(`🔍 HTML preview: ${html.substring(0, 200)}...`);
          }
          // Still save the page even if text is empty, but log it
        }
        
        console.log(`📊 Page ${p} content: ${text.length} chars text, ${html.length} chars HTML, ${images.length} images, ${keyTerms.length} key terms`);

        // Build sections
        const keyTermsSection = keyTerms.length > 0 
          ? `\n\n## Key Terms\n\n${keyTerms.map(term => `**${term.title}**\n${term.definition}`).join('\n\n')}`
          : '';

        const imagesSection = images.length > 0 
          ? `\n\n## Images\n\n${images.map(img => {
              const caption = img.caption && img.caption !== img.alt ? img.caption : '';
              const altText = img.alt ? `Alt: ${img.alt}` : 'No alt text';
              return caption 
                ? `**${caption}**\n${altText}\nURL: ${img.src}`
                : `${altText}\nURL: ${img.src}`;
            }).join('\n\n')}`
          : '';

        const md = `---
section_number: ${sectionId}
section_title: ${sectionTitle}
chapter: ${chapterNum}
chapter_title: ${lessonObj.chapterTitle}
lesson_number: ${lessonNumber}
lesson_title: ${lessonTitle}
weight: ${meta.weight}%
objectives:
${objectives.map(o => `  - ${o}`).join('\n')}
---

## Content
${text}${keyTermsSection}${imagesSection}`;

        fs.writeFileSync(path.join(outputDir, `page-${p}.md`), md);
        fs.writeFileSync(path.join(outputDir, `page-${p}.html`), html);
        console.log(`💾 Saved Section ${sectionId} Chapter ${chapterNum} Lesson ${lessonNumber} Page ${p}`);
      }
      
      console.log(`✅ Completed lesson ${lessonNumber} (${maxPage} pages)`);
    }
    
    console.log(`✅ Completed section ${sectionId}`);
  }

  console.log("\n🎉 All sections scraped successfully!");
  
  const sectionsProcessed = sectionEls.length - (startSection - 1);
  if (startLesson !== null) {
    console.log(`📊 Summary: Processed from Section ${startSection}, Chapter ${startChapter}, Lesson ${startLesson} onwards`);
  } else if (startChapter !== null) {
    console.log(`📊 Summary: Processed from Section ${startSection}, Chapter ${startChapter} onwards`);
  } else if (startSection > 1) {
    console.log(`📊 Summary: Processed sections ${startSection}-${sectionEls.length} (${sectionsProcessed} sections)`);
  } else {
    console.log(`📊 Summary: Processed all sections 1-${sectionEls.length} (${sectionsProcessed} sections)`);
  }
  
  await browser.close();
})();


async function ensureSidebarOpen(page) {
  // Debug: Check what page we're actually on
  const currentUrl = page.url();
  const pageTitle = await page.title().catch(() => 'No title');
  console.log(`🔍 Current page: ${currentUrl}`);
  console.log(`🔍 Page title: ${pageTitle}`);
  
  // Check if sidebar content is already visible
  const sidebarContent = await page.$('li.nav-item[id^="section-"]');
  if (sidebarContent && await sidebarContent.isVisible()) {
    console.log("📂 Sidebar already open");
    return;
  }
  
  // Sidebar is closed, look for burger menu to open it
  const burger = await page.$('button[aria-label="Content Menu"]');
  if (burger && await burger.isVisible()) {
    await burger.click();
    await page.waitForSelector('li.nav-item[id^="section-"]', { timeout: 5000 });
    console.log("📂 Opened sidebar");
  } else {
    // Debug: What buttons/navigation do we have?
    const allButtons = await page.$$eval('button', buttons => 
      buttons.slice(0, 10).map(btn => ({
        text: btn.textContent.trim().substring(0, 30),
        ariaLabel: btn.getAttribute('aria-label'),
        className: btn.className.substring(0, 50)
      }))
    );
    console.log("🔍 Available buttons:", allButtons);
    
    console.log("⚠️ Burger menu not found - sidebar state unclear");
  }
}

async function closeSidebarIfOpen(page) {
  const closeBtn = await page.$('button[aria-label="Close menu"]');
  if (closeBtn) await closeBtn.click();
}

async function getVisibleLessonButtons(page, sectionId) {
  // Find all chapter buttons for this section
  const chapterButtons = await page.$$(`button[data-target*="section-${sectionId}-objective"][data-target$="-assets"]`);
  console.log(`🔍 Found ${chapterButtons.length} chapter buttons in section ${sectionId}`);
  
  let allLessons = [];
  
  // Process each chapter individually to avoid accordion collapse issues
  for (let chapterIndex = 0; chapterIndex < chapterButtons.length; chapterIndex++) {
    const chapterBtn = chapterButtons[chapterIndex];
    
    // Get chapter info
    const chapterTitle = await chapterBtn.$eval('.nav-link-title.small', el => el.textContent.trim()).catch(() => 'Unknown Chapter');
    const chapterTarget = await chapterBtn.getAttribute('data-target');
    
    if (!chapterTarget) continue;
    
    // Expand this specific chapter
    const isExpanded = await isButtonExpanded(chapterBtn);
    if (!isExpanded) {
      console.log(`📖 Expanding chapter: ${chapterTitle}`);
      await chapterBtn.click();
      await delay(600);
    }
    
    // Find lessons in this chapter's container
    const containerId = chapterTarget.substring(1); // Remove the #
    const container = await page.$(`ul#${containerId}`);
    
    if (container) {
      const buttons = await container.$$(`button.nav-link:not([hidden])`);
      console.log(`📚 Found ${buttons.length} lessons in chapter: ${chapterTitle}`);
      
      // Add chapter info to each lesson button for later processing
      for (const btn of buttons) {
        const text = await btn.$eval('.nav-link-title.main', el => el.textContent.trim()).catch(() => 'No title');
        const lessonId = await btn.getAttribute('id');
        console.log(`✅ Added lesson "${text}" from chapter ${chapterIndex + 1}`);
        
        // Store lesson metadata instead of DOM elements to avoid stale references
        allLessons.push({
          lessonId: lessonId,
          lessonText: text,
          chapterIndex: chapterIndex,
          chapterTitle: chapterTitle,
          chapterTarget: chapterTarget
        });
      }
    }
  }
  
  console.log(`✅ Total lessons found across all chapters: ${allLessons.length}`);
  return allLessons;
}

async function getMaxPage(page) {
  try {
    const buttons = await page.$$('button.page-link[title^="Page"]');
    console.log(`🔍 Found ${buttons.length} page buttons`);
    
    if (buttons.length === 0) {
      // Check if this is a single page lesson
      const contentExists = await page.$('.col.content.main, div.row[id^="m_"]');
      return contentExists ? 1 : 0;
    }
    
    const numbers = await Promise.all(buttons.map(async (b) => {
      try {
        const text = await b.innerText();
        const num = parseInt(text);
        console.log(`📄 Page button text: "${text}" -> ${num}`);
        return isNaN(num) ? 0 : num;
      } catch (err) {
        console.log(`⚠️  Error reading page button: ${err.message}`);
        return 0;
      }
    }));
    
    const maxPage = Math.max(...numbers.filter(n => n > 0));
    console.log(`📊 Page numbers found: [${numbers.join(', ')}], max: ${maxPage}`);
    
    return isNaN(maxPage) || maxPage <= 0 ? 1 : maxPage;
  } catch (error) {
    console.log(`❌ Error in getMaxPage: ${error.message}`);
    return 1; // Default to 1 page
  }
}

async function navigateAndScrapePage(page, p) {
  console.log(`🔍 Looking for page ${p} button...`);
  
  // Add retry logic for page button availability
  let pageBtn = null;
  let retries = 3;
  
  while (retries > 0 && !pageBtn) {
    pageBtn = await page.$(`button.page-link[title="Page ${p}"]`);
    if (!pageBtn) {
      console.log(`⏳ Page ${p} button not found, waiting... (${retries} retries left)`);
      await delay(1000);
      retries--;
    }
  }
  
  if (!pageBtn) {
    console.log(`❌ Could not find page ${p} button after retries`);
    
    // Debug: Show what page buttons are available
    const allPageButtons = await page.$$eval('button.page-link[title^="Page"]', buttons => 
      buttons.map(btn => btn.title || btn.textContent.trim())
    ).catch(() => []);
    console.log(`🔍 Available page buttons: [${allPageButtons.join(', ')}]`);
    return null;
  }
  
  console.log(`🖱️  Clicking page ${p} button...`);
  try {
    await pageBtn.click({ timeout: 5000 }); // Shorter timeout for page navigation
    await delay(1000);
    console.log(`✅ Navigated to page ${p}`);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    await delay(500); // Small delay to ensure content is ready
    
    // Verify we're on the correct page by checking the URL (only page number is reliable)
    const currentUrl = page.url();
    if (currentUrl.includes(`/p/${p}`)) {
      console.log(`✅ Confirmed on page ${p}`);
    } else {
      console.log(`⚠️  URL doesn't confirm page ${p}: ${currentUrl}`);
    }
  } catch (error) {
    console.log(`❌ Failed to click page ${p} button: ${error.message}`);
    return null;
  }

  // Detect page structure and get appropriate content container
  let contentContainer;
  const fullPageMain = await page.$('.col.content.main');
  
  if (fullPageMain) {
    console.log(`🔍 Found full page structure (.col.content.main)`);
    // Full page structure - look for nested content row
    const nestedContent = await fullPageMain.$('div.row[id^="m_"]');
    if (nestedContent) {
      console.log(`🔍 Found nested content row inside main column`);
      contentContainer = nestedContent;
    } else {
      console.log(`🔍 Using main column directly (no nested row found)`);
      contentContainer = fullPageMain;
    }
  } else {
    console.log(`🔍 No full page main found, looking for content row directly`);
    // Inner content only - look for content row directly
    contentContainer = await page.$('div.row[id^="m_"]');
    if (contentContainer) {
      console.log(`🔍 Found direct content row`);
    }
  }
  
  if (!contentContainer) {
    console.log(`❌ Could not find content container on page ${p}`);
    
    // Debug: Show what content elements are available
    const availableContent = await page.$$eval('div', divs => {
      return divs.slice(0, 10).map(div => ({
        id: div.id,
        className: div.className.substring(0, 50),
        hasText: div.textContent.trim().length > 0
      }));
    });
    console.log(`🔍 Available content divs:`, availableContent);
    return null;
  }

  console.log(`📊 Content container found, analyzing structure...`);
  const containerInfo = await contentContainer.evaluate(el => ({
    tagName: el.tagName,
    id: el.id,
    className: el.className,
    childCount: el.children.length,
    textLength: el.textContent.trim().length
  }));
  console.log(`📊 Container info:`, containerInfo);

  // Convert content to markdown with error handling
  let text = '';
  try {
    text = await convertContentToMarkdown(contentContainer);
    console.log(`📝 Page ${p}: ${text.length} chars markdown`);
  } catch (error) {
    console.log(`❌ Error converting content to markdown: ${error.message}`);
    console.log(`📊 Stack trace:`, error.stack);
    text = ''; // Continue with empty text
  }
  
  // Extract HTML with error handling  
  let html = '';
  try {
    html = await contentContainer.innerHTML();
    console.log(`📄 Page ${p}: ${html.length} chars HTML extracted`);
  } catch (error) {
    console.log(`❌ Error extracting HTML: ${error.message}`);
    html = ''; // Continue with empty HTML
  }
  
  // Extract images with captions
  let images = [];
  try {
    images = await contentContainer.$$eval('img', (imgs) => {
      return imgs.map(img => {
        // Skip video poster images
        if (img.src && img.src.includes('/Videos/') && img.src.includes('_lecture_')) {
          return null;
        }
        
        let caption = img.alt || '';
        
        // Look for figure captions in parent elements
        let parent = img.parentElement;
        while (parent && parent !== document.body) {
          const textContent = parent.textContent || '';
          const figureMatch = textContent.match(/(FIGURE|TABLE)\s*(\d+(?:[-\.]\d+)*)\s*(.*?)(?:\n|$)/i);
          if (figureMatch) {
            const [, figureType, figureNumber, captionText] = figureMatch;
            caption = captionText.trim() 
              ? `${figureType} ${figureNumber}: ${captionText.trim()}`
              : `${figureType} ${figureNumber}`;
            break;
          }
          parent = parent.parentElement;
        }
        
        return { alt: img.alt || '', src: img.src, caption };
      }).filter(Boolean); // Remove null entries
    });
  } catch (error) {
    console.log(`❌ Error extracting images: ${error.message}`);
  }
  
  // Extract key terms from sidebar
  const sidebar = await page.$('.content.side.right');
  let keyTerms = [];
  
  if (sidebar) {
    try {
      keyTerms = await sidebar.$$eval('div.content-accordion.keyterm', divs => {
        const terms = [];
        const seen = new Set();
        
        divs.forEach(div => {
          const titleSpan = div.querySelector('button span');
          const title = titleSpan ? titleSpan.textContent.trim() : '';
          
          const definitionP = div.querySelector('.card-body p');
          const definition = definitionP ? definitionP.textContent.trim() : '';
          
          if (title && definition && !seen.has(title.toLowerCase())) {
            terms.push({ title, definition });
            seen.add(title.toLowerCase());
          }
        });
        
        return terms;
      });
    } catch (error) {
      console.log(`❌ Error extracting key terms: ${error.message}`);
      keyTerms = []; // Continue with empty key terms
    }
  } else {
    console.log(`ℹ️  No sidebar found on page ${p}`);
  }
  
  if (images.length > 0 || keyTerms.length > 0) {
    console.log(`📚 Found ${keyTerms.length} key terms, ${images.length} images on page ${p}`);
  }
  
  return { text, html, images, keyTerms };
}

async function convertContentToMarkdown(contentElement) {
  try {
    console.log(`🔄 Starting markdown conversion...`);
    
    // First, analyze the document's heading structure for context
    const headingAnalysis = await contentElement.evaluate(el => {
      const headings = Array.from(el.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const structure = headings.map(h => ({
        tag: h.tagName.toLowerCase(),
        level: parseInt(h.tagName[1]),
        text: h.textContent.trim().substring(0, 50),
        isMainContent: !h.closest('.content-callout, .content-accordion, .sidebar')
      }));
      
      const mainContentMaxLevel = Math.max(...structure
        .filter(h => h.isMainContent)
        .map(h => h.level), 0);
        
      return { structure, mainContentMaxLevel };
    });

    console.log(`📊 Document headings: ${headingAnalysis.structure.length} found, main content max: h${headingAnalysis.mainContentMaxLevel}`);

    console.log(`🔄 Processing DOM nodes...`);
    const result = await contentElement.evaluate((element, maxLevel) => {
      let nodeCount = 0;
      let skippedCount = 0;
      
      function nodeToMarkdown(node, depth = 0) {
        nodeCount++;
        
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent;
        }
        
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }
        
        const tagName = node.tagName.toLowerCase();
        const className = node.className || '';
        
        // Skip video content and keyterm accordions (handled separately)
        if (tagName === 'video' || 
            tagName === 'iframe' ||
            className.includes('content-video') ||
            className.includes('content-audio') ||
            className.includes('amp-caption') ||
            (className.includes('content-accordion') && className.includes('keyterm'))) {
          skippedCount++;
          return '';
        }
        
        // Skip podcast-related content (check if this specific element contains podcast text)
        // Only skip if this node's own text (excluding children) contains "podcast"
        const nodeOwnText = Array.from(node.childNodes)
          .filter(child => child.nodeType === Node.TEXT_NODE)
          .map(child => child.textContent)
          .join('');
          
        if (nodeOwnText.toLowerCase().includes('podcast')) {
          skippedCount++;
          return '';
        }
        
        // Also skip simple text containers (p, span, div with minimal children) that contain podcast
        const isSimpleContainer = ['p', 'span', 'div', 'a'].includes(tagName);
        const hasOnlyTextAndSimpleElements = Array.from(node.childNodes).every(child => 
          child.nodeType === Node.TEXT_NODE || 
          ['strong', 'em', 'b', 'i', 'a', 'span'].includes(child.tagName?.toLowerCase())
        );
        
        if (isSimpleContainer && hasOnlyTextAndSimpleElements && 
            node.textContent.toLowerCase().includes('podcast')) {
          skippedCount++;
          return '';
        }
        
        // Handle callouts with intelligent heading hierarchy
        if (className.includes('content-callout')) {
          const titleElement = node.querySelector('.card-header .title');
          const bodyElement = node.querySelector('.card-body');
          
          if (titleElement && bodyElement) {
            let calloutContent = '';
            
            // Process body content recursively
            for (const child of bodyElement.childNodes) {
              calloutContent += nodeToMarkdown(child, depth + 1);
            }
            
            const title = titleElement.textContent.trim();
            // Use appropriate heading level based on document context
            const calloutLevel = Math.min(maxLevel + 1, 6);
            const headingMarks = '#'.repeat(calloutLevel);
            
            return `\n\n${headingMarks} ${title}\n\n${calloutContent}\n\n`;
          }
        }
        
        // Handle NASM tables specially - convert to proper markdown tables
        if (tagName === 'app-table' || className.includes('content-table')) {
          const tableHeader = node.querySelector('.table-header');
          const table = node.querySelector('table');
          
          if (table) {
            let tableMarkdown = '';
            
            // Add table title if it exists
            if (tableHeader) {
              const title = tableHeader.textContent.trim();
              tableMarkdown += `\n\n**${title}**\n\n`;
            }
            
            // Convert table rows
            const rows = Array.from(table.querySelectorAll('tr'));
            let tableRows = [];
            
            rows.forEach((row, rowIndex) => {
              const cells = Array.from(row.querySelectorAll('th, td'));
              const cellContents = cells.map(cell => {
                // Extract text from nested app-katex-html or direct text
                const katexContent = cell.querySelector('app-katex-html span');
                return katexContent ? katexContent.textContent.trim() : cell.textContent.trim();
              });
              
              if (cellContents.length > 0) {
                tableRows.push('| ' + cellContents.join(' | ') + ' |');
                
                // Add separator after header row (first row)
                if (rowIndex === 0) {
                  const separator = '|' + cellContents.map(() => '---').join('|') + '|';
                  tableRows.push(separator);
                }
              }
            });
            
            tableMarkdown += tableRows.join('\n') + '\n\n';
            return tableMarkdown;
          }
        }
        
        let content = '';
        
        // Process child nodes
        for (const child of node.childNodes) {
          content += nodeToMarkdown(child, depth + 1);
        }
        
        // Convert HTML tags to markdown
        switch (tagName) {
          case 'strong':
          case 'b':
            return `**${content}**`;
          case 'em':
          case 'i':
            return `*${content}*`;
          case 'sup':
            return `^${content}^`;
          case 'sub':
            return `~${content}~`;
          case 'a':
            const href = node.getAttribute('href');
            // Only format external links, ignore internal/keyterm anchors
            if (href && href.startsWith('http')) {
              return `[${content}](${href})`;
            }
            return content;
          case 'h1':
            return `\n\n# ${content}\n\n`;
          case 'h2':
            return `\n\n## ${content}\n\n`;
          case 'h3':
            return `\n\n### ${content}\n\n`;
          case 'h4':
            return `\n\n#### ${content}\n\n`;
          case 'h5':
            return `\n\n##### ${content}\n\n`;
          case 'h6':
            return `\n\n###### ${content}\n\n`;
          case 'p':
            return `\n\n${content}\n\n`;
          case 'br':
            return '\n';
          case 'ul':
            return `\n${content}\n`;
          case 'ol':
            return `\n${content}\n`;
          case 'li':
            return `- ${content}\n`;
          case 'blockquote':
            return `\n> ${content.replace(/\n/g, '\n> ')}\n`;
          case 'code':
            return `\`${content}\``;
          case 'pre':
            return `\n\`\`\`\n${content}\n\`\`\`\n`;
          case 'hr':
            return '\n---\n';
          case 'table':
          case 'tr':
          case 'td':
          case 'th':
            // Skip standard table elements when inside app-table (handled above)
            // But process them normally if they appear outside app-table
            return content;
          default:
            return content;
        }
      }
      
      const markdown = nodeToMarkdown(element, 0);
      
      return {
        markdown: markdown,
        stats: { nodeCount, skippedCount, finalLength: markdown.length }
      };
    }, headingAnalysis.mainContentMaxLevel);
    
    console.log(`📝 Processed ${result.stats.nodeCount} nodes, skipped ${result.stats.skippedCount}, generated ${result.markdown.length} chars`);
    
    // Clean the markdown and fix figure references
    let cleanedMarkdown = cleanTextContent(result.markdown);
    
    // Fix inline figure references that are malformed (missing colon and spacing)
    cleanedMarkdown = cleanedMarkdown.replace(
      /\*\*(FIGURE|TABLE)\s*(\d+(?:[-\.]\d+)*)\s*([^*\n]+?)\*\*/gi,
      (match, figureType, figureNumber, captionText) => {
        // Clean up the caption text and add proper formatting
        const cleanCaption = captionText.trim();
        if (cleanCaption) {
          return `**${figureType} ${figureNumber}: ${cleanCaption}**`;
        } else {
          return `**${figureType} ${figureNumber}**`;
        }
      }
    );
    
    return cleanedMarkdown;
  } catch (error) {
    console.log(`❌ Error in convertContentToMarkdown: ${error.message}`);
    console.log(`📊 Stack trace:`, error.stack);
    return ''; // Continue with empty string
  }
}