# Audio assets

## Regional overworld BGM (`overworld_bgm`)

All 16 beds are MP3 under `bgm/`:

| Key | File | Region |
| --- | --- | --- |
| `plains` | `bgm/plains_overworld.mp3` | Đồng Bằng |
| `mountain` | `bgm/mountain_overworld.mp3` | Núi Non |
| `forest` | `bgm/forest_overworld.mp3` | Rừng Rậm |
| `swamp` | `bgm/swamp_overworld.mp3` | Đầm Lầy |
| `beach` | `bgm/beach_overworld.mp3` | Bãi Biển |
| `ocean` | `bgm/ocean_overworld.mp3` | Đại Dương |
| `frost` | `bgm/frost_overworld.mp3` | Băng Giá |
| `savannah` | `bgm/savannah_overworld.mp3` | Thảo Nguyên |
| `volcano` | `bgm/volcano_overworld.mp3` | Núi Lửa |
| `desert` | `bgm/desert_overworld.mp3` | Sa Mạc |
| `darkness` | `bgm/darkness_overworld.mp3` | Bóng Tối |
| `light` | `bgm/light_overworld.mp3` | Ánh Sáng |
| `heaven` | `bgm/heaven_overworld.mp3` | Thiên Đường |
| `hell` | `bgm/hell_overworld.mp3` | Địa Ngục |
| `chaos` | `bgm/chaos_overworld.mp3` | Hỗn Mang |
| `cosmic` | `bgm/cosmic_overworld.mp3` | Vũ Trụ |

Requires live in `src/audio/tracks.ts`. Metro needs a static `require()` — do not build paths dynamically.
