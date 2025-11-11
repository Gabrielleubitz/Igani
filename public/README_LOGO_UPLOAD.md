# 📁 Logo Upload Instructions

## Quick Start

Simply place your logo file in this `/public` folder with one of these filenames:

### Recommended (in order of preference):
1. **`logo.svg`** - Best choice! Scales perfectly at any size
2. **`logo.png`** - Good choice with transparent background
3. **`logo.webp`** - Modern format, great compression

### Also supported:
- `logo.jpg` or `logo.jpeg` - Works but no transparency

## Steps to Upload Your Logo

### Option 1: Drag and Drop (Easiest)
1. Open this folder in Finder: `/Users/GabrielLeubitz/Downloads/igani/public/`
2. Drag your logo file into this folder
3. Rename it to one of the supported names above (e.g., `logo.png`)
4. Refresh your browser - the logo will appear automatically!

### Option 2: Using Terminal
```bash
# From your project root
cp /path/to/your/logo.png public/logo.png
```

### Option 3: Using VS Code / IDE
1. Navigate to `public/` folder in your IDE
2. Right-click → "Reveal in Finder" (or File Explorer)
3. Copy your logo file here and rename it

## Logo Specifications

### Recommended Dimensions:
- **Width:** 150-300px
- **Height:** 40-80px
- **Format:** SVG (preferred) or PNG with transparency

### File Size:
- Keep under 50KB for fast loading
- SVG files are usually very small (<10KB)

## How It Works

The `IganiLogo` component automatically:
1. Checks if any logo file exists (tries `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`)
2. If found, displays your uploaded logo
3. If not found, shows the animated "I|I Igani" text logo

## After Uploading

Once you upload your logo:
- ✅ It will appear in the **header** (top navigation)
- ✅ It will appear in the **footer** (bottom of page)
- ✅ No code changes needed!
- ✅ Just refresh your browser

## Testing

After uploading, check:
- http://localhost:3001 (your homepage)
- Scroll to top to see header logo
- Scroll to bottom to see footer logo

---

**Current Location:** `/Users/GabrielLeubitz/Downloads/igani/public/`

You can delete this README file after uploading your logo.
