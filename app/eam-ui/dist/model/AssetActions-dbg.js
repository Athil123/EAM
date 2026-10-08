sap.ui.define([
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Fragment, JSONModel, MessageToast, MessageBox) {
    "use strict";

    function today() {
        var oDate = new Date();
        var sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
        var sDay = String(oDate.getDate()).padStart(2, "0");
        return oDate.getFullYear() + "-" + sMonth + "-" + sDay;
    }

    // Calls an unbound OData V4 action, e.g. "/assignAsset(...)"
    function execute(oModel, sPath, mParameters) {
        var oAction = oModel.bindContext(sPath);

        Object.keys(mParameters).forEach(function (sName) {
            oAction.setParameter(sName, mParameters[sName]);
        });

        return oAction.execute();
    }

    return {

        /**
         * Opens the Assign Asset dialog.
         * mOptions.assetId (optional): preselects and locks the asset.
         * mOptions.onSuccess (optional): called after a successful assignment.
         */
        openAssignDialog: function (oView, mOptions) {
            mOptions = mOptions || {};

            var oModel = oView.getModel();
            var oDialog;

            var oDialogModel = new JSONModel({
                employeeId: "",
                assetId: mOptions.assetId || "",
                assetLocked: !!mOptions.assetId,
                assignedDate: today(),
                state: {
                    employeeId: "None",
                    assetId: "None",
                    assignedDate: "None"
                }
            });

            var oHandler = {

                onFieldChange: function (oEvent) {
                    var oControl = oEvent.getSource();
                    var oBinding = oControl.getBinding("selectedKey") || oControl.getBinding("value");

                    // "/employeeId" -> "/state/employeeId"
                    oDialogModel.setProperty("/state" + oBinding.getPath(), "None");
                },

                onConfirm: function () {
                    var oData = oDialogModel.getData();

                    var mState = {
                        employeeId: oData.employeeId ? "None" : "Error",
                        assetId: oData.assetId ? "None" : "Error",
                        assignedDate: oData.assignedDate ? "None" : "Error"
                    };
                    oDialogModel.setProperty("/state", mState);

                    if (Object.keys(mState).some(function (sKey) { return mState[sKey] === "Error"; })) {
                        return;
                    }

                    oDialog.setBusy(true);

                    execute(oModel, "/assignAsset(...)", {
                        employeeID: oData.employeeId,
                        assetID: oData.assetId,
                        assignedDate: oData.assignedDate
                    }).then(function () {
                        oDialog.close();
                        MessageToast.show("Asset assigned");
                        oModel.refresh();
                        if (mOptions.onSuccess) {
                            mOptions.onSuccess();
                        }
                    }).catch(function (oError) {
                        oDialog.setBusy(false);
                        MessageBox.error(oError.message || "Assignment failed.");
                    });
                },

                onCancel: function () {
                    oDialog.close();
                }
            };

            Fragment.load({
                id: oView.getId(),
                name: "eam.ui.view.fragment.AssignDialog",
                controller: oHandler
            }).then(function (oLoadedDialog) {
                oDialog = oLoadedDialog;
                oDialog.setModel(oDialogModel, "assign");
                oView.addDependent(oDialog);
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                });
                oDialog.open();
            });
        },

        returnAsset: function (oView, sAssignmentId) {
            var oModel = oView.getModel();

            MessageBox.confirm("Mark this asset as returned?", {
                title: "Return asset",
                actions: ["Return", MessageBox.Action.CANCEL],
                emphasizedAction: "Return",
                onClose: function (sAction) {
                    if (sAction !== "Return") {
                        return;
                    }

                    execute(oModel, "/returnAsset(...)", {
                        assignmentID: sAssignmentId
                    }).then(function () {
                        MessageToast.show("Asset returned");
                        oModel.refresh();
                    }).catch(function (oError) {
                        MessageBox.error(oError.message || "Return failed.");
                    });
                }
            });
        }

    };
});