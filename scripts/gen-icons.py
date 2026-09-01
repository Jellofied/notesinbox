from PIL import Image, ImageDraw


def make_icon(size, radius_ratio=0.22):
    bg = "#faf9f7"
    surface = "#292524"
    accent = "#d97706"
    img = Image.new("RGB", (size, size), bg)
    draw = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    margin = int(size * 0.15)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin], radius=r, fill=surface
    )
    bar_h = max(1, int(size * 0.08))
    bar_y = int(size * 0.34)
    bar_margin = int(size * 0.28)
    draw.rounded_rectangle(
        [bar_margin, bar_y, size - bar_margin, bar_y + bar_h],
        radius=bar_h // 2,
        fill=accent,
    )
    return img


make_icon(192).save("public/icons/icon-192x192.png")
make_icon(512).save("public/icons/icon-512x512.png")
make_icon(180, radius_ratio=0.24).save("public/apple-icon.png")
print("icons created")
