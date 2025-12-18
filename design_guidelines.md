# Restaurant Management Application - Design Guidelines

## Design Approach

**Hybrid Approach**: Material Design System for admin dashboard (information density, clear hierarchy) + Food delivery app patterns (Uber Eats, DoorDash) for customer interface.

**Core Principles**:
- Admin Dashboard: Data clarity, quick scanning, efficient workflows
- Customer Interface: Appetite appeal, easy navigation, trust-building
- Universal: Clear status communication, mobile-first responsive design

---

## Typography

**Font Families**:
- Primary: Inter (UI elements, body text, data tables)
- Secondary: Playfair Display (restaurant name, section headers on customer side)

**Hierarchy**:
- Hero/Restaurant Name: text-4xl to text-6xl, font-bold
- Page Headers: text-2xl to text-3xl, font-semibold
- Section Headers: text-xl, font-semibold
- Card Titles: text-lg, font-medium
- Body/Labels: text-base, font-normal
- Small Data/Meta: text-sm, font-normal
- Micro Text: text-xs, font-normal

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4 to gap-6
- Margins between major sections: mb-8 to mb-12

**Container Widths**:
- Admin Dashboard: max-w-7xl (full workspace)
- Customer Menu: max-w-4xl (focused browsing)
- Forms/Modals: max-w-md to max-w-lg

---

## Component Library

### Admin Dashboard Components

**Table Status Cards** (3-4 column grid on desktop, 2 on tablet, 1 on mobile):
- Rounded corners (rounded-lg)
- Border with status-based accent (border-l-4)
- Compact padding (p-4)
- Table number (text-xl, font-bold)
- Status badge with dot indicator
- Order count chip
- Action button at bottom

**Order List Items**:
- Stacked layout with border-bottom dividers
- Order number + timestamp (text-sm, text-gray-600)
- Item details with quantity badge
- Price right-aligned
- Status tag (pill-shaped, color-coded)
- Action buttons inline (Accept/Reject or Process/Complete)

**Billing Interface**:
- Split layout: Left (items list), Right (calculation summary)
- Items in simple list format with quantities
- Input fields for discount/service charge (inline with real-time totals)
- Prominent total display (text-3xl, font-bold)
- Primary action button spans full width

**Navigation**:
- Top horizontal navbar with restaurant name, menu URL display with copy button, profile/logout
- Sidebar navigation for dashboard sections (Tables, Orders, Menu, Billing, Analytics)
- Active state with background highlight and left accent border

### Customer Interface Components

**Menu Category Tabs**:
- Horizontal scrollable tabs on mobile, full-width on desktop
- Active category with underline accent (border-b-2)
- Icons paired with category names
- Sticky positioning while scrolling

**Product Cards** (2 columns on mobile, 3-4 on desktop):
- Card format with prominent food image (aspect-ratio-4/3)
- Image fills card top portion
- Product name (text-lg, font-semibold)
- Price displayed prominently (text-xl, font-bold)
- Optional details collapsible
- "Add to Order" button at card bottom (full width)

**Cart/Order Summary**:
- Sticky bottom bar on mobile showing item count + total
- Expands to full sheet when tapped
- Desktop: Fixed right sidebar
- Clear line items with quantities (adjustable)
- Subtotal display
- Primary "Place Order" button

**Table Number Entry Screen**:
- Centered modal-style layout
- Large restaurant name header
- Numeric input field (large, text-2xl)
- Visual table illustration/icon
- Clear CTA button

**Order Tracking View**:
- Timeline/stepper component showing order progression
- Status badges (Pending, Accepted, Processing, Completed)
- Real-time updates with subtle animations
- Grouped by order timestamp

### Shared Components

**Status Badges**:
- Pill-shaped (rounded-full, px-3, py-1)
- Semantic colors: Vacant (gray), Active (green), Billing (yellow), Pending (orange), Completed (blue), Rejected (red)
- Text-xs, font-medium

**Buttons**:
- Primary: Solid fill, rounded-md, py-2.5 px-4, font-semibold
- Secondary: Outlined, same padding
- Danger: For reject/delete actions
- Text buttons: For secondary actions

**Form Inputs**:
- Consistent height (h-11)
- Border with focus ring
- Labels above inputs (text-sm, font-medium, mb-2)
- Error states with red accent + message below

**Modals/Dialogs**:
- Centered overlay with backdrop blur
- Max-width constraints (max-w-md to max-w-2xl)
- Header with title + close button
- Content area with comfortable padding (p-6)
- Footer with action buttons right-aligned

**Analytics Charts**:
- Bar/line charts for sales trends
- Card-based metric displays (Today's Sales, Top Items)
- Date range selector
- Export functionality

---

## Images

**Customer Interface**:
- Food product images for each menu item (square format, high-quality, professional photography)
- Placeholder image system for items without photos

**Admin Dashboard**:
- QR code dynamically generated for menu URL
- Icon-based UI (no decorative images needed)

**No large hero image required** - Application prioritizes functionality over marketing appeal.

---

## Critical Implementation Notes

- **Real-time Updates**: Visual feedback for order status changes (subtle pulse animation on new orders)
- **Mobile Priority**: Customer interface must be fully functional on mobile devices
- **Accessibility**: Color-blind safe status indicators (use icons + color), keyboard navigation for admin dashboard
- **Performance**: Lazy load menu images, optimize for quick table scanning on admin dashboard
- **Print Styles**: Ensure bills print cleanly with proper formatting