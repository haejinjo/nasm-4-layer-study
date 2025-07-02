// Validate Scraped Content Against Structure
// Cross-references the actual scraped files with expected structure

const fs = require('fs');
const path = require('path');

// Expected structure from structure analysis
const expectedStructure = {
  1: { chapters: [1, 2], weight: 10, title: "Professional Development and Responsibility" },
  2: { chapters: [3, 4], weight: 15, title: "Client Relations and Behavioral Coaching" },
  3: { chapters: [5, 6, 7, 8, 9, 10], weight: 15, title: "Basic and Applied Sciences and Nutritional Concepts" },
  4: { chapters: [11, 12], weight: 16, title: "Assessment" },
  5: { chapters: [13, 14, 15, 16, 17, 18, 19, 20], weight: 24, title: "Exercise Technique and Training Instruction" },
  6: { chapters: [21, 22, 23], weight: 20, title: "Program Design" },
};

function analyzeScrapedContent() {
  const baseDir = 'staging-outputs/nasm-dump';
  
  if (!fs.existsSync(baseDir)) {
    console.error(`❌ Directory ${baseDir} does not exist`);
    return;
  }

  const results = {
    totalLessons: 0,
    totalPages: 0,
    emptyLessons: [],
    missingSections: [],
    missingChapters: [],
    lessonDetails: {},
    contentIssues: [],
    fileSizeStats: {
      htmlSizes: [],
      mdSizes: [],
      totalHtmlSize: 0,
      totalMdSize: 0
    }
  };

  console.log("🔍 Analyzing scraped content structure...\n");

  // Check each expected section
  for (let sectionId = 1; sectionId <= 6; sectionId++) {
    const sectionDir = path.join(baseDir, `section-${sectionId}`);
    const expectedChapters = expectedStructure[sectionId].chapters;
    
    if (!fs.existsSync(sectionDir)) {
      results.missingSections.push(sectionId);
      console.log(`❌ Missing section-${sectionId} directory`);
      continue;
    }

    console.log(`📚 Section ${sectionId}: ${expectedStructure[sectionId].title}`);

    // Check each expected chapter
    for (const chapterNum of expectedChapters) {
      const chapterDir = path.join(sectionDir, `chapter-${chapterNum}`);
      
      if (!fs.existsSync(chapterDir)) {
        results.missingChapters.push(`${sectionId}-${chapterNum}`);
        console.log(`  ❌ Missing chapter-${chapterNum} directory`);
        continue;
      }

      // Find all lesson directories in this chapter
      const lessons = fs.readdirSync(chapterDir)
        .filter(item => fs.statSync(path.join(chapterDir, item)).isDirectory())
        .filter(item => item.startsWith('lesson-'))
        .sort((a, b) => {
          const aNum = parseInt(a.split('-')[1]);
          const bNum = parseInt(b.split('-')[1]);
          return aNum - bNum;
        });

      console.log(`  📖 Chapter ${chapterNum}: ${lessons.length} lessons`);

      for (const lessonDir of lessons) {
        const lessonPath = path.join(chapterDir, lessonDir);
        const lessonNum = parseInt(lessonDir.split('-')[1]);
        
        // Find all pages in this lesson
        const files = fs.readdirSync(lessonPath);
        const htmlPages = files.filter(f => f.endsWith('.html')).sort();
        const mdPages = files.filter(f => f.endsWith('.md')).sort();
        
        const lessonKey = `${sectionId}-${chapterNum}-${lessonNum}`;
        results.lessonDetails[lessonKey] = {
          sectionId,
          chapterNum,
          lessonNum,
          htmlPages: htmlPages.length,
          mdPages: mdPages.length,
          pages: []
        };

        console.log(`    📄 Lesson ${lessonNum}: ${htmlPages.length} HTML, ${mdPages.length} MD`);

        if (htmlPages.length === 0 && mdPages.length === 0) {
          results.emptyLessons.push(lessonKey);
        }

        // Analyze each page
        for (let i = 0; i < Math.max(htmlPages.length, mdPages.length); i++) {
          const pageNum = i + 1;
          const htmlFile = path.join(lessonPath, `page-${pageNum}.html`);
          const mdFile = path.join(lessonPath, `page-${pageNum}.md`);
          
          const pageInfo = {
            pageNum,
            hasHtml: fs.existsSync(htmlFile),
            hasMd: fs.existsSync(mdFile),
            htmlSize: 0,
            mdSize: 0,
            htmlEmpty: false,
            mdEmpty: false
          };

          // Check HTML file
          if (pageInfo.hasHtml) {
            const htmlContent = fs.readFileSync(htmlFile, 'utf8');
            pageInfo.htmlSize = htmlContent.length;
            pageInfo.htmlEmpty = htmlContent.trim().length < 100; // Consider <100 chars as empty
            
            results.fileSizeStats.htmlSizes.push(pageInfo.htmlSize);
            results.fileSizeStats.totalHtmlSize += pageInfo.htmlSize;

            if (pageInfo.htmlEmpty) {
              results.contentIssues.push({
                type: 'empty_html',
                file: htmlFile,
                size: pageInfo.htmlSize
              });
            }
          }

          // Check MD file
          if (pageInfo.hasMd) {
            const mdContent = fs.readFileSync(mdFile, 'utf8');
            pageInfo.mdSize = mdContent.length;
            
            // Check if MD has actual content (not just frontmatter)
            const frontmatterEnd = mdContent.indexOf('---', 3);
            const actualContent = frontmatterEnd > 0 ? mdContent.substring(frontmatterEnd + 3).trim() : mdContent.trim();
            pageInfo.mdEmpty = actualContent.length < 50;
            
            results.fileSizeStats.mdSizes.push(pageInfo.mdSize);
            results.fileSizeStats.totalMdSize += pageInfo.mdSize;

            if (pageInfo.mdEmpty) {
              results.contentIssues.push({
                type: 'empty_md',
                file: mdFile,
                size: pageInfo.mdSize,
                contentSize: actualContent.length
              });
            }
          }

          results.lessonDetails[lessonKey].pages.push(pageInfo);
        }

        results.totalPages += Math.max(htmlPages.length, mdPages.length);
        results.totalLessons++;
      }
    }
    console.log();
  }

  return results;
}

function generateReport(results) {
  console.log("=" .repeat(80));
  console.log("📊 SCRAPED CONTENT VALIDATION REPORT");
  console.log("=" .repeat(80));

  console.log(`\n🔢 TOTALS:`);
  console.log(`- Lessons Found: ${results.totalLessons}`);
  console.log(`- Pages Found: ${results.totalPages}`);
  console.log(`- Expected Lessons: 146 (from structure analysis)`);
  
  const lessonMatch = results.totalLessons === 146;
  console.log(`${lessonMatch ? '✅' : '❌'} Lesson Count: ${lessonMatch ? 'MATCHES' : 'MISMATCH'}`);

  if (results.missingSections.length > 0) {
    console.log(`\n❌ MISSING SECTIONS: ${results.missingSections.join(', ')}`);
  }

  if (results.missingChapters.length > 0) {
    console.log(`\n❌ MISSING CHAPTERS: ${results.missingChapters.join(', ')}`);
  }

  if (results.emptyLessons.length > 0) {
    console.log(`\n⚠️  EMPTY LESSONS: ${results.emptyLessons.length}`);
    results.emptyLessons.forEach(lesson => {
      console.log(`  - ${lesson}`);
    });
  }

  if (results.contentIssues.length > 0) {
    console.log(`\n⚠️  CONTENT ISSUES: ${results.contentIssues.length}`);
    const emptyHtml = results.contentIssues.filter(i => i.type === 'empty_html');
    const emptyMd = results.contentIssues.filter(i => i.type === 'empty_md');
    
    if (emptyHtml.length > 0) {
      console.log(`  📄 Empty HTML files: ${emptyHtml.length}`);
      emptyHtml.slice(0, 5).forEach(issue => {
        console.log(`    - ${issue.file} (${issue.size} bytes)`);
      });
      if (emptyHtml.length > 5) console.log(`    ... and ${emptyHtml.length - 5} more`);
    }

    if (emptyMd.length > 0) {
      console.log(`  📝 Empty MD files: ${emptyMd.length}`);
      emptyMd.slice(0, 5).forEach(issue => {
        console.log(`    - ${issue.file} (${issue.size} bytes, ${issue.contentSize} content)`);
      });
      if (emptyMd.length > 5) console.log(`    ... and ${emptyMd.length - 5} more`);
    }
  }

  // File size statistics
  const stats = results.fileSizeStats;
  if (stats.htmlSizes.length > 0) {
    const avgHtml = Math.round(stats.totalHtmlSize / stats.htmlSizes.length);
    const maxHtml = Math.max(...stats.htmlSizes);
    const minHtml = Math.min(...stats.htmlSizes);
    
    console.log(`\n📊 HTML FILE STATS:`);
    console.log(`  - Total files: ${stats.htmlSizes.length}`);
    console.log(`  - Total size: ${(stats.totalHtmlSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Average size: ${(avgHtml / 1024).toFixed(1)} KB`);
    console.log(`  - Size range: ${(minHtml / 1024).toFixed(1)} KB - ${(maxHtml / 1024).toFixed(1)} KB`);
  }

  if (stats.mdSizes.length > 0) {
    const avgMd = Math.round(stats.totalMdSize / stats.mdSizes.length);
    const maxMd = Math.max(...stats.mdSizes);
    const minMd = Math.min(...stats.mdSizes);
    
    console.log(`\n📊 MARKDOWN FILE STATS:`);
    console.log(`  - Total files: ${stats.mdSizes.length}`);
    console.log(`  - Total size: ${(stats.totalMdSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Average size: ${(avgMd / 1024).toFixed(1)} KB`);
    console.log(`  - Size range: ${(minMd / 1024).toFixed(1)} KB - ${(maxMd / 1024).toFixed(1)} KB`);
  }

  // Quality assessment
  const qualityScore = calculateQualityScore(results);
  console.log(`\n🎯 QUALITY SCORE: ${qualityScore.score}% (${qualityScore.grade})`);
  console.log(`${qualityScore.score >= 95 ? '🎉' : qualityScore.score >= 85 ? '✅' : '⚠️'} ${qualityScore.message}`);

  return results;
}

function calculateQualityScore(results) {
  let score = 100;
  let issues = [];

  // Deduct for missing lessons
  const expectedLessons = 146;
  const lessonCompleteness = (results.totalLessons / expectedLessons) * 100;
  if (lessonCompleteness < 100) {
    const deduction = (100 - lessonCompleteness) * 0.5; // 0.5 points per missing lesson
    score -= deduction;
    issues.push(`${expectedLessons - results.totalLessons} missing lessons`);
  }

  // Deduct for empty lessons
  if (results.emptyLessons.length > 0) {
    score -= results.emptyLessons.length * 2; // 2 points per empty lesson
    issues.push(`${results.emptyLessons.length} empty lessons`);
  }

  // Deduct for content issues
  if (results.contentIssues.length > 0) {
    score -= results.contentIssues.length * 0.5; // 0.5 points per content issue
    issues.push(`${results.contentIssues.length} content issues`);
  }

  score = Math.max(0, Math.round(score));

  let grade, message;
  if (score >= 95) {
    grade = 'A+';
    message = 'Excellent scraping quality';
  } else if (score >= 90) {
    grade = 'A';
    message = 'Very good scraping quality';
  } else if (score >= 85) {
    grade = 'B+';
    message = 'Good scraping quality with minor issues';
  } else if (score >= 80) {
    grade = 'B';
    message = 'Acceptable scraping quality';
  } else {
    grade = 'C';
    message = 'Scraping quality needs improvement';
  }

  if (issues.length > 0) {
    message += ` (Issues: ${issues.join(', ')})`;
  }

  return { score, grade, message, issues };
}

// Main execution
console.log("🔍 NASM Scraped Content Validator");
console.log("Cross-referencing scraped files against expected structure\n");

const results = analyzeScrapedContent();
if (results) {
  generateReport(results);
} 