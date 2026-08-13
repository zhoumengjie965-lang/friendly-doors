import csv
import sys
from pathlib import Path

from numbers_parser import Document


def main() -> None:
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    document = Document(source)
    tables = [(sheet.name, table) for sheet in document.sheets for table in sheet.tables]
    if len(tables) != 1:
        raise RuntimeError(f"Expected exactly one table, found {len(tables)}")

    _, table = tables[0]
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.writer(csv_file, lineterminator="\r\n")
        writer.writerows(table.rows(values_only=True))

    print(f"rows={table.num_rows} cols={table.num_cols} output={output}")


if __name__ == "__main__":
    main()
