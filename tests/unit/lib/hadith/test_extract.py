"""Adversarial XLSX fixtures; no real publisher workbook is written or modified."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from xml.sax.saxutils import escape
from zipfile import ZipFile

SPEC = importlib.util.spec_from_file_location("hadith_extract", Path(__file__).resolve().parents[4] / "scripts/hadith/extract.py")
EXTRACTOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXTRACTOR)


class ExtractionTests(unittest.TestCase):
    def workbook(self, headers=None, records=None, formula=False):
        headers = headers or ["id", "title", "hadith_text", "other"]
        records = records or [["123", "  Title\n", "نَصّ [Text]  ", None]]
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        filename = Path(directory.name) / "fixture.xlsx"
        rows = [["Complete notice v1.0.0 2026-09-04"], headers, *records]
        xml_rows = []
        for number, values in enumerate(rows, 1):
            cells = []
            for column, value in enumerate(values):
                ref = f"{chr(65 + column)}{number}"
                if formula and number == 3 and column == 2:
                    cells.append(f'<c r="{ref}"><f>1+1</f><v>2</v></c>')
                elif value is not None:
                    cells.append(f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{escape(value)}</t></is></c>')
            xml_rows.append(f'<row r="{number}">{"".join(cells)}</row>')
        with ZipFile(filename, "w") as archive:
            archive.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
            archive.writestr("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
            archive.writestr("xl/workbook.xml", '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Source" sheetId="1" r:id="rId1"/></sheets></workbook>')
            archive.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
            archive.writestr("xl/worksheets/sheet1.xml", f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:D{len(rows)}"/><sheetData>{"".join(xml_rows)}</sheetData></worksheet>')
        return filename

    def test_lossless_and_read_only(self):
        filename = self.workbook()
        before = filename.read_bytes()
        result = EXTRACTOR.extract(filename)
        self.assertEqual(result["notice"], "Complete notice v1.0.0 2026-09-04")
        self.assertEqual(result["rows"], [{"id": "123", "title": "  Title\n", "hadith_text": "نَصّ [Text]  ", "other": None}])
        self.assertEqual(filename.read_bytes(), before)

    def test_formula_rejected(self):
        with self.assertRaisesRegex(ValueError, "Formula"):
            EXTRACTOR.extract(self.workbook(formula=True))

    def test_duplicate_headers_rejected(self):
        with self.assertRaisesRegex(ValueError, "duplicate headers"):
            EXTRACTOR.extract(self.workbook(headers=["id", "title", "hadith_text", "title"]))

    def test_duplicate_ids_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate ID"):
            EXTRACTOR.extract(self.workbook(records=[["1", "Title", "Text"], ["1", "Other", "Text"]]))

    def test_missing_text_rejected(self):
        with self.assertRaisesRegex(ValueError, "Missing text"):
            EXTRACTOR.extract(self.workbook(records=[["1", "Title", None]]))

    def test_path_like_id_rejected(self):
        with self.assertRaisesRegex(ValueError, "Invalid decimal ID"):
            EXTRACTOR.extract(self.workbook(records=[["../1", "Title", "Text"]]))


if __name__ == "__main__":
    unittest.main()
