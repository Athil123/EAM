sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/Device"
], function (Controller, Device) {
    "use strict";

    // Detail routes highlight their parent section in the side navigation
    var mRouteToNavKey = {
        dashboard: "dashboard",
        employees: "employees",
        employeeDetail: "employees",
        assets: "assets",
        assetDetail: "assets",
        assignments: "assignments",
        reports: "reports"
    };

    return Controller.extend("eam.ui.controller.App", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();

            this.byId("toolPage").setSideExpanded(!Device.system.phone);

            oRouter.attachRouteMatched(this._onRouteMatched, this);
            oRouter.initialize();
        },

        _onRouteMatched: function (oEvent) {
            var sKey = mRouteToNavKey[oEvent.getParameter("name")];

            if (sKey) {
                this.byId("sideNavigation").setSelectedKey(sKey);
            }
        },

        onSideNavButtonPress: function () {
            var oToolPage = this.byId("toolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        onNavigationSelect: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var oRouter = this.getOwnerComponent().getRouter();

            switch (sKey) {
                case "dashboard":
                    oRouter.navTo("dashboard");
                    break;
                case "employees":
                    oRouter.navTo("employees");
                    break;
                case "assets":
                    oRouter.navTo("assets");
                    break;
                case "assignments":
                    oRouter.navTo("assignments");
                    break;
                case "reports":
                    oRouter.navTo("reports");
                    break;
            }
        }

    });
});