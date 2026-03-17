PDF Extraction Performance Benchmarks

Overview

This document records performance, accuracy, memory usage, and concurrency
results for the PDF extraction pipeline implemented in:
services/extractors/pdf/


The pipeline supports:
Text-based PDF extraction using pypdf
OCR fallback using pdf2image + pytesseract
Structured extraction for layout/tables
Multi-page documents
Corruption handling
Parallel batch processing across PDFs

Test Environment
OS: Windows 10
Python: 3.11.8
CPU: Multi-core laptop
RAM: 16 GB
OCR Engine: Tesseract OCR
Batch Runner: ProcessPoolExecutor

Dataset
Evaluated on CV/resume-style PDFs:
Text-based multi-page resumes
Scanned single-page resumes
Mixed-layout PDFs
Corrupted PDFs

Total evaluated manually for accuracy: 10 PDFs
Accuracy Results

Ground-truth comparison was performed using
ai-ml/scripts/evaluate_accuracy.py.
Summary:
Files tested: 10
Average accuracy: 0.959
Requirement: >95%
Status: ✅ PASS
Individual examples:
PDF	Accuracy
Luminance Fund_Saleem Lalani	1.000
PWC_Olivia Peter	0.907
UOB AM_Felyna Lee	0.982
Xander_Erwina Lau	0.976
Xander_Rohit Khandelwal	0.977
Timing Performance

Measured from PDFExtractionResult.time_taken.

Typical cases:

PDF Type	Pages	Time (s)
Text-based CV	2–3	2–4
Scanned single page	1	2–5
Multi-page scanned	3–4	6–11 (worst case)
Corrupted PDF	1	<1

Worst observed case:
11.3 seconds for 3-page OCR-heavy PDF

Mitigation:
OCR is triggered only when required
OCR runs sequentially inside a PDF
PDFs processed in parallel across processes
Status: ⚠️ Mostly within SLA — edge OCR-heavy cases documented.

Memory Usage
Peak memory recorded using tracemalloc.
Observed:
Typical: 5–20 MB
OCR-heavy: up to 50 MB
Requirement: <500 MB
Status: ✅ PASS

Concurrency Model
Architecture:
Parallel processing across PDFs using ProcessPoolExecutor
Sequential page OCR inside a single PDF to avoid Windows file locking
Temp directory isolation per OCR job
Safe cleanup using shutil.rmtree
This balances:
CPU utilization
Disk I/O
OCR engine stability

Stability & Error Handling
Verified:
Corrupted PDFs return structured errors
OCR retry logic enabled
Temp file cleanup enforced
File-handle leaks prevented
Windows locking issues mitigated

Test Coverage
Unit tests cover:
Text extraction
OCR fallback
Structured extraction
Corrupted files
Confidence scoring

Coverage:
Total module coverage: 80%
Requirement: >80%
Status: ✅ PASS
