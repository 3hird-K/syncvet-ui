Act as a Senior Frontend Engineer, Senior UX/UI Designer, Senior Clerk Authentication Specialist, and Full-Stack Developer with 10+ years of experience in building modern, secure, and high-conversion web applications.

Design and implement a premium, modern, and trustworthy authentication page for SyncVet, an integrated animal health management and predictive resource forecasting platform for municipal veterinary offices and pet owners.

About SyncVet

SyncVet is built with Next.js and digitizes veterinary services such as:

Pet registration with QR-coded digital pet passports
Vaccination and clinical record management
Veterinary inventory and vaccine stock tracking
Mobile field vaccination drives
AI-powered vaccine demand forecasting
Barangay-level rabies risk analysis

The authentication page should reflect:

Trust
Government-grade reliability
Healthcare professionalism
Modern technology
Warm pet-friendly experience
Authentication Requirements
Google Sign-In only
Use Clerk Authentication
Read all Clerk keys and configuration from .env.local
Follow Clerk best practices for security, session handling, middleware, and protected routes
Keep implementation clean, scalable, and production-ready
Design Requirements

Create a design inspired by premium SaaS products from Dribbble and modern healthcare platforms:

Minimal, elegant, and highly polished UI
Soft shadows and subtle glassmorphism
Smooth micro-interactions and animations
Responsive design for desktop, tablet, and mobile
Professional typography
Large visual hierarchy
Government + healthcare + pet care aesthetic
Layout

Left Section (Desktop):

High-quality illustration or animated scene showing:
Veterinarian
Pets (dog, cat, birds, livestock if applicable)
QR pet passport
Vaccination icons
Analytics dashboard
Smart forecasting visuals

Include a short message:

"Modern Animal Health Management for Communities"

or

"Digitizing Veterinary Services Through Data, Care, and Innovation."

Right Section:

Clean authentication card
SyncVet logo
Short welcome text
Single premium Google Sign-In button
Terms & Privacy links
Loading states and smooth transitions
User Experience

The login process should feel:

Fast
Secure
Friendly
Official
Simple (one-click authentication)
Clerk Implementation

Implement:

ClerkProvider
Middleware route protection
Google OAuth strategy
Session management
Redirect after login
User metadata support

Use environment variables from .env:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=
Post-Login Flow

After successful login:

Check whether the user already has owner and pet metadata.
If profile is incomplete:
Redirect to onboarding.
If profile exists:
Redirect directly to the dashboard.
Technical Stack
Next.js App Router
TypeScript
Tailwind CSS
shadcn/ui
Clerk Authentication
Framer Motion for animations
Deliverables

Provide:

Complete UI/UX structure
Component hierarchy
Responsive layout
Clerk implementation example
Folder structure
Animation suggestions
Accessibility improvements
Production-ready code architecture

The final authentication page should feel like a combination of:
Google + Stripe + Notion + modern healthcare SaaS + pet care platform, resulting in a premium, trustworthy, and delightful first impression for SyncVet users.
