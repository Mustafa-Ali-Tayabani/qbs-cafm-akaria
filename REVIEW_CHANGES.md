# 22 Oct review fixes

1. **Ajeek Onboarding → SLA.** The nav item is now "SLA" (Service Level Agreements) with its own icon, in AKARIA navy/blue with no Ajeek wording or teal. There is no login: SLA Registration is a simple one-page form with a Partner / Sub-contractor switch. Tabs: SLA Registration · Applications · SLA Rules · SLA Agreement. SLA screens were removed from Contractors and Governance so they live in one place.
2. **Sidebar navigation.** On short screens the lower items were off-screen and could not be reached. The nav list now scrolls, and the hover shift is gone.
3. **Filters.** Register toolbars now show Search · Filters · Columns · Export. Clicking Filters opens a panel with aligned, labelled dropdowns, date ranges, toggles and saved views. A badge shows how many filters are active. The mobile app job list works the same way.
4. **View screens instead of popups.** "View" (and every "open record" link) opens a full page with Back, breadcrumb, status pills, a Details card with readable labels and dates, Linked records and Activity. Back returns you to where you were, with tabs and filters kept.
5. **Overview.** One aligned tab row: Operations · Asset Executive · Supervisor · KPI Targets · Notifications. The nested second row is gone.
6. **Removed non-working controls.** "All demo dates" (did nothing) and "Original reference views" (legacy screens) are removed, along with the code behind them.
7. **Polish.** Each module has its own subtitle. Field labels are readable ("Site", not "site ID"; "Next due", not "next Due at"). Status pills are colour-coded. Sort arrows show direction. The seed SLA agreement text has been rewritten.

All new styles are in `src/review-fixes.css`, which loads last. Click **Reset demo data** once to load the new seed SLA text in a browser that already has saved demo data.

# 22 Oct (afternoon): connected workflow, apps and portals

8. **Role-based login.** One sign-in form routes the account to its workspace:
   - `@akaria.sa` email → web portal
   - technician ID `KR-1042` → technician app
   - registered partner email (for example `service@gulfhvac.sa`) → Partner Portal

   New partners use "Register for an SLA" on the login page. In production this maps to SSO roles.
9. **Partner Portal, separate from the FM portal.** It has its own layout and covers: SLA registration for new partners, application status tracking, the partner's work orders and SLA status, their assigned SLA, contracts, the published agreement, and the company profile. The FM portal's SLA module keeps only the review side: Applications, SLA Rules and SLA Agreement.
10. **Technician app** (`src/TechnicianApp.tsx`), shown in an iPhone 17 Pro Max frame and re-themed to AKARIA from the Shaker design. Screens: in-app login, assigned jobs, calendar, job detail with linked SR / machine / PPM, accept, go to job (route and GPS arrival), QR scan with machine details and history, checklist, perform job (timer, root cause, diagnosis), spare parts (issued from stock with cost charged to the asset, or a purchase request when out of stock), photos (camera or sample), signature sign-off and close. There are also Scan, Alerts and Profile tabs.
11. **Mobile App removed from the web portal menu.** The technician app runs on the same records, so every action shows up in the web portal under Khalid's name.
12. **Work order trace on WO and SR views:** Raise → Classify → Assign → Execute → Evidence → Confirm → Report, with time-stamps, actors, linked chips (SR number, WO, machine, assignee, site), photos, parts and cost. The WO register now shows Request, Asset and Assignee columns.
13. **Create contractor → SLA assignment → Review** (`src/ContractorOnboard.tsx`).
    - Pick an SLA tier (Standard, Priority, Premium or Custom) and adjust response/resolution minutes per priority.
    - Set the penalty per breach and optionally create the contract.
    - The contractor view shows an **Assigned SLA** card with a **Change SLA** button.
14. **Store:** each audit event records the real actor. Changes apply synchronously, so chained actions such as sign-off then close work. The storage key was bumped to v6, so existing browsers load the new sample data.
