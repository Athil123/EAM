sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "eam/ui/model/formatter",
    "eam/ui/model/AssetActions"
], function (Controller, formatter, AssetActions) {
    "use strict";

    return Controller.extend("eam.ui.controller.AssetDetail", {

        formatter: formatter,

        onInit: function () {
            this.getOwnerComponent()
                .getRouter()
                .getRoute("assetDetail")
                .attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            this._sAssetId = oEvent.getParameter("arguments").assetId;

            this.getView().bindElement({
                path: "/Assets(" + this._sAssetId + ")"
            });
        },

        onAssignPress: function () {
            AssetActions.openAssignDialog(this.getView(), {
                assetId: this._sAssetId
            });
        },

        onReturnPress: function (oEvent) {
            var sAssignmentId = oEvent.getSource().getBindingContext().getProperty("ID");
            AssetActions.returnAsset(this.getView(), sAssignmentId);
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("assets");
        }

    });
});