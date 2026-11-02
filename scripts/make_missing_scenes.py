from PIL import Image, ImageDraw, ImageEnhance

scene_dir = r"C:\Users\WizTech\.gemini\antigravity\scratch\animated-shorts\public\cheese\scenes"
art_dir = r"C:\Users\WizTech\.gemini\antigravity\brain\4944ba15-09e9-48da-ad38-e7453ebabc4f"

im1 = Image.open(f"{scene_dir}\\scene_01.jpg").convert("RGB")
W, H = im1.size
print("Dimensions:", W, H)

# --- SCENE 04: ENEMY CLOSING IN & WHITE SURRENDER FLAG ---
im2 = Image.open(f"{scene_dir}\\scene_02.jpg").convert("RGB")
im3 = Image.open(f"{scene_dir}\\scene_03.jpg").convert("RGB")

s4 = Image.new("RGB", (W, H), (14, 18, 26))
div_y = int(H * 0.52)

warships = im2.crop((0, int(H * 0.44), W, H)).resize((W, div_y), Image.Resampling.LANCZOS)
warships = ImageEnhance.Contrast(warships).enhance(1.15)
s4.paste(warships, (0, 0))

crew = im3.crop((0, int(H * 0.14), W, int(H * 0.68))).resize((W, H - div_y), Image.Resampling.LANCZOS)
s4.paste(crew, (0, div_y))

draw4 = ImageDraw.Draw(s4, "RGBA")
draw4.rectangle([0, div_y - 8, W, div_y + 8], fill=(16, 20, 28, 255))
draw4.line([(0, div_y - 8), (W, div_y - 8)], fill=(212, 168, 83, 255), width=3)
draw4.line([(0, div_y + 8), (W, div_y + 8)], fill=(212, 168, 83, 255), width=3)

# Graphic-novel White Surrender Flag on wooden pole
pole_x1, pole_y1 = int(W * 0.80), int(H * 0.96)
pole_x2, pole_y2 = int(W * 0.68), int(H * 0.40)
draw4.line([(pole_x1, pole_y1), (pole_x2, pole_y2)], fill=(18, 14, 10, 255), width=18)
draw4.line([(pole_x1, pole_y1), (pole_x2, pole_y2)], fill=(138, 92, 48, 255), width=10)

flag_pts = [
    (pole_x2, pole_y2 + 8),
    (int(W * 0.30), int(H * 0.43)),
    (int(W * 0.24), int(H * 0.51)),
    (int(W * 0.32), int(H * 0.59)),
    (pole_x2 + 18, pole_y2 + int(H * 0.17)),
]
draw4.polygon(flag_pts, fill=(244, 240, 230, 252), outline=(15, 15, 18, 255))
for i in range(len(flag_pts)):
    p1 = flag_pts[i]
    p2 = flag_pts[(i + 1) % len(flag_pts)]
    draw4.line([p1, p2], fill=(15, 15, 18, 255), width=6)
draw4.line([(pole_x2 - 15, pole_y2 + 45), (int(W * 0.36), int(H * 0.49))], fill=(185, 180, 170, 220), width=4)
draw4.line([(pole_x2 - 10, pole_y2 + 85), (int(W * 0.38), int(H * 0.55))], fill=(185, 180, 170, 220), width=4)

s4.save(f"{scene_dir}\\scene_04.jpg", quality=95)
s4.save(f"{art_dir}\\scene_04_white_flag.jpg", quality=95)

# --- SCENE 13: UNDEFEATED AT SEA GOLDEN SUNRISE FINALE ---
im7 = Image.open(f"{scene_dir}\\scene_07.jpg").convert("RGB")
s13 = Image.new("RGB", (W, H), (18, 22, 30))

victory = im7.crop((0, int(H * 0.49), W, H)).resize((W, div_y), Image.Resampling.LANCZOS)
s13.paste(victory, (0, 0))

hero = im1.crop((0, int(H * 0.12), W, int(H * 0.68))).resize((W, H - div_y), Image.Resampling.LANCZOS)
r, g, b = hero.split()
r = r.point(lambda x: min(255, int(x * 1.14 + 14)))
g = g.point(lambda x: min(255, int(x * 1.05 + 6)))
hero = Image.merge("RGB", (r, g, b))
s13.paste(hero, (0, div_y))

draw13 = ImageDraw.Draw(s13, "RGBA")
draw13.rectangle([0, div_y - 8, W, div_y + 8], fill=(20, 24, 32, 255))
draw13.line([(0, div_y - 8), (W, div_y - 8)], fill=(235, 190, 75, 255), width=4)
draw13.line([(0, div_y + 8), (W, div_y + 8)], fill=(235, 190, 75, 255), width=4)

s13.save(f"{scene_dir}\\scene_13.jpg", quality=95)
s13.save(f"{art_dir}\\scene_13_ending.jpg", quality=95)
print("Saved scene_04.jpg and scene_13.jpg successfully!")
