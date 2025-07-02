# NASM Course Content Repository

This repository contains scraped and processed content from the **NASM Certified Personal Trainer (CPT) 7th Edition** course, converted to markdown format for easy consumption by LLMs and analysis tools.

## Content Summary

**Complete NASM CPT 7th Edition dataset with exam-focused study materials:**

- **Course Content**: 825 markdown files (146 lessons, 99.3% capture rate)
- **Glossary**: 729 terms with exam weights (167 high-priority, 526 medium, 36 low)
- **Study Guides**: Official NASM PDFs for all 6 sections
- **Validation**: 98% quality score with comprehensive validation tools

**Key Features:**
- Clean markdown with metadata frontmatter
- Exam-weighted term prioritization  
- Multi-format outputs (hierarchical, flat, study-ready)
- Complete chapter/lesson/page cross-references

## 📁 Directory Structures

### `staging-outputs/` - Course Content

#### `staging-outputs/nasm-dump/` - Hierarchical Structure

Traditional directory structure mirroring the NASM course organization:

```
staging-outputs/
└── nasm-dump/
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

#### `staging-outputs/nasm-flat/` - Flat Structure

Single-directory structure with systematic naming for easy LLM access:

```
staging-outputs/
└── nasm-flat/
    ├── 1_1_1_page1.md          # Section 1, Chapter 1, Lesson 1, Page 1
    ├── 1_1_1_page2.md          # Section 1, Chapter 1, Lesson 1, Page 2
    ├── 1_1_2_page1.md          # Section 1, Chapter 1, Lesson 2, Page 1
    ├── 3_7_5_page1.md          # Section 3, Chapter 7, Lesson 5, Page 1
    ├── 6_23_4_page12.md        # Section 6, Chapter 23, Lesson 4, Page 12
    └── ... (825 total files)
```

**Naming Convention**: `{section}_{chapter}_{lesson}_page{page}.md`

### `final-outputs/` - Study-Ready LLM Optimized Content

Production-ready files optimized for study applications:

```
final-outputs/
├── glossary.md                          # Complete exam-weighted glossary (729 terms)
├── cpt7_exam_study_guide.pdf            # Official NASM exam study guide
├── section_1_study_guide.pdf            # Professional Development (10% weight)
├── section_2_study_guide.pdf            # Client Relations & Coaching (15% weight)
├── section_3_study_guide.pdf            # Basic Sciences & Nutrition (15% weight)  
├── section_4_study_guide.pdf            # Assessment (16% weight)
├── section_5_study_guide.pdf            # Exercise Technique (24% weight)
├── section_6_study_guide.pdf            # Program Design (20% weight)
└── nasm-course-lessons/                 # Additional lesson content
```

#### Glossary Features
- **729 terms** with definitions and exam weights
- **Chapter/lesson/page course content references** for each term
- **Sorted by exam relevance** with Section 5 (Exercise Technique, 24%) terms prioritized
- **Study priority levels** (High/Medium/Low based on exam weight)
  - **Exam weight calculation** depends on section reference distribution
  - 167 high, 526 medium, 36 low priority terms
  - (20%+ focus study area, 15-19% secondary review, < 15% supplementary knowledge)

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

## 🔍 Data Quality Validation

The scraped content has undergone comprehensive validation to ensure completeness and quality:

### Quality Metrics
- **Overall Score**: 98% (A+ grade)
- **Completeness**: 146/146 expected lessons captured (100%)
- **Data Integrity**: Perfect HTML↔️MD file pairing (825 pairs)
- **Success Rate**: 99.3% (only 1 empty lesson due to NASM platform 404 error)

### Content Analysis Results

#### File Statistics
- **HTML Files**: 825 files, 9.18 MB total
  - Average size: 11.4 KB per file
  - Size range: 2.0 KB - 49.7 KB
- **Markdown Files**: 825 files, 2.45 MB total  
  - Average size: 3.0 KB per file
  - Size range: 0.7 KB - 23.9 KB

#### Structure Verification
✅ **All 6 sections** present and complete  
✅ **All 23 chapters** captured correctly  
✅ **Perfect lesson count** (146 content lessons)  
✅ **Proper chapter numbering** (1-23 continuous)  
⚠️ **1 empty lesson**: Section 4, Chapter 11, Lesson 3 (known NASM platform issue)

#### Content Quality Indicators
- **Multi-page lessons**: Average 5.6 pages per lesson (ranging from 2-13 pages)
- **Rich content**: Substantial file sizes indicate comprehensive content extraction
- **Clean formatting**: Successful HTML-to-markdown conversion with preserved structure
- **Complete metadata**: All files include proper frontmatter with section/chapter/lesson information

### Validation Tools

Two complementary validation scripts ensure data quality:

#### `nasm-structure-check.js`
- Validates course navigation structure against expected layout
- Identifies content vs quiz/test lessons
- Confirms chapter numbering and section organization
- **Result**: Perfect match with expected 146 content lessons

#### `validate-scraped-content.js`  
- Cross-references scraped files against expected structure using HTML files
- Analyzes file sizes and content quality
- Identifies empty or problematic files
- Calculates comprehensive quality score
- **Result**: 98% quality score (A+ grade)

### Data Integrity Assurance

1. **Completeness Verification**: Automated comparison against course structure
2. **Content Quality Assessment**: File size analysis and empty content detection  
3. **Structure Validation**: Directory and file naming consistency checks
4. **Cross-referencing**: Scraped content validated against live course navigation

The validation process confirms this dataset represents a complete, high-quality capture of the NASM CPT curriculum suitable for both automated analysis and human study.

## Advanced Usage

### Partial Re-scraping
```bash
# Start from specific points (course content only)
node course-scraper.js 3           # Start from section 3
node course-scraper.js 3 7         # Start from section 3, chapter 7  
node course-scraper.js 3 7 5       # Start from section 3, chapter 7, lesson 5
```

### Validation & Quality Control
- **Structure Check**: Confirms 146 content lessons across 23 chapters
- **Content Validation**: Provides quality score, file statistics, and issue identification
- **Known Issues**: 1 missing lesson (Section 4-11-3, NASM platform 404 error)

## Technical Details

### Course Content Scraping (`course-scraper.js`)
- **Tool**: Playwright-based Node.js scraper
- **Authentication**: Automated login to NASM platform
- **Navigation**: Handles accordion-style course navigation
- **Content Extraction**: DOM-based with intelligent filtering
- **Error Handling**: Comprehensive logging and retry mechanisms
- **Output**: Hierarchical and flat directory structures in `staging-outputs/`

### Glossary Scraping (`glossary-scraper.js`)
- **Tool**: Playwright-based Node.js scraper
- **Navigation**: 37-page glossary pagination
- **Exam Weight Calculation**: Based on section distribution percentages
- **Term Prioritization**: Sorted by exam relevance
- **Reference Tracking**: Complete chapter/lesson/page mapping
- **Output**: Single study-optimized file in `final-outputs/`

### Content Processing
- **HTML to Markdown**: Custom conversion with heading hierarchy analysis
- **Figure Formatting**: Automatic correction of malformed references
- **Table Conversion**: NASM-specific table structures to markdown tables
- **Text Cleaning**: Removal of video artifacts and styling remnants
- **Exam Weight Analysis**: Glossary terms weighted by section importance

## 📄 File Formats

- **`.md` files**: Clean markdown content for analysis
- **`.html` files**: Original scraped HTML for reference
- **Frontmatter**: YAML metadata in all markdown files
- **Encoding**: UTF-8 with proper handling of special characters

## Usage

### Quick Start
```bash
# Scrape course content (825 pages)
node course-scraper.js

# Extract glossary with exam weights (729 terms)  
node glossary-scraper.js

# Validate scraped content quality
node nasm-structure-check.js
node validate-scraped-content.js
```

### Study Applications
- **High-Priority Focus**: Use `final-outputs/glossary.md` - prioritize 167 terms with 20%+ exam weight
- **Content Analysis**: Use `staging-outputs/nasm-flat/` for systematic LLM processing
- **Human Study**: Use `staging-outputs/nasm-dump/` for structured lesson browsing
- **Official Materials**: Use `final-outputs/section_*_study_guide.pdf` for NASM's exam prep

### Key File Patterns
```bash
# Nutrition content (Chapter 9)
ls staging-outputs/nasm-flat/*_9_*

# Exercise Technique (highest exam weight, 24%)  
ls staging-outputs/nasm-flat/*_1[3-9]_* staging-outputs/nasm-flat/*_20_*

# Specific lesson example
cat staging-outputs/nasm-flat/3_7_5_page1.md  # Section 3, Chapter 7, Lesson 5, Page 1
```

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

## Statistics

### Dataset Overview
- **Course Content**: 825 pages across 146 lessons (5.6 pages/lesson average)
- **File Sizes**: 9.18 MB HTML, 2.45 MB Markdown (11.4 KB, 3.0 KB averages)
- **Glossary Terms**: 729 total (167 high-priority, 526 medium, 36 low-priority)
- **Quality Score**: 98% (A+ grade) - only 1 missing lesson due to NASM platform error
- **Coverage**: Complete CPT curriculum across 6 sections, 23 chapters

### Exam Weight Distribution
- **Section 5 (Exercise Technique)**: 24% - highest priority for study focus
- **Section 6 (Program Design)**: 20% 
- **Section 4 (Assessment)**: 16%
- **Section 2 (Client Relations)**: 15%
- **Section 3 (Basic Sciences)**: 15% 
- **Section 1 (Professional Development)**: 10%


---

*Generated from NASM CPT 7th Edition course content*
*Last updated: January 2025*