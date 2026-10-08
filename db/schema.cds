namespace eam;

using {
    cuid,
    managed
} from '@sap/cds/common';

type AssetStatus : String enum {
    AVAILABLE;
    ASSIGNED;
    REPAIR;
    RETIRED;
}

type AssignmentStatus : String enum {
    ASSIGNED;
    RETURNED;
}

entity Employees : cuid, managed {

    FirstName   : String(50);
    LastName    : String(50);
    Email       : String(100);
    Department  : String(100);

    assignments : Association to many AssetAssignments
                    on assignments.Employee = $self;
}

@assert.unique: { serialNumber: [SerialNumber] }
entity Assets : cuid, managed {

    AssetName       : String(100);
    AssetType       : String(50);
    SerialNumber    : String(100);
    PurchaseDate    : Date;
    Price           : Decimal(10,2);
    Status          : AssetStatus;

    assignments     : Association to many AssetAssignments
                        on assignments.Asset = $self;
}

entity AssetAssignments : cuid, managed {

    Employee        : Association to one Employees;
    Asset           : Association to one Assets;

    AssignedDate    : Date;
    ReturnDate      : Date;
    Status          : AssignmentStatus;
}

// Currently assigned assets: one row per active assignment
view CurrentlyAssignedAssets as select from AssetAssignments {
    key ID,
    Asset.ID            as AssetID,
    Asset.AssetName     as AssetName,
    Asset.AssetType     as AssetType,
    Asset.SerialNumber  as SerialNumber,
    Employee.ID         as EmployeeID,
    Employee.FirstName  as FirstName,
    Employee.LastName   as LastName,
    Employee.Department as Department,
    AssignedDate
} where Status = 'ASSIGNED';

// Department report: employees, assets currently held and their total value
view DepartmentAssetReport as select from Employees as e
    left join AssetAssignments as a
        on a.Employee.ID = e.ID and a.Status = 'ASSIGNED'
    left join Assets as s
        on s.ID = a.Asset.ID
{
    key coalesce(e.Department, 'Unassigned') as Department : String(100),
    count(distinct e.ID)                     as Employees      : Integer,
    count(a.ID)                              as AssignedAssets : Integer,
    sum(s.Price)                             as TotalValue     : Decimal(12,2)
} group by coalesce(e.Department, 'Unassigned');