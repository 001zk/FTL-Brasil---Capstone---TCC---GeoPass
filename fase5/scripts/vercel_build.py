                                          

                                                                                 
                                                                          
   
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from scripts.build_dataset import DATA_DIR, OUTPUT_PATH, build              


def main() -> int:
    dataset = build(refresh=True)
    encoded = json.dumps(dataset, ensure_ascii=False, indent=2)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(encoded, encoding="utf-8")

    public_dir = ROOT / "public"
    public_data_dir = public_dir / "data"
    public_data_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / "web" / "index.html", public_dir / "index.html")
    (public_data_dir / "passes.json").write_text(encoded, encoding="utf-8")

    print(
        "Vercel build OK: "
        f"{len(dataset['satellites'])} satélites, "
        f"{len(dataset['passes'])} passagens, "
        f"{len(dataset['locations'])} localidades."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
