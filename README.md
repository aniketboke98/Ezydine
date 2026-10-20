# EzyDine Mobile App (React Native Expo TypeScript)

A mobile restaurant management & POS billing application built with React Native Expo and TypeScript, faithful to the design specifications and brand guidelines.

---

## 🎨 Color Palette

| Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Primary Red** | `#D92F43` | Primary action buttons, badges, active tabs, highlight bars |
| **Deep Red** | `#B82035` | Gradients, pressed button states |
| **Navy** | `#0B1B29` | Splash background, card backgrounds, primary typography |
| **Background** | `#F7F8FA` | App screen background |
| **White** | `#FFFFFF` | Card surfaces, container backgrounds, icon contrasts |
| **Secondary Text** | `#64748B` | Labels, metadata, timestamps, subheaders |
| **Border** | `#E2E8F0` | Dividers, card borders, input borders |
| **Success Green** | `#16A34A` | Sales growth indicators, veg badges, ready status |
| **Warning Orange** | `#F59E0B` | Low inventory warnings, ingredient alerts |

---

## 📱 Implemented Screens

1. **Splash Screen**
   - Deep Navy `#0B1B29` backdrop with subtle concentric ambient rings
   - Red squircle EzyDine emblem with fork & knife monogram
   - *"Smart Billing, Simple Business"* tagline with red accent indicator
   - Cutlery badge & restaurant rhythm slogan

2. **Sign In Screen**
   - Clean white card layout with brand mark
   - *"A fresh start. A smoother service."* hero typography
   - Mobile / Email and Password input fields with eye password visibility toggle
   - Forgot password link and Red `→ Sign in` button
   - Security assurance shield badge & customer support link

3. **Dashboard ("The Curry House")**
   - Outlet header with location, date, and notification bell
   - **Today's sales**: Navy card with `₹24,780` & `↗ 12.4% vs yesterday`
   - **Total bills**: `48` bills with `Avg. ₹516.25`
   - Prominent Primary Red `+ Start quick billing` action button
   - Quick action cards: Tables, Kitchen, Reports
   - **Sales Summary Bar Chart**: 12-day breakdown with 18 Oct highlighted in red
   - **Low Stock Alert**: Warning banner for Paneer, basmati rice, and cooking oil
   - **Recent Transactions**: Filterable table list with bill numbers and amounts

4. **New Bill / Quick POS Billing Screen**
   - Header with active bill `#1048` and bill history icon
   - Table / Order selector dropdown (Dine-in Table 04, Table 01, Takeaway, etc.)
   - Cart badge indicator (`Cart · 5`)
   - Food search bar with real-time text filter
   - Category filter pills: *All items*, *Starters*, *Mains*, *Drinks*
   - 2-Column food item grid:
     - High-quality dish photos
     - Veg / Non-veg indicators
     - Live increment/decrement quantity badges
   - Sticky bottom billing bar with live item count, tax calculation, and `→ Checkout` button
   - Interactive checkout modal with UPI QR, Cash, and Card settlement

1. **Splash Screen** - Deep Navy `#0B1B29` backdrop with stylized cutlery monogram and slogan
2. **Sign In Screen** - Modern credential inputs with password eye toggle & security badge
3. **Dashboard Screen** - The Curry House metrics, Today's sales (`₹24,780`), 12-day sales bar chart, low stock alert
4. **Tables Floor Plan Screen** - Main floor 6 tables with live status counters (2 Available, 3 Occupied, 1 Reserved) & floating selection bar
5. **New Bill Screen (POS Grid)** - Table selection, search bar, veg/non-veg dish cards with quantity badges
6. **Bill Details Screen** - Dish list with interactive `[ -  qty  + ]` steppers, discount calculation (`- ₹40.00`), GST
7. **Collect Payment Screen** - Cash drawer calculator, change return calculation (`₹70.00`), UPI QR suggestion
8. **Receipt Screen** - Bill #1048 thermal receipt slip, breakdown, Share & Thermal Print actions, and `+ New bill`
9. **Kitchen Orders Queue Screen** - Live KOT queue (3 tickets) with Pending, Preparing, Ready status advancement & printer pairing
10. **Inventory & Stock Screen** - Stock value (`₹18,420`), 3 low-stock ingredient alerts, vendor purchase order logs (`PO-086`)
11. **Sales & Reports Screen** - Daily/Weekly/Monthly breakdown, UPI/Cash/Card split bars, expenses card, and bill history
12. **Menu Management Screen** - Instant live toggle switches for dish availability, category filter, edit dish, and `+ Add food item`
13. **Profile & Settings Screen** - Restaurant details, GST configuration, staff management, Bluetooth thermal printer settings (58mm/80mm), receipt settings, and logout
14. **My Subscription Screen** - Current plan (Growth · Active), 16 days left countdown, team usage progress bars (Outlets 1/2, Users 4/10)
15. **Upgrade & Renewal Screen** - Prorated upgrade comparison (Growth vs Premium), prorated credit calculation, and `Confirm upgrade · ₹1,339.81`
16. **Subscription History Screen** - Payment history records, invoice downloads, and Paid / Failed status filters
17. **Subscription Expired Screen** - Restricted features list (locked bills, paused KOTs), manual renewal notice, and renew CTA
18. **Subscription Plans Screen** - Monthly vs Yearly (save 15%) billing toggle with Starter, Growth (Recommended), and Premium
19. **Plan Details Screen** - Dark Navy banner, team features list, and GST breakdown
20. **Checkout & Payment Screen** - Live editable coupon input (SAVE10 discount, or WELCOME20 expired error state), payment method tiles
21. **Payment Processing Screen** - Animated spinner circle, attempt reference, and checking payment state
22. **Payment Verification Screen** - Clock icon, pending verification alert, and check status CTA
23. **Payment Unsuccessful Screen** - Failed transaction badge, debited alert, retry payment, and check status options
24. **Payment Successful Screen** - Animated checkmark, subscription reference `ED2610180842`, and invoice download

---

## 🚀 Running the App

### 1. Start the Expo Development Server
```bash
npx expo start
```

### 2. Run on Device / Simulator
- **iOS Simulator**: Press `i` in the terminal or run `npm run ios`
- **Android Emulator**: Press `a` in the terminal or run `npm run android`
- **Expo Go (Physical Device)**: Scan the QR code displayed in the terminal with the Expo Go app (iOS Camera or Android Expo Go)
- **Web Browser**: Press `w` in the terminal or run `npm run web`

---

## 🛠️ Verification Commands
```bash
npx tsc --noEmit     # TypeScript typechecking
npx expo-doctor      # Health and dependency check (20/20 passing)
```
