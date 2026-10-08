sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "eam/ui/model/CrudHelper"
], function (Controller, Fragment, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, CrudHelper) {
    "use strict";

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return Controller.extend("eam.ui.controller.Employees", {

        onInit: function () {
            this.getView().setModel(new JSONModel({ count: 0 }), "view");
        },

        /* ---------- List ---------- */

        onSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("query") || "").trim();
            var aFilters = [];

            if (sQuery) {
                aFilters.push(new Filter({
                    and: false,
                    filters: [
                        new Filter("FirstName", FilterOperator.Contains, sQuery),
                        new Filter("LastName", FilterOperator.Contains, sQuery),
                        new Filter("Department", FilterOperator.Contains, sQuery),
                        new Filter("Email", FilterOperator.Contains, sQuery)
                    ]
                }));
            }

            this.byId("employeesTable").getBinding("items").filter(aFilters);
        },

        onUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (typeof iTotal === "number" && iTotal >= 0) {
                this.getView().getModel("view").setProperty("/count", iTotal);
            }
        },

        onItemPress: function (oEvent) {
            var sId = oEvent.getSource().getBindingContext().getProperty("ID");

            this.getOwnerComponent().getRouter().navTo("employeeDetail", {
                employeeId: sId
            });
        },

        /* ---------- Create / edit ---------- */

        onAddPress: function () {
            this._openDialog(null);
        },

        onEditPress: function (oEvent) {
            this._openDialog(oEvent.getSource().getBindingContext());
        },

        _openDialog: function (oContext) {
            var oView = this.getView();

            if (this._oDialog || this._bOpening) {
                return;
            }
            this._bOpening = true;

            var bEdit = !!oContext;
            var fnGet = function (sName) {
                var vValue = bEdit ? oContext.getProperty(sName) : "";
                return vValue === null || vValue === undefined ? "" : String(vValue);
            };

            this._oEditContext = oContext;
            this._oDialogModel = new JSONModel({
                title: bEdit ? "Edit Employee" : "Add Employee",
                confirmText: bEdit ? "Save" : "Add",
                FirstName: fnGet("FirstName"),
                LastName: fnGet("LastName"),
                Email: fnGet("Email"),
                Department: fnGet("Department"),
                state: { FirstName: "None", LastName: "None", Email: "None" }
            });

            Fragment.load({
                id: oView.getId(),
                name: "eam.ui.view.fragment.EmployeeDialog",
                controller: this
            }).then(function (oDialog) {
                this._oDialog = oDialog;
                this._bOpening = false;

                oDialog.setModel(this._oDialogModel, "employee");
                oView.addDependent(oDialog);
                oDialog.attachAfterClose(function () {
                    oDialog.destroy();
                    this._oDialog = null;
                }.bind(this));
                oDialog.open();
            }.bind(this));
        },

        onFieldChange: function (oEvent) {
            // Clear the error state of the field being edited
            var sPath = oEvent.getSource().getBinding("value").getPath();
            this._oDialogModel.setProperty("/state" + sPath, "None");
        },

        onCancelEmployee: function () {
            this._oDialog.close();
        },

        onSaveEmployee: function () {
            var oData = this._oDialogModel.getData();

            var mEmployee = {
                FirstName: (oData.FirstName || "").trim(),
                LastName: (oData.LastName || "").trim(),
                Email: (oData.Email || "").trim(),
                Department: (oData.Department || "").trim()
            };

            var mState = {
                FirstName: mEmployee.FirstName ? "None" : "Error",
                LastName: mEmployee.LastName ? "None" : "Error",
                Email: EMAIL_PATTERN.test(mEmployee.Email) ? "None" : "Error"
            };
            this._oDialogModel.setProperty("/state", mState);

            if (Object.keys(mState).some(function (sKey) { return mState[sKey] === "Error"; })) {
                return;
            }

            var bEdit = !!this._oEditContext;
            var oBinding = this.byId("employeesTable").getBinding("items");
            var pSave = bEdit
                ? CrudHelper.update(this._oEditContext, mEmployee)
                : CrudHelper.create(oBinding, mEmployee);

            this._oDialog.setBusy(true);

            pSave.then(function () {
                this._oDialog.close();
                MessageToast.show(bEdit ? "Employee updated" : "Employee added");
                oBinding.refresh();
            }.bind(this)).catch(function (oError) {
                this._oDialog.setBusy(false);
                MessageBox.error(
                    (oError && oError.message) ||
                    "The employee could not be saved. Please try again."
                );
            }.bind(this));
        },

        /* ---------- Delete ---------- */

        onDeletePress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oTable = this.byId("employeesTable");
            var sName = oContext.getProperty("FirstName") + " " + oContext.getProperty("LastName");

            CrudHelper.confirmDelete(
                "Delete employee",
                "Delete " + sName + "? This cannot be undone."
            ).then(function (bConfirmed) {
                if (!bConfirmed) {
                    return;
                }

                oTable.setBusy(true);

                oContext.delete().then(function () {
                    oTable.setBusy(false);
                    MessageToast.show("Employee deleted");
                }, function (oError) {
                    oTable.setBusy(false);
                    MessageBox.error(
                        (oError && oError.message) ||
                        "The employee could not be deleted."
                    );
                });
            });
        }

    });
});