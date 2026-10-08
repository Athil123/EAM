sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "eam/ui/model/formatter"
], function (Controller, formatter) {
    "use strict";

    return Controller.extend("eam.ui.controller.EmployeeDetail", {

        formatter: formatter,

        onInit: function () {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("employeeDetail")
                .attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sId = oEvent.getParameter("arguments").employeeId;

            // UUID keys are unquoted in OData V4 key predicates
            this.getView().bindElement({
                path: "/Employees(" + sId + ")"
            });
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("employees");
        }

    });
});