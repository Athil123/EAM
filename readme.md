# EAM – Employee Asset Management

An Enterprise Asset Management application built with **SAP CAP**, a **SAPUI5 freestyle** frontend and **SAP HANA Cloud**, deployed to **SAP BTP Cloud Foundry**.

It manages employees, company assets (laptops, monitors, phones, tablets) and the assignment of assets to employees, including returns and status tracking.

---

## Features

| Area | What you can do |
|---|---|
| **Dashboard** | KPI cards (employees, total / assigned / available assets), asset-status distribution, recent assignments, quick "Assign Asset" action |
| **Employees** | List, search, add, edit, delete; open an employee to see currently assigned assets and full assignment history |
| **Assets** | List, search, filter by status and type, sort, add, edit, delete; open an asset to see its current holder and history |
| **Assignments** | Assign an available asset to an employee, return an asset, search / filter / sort all assignments |
| **Reports** | Assets by department (employees, assets held, total value) and a filterable list of currently assigned assets |

### Business rules (enforced in the backend)

- Only assets with status `AVAILABLE` can be assigned.
- Assigning an asset sets it to `ASSIGNED`; returning it sets the assignment to `RETURNED`, records the return date and sets the asset back to `AVAILABLE`.
- An already-returned assignment cannot be returned again.
- An employee with assignment records cannot be deleted.
- An asset that is currently assigned, or has assignment history, cannot be deleted (set it to `RETIRED` instead).
- Serial numbers are unique.

---

## Architecture

```
Browser
   |
   v
SAPUI5 application (served from HTML5 Application Repository)
   |
   v
Application Router  (XSUAA authentication, routing)
   |
   +---------------------------+
   |                           |
   v                           v
HTML5 App Repo runtime     CAP service (Node.js, OData V4)
                               |
                               v
                         SAP HANA Cloud (HDI container)
```

### Tech stack

| Layer | Technology |
|---|---|
| Backend | SAP CAP (Node.js), CDS, OData V4 |
| Database | SAP HANA Cloud (HDI) |
| Frontend | OpenUI5 1.120.0, XML views, `sap.m`, `sap.tnt` |
| Auth & routing | XSUAA, Application Router |
| Packaging | MTA (`mbt`), HTML5 Application Repository |

---

## Project structure

```
EAM/
├── app/
│   ├── eam-ui/                      # SAPUI5 application (namespace: eam.ui)
│   │   └── webapp/
│   │       ├── controller/          # App, Dashboard, Employees, EmployeeDetail,
│   │       │                        # Assets, AssetDetail, Assignments, Reports
│   │       ├── view/                # XML views
│   │       │   └── fragment/        # Dialogs (assign, employee, asset)
│   │       ├── model/               # formatter.js, AssetActions.js, CrudHelper.js
│   │       ├── css/style.css        # All custom styling
│   │       ├── Component.js
│   │       └── manifest.json        # OData V4 model, routing, CSS
│   └── router/
│       └── xs-app.json              # Application Router routes
├── db/
│   ├── schema.cds                   # Data model and views
│   └── data/                        # Sample data (CSV)
├── srv/
│   ├── asset-service.cds            # OData service definition
│   └── asset-service.js             # Action handlers and delete guards
├── mta.yaml
└── package.json
```

---

## Data model

Defined in `db/schema.cds` (namespace `eam`, entities use `cuid` and `managed`).

| Entity | Fields |
|---|---|
| **Employees** | `FirstName`, `LastName`, `Email`, `Department` |
| **Assets** | `AssetName`, `AssetType`, `SerialNumber` (unique), `PurchaseDate`, `Price`, `Status` (`AVAILABLE` \| `ASSIGNED` \| `REPAIR` \| `RETIRED`) |
| **AssetAssignments** | `Employee`, `Asset`, `AssignedDate`, `ReturnDate`, `Status` (`ASSIGNED` \| `RETURNED`) |

CDS views:

| View | Purpose |
|---|---|
| `CurrentlyAssignedAssets` | One row per active assignment, with asset and employee details |
| `DepartmentAssetReport` | Per department: employee count, assets currently held, total value |

---

## OData service

Base path: `/odata/v4/asset/`

| Resource | Notes |
|---|---|
| `Employees`, `Assets`, `AssetAssignments` | Full CRUD |
| `CurrentlyAssignedAssets`, `DepartmentAssetReport` | Read-only views |
| `assignAsset(employeeID, assetID, assignedDate)` | Action: creates an assignment, sets the asset to `ASSIGNED` |
| `returnAsset(assignmentID)` | Action: marks the assignment `RETURNED`, sets the asset to `AVAILABLE` |

Examples:

```
GET /odata/v4/asset/Employees?$count=true
GET /odata/v4/asset/Assets?$filter=Status eq 'AVAILABLE'
GET /odata/v4/asset/AssetAssignments?$expand=Asset,Employee&$orderby=AssignedDate desc
GET /odata/v4/asset/DepartmentAssetReport
```

---

## Prerequisites

- Node.js (LTS) and npm
- `@sap/cds-dk` (CAP development kit)
- Cloud MTA Build Tool (`mbt`)
- Cloud Foundry CLI (`cf`) with the MultiApps plugin (`cf deploy`)
- A BTP subaccount with Cloud Foundry, SAP HANA Cloud, XSUAA, the Destination service and the HTML5 Application Repository

---

## Build and deploy

All commands assume the project root is `EAM/`.

**1. Log in to Cloud Foundry**

```bash
cf login
```

**2. Build the UI** (creates `app/eam-ui/dist/eam-ui.zip`)

```bash
cd app/eam-ui
npm run build
cd ../..
```

**3. Build the MTA archive**

```bash
mbt build
```

**4. Deploy**

```bash
cf deploy mta_archives/EAM_1.0.0.mtar
```

If Cloud Foundry reports an ongoing operation for the app, check its state first (`cf mta-ops`) and then resume or abort it deliberately instead of starting another deployment.

**5. Open the application**

Open the Application Router URL (`cf apps` shows it for the `EAM` app) and log in.

### MTA modules

| Module | Role |
|---|---|
| `EAM-srv` | CAP backend |
| `EAM-db-deployer` | Deploys the database artifacts (tables, views, sample data) |
| `EAM-app-deployer` | Pushes the UI to the HTML5 Application Repository |
| `EAM-ui` | Builds the UI zip |
| `EAM` | Application Router |

---

## Verify the data in SAP HANA

In **SAP HANA Database Explorer**, open the HDI container created for this project and run:

```sql
SELECT * FROM "EAM_EMPLOYEES";
SELECT * FROM "EAM_ASSETS";
SELECT * FROM "EAM_ASSETASSIGNMENTS";

SELECT * FROM "EAM_CURRENTLYASSIGNEDASSETS";
SELECT * FROM "EAM_DEPARTMENTASSETREPORT";
```

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| UI loads but all numbers are `0`, console shows `401` on `$metadata` / `$batch` | The Application Router has a stale or no session for XHR calls. Clear the site cookies and reload the Application Router URL as a top-level page so it redirects to login. |
| Intermittent `Unauthorized` (plain text body) on OData calls | The Application Router app is also mapped to the CAP service route, so some backend calls loop back to it. Check `cf routes` and run `cf unmap-route EAM <domain> --hostname <org>-<space>-eam-srv`. |
| Deployment fails with "Invalid file format … must include a zip file" | The HTML5 app zip was not built correctly. Run `npm run build` in `app/eam-ui` and confirm `dist/eam-ui.zip` exists before `mbt build`. |
| Database deployment fails on the unique constraint | Two assets share a serial number in the sample data. Fix the duplicates in `db/data` and redeploy. |
| Old UI after deploying | The HTML5 repository is cached. Hard-refresh (or disable cache in DevTools). |

---

## Notes

- Asset status `ASSIGNED` can only be set by the `assignAsset` action, never by hand in the UI.
- Custom styling lives in `webapp/css/style.css` and is loaded through `manifest.json`.
- The Application Router configuration (`xs-app.json`) and `forwardAuthToken` are already set up for the CAP destination; avoid changing them unless the routing itself breaks.