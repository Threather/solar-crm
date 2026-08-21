# Graph Report - solar-crm  (2026-08-17)

## Corpus Check
- Corpus is ~10,425 words - fits in a single context window. You may not need a graph.

## Summary
- 207 nodes · 338 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.78)
- Token cost: 52,087 input · 0 output

## Community Hubs (Navigation)
- Core Helpers And Vocabularies
- Leads Table And Creation
- Lead Detail And Quotations
- Finance And Payments
- App Shell And Keepalive
- Admin, EDC And Routing
- Reports And CSV Export
- Today Home Page
- Notifications And Bell
- Auth And Boot Sequence
- Quotation Document
- EDC Eligibility Rules
- No-Build Design Decisions
- Sidebar Navigation
- Lead Fetch And Toast
- Qualification Derivation
- Supabase Configuration
- Cambodia Geography Data

## God Nodes (most connected - your core abstractions)
1. `go()` - 11 edges
2. `renderFinance()` - 11 edges
3. `finDue()` - 8 edges
4. `homeSales()` - 8 edges
5. `paintLeads()` - 8 edges
6. `boot()` - 7 edges
7. `finPaid()` - 7 edges
8. `drawFinance()` - 7 edges
9. `homeFinance()` - 7 edges
10. `drawTable()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Ping database step` --semantically_similar_to--> `doLogin (onclick target)`  [INFERRED] [semantically similar]
  .github/workflows/keepalive.yml → index.html
- `renderEdc()` --indirect_call--> `edcApplies()`  [INFERRED]
  app-edc.js → app-core.js
- `boot()` --indirect_call--> `loadBells()`  [INFERRED]
  app-core.js → app-notify.js
- `go()` --indirect_call--> `renderFinance()`  [INFERRED]
  app-core.js → app-finance.js
- `go()` --indirect_call--> `renderHome()`  [INFERRED]
  app-core.js → app-home.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Global-script boot chain** — index_config_js, index_supabase_js_client, index_app_core_js, index_app_start_js, index_script_load_order [EXTRACTED 0.90]
- **Sign-in and sign-out surface** — index_login_view, index_dologin, index_dologout, index_app_core_js [INFERRED 0.85]
- **Free-tier keepalive pattern** — _github_workflows_keepalive_keep_supabase_awake, _github_workflows_keepalive_ping_database, _github_workflows_keepalive_lead_stages_rest_endpoint, _github_workflows_keepalive_free_tier_pause_prevention [EXTRACTED 0.90]

## Communities (19 total, 4 thin omitted)

### Community 0 - "Core Helpers And Vocabularies"
Cohesion: 0.05
Nodes (29): BATTERY_BRANDS, BOQ_STATUS, CHANNELS, COMMS, CONTRACT_STATUS, CUSTOMER_TYPES, EARLY_STAGES, EDC_LARGE (+21 more)

### Community 1 - "Leads Table And Creation"
Cohesion: 0.17
Nodes (18): activeStats(), drawLostTable(), drawTable(), drawWonTable(), filteredLeads(), geoDist(), geoProv(), lostStats() (+10 more)

### Community 2 - "Lead Detail And Quotations"
Cohesion: 0.22
Nodes (16): addQuot(), closeLead(), dDist(), dKwp(), dProv(), kwp(), logActivity(), markLockable() (+8 more)

### Community 3 - "Finance And Payments"
Cohesion: 0.29
Nodes (16): addPayment(), deletePayment(), drawFinance(), exportFinance(), filteredFin(), finDue(), finFees(), finFollowDue() (+8 more)

### Community 4 - "App Shell And Keepalive"
Cohesion: 0.15
Nodes (17): Free-tier pause prevention, Keep Supabase awake workflow, lead_stages REST endpoint, Ping database step, Publishable anon key in CI, app-core.js, app-notify.js, app-start.js (+9 more)

### Community 5 - "Admin, EDC And Routing"
Cohesion: 0.17
Nodes (11): createProfile(), markPaid(), renderComm(), renderUsers(), toggleUser(), go(), edcTable(), renderEdc() (+3 more)

### Community 6 - "Reports And CSV Export"
Cohesion: 0.22
Nodes (15): barChart(), CH_COLOR, CH_ORDER, chOf(), csvCell(), downloadCSV(), drawQuots(), exportComms() (+7 more)

### Community 7 - "Today Home Page"
Cohesion: 0.52
Nodes (11): dayBar(), homeFinance(), homeMarketing(), homeSales(), homeSite(), isLate(), lateText(), panel() (+3 more)

### Community 8 - "Notifications And Bell"
Cohesion: 0.29
Nodes (8): BELLS, bellSeen(), bellSound(), hidePop(), loadBells(), paintBell(), popNotice(), watchBells()

### Community 9 - "Auth And Boot Sequence"
Cohesion: 0.38
Nodes (7): boot(), doLogin(), esc(), followUpToday(), opt(), optList(), stagePill()

### Community 10 - "Quotation Document"
Cohesion: 0.53
Nodes (5): printQuote(), qb(), qnum(), QT, quoteHtml()

### Community 11 - "EDC Eligibility Rules"
Cohesion: 0.50
Nodes (4): edcApplies(), edcDone(), edcFields(), kwac()

### Community 12 - "No-Build Design Decisions"
Cohesion: 0.50
Nodes (4): Cache-busting ?v= query string, Inline onclick to global functions, No build step, no framework, Ordered plain script loading

### Community 13 - "Sidebar Navigation"
Cohesion: 0.67
Nodes (3): buildNav(), canFinance(), navBtn()

## Knowledge Gaps
- **39 isolated node(s):** `sb`, `STAGES`, `STAFF`, `LEADS`, `QUOTS` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `go()` connect `Admin, EDC And Routing` to `Core Helpers And Vocabularies`, `Leads Table And Creation`, `Finance And Payments`, `Reports And CSV Export`, `Today Home Page`, `Auth And Boot Sequence`?**
  _High betweenness centrality (0.405) - this node is a cross-community bridge._
- **Why does `renderFinance()` connect `Finance And Payments` to `Admin, EDC And Routing`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Why does `boot()` connect `Auth And Boot Sequence` to `Core Helpers And Vocabularies`, `Notifications And Bell`, `Admin, EDC And Routing`, `Sidebar Navigation`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `go()` (e.g. with `renderComm()` and `renderUsers()`) actually correct?**
  _`go()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `sb`, `STAGES`, `STAFF` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Helpers And Vocabularies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `App Shell And Keepalive` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._