sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/NumberFormat",
    "eam/ui/model/formatter"
], function (Controller, JSONModel, Filter, FilterOperator, NumberFormat, formatter) {
    "use strict";

    return Controller.extend("eam.ui.controller.Reports", {

        formatter: formatter,

        onInit: function () {
            this.getView().setModel(new JSONModel({
                maxAssigned: 0,
                summary: "",
                count: 0
            }), "view");

            this._sQuery = "";
            this._sDepartment = "";
        },

        /* ---------- Department report ---------- */

        onDepartmentUpdateFinished: function (oEvent) {
            var oModel = this.getView().getModel("view");
            var iMax = 0;
            var iAssigned = 0;
            var iEmployees = 0;
            var fValue = 0;

            oEvent.getSource().getItems().forEach(function (oItem) {
                var oContext = oItem.getBindingContext();
                var iCount = oContext.getProperty("AssignedAssets") || 0;

                iMax = Math.max(iMax, iCount);
                iAssigned += iCount;
                iEmployees += oContext.getProperty("Employees") || 0;
                fValue += parseFloat(oContext.getProperty("TotalValue")) || 0;
            });

            var oFormat = NumberFormat.getFloatInstance({
                minFractionDigits: 2,
                maxFractionDigits: 2
            });

            oModel.setProperty("/maxAssigned", iMax);
            oModel.setProperty(
                "/summary",
                iEmployees + " employees · " + iAssigned + " assets assigned · " +
                oFormat.format(fValue) + " total value"
            );
        },

        /* ---------- Currently assigned assets ---------- */

        onSearch: function (oEvent) {
            this._sQuery = (oEvent.getParameter("query") || "").trim();
            this._applyFilters();
        },

        onDepartmentChange: function (oEvent) {
            this._sDepartment = oEvent.getSource().getSelectedKey() || "";
            this._applyFilters();
        },

        _applyFilters: function () {
            var aFilters = [];

            if (this._sQuery) {
                aFilters.push(new Filter({
                    and: false,
                    filters: [
                        new Filter("AssetName", FilterOperator.Contains, this._sQuery),
                        new Filter("SerialNumber", FilterOperator.Contains, this._sQuery),
                        new Filter("FirstName", FilterOperator.Contains, this._sQuery),
                        new Filter("LastName", FilterOperator.Contains, this._sQuery)
                    ]
                }));
            }

            if (this._sDepartment) {
                aFilters.push(new Filter("Department", FilterOperator.EQ, this._sDepartment));
            }

            var vFilter = aFilters.length
                ? new Filter({ filters: aFilters, and: true })
                : [];

            this.byId("assignedTable").getBinding("items").filter(vFilter);
        },

        onAssignedUpdateFinished: function (oEvent) {
            var iTotal = oEvent.getParameter("total");
            if (typeof iTotal === "number" && iTotal >= 0) {
                this.getView().getModel("view").setProperty("/count", iTotal);
            }
        }

    });
});