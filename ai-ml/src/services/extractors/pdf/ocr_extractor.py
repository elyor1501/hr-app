from pathlib import Path
import tempfile
import shutil
import gc
import time

from pdf2image import convert_from_path
import pytesseract

from .models import PageExtraction


class OCRPDFExtractor:
    """
    Windows-safe OCR extractor using pdf2image + pytesseract.

    Design goals:
      - No temp-file leakage
      - No file-handle locking
      - Retry conversion
      - Deterministic cleanup
      - Stable for batch runs
    """

    RETRIES = 2
    DPI = 150
    SLEEP_BETWEEN_RETRIES = 1.0

   

    def _safe_convert(self, **kwargs):
        """
        Retry wrapper around pdf2image.convert_from_path.
        """

        last_exc = None

        for attempt in range(self.RETRIES):
            try:
                return convert_from_path(**kwargs)
            except Exception as exc:
                last_exc = exc
                time.sleep(self.SLEEP_BETWEEN_RETRIES)

        raise RuntimeError(
            f"pdf2image failed after {self.RETRIES} attempts: {last_exc}"
        )



    def _cleanup_tmp(self, folder: str):
        """
        Best-effort Windows-safe cleanup.
        """

        try:
            shutil.rmtree(folder, ignore_errors=True)
        finally:
            gc.collect()

    

    def extract(self, path: str):
        """
        OCR entire PDF.
        """

        path = str(Path(path))
        pages = []

        tmp_root = tempfile.mkdtemp(prefix="ocrpdf_")

        try:
            images = self._safe_convert(
                pdf_path=path,
                dpi=self.DPI,
                output_folder=tmp_root,
            )

            for idx, image in enumerate(images):
                try:
                    text = pytesseract.image_to_string(
                        image,
                        config="--psm 3",
                    )

                    alpha_ratio = sum(c.isalpha() for c in text) / max(len(text), 1)

                    pages.append(
                        PageExtraction(
                            page_number=idx + 1,
                            text=text.strip(),
                            method="ocr",
                            confidence=round(alpha_ratio, 2),
                        )
                    )

                finally:
                    # Always release PIL handle
                    image.close()

            return pages

        except Exception as exc:
            raise RuntimeError(
                f"OCRPDFExtractor failed: {exc}"
            ) from exc

        finally:
            self._cleanup_tmp(tmp_root)

   

    def extract_page(self, path: str, page_number: int):
        """
        OCR a single page only (1-indexed).
        """

        path = str(Path(path))
        tmp_root = tempfile.mkdtemp(prefix="ocrpage_")

        try:
            images = self._safe_convert(
                pdf_path=path,
                dpi=self.DPI,
                first_page=page_number,
                last_page=page_number,
                output_folder=tmp_root,
            )

            if not images:
                raise RuntimeError("No image produced for OCR page")

            image = images[0]

            try:
                text = pytesseract.image_to_string(
                    image,
                    config="--psm 3",
                )

            finally:
                image.close()

            alpha_ratio = sum(c.isalpha() for c in text) / max(len(text), 1)

            return PageExtraction(
                page_number=page_number,
                text=text.strip(),
                method="ocr",
                confidence=round(alpha_ratio, 2),
            )

        except Exception as exc:
            raise RuntimeError(
                f"OCRPDFExtractor.extract_page failed (page {page_number}): {exc}"
            ) from exc

        finally:
            self._cleanup_tmp(tmp_root)
