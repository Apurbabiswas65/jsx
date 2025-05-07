import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))', // Main text/heading color
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))', // Primary action color
  				foreground: 'hsl(var(--primary-foreground))' // Text on primary bg
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))', // Secondary bg/borders
  				foreground: 'hsl(var(--secondary-foreground))' // Text on secondary bg
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))', // Muted bg
  				foreground: 'hsl(var(--muted-foreground))' // Muted text
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))', // Accent color for buttons/highlights
  				foreground: 'hsl(var(--accent-foreground))' // Text on accent bg
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: { // Sidebar specific theme variables
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
            // You can add specific navbar colors here if needed,
            // but the change was made to use general theme variables.
            // navbar: {
            //     background: 'hsl(var(--background))', // Example: Use main background
            //     foreground: 'hsl(var(--foreground))', // Example: Use main foreground
            // }
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
             // Add custom keyframes for animations
             'fade-in': {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
             },
             'fade-out': {
                 '0%': { opacity: '1' },
                '100%': { opacity: '0' },
            },
             'slide-in-from-bottom': {
                '0%': { transform: 'translateY(20px)', opacity: '0' },
                '100%': { transform: 'translateY(0)', opacity: '1' },
            },
             'slide-in-from-top': {
                 '0%': { transform: 'translateY(-20px)', opacity: '0' },
                '100%': { transform: 'translateY(0)', opacity: '1' },
            },
            'zoom-in': {
                 '0%': { transform: 'scale(0.95)', opacity: '0' },
                 '100%': { transform: 'scale(1)', opacity: '1' },
            },
             'zoom-out': {
                 '0%': { transform: 'scale(1)', opacity: '1' },
                 '100%': { transform: 'scale(0.95)', opacity: '0' },
            },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
             // Add custom animation utilities
             'fade-in': 'fade-in 0.5s ease-out forwards',
             'fade-out': 'fade-out 0.5s ease-out forwards',
             'slide-in-from-bottom': 'slide-in-from-bottom 0.5s ease-out forwards',
             'slide-in-from-top': 'slide-in-from-top 0.5s ease-out forwards',
             'zoom-in': 'zoom-in 0.3s ease-out forwards',
              'zoom-out': 'zoom-out 0.3s ease-out forwards',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
