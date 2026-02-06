#!/usr/bin/env python3
import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

from PIL import Image


@dataclass(frozen=True)
class Job:
    filename: str
    target: Tuple[int, int]
    crop_ratio: Optional[Tuple[int, int]] = None


JOBS: List[Job] = [
    # Batch A
    Job("A1_scene1_shaanxi_market_main.png", (1280, 720), (16, 9)),
    Job("A1T_scene1_market_ground_tile.png", (16, 16), None),
    Job("A2_scene2_school_gate_exterior.png", (1280, 720), (16, 9)),
    Job("A3_scene2_classroom_interior.png", (1280, 720), (16, 9)),
    Job("A4_scene3_haunted_corridor_loop.png", (1280, 720), (16, 9)),
    Job("A5_scene4_small_park_cheerful.png", (1280, 720), (16, 9)),
    Job("A6_scene5_park_magic_celebration.png", (1280, 720), (16, 9)),
    # Batch B
    Job("B1_player_xiaoshou_walk_spritesheet.png", (128, 192), None),
    Job("B2_player_xiaoshou_heads_expressions.png", (64, 64), None),
    Job("B3_player_xiaoshou_coffeehead_walk_spritesheet.png", (128, 192), None),
    Job("B4_classmate_sitting.png", (32, 48), None),
    Job("B5_witch_teacher_run_spritesheet.png", (128, 96), (4, 3)),
    Job("B6_witch_arm_and_hook_pack.png", (32, 32), None),
    # Batch C
    Job("C1_basketball_spin_spritesheet.png", (64, 16), (4, 1)),
    Job("C2_plane_sprite.png", (32, 32), None),
    Job("C3_exit_door_glow.png", (32, 48), None),
    Job("C4_giftbox_pack_spritesheet.png", (160, 32), (5, 1)),
    Job("C5_thought_icons_set.png", (48, 16), (3, 1)),
    Job("C6_coffee_mug_head_and_drops.png", (64, 16), (4, 1)),
    Job("C7_delivery_app_icon_placeholder.png", (32, 32), None),
    Job("C8_confetti_and_sparkle_particles.png", (64, 64), None),
    # Batch D
    Job("D1_dialog_box_9slice.png", (256, 128), (2, 1)),
    Job("D2_thought_bubble_frame.png", (160, 120), (4, 3)),
    Job("D3_hint_arrow_and_space_panel.png", (128, 48), (8, 3)),
    Job("D4_pause_menu_panel_buttons.png", (512, 256), (2, 1)),
]


def center_crop_to_ratio(img: Image.Image, ratio: Tuple[int, int]) -> Image.Image:
    w, h = img.size
    target_ratio = ratio[0] / ratio[1]
    current_ratio = w / h

    if abs(current_ratio - target_ratio) < 1e-6:
        return img

    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        new_h = h
    else:
        new_w = w
        new_h = int(w / target_ratio)

    left = (w - new_w) // 2
    top = (h - new_h) // 2
    right = left + new_w
    bottom = top + new_h
    return img.crop((left, top, right, bottom))


def process_one(src: Path, dst: Path, target: Tuple[int, int], crop_ratio: Optional[Tuple[int, int]]) -> None:
    img = Image.open(src)
    if crop_ratio is not None:
        img = center_crop_to_ratio(img, crop_ratio)
    if img.size != target:
        img = img.resize(target, resample=Image.NEAREST)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst)


def main() -> None:
    parser = argparse.ArgumentParser(description="Post-process ImageGen outputs: crop + nearest-neighbor resize.")
    parser.add_argument("--raw-root", default="output/imagegen/raw", help="Root dir containing raw batch outputs")
    parser.add_argument("--out-root", default="output/imagegen", help="Output dir for final assets")
    args = parser.parse_args()

    raw_root = Path(args.raw_root)
    out_root = Path(args.out_root)

    missing = []
    for job in JOBS:
        src = raw_root / job.filename
        if not src.exists():
            alt = list(raw_root.glob(f"**/{job.filename}"))
            if alt:
                src = alt[0]
            else:
                missing.append(job.filename)
                continue
        dst = out_root / job.filename
        process_one(src, dst, job.target, job.crop_ratio)

    if missing:
        print("Missing raw files:")
        for name in missing:
            print("-", name)


if __name__ == "__main__":
    main()
