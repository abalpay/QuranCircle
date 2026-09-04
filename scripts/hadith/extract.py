"""Read official HadeethEnc XLSX without modifying it; emit lossless JSON to stdout."""
import json
import re
import sys
import openpyxl


def extract(filename):
    if openpyxl.__version__ != "3.1.5":
        raise ValueError("Use pinned openpyxl 3.1.5")
    workbook = openpyxl.load_workbook(filename, read_only=True, data_only=False)
    try:
        if len(workbook.worksheets) != 1:
            raise ValueError("Expected exactly one export worksheet")
        sheet = workbook.worksheets[0]
        rows = sheet.iter_rows()

        def values(cells):
            result = []
            for cell in cells:
                if cell.data_type == "f":
                    raise ValueError(f"Formula cell rejected: {cell.coordinate}")
                value = cell.value
                if value is not None and not isinstance(value, (str, int)):
                    raise ValueError(f"Unsupported source value at {cell.coordinate}")
                result.append(None if value is None else str(value))
            return result

        notice_values = values(next(rows))
        notices = [value for value in notice_values if value is not None]
        if len(notices) != 1:
            raise ValueError("Expected one complete publisher notice")
        headers = values(next(rows))
        if any(not header for header in headers) or len(set(headers)) != len(headers):
            raise ValueError("Missing or duplicate headers")
        if not {"id", "title", "hadith_text"}.issubset(headers):
            raise ValueError("Missing required columns")
        records, seen = [], set()
        for cells in rows:
            row = values(cells)
            if all(value is None for value in row):
                continue
            raw = dict(zip(headers, row, strict=True))
            if not re.fullmatch(r"[0-9]+", raw["id"] or ""):
                raise ValueError("Invalid decimal ID")
            if raw["id"] in seen:
                raise ValueError(f"Duplicate ID {raw['id']}")
            if not raw["title"] or not raw["hadith_text"]:
                raise ValueError(f"Missing text: {raw['id']}")
            seen.add(raw["id"])
            records.append(raw)
        if not records:
            raise ValueError("Empty export")
        return {"notice": notices[0], "headers": headers, "rows": records}
    finally:
        workbook.close()


if __name__ == "__main__":
    print(json.dumps(extract(sys.argv[1]), ensure_ascii=False, separators=(",", ":")))
