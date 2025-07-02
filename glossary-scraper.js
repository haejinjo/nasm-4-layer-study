// NASM Glossary Scraper
// Extracts all glossary terms with chapter/lesson/page references and exam weights

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

// Exam weight distribution by chapter
const examWeights = {
  1: 10, 2: 10,           // Section 1: 10%
  3: 15, 4: 15,           // Section 2: 15%
  5: 15, 6: 15, 7: 15, 8: 15, 9: 15, 10: 15,  // Section 3: 15%
  11: 16, 12: 16,         // Section 4: 16%
  13: 24, 14: 24, 15: 24, 16: 24, 17: 24, 18: 24, 19: 24, 20: 24, // Section 5: 24%
  21: 20, 22: 20, 23: 20  // Section 6: 20%
};

function calculateExamWeight(references) {
  if (!references || references.length === 0) return 0;
  
  // Sum weights from all chapter references
  const totalWeight = references.reduce((sum, ref) => {
    const chapterWeight = examWeights[ref.chapter] || 0;
    return sum + chapterWeight;
  }, 0);
  
  // Average weight across references
  return Math.round(totalWeight / references.length);
}

async function ensureSidebarOpen(page) {
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
    console.log("⚠️ Burger menu not found - sidebar state unclear");
  }
}

function parseReferences(referenceButtons) {
  return referenceButtons.map(btn => {
    const text = btn.textContent.trim();
    const match = text.match(/Chapter (\d+)\s*\/\s*Lesson (\d+)\s*\/\s*Page (\d+)/);
    if (match) {
      return {
        chapter: parseInt(match[1]),
        lesson: parseInt(match[2]),
        page: parseInt(match[3])
      };
    }
    return null;
  }).filter(Boolean);
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

  // Ensure sidebar is open before accessing glossary
  await ensureSidebarOpen(coursePage);

  // Navigate to glossary
  console.log("📚 Opening glossary...");
  await coursePage.waitForSelector('#glossaryMenuBtn');
  await coursePage.click('#glossaryMenuBtn');
  await delay(2000);
  console.log("✅ Glossary opened.");

  const allTerms = [];
  let currentPage = 1;
  const totalPages = 37;

  console.log(`📖 Scraping ${totalPages} pages of glossary terms...\n`);

  while (currentPage <= totalPages) {
    console.log(`🔄 Scraping page ${currentPage} of ${totalPages}...`);

    // Wait for terms to load
    await coursePage.waitForSelector('li.menu-item.ng-star-inserted', { timeout: 10000 });

    // Extract terms from current page
    const pageTerms = await coursePage.$$eval('li.menu-item.ng-star-inserted', (items) => {
      return items.map(item => {
        // Get term name
        const termElement = item.querySelector('strong');
        const term = termElement ? termElement.textContent.trim() : '';

        // Get definition
        const definitionElement = item.querySelector('app-katex-html span p');
        const definition = definitionElement ? definitionElement.textContent.trim() : '';

        // Get references
        const referenceButtons = Array.from(item.querySelectorAll('button.menu-link.small'));
        const references = referenceButtons.map(btn => {
          const text = btn.textContent.trim();
          const match = text.match(/Chapter (\d+)\s*\/\s*Lesson (\d+)\s*\/\s*Page (\d+)/);
          if (match) {
            return {
              chapter: parseInt(match[1]),
              lesson: parseInt(match[2]),
              page: parseInt(match[3])
            };
          }
          return null;
        }).filter(Boolean);

        return {
          term,
          definition,
          references
        };
      }).filter(item => item.term && item.definition); // Only include valid terms
    });

    allTerms.push(...pageTerms);
    console.log(`✅ Extracted ${pageTerms.length} terms from page ${currentPage}`);

    // Navigate to next page if not the last page
    if (currentPage < totalPages) {
      const nextButton = await coursePage.$('button.menu-pagination-link[title="Next"]');
      if (nextButton && await nextButton.isVisible()) {
        await nextButton.click();
        await delay(2000); // Wait for page to load
        currentPage++;
      } else {
        console.log("⚠️ Next button not found, stopping...");
        break;
      }
    } else {
      currentPage++;
    }
  }

  console.log(`\n📊 Total terms extracted: ${allTerms.length}`);

  // Calculate exam weights and sort by weight (highest first)
  const termsWithWeights = allTerms.map(term => ({
    ...term,
    examWeight: calculateExamWeight(term.references)
  })).sort((a, b) => b.examWeight - a.examWeight);

  // Generate markdown output
  const markdown = generateGlossaryMarkdown(termsWithWeights);

  // Save to file
  const outputDir = 'final-outputs';
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'glossary.md');
  fs.writeFileSync(outputPath, markdown);

  console.log(`\n💾 Glossary saved to: ${outputPath}`);
  console.log(`📖 ${allTerms.length} terms with chapter/lesson/page references`);

  // Generate summary statistics
  const stats = generateStats(termsWithWeights);
  console.log("\n📊 GLOSSARY STATISTICS:");
  console.log(`- High Priority (20%+ exam weight): ${stats.highPriority} terms`);
  console.log(`- Medium Priority (15-19% exam weight): ${stats.mediumPriority} terms`);
  console.log(`- Low Priority (<15% exam weight): ${stats.lowPriority} terms`);
  console.log(`- Average references per term: ${stats.avgReferences.toFixed(1)}`);

  await browser.close();
})();

function generateGlossaryMarkdown(terms) {
  const header = `# NASM CPT Glossary

This glossary contains all terms from the NASM CPT course with their chapter/lesson/page references and calculated exam weights based on section distribution.

**Exam Weight Distribution:**
- Section 1 (Chapters 1-2): 10%
- Section 2 (Chapters 3-4): 15% 
- Section 3 (Chapters 5-10): 15%
- Section 4 (Chapters 11-12): 16%
- Section 5 (Chapters 13-20): 24%
- Section 6 (Chapters 21-23): 20%

**Total Terms:** ${terms.length}

---

`;

  const termEntries = terms.map(term => {
    const referencesText = term.references.map(ref => 
      `Chapter ${ref.chapter}, Lesson ${ref.lesson}, Page ${ref.page}`
    ).join(' • ');

    return `## ${term.term}

**Definition:** ${term.definition}

**Exam Weight:** ${term.examWeight}%

**References:** ${referencesText}

---

`;
  }).join('');

  return header + termEntries;
}

function generateStats(terms) {
  const highPriority = terms.filter(t => t.examWeight >= 20).length;
  const mediumPriority = terms.filter(t => t.examWeight >= 15 && t.examWeight < 20).length;
  const lowPriority = terms.filter(t => t.examWeight < 15).length;
  
  const totalReferences = terms.reduce((sum, term) => sum + term.references.length, 0);
  const avgReferences = totalReferences / terms.length;

  return {
    highPriority,
    mediumPriority, 
    lowPriority,
    avgReferences
  };
} 