# Favicon Generation Instructions

Your SVG favicon doesn't display in Safari. To fix this, you need to generate PNG and ICO versions.

## Quick Fix - Use Online Tool

1. Go to: https://realfavicongenerator.net/
2. Upload your `/public/favicon.svg` file
3. Download the generated favicon package
4. Extract and place these files in `/public/`:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`

## Alternative - Manual Conversion

If you have design software (Figma, Photoshop, Sketch):
1. Open `favicon.svg`
2. Export as PNG in these sizes:
   - 16x16px → `favicon-16x16.png`
   - 32x32px → `favicon-32x32.png`
   - 180x180px → `apple-touch-icon.png`
3. Convert the 32x32 PNG to ICO format (use an online tool like convertio.co)

## Files Needed

Place these in the `/public/` directory:
- `favicon.ico` (16x16 or 32x32, ICO format)
- `favicon-16x16.png` (16x16, PNG)
- `favicon-32x32.png` (32x32, PNG)
- `apple-touch-icon.png` (180x180, PNG)

The metadata in `app/layout.tsx` has already been updated to use these files.
