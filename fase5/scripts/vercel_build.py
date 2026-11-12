                                          

                                                                                 
                                                                          
   
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from build_dataset import DATA_DIR, OUTPUT_PATH, build


def copy_web_assets(web_dir: Path, public_dir: Path) -> None:
    public_dir.mkdir(parents=True, exist_ok=True)
    shutil.copytree(web_dir, public_dir, dirs_exist_ok=True)


def main() -> int:
    dataset = build(refresh=True)
    encoded = json.dumps(dataset, ensure_ascii=False, indent=2)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(encoded, encoding="utf-8")

    public_dir = ROOT / "public"
    copy_web_assets(ROOT / "web", public_dir)
    public_data_dir = public_dir / "data"
    public_data_dir.mkdir(parents=True, exist_ok=True)
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
