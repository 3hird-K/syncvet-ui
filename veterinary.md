Act as a senior full-stack engineer, UX/UI designer, and government information-system architect with 10+ years of experience.

I already have an existing veterinary management system with:

- Authentication already implemented
- User roles/auth already implemented
- Dashboard already implemented
- Existing database/backend already connected
- Existing project structure and UI components

DO NOT rebuild the authentication system.
DO NOT replace my existing architecture.
DO NOT unnecessarily rewrite working code.

Your task is to inspect the existing project first, understand its current architecture, database schema, routes, components, authentication, and dashboard, then improve and extend the existing dashboard into a realistic LGU Veterinary Management Information System inspired by the workflow of the Cagayan de Oro City Veterinary Office (CVO).

The goal is to make the system feel like an actual government veterinary office system, not a commercial private veterinary clinic.

==================================================

1. # REAL-WORLD SYSTEM CONTEXT

The system should support the operational workflow of a City Veterinary Office:

A. Walk-in government veterinary services

- Pet registration
- Owner registration
- Free veterinary consultation
- Anti-rabies vaccination
- Basic treatment
- Vaccination records
- Veterinary Health Certificate requests
- Follow-up records

B. Community/Barangay operations

- Barangay vaccination drives
- Mass anti-rabies vaccination
- Spay/neuter events
- Livestock services
- Disease surveillance
- Field worker data collection
- Offline-capable field data collection where appropriate

C. Veterinary office administration

- Patient/animal records
- Owner records
- Consultations
- Vaccinations
- Medical records
- Inventory
- Vaccine batch tracking
- Expiration monitoring
- Reports
- Statistics

D. Animal control and regulatory operations

- Stray/impounded animal records
- Animal redemption
- Adoption status
- Incident/case records
- Regulatory inspection records

================================================== 2. FIRST: AUDIT THE EXISTING PROJECT
==================================================

Before modifying anything:

1. Inspect the complete project structure.
2. Identify:
   - Framework
   - Database
   - Authentication provider
   - API/backend architecture
   - Existing dashboard components
   - Existing tables/models
   - Existing routes
   - Existing reusable UI components
   - Existing design system
3. Determine what is already implemented.
4. Reuse existing components and patterns whenever possible.
5. Do not create duplicate components or duplicate database models.
6. Do not introduce a new library if an existing dependency already solves the problem.
7. Do not modify authentication unless absolutely necessary.
8. Preserve existing working functionality.

After inspecting the project, create a short implementation plan before making major changes.

================================================== 3. DASHBOARD REDESIGN
==================================================

Transform the dashboard into a Veterinary Office Command Center.

The dashboard should immediately show the current operational status of the veterinary office.

Recommended dashboard structure:

HEADER

- Current date
- Current user
- Role
- Notifications
- Quick search
- Office/system status

SUMMARY CARDS

- Total Registered Animals
- Registered Owners
- Today's Consultations
- Today's Vaccinations
- Pending Requests
- Low Stock Items
- Expiring Vaccines
- Active Field Operations

MAIN DASHBOARD

Section 1 — Today's Operations

Show:

- Today's consultations
- Today's vaccinations
- Upcoming appointments/events
- Pending certificate requests
- Pending service requests

Use status badges such as:

- Pending
- Confirmed
- In Progress
- Completed
- Cancelled

Section 2 — Public Health Overview

Display:

- Rabies vaccinations this month
- Animals vaccinated this year
- Barangays covered
- Upcoming vaccination drives
- Reported animal bite incidents
- High-priority barangays

Section 3 — Inventory Alerts

Show:

- Low-stock vaccines
- Low-stock medicines
- Expiring vaccines
- Expired inventory

Example:

Rabies Vaccine
Stock: 12 vials
Minimum: 20
Status: LOW STOCK

Tetanus Vaccine
Expires: 2026-11-10
Status: EXPIRING SOON

Section 4 — Barangay Operations

Show a map/statistical visualization of barangay activities.

Examples:

- Barangays vaccinated
- Animals vaccinated per barangay
- Animal population
- Rabies cases
- Upcoming field deployments

Do not fabricate geographic data.
Use actual database data where available.

Section 5 — Recent Activity

Show a timeline:

08:42 AM
Animal vaccinated
Owner: Juan Dela Cruz
Pet: Max

09:10 AM
New consultation
Pet: Bruno

10:25 AM
Veterinary Health Certificate requested

================================================== 4. PATIENT / ANIMAL MANAGEMENT
==================================================

Create a unified animal registry.

The relationship should conceptually be:

OWNER
└── ANIMAL 1
└── ANIMAL 2
└── ANIMAL 3

Animal profile should support:

- Animal ID
- QR code
- Name
- Species
- Breed
- Sex
- Date of birth / estimated age
- Color
- Weight
- Photo
- Owner
- Barangay
- Address
- Classification
  - Domestic
  - Livestock
- Vaccination status
- Sterilization status
- Medical history
- Consultation history

Animal profile should have tabs:

Overview
Medical Records
Vaccinations
Consultations
Treatments
Certificates
Appointments
Activity History

Make the animal profile feel like an electronic veterinary record.

================================================== 5. OWNER MANAGEMENT
==================================================

Create an owner registry.

Owner profile:

- Owner ID
- Full name
- Contact number
- Address
- Barangay
- Residency verification status
- Registered animals
- Consultation history
- Vaccination history
- Certificates
- Service requests

Allow one owner to have multiple animals.

================================================== 6. CONSULTATION / EMR MODULE
==================================================

Create a clean veterinary consultation workflow.

Veterinarian should be able to record:

- Chief complaint
- Symptoms
- Physical examination
- Vital information
- Diagnosis
- Treatment
- Medication
- Dosage/instructions
- Veterinarian notes
- Follow-up date

Consultation lifecycle:

WAITING
→ IN CONSULTATION
→ TREATMENT
→ COMPLETED

Make the interface optimized for fast encoding.

Avoid making vets fill unnecessary fields.

================================================== 7. VACCINATION MODULE
==================================================

Create a vaccination management workflow.

Support:

- Vaccine type
- Vaccine name
- Batch/Lot number
- Manufacturer
- Date administered
- Expiration date
- Dose
- Route
- Veterinarian
- Animal
- Next vaccination date

For anti-rabies vaccination specifically:

Record:

- Vaccine brand
- Batch number
- Date vaccinated
- Next due date
- Vaccinator
- Certificate number

Automatically calculate the next recommended vaccination date where appropriate.

Display vaccination status:

UP TO DATE
DUE SOON
OVERDUE

================================================== 8. VETERINARY HEALTH CERTIFICATE
==================================================

Add a certificate management system.

Allow authorized staff to:

- Create certificate
- Generate certificate number
- Generate QR code
- Preview certificate
- Print certificate
- Download PDF if supported by the existing system
- Verify certificate

Certificate should reference:

Owner
Animal
Species
Breed
Vaccination information
Certificate number
Issue date
Validity date
Issuing veterinarian
Office information

QR code should point to a verification page.

Example:

/verify/certificate/{certificateNumber}

The verification page should show only appropriate public verification information.

Do not expose private owner information unnecessarily.

================================================== 9. INVENTORY MANAGEMENT
==================================================

Create a government veterinary inventory module.

Categories:

- Vaccines
- Medicines
- Medical supplies
- Surgical supplies
- Equipment

Track:

- Item name
- Category
- Quantity
- Unit
- Batch number
- Supplier/source
- Date received
- Expiration date
- Minimum stock
- Storage location
- Status

Statuses:

IN STOCK
LOW STOCK
OUT OF STOCK
EXPIRING
EXPIRED

Important:

Use FEFO where appropriate:

First Expire, First Out.

Vaccines with the nearest expiration date should be prioritized.

================================================== 10. BARANGAY / FIELD OPERATIONS
==================================================

Create a Barangay Operations module.

Allow staff to create a field activity:

Example:

Activity:
Mass Anti-Rabies Vaccination

Barangay:
Barangay Carmen

Date:
October 15, 2026

Team:
Veterinary Field Team A

Target:
500 animals

Track:

- Registered animals
- Vaccinated animals
- Dogs vaccinated
- Cats vaccinated
- Other animals
- Vaccine consumption
- Remaining vaccine stock
- Field personnel
- Location
- Start/end time

Dashboard should show:

Target: 500
Vaccinated: 372
Progress: 74.4%

================================================== 11. OFFLINE FIELD DATA COLLECTION
==================================================

If the existing technology stack supports it, design the field workflow to support offline data entry.

Field workers should be able to temporarily record:

- Owner
- Animal
- Barangay
- Vaccine
- Batch number
- Vaccination date

When internet becomes available:

OFFLINE RECORDS
→ SYNC QUEUE
→ SERVER
→ CONFIRMED

Clearly show:

Synced
Pending Sync
Sync Failed

Do not implement complicated offline infrastructure unless it fits the existing architecture.

If offline support would require a major architectural change, explain the recommended approach first instead of blindly implementing it.

================================================== 12. SERVICE REQUESTS
==================================================

Create a citizen/service request workflow.

Possible services:

- Veterinary consultation
- Anti-rabies vaccination
- Spay/neuter
- Veterinary Health Certificate
- Livestock service
- Animal complaint
- Animal rescue/control request

Request lifecycle:

SUBMITTED
→ REVIEWING
→ APPROVED
→ SCHEDULED
→ COMPLETED

Allow staff to see:

- Requester
- Animal
- Barangay
- Service
- Requested date
- Status
- Assigned staff

================================================== 13. ANIMAL CONTROL
==================================================

Create an Animal Control module.

Track:

- Case ID
- Animal
- Date captured
- Location
- Barangay
- Reason
- Officer
- Impound location
- Status

Statuses:

IMPOUNDED
CLAIMED
RELEASED
ADOPTED
TRANSFERRED
CLOSED

Include an animal timeline so staff can understand what happened to the animal.

================================================== 14. REPORTS & ANALYTICS
==================================================

Create a reports section.

Reports should include:

Animal population
Vaccination statistics
Rabies vaccination coverage
Barangay vaccination coverage
Consultation statistics
Medicine consumption
Vaccine consumption
Inventory status
Expiring inventory
Animal control cases
Spay/neuter statistics
Monthly/annual service statistics

Filters:

- Date range
- Barangay
- Species
- Service
- Vaccine
- Status

Use charts only when they communicate useful information.

Do not create charts just for visual decoration.

================================================== 15. SEARCH
==================================================

Create a global search.

Search across:

- Animals
- Owners
- Certificates
- Consultations
- Vaccinations
- Service requests
- Animal control cases

Search should support:

Animal name
Owner name
Animal ID
Owner ID
Certificate number
Contact number
QR code where applicable

================================================== 16. UI / UX REQUIREMENTS
==================================================

The design should look like a modern government information system.

Style:

- Clean
- Professional
- Accessible
- Trustworthy
- Modern
- Data-focused
- Responsive

Avoid:

- Excessive gradients
- Excessive animations
- Gaming-style UI
- Overly rounded cards everywhere
- Huge decorative elements
- Fake statistics
- Unnecessary dashboards within dashboards

Use the project's existing design system whenever possible.

Prioritize:

Information hierarchy
Fast data entry
Readable tables
Clear status indicators
Accessible forms
Responsive layouts
Keyboard-friendly workflows

The system should work well on:

Desktop
Tablet
Mobile

================================================== 17. ROLE-BASED DASHBOARDS
==================================================

Adapt the dashboard according to user role.

ADMIN

Show:

- Overall statistics
- Staff activity
- Inventory
- Reports
- Barangay operations
- System activity

VETERINARIAN

Show:

- Today's consultations
- Patients
- Vaccinations
- Medical records
- Pending cases

FIELD WORKER

Show:

- Assigned field activities
- Barangay deployments
- Offline records
- Sync status
- Vaccination workload

STAFF

Show:

- Service requests
- Registrations
- Certificates
- Appointments
- Daily operations

Do not show unauthorized information.

================================================== 18. DATA INTEGRITY
==================================================

Important:

Never generate fake production data.

If seed/demo data is needed, clearly label it as demo data.

Use proper relationships between:

Owner
Animal
Consultation
Vaccination
Vaccine Batch
Inventory
Certificate
Service Request
Barangay
Field Activity
Animal Control Case

Avoid duplicated data where a relational reference should be used.

================================================== 19. AUDIT LOG
==================================================

For government operations, important actions should be auditable.

Track:

- User
- Action
- Record
- Timestamp
- Previous value where appropriate
- New value where appropriate

Examples:

"Admin updated vaccine stock"

"Veterinarian created consultation"

"Staff issued Veterinary Health Certificate"

"Field Worker synchronized 42 vaccination records"

================================================== 20. IMPORTANT IMPLEMENTATION RULE
==================================================

Do not attempt to implement every feature at once.

First:

1. Inspect existing application.
2. Identify current functionality.
3. Identify reusable components.
4. Identify missing database entities.
5. Design the improved dashboard.
6. Implement the highest-value modules first.

Recommended implementation priority:

PHASE 1

- Dashboard
- Owner registry
- Animal registry
- Consultation
- Vaccination

PHASE 2

- Inventory
- Certificate generation
- Service requests

PHASE 3

- Barangay field operations
- Offline synchronization
- Animal control

PHASE 4

- Reports
- Analytics
- Advanced audit logs

For every feature, make sure it integrates with the existing application instead of creating an isolated mock interface.

==================================================
FINAL REQUIREMENT
==================================================

Before writing code, inspect the existing codebase and explain:

1. What already exists
2. What should be reused
3. What needs improvement
4. What database changes are required
5. What routes/pages/components need to be added
6. What should be implemented first

Then proceed with implementation.

Do not destroy working functionality.

Do not replace the existing authentication.

Do not use fake API responses when a real backend/database exists.

Do not create unnecessary dependencies.

Make the final system feel like a real City Veterinary Office Management Information System suitable for an LGU environment.
