// Template file paths configuration
// Update these paths based on the actual structure of the template repository

export const TEMPLATE_PATHS = {
  // Content files - where the generated copy should be injected
  CONTENT: {
    SITE: 'content/site.json', // or data/content.json, src/data/site.json
    EMAILS: 'content/emails.json', // or data/emails.json
    SMS: 'content/sms.json', // or data/sms.json
  },
  
  // Branding/theme files
  BRANDING: {
    THEME: 'theme.json', // or config/theme.json, src/theme.json
    COLORS: 'styles/colors.json', // or config/colors.json
  },
  
  // Asset directories
  ASSETS: {
    LOGOS: 'public/assets/logos', // or assets/images, public/images
    IMAGES: 'public/assets/images', // or assets/images, public/images  
    BRANDING: 'public/branding', // or assets/branding
  },
  
  // Configuration files
  CONFIG: {
    ENV_EXAMPLE: '.env.example',
    PACKAGE_JSON: 'package.json',
    README: 'README.md',
  }
}

// Alternative common structures - update based on actual repo structure
export const ALTERNATIVE_PATHS = {
  // If using src-based structure
  SRC_BASED: {
    CONTENT: 'src/data/content.json',
    EMAILS: 'src/data/emails.json', 
    SMS: 'src/data/sms.json',
    THEME: 'src/config/theme.json',
  },
  
  // If using data directory
  DATA_BASED: {
    CONTENT: 'data/content.json',
    EMAILS: 'data/emails.json',
    SMS: 'data/sms.json', 
    THEME: 'data/theme.json',
  },
  
  // If using config directory
  CONFIG_BASED: {
    CONTENT: 'config/content.json',
    EMAILS: 'config/emails.json',
    SMS: 'config/sms.json',
    THEME: 'config/theme.json', 
  }
}

// Helper function to get file paths based on template structure
export function getTemplatePaths(structure: 'default' | 'src' | 'data' | 'config' = 'default') {
  switch (structure) {
    case 'src':
      return ALTERNATIVE_PATHS.SRC_BASED
    case 'data':
      return ALTERNATIVE_PATHS.DATA_BASED
    case 'config':
      return ALTERNATIVE_PATHS.CONFIG_BASED
    default:
      return TEMPLATE_PATHS.CONTENT
  }
}