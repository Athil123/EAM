sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "eam/ui/model/formatter",
    "eam/ui/model/AssetActions",
    "sap/ui/model/Sorter"
], function (Controller, JSONModel, Filter, FilterOperator, formatter, AssetActions,Sorter) {
    "use strict";

    return Controller.extend("eam.ui.controller.Assignments", {

        formatter: formatter,

        onInit: function () {
            this.getView().setModel(new JSONModel({ count: 0 }), "view");
            this._sQuery = "";
            this._sStatus = "ALL";
            this._sSort = "DATE_DESC";
        },

        onSearch: function (oEvent) {
            this._sQuery = (oEvent.getParameter("query") || "").trim();
            this._applyFilters();
        },

        onStatusChange: function (oEvent) {
            this._sStatus = oEvent.getParameter("selectedItem").getKey();
            this._applyFilters();
        },

        onSortChange: function (oEvent) {
            this._sSort = oEvent.getParameter("selectedItem").getKey();

            var mSorters = {
                DATE_DESC: new Sorter("AssignedDate", true),
                DATE_ASC:  new Sorter("AssignedDate", false),
                ASSET_ASC: new Sorter("Asset/AssetName", false),
                EMP_ASC:   new Sorter("Employee/LastName", false)
            };

            this.byId("assignmentsTable").getBinding("items").sort(mSorters[this._sSort]);
        },

        _applyFilters: function () {
            var aFilters = [];

            if (this._sQuery) {
                aFilters.push(new Filter({
                    and: false,
                    filters: [
                        new Filter("Asset/AssetName", FilterOperator.Contains, this._sQuery),
                        new Filter("Employee/FirstName", FilterOperator.Contains, this._sQuery),
                        new Filter("Employee/LastName", FilterOperator.Contains, this._sQuery)
                    ]
                }));
            }

            if (this._sStatus !== "ALL") {
                aFilters.push(new Filter("Status", FilterOperator.EQ, this._sStatus));
            }

            var vFilter = aFilters.length
                ? new Filter({ filters: aFilters, and: true })
                : [];

            this.byId("assignmentsTable").getBinding("items").filter(vFilter);
        },

        onUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (typeof iTotal === "number" && iTotal >= 0) {
                this.getView().getModel("view").setProperty("/count", iTotal);
            }
        },

        onAssignPress: function () {
            AssetActions.openAssignDialog(this.getView());
        },

        onReturnPress: function (oEvent) {
            var sAssignmentId = oEvent.getSource().getBindingContext().getProperty("ID");
            AssetActions.returnAsset(this.getView(), sAssignmentId);
        }

    });
});