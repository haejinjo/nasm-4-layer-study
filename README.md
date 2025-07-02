# NASM Course Content Repository

This repository contains scraped and processed content from the **NASM Certified Personal Trainer (CPT) 7th Edition** course, converted to markdown format for easy consumption by LLMs and analysis tools.

## ⚠️ Known Issues

### Content Issues
- **Missing Content**: 1 empty lesson (`section-4/chapter-11/lesson-3/`)
- **Figure References**: Some inline references may need manual review
- **Complex Tables**: Very complex tables may need formatting adjustments

### System Requirements
- **Disk Space**: Script may fail with `ENOSPC: no space left on device` error if insufficient storage available (requires ~200MB+ free space for complete scrape)

### Performance & Code Quality Issues
- **DOM Element Staleness**: Frequent re-querying of DOM elements due to navigation, causing performance overhead
- **Fixed Delays**: Uses `delay(3000)` instead of intelligent waiting for content readiness, slowing execution
- **Sequential Processing**: Lessons processed one-by-one instead of parallel batching where possible
- **Accordion Re-expansion**: Must re-expand chapters for each lesson due to platform's accordion behavior
- **Hard-coded Selectors**: CSS selectors scattered throughout code without centralization, making maintenance difficult
- **Large Monolithic Functions**: Functions like `convertContentToMarkdown` handle multiple responsibilities
- **Memory Inefficiency**: Large HTML strings held in memory during processing instead of streaming
- **No Configuration Management**: Timeouts, selectors, and delays hard-coded rather than configurable
- **Limited Error Recovery**: Basic retry logic only for page navigation, not for content extraction failures
- **No Unit Testing**: Difficult to test individual components due to tight coupling with Playwright


## Content Summary

- **Total Files**: 825 markdown files + 825 HTML files
  - Note: Missing Section 4 Chapter 11 Lesson 3 due to a bug on the NASM website
- **6 Sections**: Complete NASM course content
- **23 Chapters**: All chapters across all sections
- **Success Rate**: 99.9% complete (1 empty lesson out of hundreds)
- **Format**: Clean markdown with metadata frontmatter

## 📁 Directory Structures

### `nasm-dump/` - Hierarchical Structure

Traditional directory structure mirroring the NASM course organization:

```
nasm-dump/
├── section-1/              # Professional Development and Responsibility (10%)
│   ├── chapter-1/           # The Modern State of Health and Fitness
│   │   ├── lesson-1/
│   │   │   ├── page-1.md
│   │   │   ├── page-1.html
│   │   │   ├── page-2.md
│   │   │   ├── page-2.html
│   │   │   └── ...
│   │   ├── lesson-2/
│   │   └── ...
│   └── chapter-2/           # The Personal Training Profession
├── section-2/              # Exercise Psychology and Coaching (15%)
│   ├── chapter-3/           # Psychology of Exercise
│   └── chapter-4/           # Behavior Change and Motivational Interviewing
├── section-3/              # Basic and Applied Sciences (15%)
│   ├── chapter-5/           # The Nervous, Skeletal, and Muscular Systems
│   ├── chapter-6/           # The Cardiorespiratory, Endocrine, and Digestive Systems
│   ├── chapter-7/           # Human Movement Science
│   ├── chapter-8/           # Exercise Metabolism and Bioenergetics
│   ├── chapter-9/           # Nutrition
│   └── chapter-10/          # Supplementation
├── section-4/              # Fitness Assessments (16%)
│   ├── chapter-11/          # Fitness Assessments
│   └── chapter-12/          # Posture, Movement, and Performance Assessments
├── section-5/              # Exercise Technique and Training Instruction (24%)
│   ├── chapter-13/          # Integrated Training and the OPT Model
│   ├── chapter-14/          # Flexibility Training Concepts
│   ├── chapter-15/          # Cardiorespiratory Training Concepts
│   ├── chapter-16/          # Core Training Concepts
│   ├── chapter-17/          # Balance Training Concepts
│   ├── chapter-18/          # Plyometric (Reactive) Training Concepts
│   ├── chapter-19/          # Speed, Agility, and Quickness Training Concepts
│   └── chapter-20/          # Resistance Training Concepts
└── section-6/              # Program Design (20%)
    ├── chapter-21/          # Program Design Concepts
    ├── chapter-22/          # The Optimum Performance Training (OPT) Model
    └── chapter-23/          # Chronic Health Conditions and Physical or Functional Limitations
```

### `nasm-flat/` - Flat Structure

Single-directory structure with systematic naming for easy LLM access:

```
nasm-flat/
├── 1_1_1_page1.md          # Section 1, Chapter 1, Lesson 1, Page 1
├── 1_1_1_page2.md          # Section 1, Chapter 1, Lesson 1, Page 2
├── 1_1_2_page1.md          # Section 1, Chapter 1, Lesson 2, Page 1
├── 3_7_5_page1.md          # Section 3, Chapter 7, Lesson 5, Page 1
├── 6_23_4_page12.md        # Section 6, Chapter 23, Lesson 4, Page 12
└── ... (825 total files)
```

**Naming Convention**: `{section}_{chapter}_{lesson}_page{page}.md`

## Section Breakdown

| Section | Chapters | Weight | Topics |
|---------|----------|--------|--------|
| 1 | 1-2 | 10% | Professional Development and Responsibility |
| 2 | 3-4 | 15% | Exercise Psychology and Behavioral Coaching |
| 3 | 5-10 | 15% | Basic and Applied Sciences and Nutritional Concepts |
| 4 | 11-12 | 16% | Fitness Assessments |
| 5 | 13-20 | 24% | Exercise Technique and Training Instruction |
| 6 | 21-23 | 20% | Program Design |

## 📄 File Structure

Each page contains:

```yaml
---
section_number: 3
section_title: "Basic and Applied Sciences and Nutritional Concepts"
chapter: 7
chapter_title: "Human Movement Science"
lesson_number: 5
lesson_title: "Muscular Force"
weight: 15%
objectives:
  - "Understanding anatomy, physiology, movement science, metabolism, nutrition, and supplementation."
---

## Content
[Main lesson content in clean markdown]

## Key Terms
**Term Name**
Definition text

## Images
**FIGURE 7-15: Length-tension relationships**
Alt: Description
URL: https://...
```

## Content Features

### What's Included
- **Clean Markdown**: Professional formatting with proper headers
- **Key Terms**: Extracted from sidebars and formatted consistently
- **Images**: Figure captions, alt text, and URLs preserved
- **Tables**: Converted to proper markdown table format
- **Metadata**: Complete frontmatter with section/chapter/lesson info
- **References**: Properly formatted figure and table references

### What's Filtered Out
- Video content and timestamps
- Audio/podcast references
- Quiz and test content
- Navigation elements
- Styling and CSS artifacts

## Technical Details

### Scraping Process
- **Tool**: Playwright-based Node.js scraper
- **Authentication**: Automated login to NASM platform
- **Navigation**: Handles accordion-style course navigation
- **Content Extraction**: DOM-based with intelligent filtering
- **Error Handling**: Comprehensive logging and retry mechanisms

### Content Processing
- **HTML to Markdown**: Custom conversion with heading hierarchy analysis
- **Figure Formatting**: Automatic correction of malformed references
- **Table Conversion**: NASM-specific table structures to markdown tables
- **Text Cleaning**: Removal of video artifacts and styling remnants

## Usage

### For LLM Analysis
Use the `nasm-flat/` directory for:
- Batch processing all content
- Sequential analysis by section/chapter
- Searching specific lessons by filename

### For Human Navigation
Use the `nasm-dump/` directory for:
- Browsing course structure
- Understanding lesson organization
- Maintaining original hierarchy

### Example Queries
```bash
# Find all content about nutrition
ls nasm-flat/*_9_*  # Chapter 9 = Nutrition

# Get all pages from Section 3 (Basic Sciences)
ls nasm-flat/3_*

# Find specific lesson content
cat nasm-flat/3_7_5_page1.md  # Section 3, Chapter 7, Lesson 5, Page 1
```

## Statistics

- **Total Markdown Files**: 825
- **Total HTML Files**: 825 (original scraped content)
- **Average Pages per Lesson**: 3-8 pages
- **Largest Lesson**: 12+ pages
- **Content Coverage**: Complete NASM CPT curriculum

## Regeneration

To re-scrape or update content:

```bash
# Full scrape
node nasm-scraper.js

# Start from specific section
node nasm-scraper.js 3

# Start from specific chapter
node nasm-scraper.js 3 7

# Start from specific lesson
node nasm-scraper.js 3 7 5
```

## 📄 File Formats

- **`.md` files**: Clean markdown content for analysis
- **`.html` files**: Original scraped HTML for reference
- **Frontmatter**: YAML metadata in all markdown files
- **Encoding**: UTF-8 with proper handling of special characters

---

*Generated from NASM CPT 7th Edition course content*
*Last updated: January 2025* 