// NASM Course Structure Checker
// Efficiently collects all sections, chapters, and lessons to verify completeness
// without actually scraping content

const { chromium } = require('playwright');
require('dotenv').config();

const delay = ms => new Promise(res => setTimeout(res, ms));
const email = process.env.NASM_EMAIL;
const password = process.env.NASM_PASSWORD;

if (!email || !password) {
  console.error("❌ NASM_EMAIL and NASM_PASSWORD must be set in .env");
  process.exit(1);
}

// Expected structure for comparison
const expectedStructure = {
  1: { chapters: [1, 2], weight: 10, title: "Professional Development and Responsibility" },
  2: { chapters: [3, 4], weight: 15, title: "Exercise Psychology and Coaching" },
  3: { chapters: [5, 6, 7, 8, 9, 10], weight: 15, title: "Basic and Applied Sciences and Nutritional Concepts" },
  4: { chapters: [11, 12], weight: 16, title: "Fitness Assessments" },
  5: { chapters: [13, 14, 15, 16, 17, 18, 19, 20], weight: 24, title: "Exercise Technique and Training Instruction" },
  6: { chapters: [21, 22, 23], weight: 20, title: "Program Design" },
};

async function isButtonExpanded(button) {
  if (!button) return false;
  const ariaExpanded = await button.getAttribute('aria-expanded');
  return ariaExpanded === 'true';
}

async function ensureSidebarOpen(page) {
  const sidebarContent = await page.$('li.nav-item[id^="section-"]');
  if (sidebarContent && await sidebarContent.isVisible()) {
    console.log("📂 Sidebar already open");
    return;
  }
  
  const burger = await page.$('button[aria-label="Content Menu"]');
  if (burger && await burger.isVisible()) {
    await burger.click();
    await page.waitForSelector('li.nav-item[id^="section-"]', { timeout: 5000 });
    console.log("📂 Opened sidebar");
  }
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

  await ensureSidebarOpen(coursePage);

  const discoveredStructure = {};
  let totalContentLessons = 0;
  let totalQuizzes = 0;
  let flatChapterNumber = 0; // Continuous chapter numbering across sections

  const sectionEls = (await coursePage.$$('li.nav-item[id^="section-"]')).slice(1, -1);
  console.log(`📋 Found ${sectionEls.length} sections to analyze\n`);

  for (let s = 0; s < sectionEls.length; s++) {
    const sectionId = s + 1;
    const sectionEl = sectionEls[s];
    
    // Get section title
    const sectionTitle = await sectionEl.$eval('.nav-link-title.small', el => el.textContent.trim()).catch(() => 'Unknown Section');
    
    // Expand section if needed
    const sectionButton = await sectionEl.$('button.nav-link');
    const sectionIsExpanded = await isButtonExpanded(sectionButton);
    
    if (!sectionIsExpanded) {
      await sectionEl.click();
      await delay(500);
    }

    // Expand objectives
    const toggle = await coursePage.$(`button[data-target="#section-${sectionId}-objectives"]`);
    if (toggle) {
      const objectivesIsExpanded = await isButtonExpanded(toggle);
      if (!objectivesIsExpanded) {
        await toggle.click();
        await delay(500);
      }
    }

    console.log(`📚 Section ${sectionId}: ${sectionTitle}`);
    
    discoveredStructure[sectionId] = {
      title: sectionTitle,
      chapters: []
    };

    // Find all chapter buttons for this section
    const chapterButtons = await coursePage.$$(`button[data-target*="section-${sectionId}-objective"][data-target$="-assets"]`);
    
    for (let chapterIndex = 0; chapterIndex < chapterButtons.length; chapterIndex++) {
      const chapterBtn = chapterButtons[chapterIndex];
      
      // Get chapter info
      const chapterTitle = await chapterBtn.$eval('.nav-link-title.small', el => el.textContent.trim()).catch(() => 'Unknown Chapter');
      const chapterTarget = await chapterBtn.getAttribute('data-target');
      
      if (!chapterTarget) continue;
      
      // Expand this specific chapter
      const isExpanded = await isButtonExpanded(chapterBtn);
      if (!isExpanded) {
        await chapterBtn.click();
        await delay(400);
      }
      
      // Find lessons in this chapter's container
      const containerId = chapterTarget.substring(1); // Remove the #
      const container = await coursePage.$(`ul#${containerId}`);
      
      const chapterData = {
        title: chapterTitle,
        lessons: [],
        contentLessons: []
      };
      
      if (container) {
        const buttons = await container.$$(`button.nav-link:not([hidden])`);
        
        for (const btn of buttons) {
          const lessonMain = await btn.$eval('.nav-link-title.main', el => el.textContent.trim()).catch(() => 'No title');
          const lessonTitle = await btn.$eval('.nav-link-title.small', el => el.textContent.trim()).catch(() => 'Unknown Lesson');
          
          const isQuiz = /quiz|test|review|practice|knowledge check/i.test(lessonMain);
          
          const lessonData = {
            main: lessonMain,
            title: lessonTitle,
            isQuiz: isQuiz
          };
          
          chapterData.lessons.push(lessonData);
          
          if (isQuiz) {
            totalQuizzes++;
          } else {
            totalContentLessons++;
            chapterData.contentLessons.push(lessonData);
          }
        }
      }
      
      // Only include chapters that have content lessons (skip review/practice test chapters)
      if (chapterData.contentLessons.length > 0) {
        // Increment flat chapter number only for content chapters
        flatChapterNumber++;
        chapterData.flatChapterNumber = flatChapterNumber;
        
        discoveredStructure[sectionId].chapters.push(chapterData);
        console.log(`  📖 Chapter ${flatChapterNumber}: ${chapterTitle} (${chapterData.contentLessons.length} content lessons, ${chapterData.lessons.length - chapterData.contentLessons.length} quizzes)`);
      } else {
        console.log(`  🚫 Skipping review/practice chapter: ${chapterTitle} (${chapterData.lessons.length} quizzes only)`);
      }
    }
    
    console.log();
  }

  // Generate comparison report
  console.log("=" .repeat(80));
  console.log("📊 STRUCTURE ANALYSIS REPORT");
  console.log("=" .repeat(80));
  
  console.log(`\n🔢 TOTALS:`);
  console.log(`- Content Lessons: ${totalContentLessons}`);
  console.log(`- Quizzes/Tests: ${totalQuizzes}`);
  console.log(`- Total Items: ${totalContentLessons + totalQuizzes}`);
  
  console.log(`\n📋 SECTION COMPARISON (with flat chapter numbering):`);
  let allMatches = true;
  
  for (let sectionId = 1; sectionId <= 6; sectionId++) {
    const discovered = discoveredStructure[sectionId];
    const expected = expectedStructure[sectionId];
    
    const discoveredChapterCount = discovered.chapters.length;
    const expectedChapterCount = expected.chapters.length;
    
    // Get the actual flat chapter numbers for this section
    const discoveredChapterNumbers = discovered.chapters.map(c => c.flatChapterNumber);
    
    const match = discoveredChapterCount === expectedChapterCount && 
                  discoveredChapterNumbers.every((num, i) => num === expected.chapters[i]);
    const icon = match ? "✅" : "❌";
    
    console.log(`${icon} Section ${sectionId}: Found chapters ${discoveredChapterNumbers.join(', ')}`);
    console.log(`   Expected: ${expected.chapters.join(', ')}`);
    console.log(`   Title: ${discovered.title}`);
    
    if (!match) {
      allMatches = false;
    }
  }
  
  console.log(`\n📄 DETAILED LESSON BREAKDOWN (content lessons only):`);
  for (let sectionId = 1; sectionId <= 6; sectionId++) {
    const discovered = discoveredStructure[sectionId];
    console.log(`\nSection ${sectionId}: ${discovered.title}`);
    
    discovered.chapters.forEach((chapter) => {
      const contentLessons = chapter.contentLessons;
      const quizzes = chapter.lessons.filter(l => l.isQuiz);
      
      console.log(`  Chapter ${chapter.flatChapterNumber}: ${chapter.title}`);
      console.log(`    📚 ${contentLessons.length} content lessons, 🧪 ${quizzes.length} quizzes`);
      
      contentLessons.forEach((lesson, lessonIndex) => {
        console.log(`      L${lessonIndex + 1}: ${lesson.main} - ${lesson.title}`);
      });
    });
  }
  
  console.log(`\n${allMatches ? "🎉 SUCCESS" : "⚠️  MISMATCH"}: Structure analysis complete`);
  
  if (allMatches) {
    console.log("✅ All sections and chapters match expected structure");
    console.log(`📁 Expected to scrape: ${totalContentLessons} content lessons`);
    console.log(`🚫 Expected to skip: ${totalQuizzes} quizzes/tests/reviews`);
  } else {
    console.log("❌ Structure mismatch found - check chapter numbering");
  }

  await browser.close();
})(); 