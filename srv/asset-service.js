import cds from '@sap/cds';

export default cds.service.impl(function () {

    const { Employees, Assets, AssetAssignments } = this.entities;

    this.on('assignAsset', async (req) => {

        const { employeeID, assetID, assignedDate } = req.data;

        // Check employee
        const employee = await SELECT.one
            .from(Employees)
            .where({ ID: employeeID });

        if (!employee) {
            return req.error(404, 'Employee not found');
        }

        // Check asset
        const asset = await SELECT.one
            .from(Assets)
            .where({ ID: assetID });

        if (!asset) {
            return req.error(404, 'Asset not found');
        }

        // Asset must be available
        if (asset.Status !== 'AVAILABLE') {
            return req.error(
                400,
                `Asset is not available. Current status: ${asset.Status}`
            );
        }

        // Create assignment
        const assignmentID = cds.utils.uuid();

        await INSERT.into(AssetAssignments).entries({
            ID: assignmentID,
            Employee_ID: employeeID,
            Asset_ID: assetID,
            AssignedDate: assignedDate || new Date().toISOString().slice(0, 10),
            Status: 'ASSIGNED'
        });

        // Change asset status
        await UPDATE(Assets)
            .set({ Status: 'ASSIGNED' })
            .where({ ID: assetID });

        // Return created assignment
        return await SELECT.one
            .from(AssetAssignments)
            .where({ ID: assignmentID });
    });


    this.on('returnAsset', async (req) => {

        const { assignmentID } = req.data;

        // Find assignment
        const assignment = await SELECT.one
            .from(AssetAssignments)
            .where({ ID: assignmentID });

        if (!assignment) {
            return req.error(404, 'Assignment not found');
        }

        // Assignment must currently be active
        if (assignment.Status !== 'ASSIGNED') {
            return req.error(
                400,
                'This asset assignment has already been returned'
            );
        }

        // Update assignment
        await UPDATE(AssetAssignments)
            .set({
                Status: 'RETURNED',
                ReturnDate: new Date().toISOString().slice(0, 10)
            })
            .where({ ID: assignmentID });

        // Change corresponding asset back to AVAILABLE
        await UPDATE(Assets)
            .set({ Status: 'AVAILABLE' })
            .where({ ID: assignment.Asset_ID });

        // Return updated assignment
        return await SELECT.one
            .from(AssetAssignments)
            .where({ ID: assignmentID });
    });

        // Employees with assignment records can't be deleted
    this.before('DELETE', Employees, async (req) => {
        const used = await SELECT.one
            .from(AssetAssignments)
            .columns('ID')
            .where({ Employee_ID: req.data.ID });

        if (used) {
            return req.reject(
                409,
                'This employee has assignment records and cannot be deleted.'
            );
        }
    });

    // Assets that are assigned, or have assignment history, can't be deleted
    this.before('DELETE', Assets, async (req) => {
        const asset = await SELECT.one
            .from(Assets)
            .columns('Status')
            .where({ ID: req.data.ID });

        if (asset && asset.Status === 'ASSIGNED') {
            return req.reject(
                409,
                'This asset is currently assigned. Return it before deleting.'
            );
        }

        const used = await SELECT.one
            .from(AssetAssignments)
            .columns('ID')
            .where({ Asset_ID: req.data.ID });

        if (used) {
            return req.reject(
                409,
                'This asset has assignment history. Set its status to Retired instead of deleting it.'
            );
        }
    });

});