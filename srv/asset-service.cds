using { eam } from '../db/schema';

@odata
service AssetService {

    entity Employees
        as projection on eam.Employees;

    entity Assets
        as projection on eam.Assets;

    entity AssetAssignments
        as projection on eam.AssetAssignments;

    @readonly
    @cds.redirection.target: false
    entity CurrentlyAssignedAssets
        as projection on eam.CurrentlyAssignedAssets;

    @readonly
    @cds.redirection.target: false
    entity DepartmentAssetReport
        as projection on eam.DepartmentAssetReport;

    action assignAsset(
        employeeID : UUID,
        assetID    : UUID,
        assignedDate : Date
    ) returns AssetAssignments;

    action returnAsset(
        assignmentID : UUID
    ) returns AssetAssignments;
}