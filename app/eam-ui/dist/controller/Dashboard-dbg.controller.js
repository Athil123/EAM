sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "eam/ui/model/formatter",
    "eam/ui/model/AssetActions"
], function (Controller, JSONModel, Filter, FilterOperator, formatter, AssetActions) {
    "use strict";

    return Controller.extend("eam.ui.controller.Dashboard", {

        formatter: formatter,

        onInit: function () {
            this.getView().setModel(new JSONModel({
                employeeCount: 0,
                assetCount: 0,
                assignedCount: 0,
                availableCount: 0,
                repairCount: 0,
                retiredCount: 0,
                availablePct: 0,
                assignedPct: 0,
                repairPct: 0,
                retiredPct: 0
            }), "dashboard");

            // Reload counts every time the dashboard is shown,
            // so numbers are fresh after assigning/returning elsewhere
            this.getOwnerComponent()
                .getRouter()
                .getRoute("dashboard")
                .attachPatternMatched(this._loadDashboardData, this);
        },

        _requestCount: function (sPath, aFilters) {
            var oModel = this.getOwnerComponent().getModel();
            var oBinding = oModel.bindList(
                sPath, null, [], aFilters || [], { $count: true }
            );

            return oBinding.requestContexts(0, 1).then(function () {
                var iLength = oBinding.getLength();
                oBinding.destroy();
                return iLength;
            }).catch(function (oError) {
                oBinding.destroy();
                throw oError;
            });
        },

        _statusFilter: function (sStatus) {
            return [new Filter("Status", FilterOperator.EQ, sStatus)];
        },

        _updatePercentages: function () {
            var oModel = this.getView().getModel("dashboard");
            var iTotal = oModel.getProperty("/assetCount");

            ["available", "assigned", "repair", "retired"].forEach(function (sKey) {
                var iCount = oModel.getProperty("/" + sKey + "Count");
                oModel.setProperty(
                    "/" + sKey + "Pct",
                    iTotal ? Math.round(iCount * 100 / iTotal) : 0
                );
            });
        },

        _loadDashboardData: function () {
            var oDashboardModel = this.getView().getModel("dashboard");

            var aRequests = [
                { property: "/employeeCount",  path: "/Employees", filters: [] },
                { property: "/assetCount",     path: "/Assets",    filters: [] },
                { property: "/assignedCount",  path: "/Assets",    filters: this._statusFilter("ASSIGNED") },
                { property: "/availableCount", path: "/Assets",    filters: this._statusFilter("AVAILABLE") },
                { property: "/repairCount",    path: "/Assets",    filters: this._statusFilter("REPAIR") },
                { property: "/retiredCount",   path: "/Assets",    filters: this._statusFilter("RETIRED") }
            ];

            // Each KPI is independent: one failure doesn't block the rest
            aRequests.forEach(function (oRequest) {
                this._requestCount(oRequest.path, oRequest.filters)
                    .then(function (iCount) {
                        oDashboardModel.setProperty(oRequest.property, iCount);
                        this._updatePercentages();
                    }.bind(this))
                    .catch(function (oError) {
                        console.error("Failed to load " + oRequest.property + ":", oError);
                    });
            }.bind(this));
        },

        onAssignPress: function () {
            AssetActions.openAssignDialog(this.getView(), {
                onSuccess: this._loadDashboardData.bind(this)
            });
        },

        onAssignmentsPress: function () {
            this.getOwnerComponent().getRouter().navTo("assignments");
        }

    });
});